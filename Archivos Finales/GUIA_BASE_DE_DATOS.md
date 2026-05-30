# GUÍA DE BASE DE DATOS PARA EL EXAMEN — Smart Parking USPG Grupo 5

---

## TABLAS DEL SISTEMA

### 1. Campus
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID generado automáticamente |
| name | TEXT NOT NULL | Nombre del campus |
| address | TEXT NOT NULL | Dirección física |
| lat, lng | FLOAT8 | Coordenadas GPS |
| total_spaces | INT DEFAULT 500 | Capacidad total del parqueo |
| is_active | BOOLEAN DEFAULT TRUE | Si el campus está activo |

**Para qué sirve:** Nodo raíz del sistema. Todo el parqueo pertenece a un campus.
**Relaciones:** 1:N con ParkingSpace

---

### 2. User
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID |
| email | TEXT UNIQUE NOT NULL | Correo institucional |
| password_hash | TEXT NOT NULL | Contraseña cifrada con bcrypt |
| role | ENUM('ADMIN','SECURITY','TEACHER','STUDENT','VISITOR') | Rol del usuario |
| first_name, last_name | TEXT NOT NULL | Nombre completo |
| carnet | TEXT UNIQUE | Carnet universitario |
| nfc_card_id | TEXT UNIQUE | ID de tarjeta NFC para acceso |
| qr_code | TEXT UNIQUE NOT NULL | Código QR personal para entrada/salida |
| deleted_at | TIMESTAMPTZ | Soft delete |

**Para qué sirve:** Gestiona todos los usuarios del sistema con sus roles y métodos de acceso.
**Relaciones:** 1:N con Vehicle, ParkingSession, Reservation, ParkingSubscription

---

### 3. Vehicle
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID |
| user_id | TEXT FK→User | Dueño del vehículo |
| placa | TEXT UNIQUE NOT NULL | Placa guatemalteca (P-123ABC) |
| brand, model, color, year | TEXT/INT | Características del vehículo |
| is_authorized | BOOLEAN DEFAULT TRUE | Si puede entrar al campus |
| blacklisted | BOOLEAN DEFAULT FALSE | Si está en lista negra |
| blacklist_reason | TEXT | Motivo del bloqueo |

**Para qué sirve:** Registro de vehículos autorizados. La placa es el identificador único de acceso.
**Relaciones:** N:1 con User; 1:N con ParkingSession

---

### 4. ParkingSpace
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID |
| code | TEXT UNIQUE NOT NULL | Código visual (A-001, B-045, C-012) |
| campus_id | TEXT FK→Campus | Campus al que pertenece |
| zone | ENUM('A','B','C','D') | Zona del parqueo |
| type | ENUM('STANDARD','VIP','HANDICAPPED','ELECTRIC','RESERVED','TEACHER') | Tipo de espacio |
| status | ENUM('AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE') | Estado actual |
| lat, lng | FLOAT8 | Posición GPS exacta del espacio |
| last_sensor_update | TIMESTAMPTZ | Última actualización del sensor IoT |

**Para qué sirve:** Representa cada lugar físico de estacionamiento. El status cambia en tiempo real.
**Relaciones:** N:1 con Campus; 1:N con ParkingSession, Reservation

---

### 5. ParkingSession
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID (también es el ticket) |
| vehicle_id | TEXT FK→Vehicle | Vehículo estacionado |
| space_id | TEXT FK→ParkingSpace | Espacio ocupado |
| user_id | TEXT FK→User | Usuario dueño del vehículo |
| entry_time | TIMESTAMPTZ NOT NULL | Hora de entrada |
| exit_time | TIMESTAMPTZ | Hora de salida (NULL si aún está) |
| entry_method | ENUM('QR','PLATE','NFC','MANUAL','VISITOR_QR') | Cómo entró |
| status | ENUM('ACTIVE','COMPLETED','CANCELLED') | Estado de la sesión |
| duration_minutes | INT | Minutos totales de parqueo |
| amount_due | FLOAT8 | Monto a pagar en Quetzales |
| is_paid | BOOLEAN DEFAULT FALSE | Si ya pagó |

**Para qué sirve:** Registro maestro de cada estancia vehicular. Es la tabla más consultada.
**Relaciones:** N:1 con Vehicle, ParkingSpace, User; 1:1 con Payment

---

