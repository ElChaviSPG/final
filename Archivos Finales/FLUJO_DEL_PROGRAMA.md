# FLUJO DEL PROGRAMA — Smart Parking USPG Grupo 5
> Para explicar en el examen. Nivel de detalle técnico completo.

---

## 1. FLUJO DE ENTRADA DE VEHÍCULO (vía QR)

```
[Guardia] escanea QR del carnet del usuario en /parqueo/escaner
    ↓
[Frontend] webapp/src/app/parqueo/escaner/page.js
    envía POST con { code: "QR_CODE_DEL_USUARIO" }
    ↓
[API Route] webapp/src/app/api/parqueo/qr/scan/route.js — función POST()
    ↓
[Consulta SQL #1 — DQL con JOIN]
    prisma.user.findFirst({
      where: { qr_code: code, deleted_at: null, is_active: true },
      include: { vehicles: { include: { sessions (ACTIVE) } } }
    })
    → SELECT u.*, v.*, s.* FROM "User" u
      LEFT JOIN "Vehicle" v ON v.user_id = u.id
      LEFT JOIN "ParkingSession" s ON s.vehicle_id = v.id AND s.status = 'ACTIVE'
      WHERE u.qr_code = $1
    ↓
[Validaciones en memoria]
    ¿vehicle.blacklisted? → res.error(403)
    ¿session activa? → va al flujo de SALIDA (ver sección 2)
    ↓
[Consulta SQL #2 — buscar espacio disponible]
    prisma.parkingSpace.findFirst({
      where: { status: 'AVAILABLE', is_active: true },
      orderBy: [{ zone: 'asc' }, { code: 'asc' }]
    })
    → SELECT * FROM "ParkingSpace"
      WHERE status = 'AVAILABLE' AND is_active = TRUE
      ORDER BY zone ASC, code ASC LIMIT 1
    ↓
[Consulta SQL #3 — verificar evento activo]
    prisma.parkingEvent.findFirst({ where: { status IN ['ACTIVE','SCHEDULED'], ... } })
    ↓
[Consulta SQL #4 — verificar suscripción activa]
    prisma.parkingSubscription.findFirst({
      where: { user_id, status: 'ACTIVE', end_date: { gt: now } }
    })
    ↓
[Transacción SQL — ATOMICA]
    prisma.$transaction([
      INSERT INTO "ParkingSession" (vehicle_id, space_id, user_id, entry_method, status='ACTIVE') → crea sesión
      UPDATE "ParkingSpace" SET status='OCCUPIED' WHERE id = space_id → ocupa espacio
    ])
    ↓
[Trigger automático — base de datos]
    trigger_audit_acceso (AFTER INSERT ON ParkingSession)
    → INSERT INTO "AuditLog" (action='VEHICLE_ENTRY', resource='parking_session', ...)
    ↓
[Respuesta JSON al frontend]
    { action: 'ENTRY', placa, owner_name, role, space_code, zone, entry_time }
    ↓
[Frontend] muestra confirmación en pantalla del escáner
```

**Tablas afectadas:** `User`, `Vehicle`, `ParkingSession` (INSERT), `ParkingSpace` (UPDATE), `AuditLog` (INSERT via trigger)

---

## 2. FLUJO DE SALIDA Y PAGO

```
[Guardia] escanea el MISMO QR del usuario al salir
    ↓
[API Route] webapp/src/app/api/parqueo/qr/scan/route.js — función POST()
    ↓
[El mismo endpoint detecta que hay sesión activa → modo SALIDA]
    activeSession = vehicle.sessions[0]  // la sesión ACTIVE encontrada en consulta inicial
    ↓
[Cálculo de duración]
    duration_minutes = Math.ceil((now - activeSession.entry_time) / 60000)
    ↓
[Cálculo de tarifa — función calcAmount()]
    1. ¿Tiene suscripción activa? → amount_due = 0, is_paid = true
    2. ¿Hay evento con FLAT_RATE? → amount_due = activeEvent.flat_rate
    3. Si no → getTariff(user.role):
       - ADMIN/SECURITY → rate = 0
       - TEACHER → rate = 0 (pero max 8h; si excede → tarifa de STUDENT)
       - STUDENT → rate = Q5/hora
       - VISITOR → rate = Q10/hora
    amount_due = (duration_minutes / 60) × hourly_rate
    ↓
[Caso A — Pago inmediato (suscripción o gratis)]
    prisma.$transaction([
      UPDATE "ParkingSession" SET status='COMPLETED', exit_time=now, duration_minutes, amount_due, is_paid=true
      UPDATE "ParkingSpace" SET status='AVAILABLE'
    ])
    ↓
[Caso B — Pago pendiente (genera cobro)]
    UPDATE "ParkingSession" SET exit_time, duration_minutes, amount_due, is_paid=false
    (el espacio NO se libera aún — se libera al confirmar pago)
    ↓
[Trigger automático]
    trigger_liberar_espacio_al_salir (AFTER UPDATE ON ParkingSession)
    → Si exit_time cambió de NULL a valor: UPDATE "ParkingSpace" SET status='AVAILABLE'
    ↓
[Respuesta JSON]
    { action: 'EXIT', duration_minutes, amount_due, is_paid, space_code }
```