### 6. Payment
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID |
| session_id | TEXT UNIQUE FK→ParkingSession | Sesión pagada |
| user_id | TEXT FK→User | Quién pagó |
| amount | FLOAT8 NOT NULL | Monto pagado |
| payment_method | ENUM('CASH','CARD','TRANSFER','QR_CODE','MOBILE') | Método de pago |
| status | ENUM('PENDING','COMPLETED','FAILED','REFUNDED') | Estado del pago |
| paid_at | TIMESTAMPTZ | Cuándo se pagó |

**Para qué sirve:** Registro de cada transacción económica. 1:1 con ParkingSession.

---

### 7. Reservation
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID |
| user_id | TEXT FK→User | Quién reservó |
| vehicle_id | TEXT FK→Vehicle | Vehículo que usará el espacio |
| space_id | TEXT FK→ParkingSpace | Espacio reservado |
| start_time, end_time | TIMESTAMPTZ | Rango de la reserva |
| status | ENUM('PENDING','CONFIRMED','CANCELLED','EXPIRED','USED') | Estado |
| type | ENUM('STANDARD','PERSONAL','EVENT','SPECIAL_VISIT') | Tipo de reserva |

**Para qué sirve:** Permite reservar espacios con anticipación, bloqueándolos.

---

### 8. ParkingSubscription
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT (PK) | UUID |
| user_id | TEXT FK→User | Suscriptor |
| type | ENUM('MONTHLY','SEMESTER') | Tipo: mensual (Q150) o semestral (Q600) |
| status | ENUM('ACTIVE','EXPIRED','CANCELLED','PENDING') | Estado |
| start_date, end_date | TIMESTAMPTZ | Vigencia |
| amount_paid | NUMERIC(10,2) | Lo que pagó |

**Para qué sirve:** Los usuarios con suscripción activa no pagan por cada sesión.

---

### 9. Otras tablas importantes

| Tabla | Para qué sirve |
|---|---|
| AuditLog | Registro de todas las acciones del sistema (quién hizo qué y cuándo) |
| Blacklist | Lista negra de vehículos bloqueados del campus |
| BarrierLog | Historial de comandos enviados a las barreras físicas |
| VisitorQR | QR temporales para visitantes sin cuenta (expiran en 2h) |
| ParkingEvent | Eventos especiales con tarifas especiales (graduaciones, etc.) |
| Notification | Alertas al usuario (suscripción por vencer, espacio ocupado, etc.) |
| MonthlyBill | Facturación mensual consolidada por usuario |
| Camera | Cámaras del campus con reconocimiento de placas (LPR) |
| CardReplacement | Solicitudes de reemplazo de tarjeta NFC |

---

## JOINS MÁS IMPORTANTES

### JOIN 1 — Sesiones activas con datos completos (vista view_sesiones_activas)
```sql
SELECT
  s.id AS session_id,
  s.entry_time,
  EXTRACT(EPOCH FROM (NOW() - s.entry_time)) / 60 AS minutos_transcurridos,
  v.placa, v.brand, v.color,
  u.first_name || ' ' || u.last_name AS propietario,
  u.role,
  sp.code AS espacio_codigo,
  sp.zone,
  s.amount_due, s.is_paid
FROM "ParkingSession" s
JOIN "Vehicle" v ON v.id = s.vehicle_id        -- INNER JOIN: toda sesión tiene vehículo
JOIN "ParkingSpace" sp ON sp.id = s.space_id   -- INNER JOIN: toda sesión tiene espacio
LEFT JOIN "User" u ON u.id = s.user_id         -- LEFT JOIN: visitantes no tienen usuario
WHERE s.status = 'ACTIVE';
```
**Retorna:** Todos los vehículos actualmente estacionados con sus datos.
**Usado en:** `GET /api/parqueo/dashboard`, `GET /api/parqueo/sessions`
**Por qué LEFT JOIN en User:** los visitantes crean sesiones sin user_id registrado.

---

### JOIN 2 — Ingresos del día por zona (vista view_ingresos_del_dia)
```sql
SELECT
  COUNT(*) AS total_sesiones,
  COALESCE(SUM(s.amount_due), 0) AS total_ingresos,
  COALESCE(AVG(s.amount_due), 0) AS promedio_por_sesion,
  sp.zone
FROM "ParkingSession" s
JOIN "ParkingSpace" sp ON sp.id = s.space_id
WHERE s.status = 'COMPLETED'
  AND s.entry_time::DATE = CURRENT_DATE
GROUP BY sp.zone;
```
**Retorna:** Cuánto dinero generó cada zona hoy.
**Usado en:** `GET /api/parqueo/reports/daily`

---

### JOIN 3 — Usuarios con deuda pendiente (vista view_usuarios_con_deuda)
```sql
SELECT
  u.id, u.first_name || ' ' || u.last_name AS nombre,
  u.email, u.carnet, u.role,
  COUNT(s.id) AS sesiones_sin_pagar,
  COALESCE(SUM(s.amount_due), 0) AS deuda_total
FROM "User" u
JOIN "ParkingSession" s ON s.user_id = u.id   -- INNER JOIN: solo usuarios con sesiones
WHERE s.is_paid = FALSE
  AND s.status = 'COMPLETED'
  AND s.amount_due > 0
GROUP BY u.id, u.first_name, u.last_name, u.email, u.carnet, u.role
ORDER BY deuda_total DESC;
```
**Retorna:** Ranking de usuarios con más deuda acumulada.
**Usado en:** reportes de morosidad, validación de acceso

---

### JOIN 4 — Solvencia completa del parqueo (vista view_solvencia_parqueo)
```sql
SELECT
  u.carnet,
  u.first_name || ' ' || u.last_name AS nombre,
  u.role,
  COALESCE(sub.status = 'ACTIVE' AND sub.end_date > NOW(), FALSE) AS tiene_suscripcion,
  sub.end_date AS suscripcion_vence,
  COALESCE(SUM(s.amount_due), 0) AS deuda_total,
  CASE WHEN COALESCE(SUM(s.amount_due), 0) = 0 THEN TRUE ELSE FALSE END AS al_dia
FROM "User" u
LEFT JOIN "ParkingSubscription" sub ON sub.user_id = u.id
  AND sub.status = 'ACTIVE' AND sub.end_date > NOW()
LEFT JOIN "ParkingSession" s ON s.user_id = u.id
  AND s.is_paid = FALSE AND s.status = 'COMPLETED' AND s.amount_due > 0
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.carnet, u.first_name, u.last_name, u.role, sub.status, sub.type, sub.end_date;
```
**Retorna:** Estado financiero completo de cada usuario (suscripción + deuda).
**Por qué doble LEFT JOIN:** queremos TODOS los usuarios, tengan o no suscripción, tengan o no deuda.

---

### JOIN 5 — Búsqueda de usuario con vehículos y sesión activa (flujo QR scan)
```sql
SELECT u.*, v.*, s.*, sp.*
FROM "User" u
LEFT JOIN "Vehicle" v ON v.user_id = u.id
  AND v.deleted_at IS NULL AND v.is_authorized = TRUE AND v.blacklisted = FALSE
LEFT JOIN "ParkingSession" s ON s.vehicle_id = v.id AND s.status = 'ACTIVE'
LEFT JOIN "ParkingSpace" sp ON sp.id = s.space_id
WHERE u.qr_code = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE;
```
**Retorna:** Usuario + su vehículo + si está estacionado actualmente.
**Usado en:** `POST /api/parqueo/qr/scan` — la consulta más crítica del sistema.

---

### JOIN 6 — Top usuarios por uso
```sql
SELECT
  u.first_name, u.last_name, u.carnet, u.role,
  COUNT(s.id) AS total_sesiones,
  SUM(s.duration_minutes) AS total_minutos,
  SUM(s.amount_due) AS total_pagado
FROM "User" u
JOIN "ParkingSession" s ON s.user_id = u.id
WHERE s.status = 'COMPLETED'
GROUP BY u.id, u.first_name, u.last_name, u.carnet, u.role
ORDER BY COUNT(s.id) DESC
LIMIT 10;
```
**Retorna:** Los 10 usuarios que más usan el parqueo.
**Usado en:** `GET /api/parqueo/reports/top-users`

---

### JOIN 7 — Verificar overlap de reservas
```sql
SELECT COUNT(*) FROM "Reservation"
WHERE space_id = $1
  AND status IN ('CONFIRMED', 'PENDING')
  AND NOT (end_time <= $start_time OR start_time >= $end_time);
```
**Retorna:** Cuántas reservas chocan con el rango solicitado.
**Usado en:** `POST /api/parqueo/reservations` para validar antes de crear reserva.