**Tablas afectadas:** `ParkingSession` (UPDATE), `ParkingSpace` (UPDATE via trigger), `AuditLog` (trigger)

---

## 3. FLUJO DE VALIDACIÓN QR (Visitante)

```
[Guardia] va a /parqueo/escaner → sección "Generar QR Visitante"
    ↓
[Guardia ingresa] nombre del visitante + placa del vehículo
    ↓
[API Route] POST /api/parqueo/qr/visitor (genera el QR)
    → INSERT INTO "VisitorQR" (
        qr_code = 'VIS-{timestamp}-{NOMBRE}',
        expires_at = now + 2 horas,
        visitor_name, vehicle_plate, generated_by_user_id
      )
    → genera imagen QR en base64 con librería `qrcode`
    ↓
[Guardia puede enviar QR por email]
    POST /api/parqueo/qr/send-email → usa Resend SDK para enviar imagen
    ↓
[Visitante llega y escanea el QR]
    ↓
[API Route] POST /api/parqueo/qr/scan/route.js
    → No encuentra User con ese qr_code
    → Busca en "VisitorQR" WHERE qr_code = $1
    → ¿is_used = FALSE AND expires_at > now? → continúa
    → ¿Ya usado (is_used = TRUE)? → busca sesión activa → flujo de SALIDA de visitante
    ↓
[Crea vehículo temporal si no existe]
    prisma.vehicle.findFirst({ where: { placa: visitorQr.vehicle_plate } })
    Si no existe → crea User VISITOR + Vehicle con esa placa
    ↓
[Transacción]
    prisma.$transaction([
      INSERT INTO "ParkingSession" (entry_method: 'VISITOR_QR', notes: 'Visitante: nombre')
      UPDATE "ParkingSpace" SET status='OCCUPIED'
      UPDATE "VisitorQR" SET is_used=true, used_at=now
    ])
    → luego: UPDATE "VisitorQR" SET session_id = session.id
    ↓
[Respuesta]
    { action: 'ENTRY', placa, owner_name, role: 'VISITOR', space_code, zone }
```

**Tablas afectadas:** `VisitorQR` (INSERT + UPDATE), `Vehicle` (INSERT si nuevo), `User` (INSERT si nuevo), `ParkingSession` (INSERT), `ParkingSpace` (UPDATE)

---

## 4. FLUJO DEL DASHBOARD EN TIEMPO REAL

```
[Admin/Guardia] abre /parqueo/dashboard
    ↓
[Frontend] page.js hace GET /api/parqueo/dashboard
    ↓
[API Route] webapp/src/app/api/parqueo/dashboard/route.js
    ↓
[Consultas en paralelo — Promise.all()]

    Consulta 1 — Espacios por estado:
    SELECT status, COUNT(*) FROM "ParkingSpace"
    WHERE is_active = TRUE GROUP BY status

    Consulta 2 — Sesiones activas:
    SELECT COUNT(*) FROM "ParkingSession" WHERE status = 'ACTIVE'

    Consulta 3 — Ingresos del día:
    SELECT SUM(amount_due) FROM "ParkingSession"
    WHERE status='COMPLETED' AND entry_time::DATE = CURRENT_DATE AND is_paid=TRUE

    Consulta 4 — Ocupación por zona:
    → usa view_ocupacion_por_zona:
    SELECT zone, total_espacios, ocupados, disponibles, porcentaje_ocupacion
    FROM view_ocupacion_por_zona

    ↓
[Respuesta JSON unificada al frontend]
    { occupancy: {total, occupied, available, percentage},
      zones: [{zone, total, occupied, available, pct}],
      revenue_today, active_sessions }
    ↓
[Frontend hace polling cada 30 segundos con setInterval]
    useEffect(() => {
      fetchDashboard();
      const interval = setInterval(fetchDashboard, 30000);
      return () => clearInterval(interval);
    }, [])
    ↓
[Mapa /parqueo/mapa hace polling cada 3 segundos]
    GET /api/parqueo/spaces?status=all
    → SELECT * FROM "ParkingSpace" WHERE campus_id = $1
    → Frontend colorea cada espacio: verde(AVAILABLE) / rojo(OCCUPIED) / amarillo(RESERVED)
```

**Nota:** No usa WebSockets. El "tiempo real" se logra con polling HTTP. El endpoint `/spaces/sensor` recibe actualizaciones del ESP32 (simulado con `demo-iot.sh`).

---

## 5. FLUJO DE RESERVA DE ESPACIO