---

### JOIN 8 — Sesiones con datos de pago
```sql
SELECT s.*, p.amount, p.payment_method, p.status AS pay_status, p.paid_at
FROM "ParkingSession" s
LEFT JOIN "Payment" p ON p.session_id = s.id
WHERE s.user_id = $1
ORDER BY s.entry_time DESC;
```
**Retorna:** Historial de parqueo con estado de pago de cada sesión.
**Usado en:** perfil de usuario, reportes individuales

---

### JOIN 9 — Espacios con última actividad
```sql
SELECT sp.*, s.entry_time, v.placa, u.first_name || ' ' || u.last_name AS conductor
FROM "ParkingSpace" sp
LEFT JOIN "ParkingSession" s ON s.space_id = sp.id AND s.status = 'ACTIVE'
LEFT JOIN "Vehicle" v ON v.id = s.vehicle_id
LEFT JOIN "User" u ON u.id = s.user_id
WHERE sp.campus_id = $1 AND sp.is_active = TRUE
ORDER BY sp.zone, sp.code;
```
**Retorna:** Todos los espacios con quién los ocupa actualmente.
**Usado en:** `GET /api/parqueo/spaces` — para el mapa en tiempo real.

---

### JOIN 10 — Facturación mensual con datos de usuario
```sql
SELECT mb.*, u.first_name, u.last_name, u.carnet, u.email
FROM "MonthlyBill" mb
JOIN "User" u ON u.id = mb.user_id
WHERE mb.year = $1 AND mb.month = $2
ORDER BY mb.total_amount DESC;
```
**Retorna:** Facturas del mes con datos del estudiante.
**Usado en:** `GET /api/parqueo/reports/monthly`

---

## VISTAS CREADAS

### view_sesiones_activas
- **SQL:** Ver JOIN #1 arriba
- **Para qué se usa:** Dashboard principal, conteo de ocupación en tiempo real
- **Qué simplifica:** Evita escribir el JOIN de 4 tablas en cada consulta del dashboard

### view_ingresos_del_dia
- **SQL:** Ver JOIN #2 arriba
- **Para qué se usa:** Reporte diario de administración
- **Qué simplifica:** Agrega automáticamente sesiones del día actual por zona

### view_ocupacion_por_zona
```sql
SELECT zone,
  COUNT(*) AS total_espacios,
  COUNT(*) FILTER (WHERE status = 'OCCUPIED') AS ocupados,
  COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS disponibles,
  ROUND(COUNT(*) FILTER (WHERE status='OCCUPIED')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS porcentaje_ocupacion
FROM "ParkingSpace"
WHERE is_active = TRUE
GROUP BY zone ORDER BY zone;
```
- **Para qué se usa:** Dashboard, reportes de capacidad
- **Qué simplifica:** Calcula el porcentaje de ocupación por zona automáticamente

### view_usuarios_con_deuda
- **SQL:** Ver JOIN #3 arriba
- **Para qué se usa:** Control de morosidad, bloqueo de acceso por deuda
- **Qué simplifica:** Agrega la deuda total de múltiples sesiones sin pagar

### view_solvencia_parqueo
- **SQL:** Ver JOIN #4 arriba
- **Para qué se usa:** Certificados de solvencia, control de acceso
- **Qué simplifica:** Combina suscripción + deuda en una sola consulta

### view_eventos_activos
```sql
SELECT e.*, u.first_name || ' ' || u.last_name AS creado_por
FROM "ParkingEvent" e
JOIN "User" u ON u.id = e.created_by_user_id
WHERE e.status IN ('ACTIVE', 'SCHEDULED')
  AND e.start_time <= NOW() AND e.end_time >= NOW();
```
- **Para qué se usa:** Aplicar tarifas especiales durante eventos (graduaciones, etc.)
- **Qué simplifica:** Filtra automáticamente solo los eventos vigentes en este momento

---

## TRIGGERS

### trigger_bloquear_acceso_sin_pago
```sql
CREATE OR REPLACE FUNCTION fn_check_deuda_before_entry() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_deuda NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount_due), 0) INTO v_deuda
  FROM "ParkingSession"
  WHERE vehicle_id = NEW.vehicle_id AND is_paid = FALSE
    AND status = 'COMPLETED' AND amount_due > 0;
  IF v_deuda > 0 THEN
    RAISE EXCEPTION 'Acceso denegado: deuda pendiente de Q%.2f', v_deuda;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_bloquear_acceso_sin_pago
  BEFORE INSERT ON "ParkingSession"
  FOR EACH ROW EXECUTE FUNCTION fn_check_deuda_before_entry();
```
- **Cuándo:** BEFORE INSERT en ParkingSession
- **Qué hace:** Calcula la deuda acumulada del vehículo. Si tiene deuda > 0, lanza excepción y BLOQUEA la entrada.
- **Por qué BEFORE:** Necesitamos impedir la inserción ANTES de que ocurra.

---

### trigger_liberar_espacio_al_salir
```sql
CREATE OR REPLACE FUNCTION fn_liberar_espacio_al_salir() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.exit_time IS NULL AND NEW.exit_time IS NOT NULL THEN
    UPDATE "ParkingSpace" SET status='AVAILABLE', updated_at=NOW() WHERE id=NEW.space_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_liberar_espacio_al_salir
  AFTER UPDATE ON "ParkingSession" FOR EACH ROW EXECUTE FUNCTION fn_liberar_espacio_al_salir();
```
- **Cuándo:** AFTER UPDATE en ParkingSession
- **Qué hace:** Cuando se registra la salida (exit_time pasa de NULL a un valor), automáticamente libera el espacio.
- **Por qué AFTER:** La sesión ya se actualizó; ahora actualizamos el espacio.

---

### trigger_expirar_reservas
```sql
CREATE OR REPLACE FUNCTION fn_liberar_espacio_reserva() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status NOT IN ('USED','CANCELLED') AND NEW.status IN ('USED','CANCELLED') THEN
    UPDATE "ParkingSpace" SET status='AVAILABLE', updated_at=NOW()
    WHERE id=NEW.space_id AND status='RESERVED';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_expirar_reservas
  AFTER UPDATE ON "Reservation" FOR EACH ROW EXECUTE FUNCTION fn_liberar_espacio_reserva();
```
- **Cuándo:** AFTER UPDATE en Reservation
- **Qué hace:** Cuando una reserva se cancela o se usa, libera el espacio automáticamente.

---

### trigger_audit_acceso
```sql
CREATE OR REPLACE FUNCTION fn_audit_vehicle_entry() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "AuditLog" (action, resource, resource_id, user_id, metadata)
  VALUES ('VEHICLE_ENTRY', 'parking_session', NEW.id, NEW.user_id,
    jsonb_build_object('vehicle_id', NEW.vehicle_id, 'space_id', NEW.space_id, 'entry_method', NEW.entry_method));
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_audit_acceso
  AFTER INSERT ON "ParkingSession" FOR EACH ROW EXECUTE FUNCTION fn_audit_vehicle_entry();
```
- **Cuándo:** AFTER INSERT en ParkingSession
- **Qué hace:** Registra automáticamente en el AuditLog cada entrada vehicular con metadatos JSON.

---

### trigger_blacklist_alerta
```sql
CREATE OR REPLACE FUNCTION fn_blacklist_alert() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.blacklisted = TRUE AND (OLD.blacklisted IS DISTINCT FROM TRUE) THEN
    INSERT INTO "AuditLog" (action, resource, resource_id, metadata)
    VALUES ('VEHICLE_BLACKLISTED', 'vehicle', NEW.id,
      jsonb_build_object('placa', NEW.placa, 'reason', NEW.blacklist_reason, 'severity', 'HIGH'));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_blacklist_alerta
  AFTER UPDATE ON "Vehicle" FOR EACH ROW EXECUTE FUNCTION fn_blacklist_alert();
```
- **Cuándo:** AFTER UPDATE en Vehicle
- **Qué hace:** Cuando un vehículo se agrega a la lista negra, registra alerta de severidad HIGH en AuditLog.

---

### trigger_suscripcion_expirada
```sql
CREATE OR REPLACE FUNCTION fn_expire_subscription() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND NEW.end_date < NOW() THEN
    NEW.status := 'EXPIRED';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_suscripcion_expirada
  BEFORE UPDATE ON "ParkingSubscription" FOR EACH ROW EXECUTE FUNCTION fn_expire_subscription();
```
- **Cuándo:** BEFORE UPDATE en ParkingSubscription
- **Qué hace:** Si se intenta actualizar una suscripción cuya fecha de vencimiento ya pasó, la marca como EXPIRED automáticamente.