```
[Usuario] va a /parqueo/reservas
    ↓
[Frontend CampusMapPicker] muestra mapa interactivo con espacios disponibles
    ↓
[Usuario selecciona] zona, espacio, fecha y hora de inicio/fin
    ↓
[API Route] POST /api/parqueo/reservations/route.js
    ↓
[Validación de disponibilidad]
    SELECT * FROM "Reservation"
    WHERE space_id = $1
      AND status IN ('CONFIRMED', 'PENDING')
      AND NOT (end_time <= $start OR start_time >= $end)
    → Si hay overlap → res.conflict('Espacio ya reservado en ese horario')
    ↓
[Transacción]
    prisma.$transaction([
      INSERT INTO "Reservation" (user_id, vehicle_id, space_id, start_time, end_time, status='CONFIRMED')
      UPDATE "ParkingSpace" SET status='RESERVED'
    ])
    ↓
[Trigger automático]
    trigger_expirar_reservas (AFTER UPDATE ON Reservation)
    → Si status cambia a 'USED' o 'CANCELLED' →
      UPDATE "ParkingSpace" SET status='AVAILABLE' WHERE id = reservation.space_id
    ↓
[Opcional — enviar QR por email]
    POST /api/parqueo/qr/send-email con los datos de la reserva
    ↓
[Al llegar el usuario]
    Escanea QR → flujo normal de entrada
    → marca Reservation.status = 'USED'
```

**Tablas afectadas:** `Reservation` (INSERT), `ParkingSpace` (UPDATE), `VisitorQR` (opcional)

---

## 6. FLUJO DE GENERACIÓN DE REPORTES

```
[Admin] va a /parqueo/reportes y selecciona tipo de reporte
    ↓
[Opciones disponibles y sus endpoints:]

A) Reporte de Ocupación:
   GET /api/parqueo/reports/occupancy
   → SELECT zone, COUNT(*), COUNT(*) FILTER (WHERE status='OCCUPIED')
     FROM "ParkingSpace" GROUP BY zone
   → usa view_ocupacion_por_zona

B) Reporte Diario:
   GET /api/parqueo/reports/daily?date=2026-05-23
   → SELECT COUNT(*), SUM(amount_due), AVG(duration_minutes)
     FROM "ParkingSession" s JOIN "ParkingSpace" sp ON sp.id = s.space_id
     WHERE s.entry_time::DATE = $1 AND s.status = 'COMPLETED'
     GROUP BY sp.zone
   → usa view_ingresos_del_dia

C) Reporte Mensual:
   GET /api/parqueo/reports/monthly?year=2026&month=5
   → SELECT * FROM "MonthlyBill"
     JOIN "User" u ON u.id = monthly_bill.user_id
     WHERE year = $1 AND month = $2

D) Reporte de Ingresos:
   GET /api/parqueo/reports/revenue
   → SUM(amount_due) agrupado por día/semana

E) Top Usuarios:
   GET /api/parqueo/reports/top-users
   → SELECT u.first_name, u.last_name, COUNT(s.id), SUM(s.amount_due)
     FROM "User" u JOIN "ParkingSession" s ON s.user_id = u.id
     WHERE s.status = 'COMPLETED'
     GROUP BY u.id ORDER BY COUNT(s.id) DESC LIMIT 10

F) Predicción de demanda:
   GET /api/parqueo/reports/prediction
   → Analiza patrones históricos de entry_time para predecir horas pico

G) Exportar:
   GET /api/parqueo/reports/export
   → Genera CSV con los datos de sesiones completadas
```

**Tablas usadas:** `ParkingSession`, `ParkingSpace`, `User`, `MonthlyBill`, vistas `view_ingresos_del_dia`, `view_ocupacion_por_zona`

---

## RESUMEN DE CAPAS DEL SISTEMA

```
┌─────────────────────────────────────────────────┐
│  CAPA PRESENTACIÓN                              │
│  /webapp/src/app/parqueo/   (páginas Next.js)   │
│  /webapp/src/app/kiosco/    (kiosco público)    │
│  Componentes: /webapp/src/components/           │
└─────────────────┬───────────────────────────────┘
                  │ HTTP (fetch/axios)
┌─────────────────▼───────────────────────────────┐
│  CAPA LÓGICA DE NEGOCIO                         │
│  /webapp/src/app/api/parqueo/  (73 rutas REST)  │
│  /webapp/src/lib/  (jwt.js, response.js, etc.)  │
└─────────────────┬───────────────────────────────┘
                  │ Prisma ORM
┌─────────────────▼───────────────────────────────┐
│  CAPA DE DATOS                                  │
│  PostgreSQL (Neon serverless en producción)     │
│  19 tablas, 6 vistas, 5 SPs, 4 funciones        │
│  6 triggers, 35+ índices                        │
└─────────────────────────────────────────────────┘
```