---

## STORED PROCEDURES

### sp_registrar_entrada(p_vehicle_id, p_space_id, p_entry_method)
**Parámetros:** ID del vehículo, ID del espacio, método de entrada
**Retorna:** session_id, ticket_code
**Qué hace:** Versión transaccional completa de la entrada: valida vehículo, verifica deuda, verifica espacio disponible, crea sesión, ocupa espacio.
**Cuándo usarlo:** Alternativa directa a SQL cuando se necesita lógica compleja atómica.

---

### sp_registrar_salida(p_session_id)
**Parámetros:** ID de la sesión activa
**Retorna:** monto_a_cobrar, es_gratis
**Qué hace:** Calcula duración, aplica tarifa según rol (ADMIN/TEACHER=gratis, STUDENT=Q5/h, VISITOR=Q10/h), actualiza sesión como COMPLETED, libera espacio.

---

### sp_verificar_solvencia(p_carnet)
**Parámetros:** Carnet del estudiante
**Retorna:** carnet, nombre, rol, tiene_suscripcion, deuda_total, al_dia
**Qué hace:** Consulta completa de solvencia: busca usuario, verifica suscripción activa, suma deudas pendientes.

---

### sp_cerrar_mes(p_year, p_month)
**Parámetros:** Año y mes a cerrar
**Retorna:** Cantidad de facturas cerradas
**Qué hace:** Cierra todas las facturas mensuales abiertas del período indicado.

---

### sp_renovar_suscripcion(p_user_id, p_type, p_payment_ref)
**Parámetros:** ID usuario, tipo (MONTHLY/SEMESTER), referencia de pago
**Retorna:** ID de la nueva suscripción
**Qué hace:** Expira suscripción anterior, crea nueva (30 días=$150 / 180 días=$600), registra en AuditLog.

---

## FUNCIONES

### fn_calcular_tarifa(p_role, p_minutes, p_event_id DEFAULT NULL)
**Retorna:** NUMERIC (monto en Quetzales)
**Qué calcula:** Aplica la lógica de tarifas: si hay evento con FLAT_RATE → devuelve esa tarifa. Si no → calcula (minutes/60) × rate_por_rol.

### fn_espacio_disponible(p_zone DEFAULT NULL, p_space_type DEFAULT NULL)
**Retorna:** TEXT (ID del primer espacio disponible)
**Qué hace:** Busca el primer espacio disponible, opcionalmente filtrando por zona o tipo.

### fn_tiene_suscripcion_activa(p_user_id)
**Retorna:** BOOLEAN
**Qué hace:** Verifica en una sola línea si el usuario tiene suscripción vigente.

### fn_deuda_total(p_user_id)
**Retorna:** NUMERIC (suma de deudas)
**Qué hace:** Suma todas las sesiones completadas, sin pagar, con monto > 0 del usuario.

---

## ÍNDICES OPTIMIZADOS

| Tabla | Índice | Campo(s) | Por qué | Qué mejora |
|---|---|---|---|---|
| User | User_email_idx | email | Búsqueda de login | Login rápido (O(log n) vs O(n)) |
| User | User_role_idx | role | Filtros por rol | Reportes por tipo de usuario |
| User | User_carnet_idx | carnet | Búsqueda por carnet | sp_verificar_solvencia rápido |
| User | User_nfc_idx | nfc_card_id | Acceso con tarjeta NFC | Lectura de tarjeta en milisegundos |
| Vehicle | Vehicle_placa_idx | placa | Búsqueda por placa | Reconocimiento de placas (LPR) |
| Vehicle | Vehicle_user_id_idx | user_id | JOIN con User | Listado de vehículos del usuario |
| Vehicle | Vehicle_blacklisted_idx | blacklisted | Filtro lista negra | Verificación rápida en cada entrada |
| ParkingSpace | ParkingSpace_status_idx | status | Filtrar disponibles | fn_espacio_disponible en <1ms |
| ParkingSpace | ParkingSpace_zone_idx | zone | Filtrar por zona | Mapa por zona |
| ParkingSession | ParkingSession_status_idx | status | Buscar sesiones ACTIVE | La consulta más frecuente del sistema |
| ParkingSession | ParkingSession_vehicle_id_idx | vehicle_id | JOIN con Vehicle | Historial de vehículo rápido |
| ParkingSession | ParkingSession_entry_time_idx | entry_time | Reportes por fecha | Reportes diarios/mensuales |
| AuditLog | AuditLog_created_at_idx | created_at | Paginación de auditoría | Logs ordenados cronológicamente |
| Blacklist | Blacklist_vehicle_id_idx | vehicle_id | Verificación en entrada | En cada escaneo QR |
| Reservation | Reservation_start_time_idx | start_time | Búsqueda de overlap | Validación de reservas sin scan |

---

## CONSULTAS SQL CLAVE PARA EXPLICAR EN EL EXAMEN

### Query 1 — Buscar usuario para escaneo QR (más importante del sistema)
```sql
SELECT u.id, u.first_name, u.last_name, u.role, u.qr_code,
       v.id AS vehicle_id, v.placa, v.blacklisted, v.is_authorized,
       s.id AS session_id, s.status, s.entry_time, s.space_id
FROM "User" u
LEFT JOIN "Vehicle" v ON v.user_id = u.id
  AND v.deleted_at IS NULL AND v.is_authorized = TRUE AND v.blacklisted = FALSE
LEFT JOIN "ParkingSession" s ON s.vehicle_id = v.id AND s.status = 'ACTIVE'
WHERE u.qr_code = 'QR_CODE_AQUI'
  AND u.deleted_at IS NULL AND u.is_active = TRUE;
```
**Por qué:** Un LEFT JOIN en Vehicle y Session porque queremos el usuario aunque no tenga vehículo o sesión. Si session_id no es NULL → hay sesión activa → es salida. Si es NULL → es entrada.

---

### Query 2 — Calcular monto de salida
```sql
SELECT
  CEIL(EXTRACT(EPOCH FROM (NOW() - entry_time)) / 60) AS duration_minutes,
  CASE role
    WHEN 'ADMIN'    THEN 0
    WHEN 'TEACHER'  THEN 0
    WHEN 'STUDENT'  THEN ROUND((CEIL(EXTRACT(EPOCH FROM (NOW()-entry_time))/3600) * 5), 2)
    WHEN 'VISITOR'  THEN ROUND((CEIL(EXTRACT(EPOCH FROM (NOW()-entry_time))/3600) * 10), 2)
    ELSE 5
  END AS monto
FROM "ParkingSession" s
JOIN "User" u ON u.id = s.user_id
WHERE s.id = 'SESSION_ID';
```

---

### Query 3 — Ocupación actual del parqueo (para el dashboard)
```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'OCCUPIED') AS ocupados,
  COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS disponibles,
  ROUND(COUNT(*) FILTER (WHERE status='OCCUPIED')::NUMERIC / COUNT(*) * 100, 1) AS porcentaje
FROM "ParkingSpace"
WHERE is_active = TRUE;
```

---

### Query 4 — Verificar deuda antes de permitir entrada
```sql
SELECT COALESCE(SUM(amount_due), 0) AS deuda_total
FROM "ParkingSession"
WHERE vehicle_id = 'VEHICLE_ID'
  AND is_paid = FALSE
  AND status = 'COMPLETED'
  AND amount_due > 0;
-- Si deuda_total > 0 → denegar acceso
```

---

### Query 5 — Verificar suscripción activa
```sql
SELECT EXISTS (
  SELECT 1 FROM "ParkingSubscription"
  WHERE user_id = 'USER_ID'
    AND status = 'ACTIVE'
    AND end_date > NOW()
) AS tiene_suscripcion;
```

---

### Query 6 — Verificar overlap de reservas
```sql
SELECT COUNT(*) AS conflictos
FROM "Reservation"
WHERE space_id = 'SPACE_ID'
  AND status IN ('CONFIRMED', 'PENDING')
  AND NOT (end_time <= '2026-06-06 09:00' OR start_time >= '2026-06-06 11:00');
-- Si conflictos > 0 → el espacio ya está reservado en ese horario
```

---

### Query 7 — Ingresos agrupados por zona y día
```sql
SELECT
  DATE(s.entry_time) AS fecha,
  sp.zone,
  COUNT(s.id) AS sesiones,
  SUM(s.amount_due) AS ingresos,
  AVG(s.duration_minutes) AS duracion_promedio
FROM "ParkingSession" s
JOIN "ParkingSpace" sp ON sp.id = s.space_id
WHERE s.status = 'COMPLETED'
  AND s.entry_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(s.entry_time), sp.zone
ORDER BY fecha DESC, zone;
```

---

### Query 8 — Lista negra activa con datos del vehículo
```sql
SELECT b.*, v.placa, v.brand, v.color,
       u.first_name || ' ' || u.last_name AS propietario,
       admin.first_name || ' ' || admin.last_name AS agregado_por
FROM "Blacklist" b
JOIN "Vehicle" v ON v.id = b.vehicle_id
JOIN "User" u ON u.id = v.user_id
JOIN "User" admin ON admin.id = b.added_by_user_id
WHERE b.is_active = TRUE
ORDER BY b.created_at DESC;
```

---

### Query 9 — Sesiones sin pago (morosos)
```sql
SELECT u.carnet, u.first_name || ' ' || u.last_name AS nombre,
       COUNT(s.id) AS sesiones_deuda,
       SUM(s.amount_due) AS total_deuda,
       MAX(s.entry_time) AS ultima_visita
FROM "User" u
JOIN "ParkingSession" s ON s.user_id = u.id
WHERE s.is_paid = FALSE AND s.status = 'COMPLETED' AND s.amount_due > 0
GROUP BY u.id, u.carnet, u.first_name, u.last_name
ORDER BY total_deuda DESC;
```

---

### Query 10 — Renovar suscripción (SP)
```sql
-- Expirar suscripción anterior
UPDATE "ParkingSubscription" SET status='EXPIRED' WHERE user_id='U1' AND status='ACTIVE';
-- Crear nueva suscripción mensual (Q150, 30 días)
INSERT INTO "ParkingSubscription" (user_id, type, status, start_date, end_date, amount_paid)
VALUES ('U1', 'MONTHLY', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', 150.00);
-- Registrar en auditoría
INSERT INTO "AuditLog" (user_id, action, resource) VALUES ('U1', 'SUBSCRIPTION_RENEWED', 'parking_subscription');
```

---

### Query 11 — Catálogo de tablas del sistema (metadatos)
```sql
SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

---

### Query 12 — Registro histórico de auditoría
```sql
SELECT al.action, al.resource, al.created_at,
       u.first_name || ' ' || u.last_name AS usuario,
       u.role,
       al.metadata->>'vehicle_id' AS vehiculo,
       al.ip_address
FROM "AuditLog" al
LEFT JOIN "User" u ON u.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 100;
```

---

### Query 13 — Espacios disponibles por zona (para el mapa)
```sql
SELECT zone,
  COUNT(*) FILTER (WHERE status='AVAILABLE') AS disponibles,
  COUNT(*) FILTER (WHERE status='OCCUPIED') AS ocupados,
  COUNT(*) FILTER (WHERE status='RESERVED') AS reservados,
  COUNT(*) AS total
FROM "ParkingSpace"
WHERE is_active = TRUE
GROUP BY zone ORDER BY zone;
```

---

### Query 14 — Horas pico (para predicción de demanda)
```sql
SELECT
  EXTRACT(DOW FROM entry_time) AS dia_semana,   -- 0=Domingo, 1=Lunes...
  EXTRACT(HOUR FROM entry_time) AS hora,
  COUNT(*) AS entradas
FROM "ParkingSession"
WHERE entry_time >= NOW() - INTERVAL '90 days'
GROUP BY dia_semana, hora
ORDER BY dia_semana, hora;
```

---

### Query 15 — Dashboard ejecutivo completo
```sql
SELECT
  (SELECT COUNT(*) FROM "ParkingSpace" WHERE status='OCCUPIED' AND is_active=TRUE) AS ocupados,
  (SELECT COUNT(*) FROM "ParkingSpace" WHERE status='AVAILABLE' AND is_active=TRUE) AS disponibles,
  (SELECT COUNT(*) FROM "ParkingSession" WHERE status='ACTIVE') AS sesiones_activas,
  (SELECT COALESCE(SUM(amount_due),0) FROM "ParkingSession"
    WHERE status='COMPLETED' AND entry_time::DATE=CURRENT_DATE AND is_paid=TRUE) AS ingresos_hoy,
  (SELECT COUNT(*) FROM "Vehicle" WHERE blacklisted=TRUE) AS en_lista_negra,
  (SELECT COUNT(*) FROM "ParkingSubscription" WHERE status='ACTIVE' AND end_date>NOW()) AS suscripciones_activas;
```
