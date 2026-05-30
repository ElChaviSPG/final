# Guía de Pantallas del Sistema — Smart Parking USPG
## Qué hace cada pantalla, quién la usa y cómo funciona
### Grupo 5: Marlon Pappa & Javier Estrada

---

## MAPA GENERAL DEL SISTEMA

```
Sistema de Parqueo USPG
│
├── /login                        ← Cualquier usuario
│
├── /parqueo/                     ← Panel de administración (requiere login)
│   ├── (Dashboard)               ← ADMIN, SECURITY
│   ├── /escaner                  ← SECURITY, ADMIN
│   ├── /mapa                     ← ADMIN, SECURITY
│   ├── /sesiones                 ← ADMIN, SECURITY
│   ├── /reservas                 ← Todos los roles
│   ├── /vehiculos                ← ADMIN
│   ├── /seguridad                ← ADMIN, SECURITY
│   ├── /suscripciones            ← ADMIN
│   ├── /tarifas                  ← ADMIN
│   └── /reportes                 ← ADMIN
│
└── /kiosco/                      ← Público (sin login)
    ├── (Inicio)
    ├── /acceso                   ← Usuarios con QR o placa
    └── /buscar                   ← Consulta de vehículo por placa
```

---

## 1. LOGIN — `/login`

### ¿Para qué sirve?
Pantalla de inicio de sesión del sistema. Es la puerta de entrada a todo el panel de administración.

### ¿Quién la usa?
Cualquier usuario del sistema: administradores, guardias, docentes y estudiantes.

### ¿Qué hace exactamente?
- Muestra un formulario con campo de correo y contraseña
- Tiene un toggle para mostrar/ocultar la contraseña
- Tiene un checkbox "Recordarme"
- Tiene un detalle visual especial: los ojos del logo siguen el cursor del mouse mientras escribes
- Al hacer login, llama a `POST /api/parqueo/auth` con email y contraseña
- Si las credenciales son correctas, el servidor retorna un **Access Token JWT** (1 hora) y un **Refresh Token** (7 días)
- El token se guarda y todas las peticiones siguientes lo incluyen en el header `Authorization: Bearer TOKEN`
- Redirige automáticamente a `/parqueo` (dashboard)

### ¿Qué pasa si las credenciales son incorrectas?
Muestra un mensaje de error. El servidor verifica con `bcrypt.compare()` — si falla, responde 401.

### Credenciales de prueba:
| Usuario | Contraseña | Rol |
|---|---|---|
| admin@uspg.edu.gt | Admin2026! | Administrador |
| guardia01@uspg.edu.gt | Security2026! | Guardia |
| docente01@uspg.edu.gt | Teacher2026! | Docente |
| est001@uspg.edu.gt | Student2026! | Estudiante |

### Tablas BD involucradas:
`User` (SELECT por email, verificación de password_hash con bcrypt)

---

## 2. DASHBOARD — `/parqueo/`

### ¿Para qué sirve?
Centro de control del sistema. Muestra el estado completo del parqueo en tiempo real de un solo vistazo.

### ¿Quién la usa?
Administrador y Guardia (ADMIN, SECURITY).

### ¿Qué muestra exactamente?

#### Tarjetas de estadísticas (arriba):
| Tarjeta | Qué muestra |
|---|---|
| 🔴 Sesiones activas | Cuántos vehículos están dentro del parqueo AHORA + cuántos entraron hoy |
| 🟢 Espacios disponibles | Cuántos espacios están libres + % de ocupación total |
| 🔵 Ingresos del día | Suma de todos los pagos completados del día en Quetzales |
| ⚠️ Alertas activas | Cuántas alertas de seguridad hay + cuántos vehículos en lista negra |

#### Gráfica de tráfico por hora:
- Gráfica de área (ApexCharts) que muestra cuántas entradas hubo en cada hora del día (0-23h)
- Permite ver visualmente las horas pico (típicamente 7-9 AM y 12-2 PM)
- Se actualiza automáticamente cada 30 segundos

#### Panel de alertas de seguridad (derecha):
- Lista de alertas recientes: intentos de acceso fallidos, vehículos en blacklist detectados, accesos inusuales
- Clasificadas por severidad: CRITICAL (rojo), WARNING (amarillo), INFO (azul)

#### Tabla de actividad reciente:
- Últimas 10 sesiones (entradas y salidas) con: placa, nombre del propietario, espacio asignado, hora de entrada, tiempo transcurrido, monto y estado

#### Control de suscripciones:
- Botón para ejecutar el **job automático** de suscripciones: expira las vencidas, renueva las de auto-renovación, envía alertas a quienes vencen en 3 días

#### Resumen por zona (A, B, C, D):
- Barra de progreso por zona mostrando % de ocupación
- Verde (<60%), amarillo (60-85%), rojo (>85%)
- Número de espacios libres y ocupados por zona

### ¿Cómo se actualiza?
El dashboard hace polling a la API cada **30 segundos** con `setInterval`. No usa WebSockets.

### Endpoints que consume:
```
GET /api/parqueo/dashboard           → estadísticas generales
GET /api/parqueo/dashboard/activity  → últimas 10 sesiones
GET /api/parqueo/dashboard/alerts    → alertas de seguridad
GET /api/parqueo/dashboard/traffic   → entradas por hora
GET /api/parqueo/spaces/status       → espacios por zona
```

### Tablas BD involucradas:
`ParkingSession`, `ParkingSpace`, `Payment`, `AuditLog`, `Blacklist`
**Vistas:** `view_sesiones_activas`, `view_ocupacion_por_zona`, `view_ingresos_del_dia`

---

## 3. ESCÁNER QR — `/parqueo/escaner`

### ¿Para qué sirve?
La pantalla más importante del sistema. Desde aquí el guardia registra todas las entradas y salidas de vehículos. También genera QR para visitantes.

### ¿Quién la usa?
Guardia de seguridad (SECURITY). También puede usarla el ADMIN.

### ¿Qué tiene la pantalla?

#### Modo 1 — Escáner QR (tab principal):
- Campo de texto grande donde el guardia pega o escribe el código QR escaneado
- Botón "Procesar" que envía el QR al servidor
- El sistema detecta automáticamente si es **ENTRADA o SALIDA**:
  - Si el usuario no tiene sesión activa → **ENTRADA**: asigna espacio, crea sesión
  - Si el usuario ya tiene sesión activa → **SALIDA**: calcula monto, cierra sesión
- Muestra el resultado en una tarjeta con: nombre, placa, espacio asignado, zona, monto (si es salida)

#### Modo 2 — Búsqueda por placa:
- Input con auto-formato de placa guatemalteca (P-123ABC)
- Valida el formato letra-3números-3letras en tiempo real (verde ✓ si válido)
- Busca el vehículo por placa y muestra su estado actual

#### Modo 3 — Generar QR Visitante (modal):
- Formulario: nombre del visitante, placa del vehículo, marca/modelo/color (opcional)
- Genera QR temporal con vigencia de 2 horas
- Muestra la imagen QR en pantalla
- Opción de enviar el QR por email (campo de correo + botón "Enviar por email")
- El QR generado es de uso único (una entrada + una salida)

### ¿Qué pasa cuando se procesa un QR?

**Si es ENTRADA:**
```
QR → busca usuario → verifica blacklist → verifica deuda
→ busca espacio disponible → verifica suscripción/evento
→ INSERT ParkingSession + UPDATE ParkingSpace
→ muestra: nombre, placa, espacio (ej: A-042), zona
```

**Si es SALIDA:**
```
QR → encuentra sesión activa → calcula duración
→ aplica tarifa según rol (Q0/Q5/Q10 por hora)
→ UPDATE ParkingSession + UPDATE ParkingSpace
→ muestra: monto a cobrar, tiempo estacionado
```

### Endpoints que consume:
```
POST /api/parqueo/qr/scan        → procesar QR (entrada o salida)
POST /api/parqueo/qr/visitor     → generar QR visitante
POST /api/parqueo/qr/send-email  → enviar QR por correo
GET  /api/parqueo/vehicles?placa=→ buscar por placa
```

### Tablas BD involucradas:
`User`, `Vehicle`, `ParkingSession` (INSERT/UPDATE), `ParkingSpace` (UPDATE), `VisitorQR` (INSERT), `AuditLog` (trigger automático)

---

## 4. MAPA EN TIEMPO REAL — `/parqueo/mapa`

### ¿Para qué sirve?
Visualización en tiempo real de los 500 espacios del parqueo. Muestra qué espacios están libres, ocupados o reservados con colores.

### ¿Quién la usa?
Administrador y Guardia. También puede ser proyectada en pantallas del campus.

### ¿Qué muestra?
- Mapa visual interactivo del campus USPG con todos los espacios representados como rectángulos/cuadros
- Cada espacio tiene su código (A-001, B-045, etc.) y un color según su estado:
  - 🟢 **Verde** → AVAILABLE (disponible)
  - 🔴 **Rojo** → OCCUPIED (ocupado)
  - 🟡 **Amarillo** → RESERVED (reservado)
  - ⚫ **Gris** → MAINTENANCE (en mantenimiento)
- Al hacer clic en un espacio ocupado → muestra quién está estacionado (placa, nombre, hora de entrada)
- Filtros por zona (A, B, C, D) y por estado
- Contador en tiempo real: X disponibles / Y ocupados / Z reservados

### ¿Cómo se actualiza en "tiempo real"?
El mapa hace polling HTTP cada **3 segundos**:
```javascript
setInterval(() => {
  GET /api/parqueo/spaces  // trae todos los espacios con su status actual
}, 3000)
```
Los sensores IoT (ESP32) actualizan el campo `status` en `ParkingSpace`. En máximo 3 segundos, el mapa refleja el cambio.

### Integración IoT:
Cuando el sensor HC-SR04 detecta un vehículo:
```
ESP32 → POST /api/parqueo/spaces/sensor
        { space_code: "A-042", status: "OCCUPIED" }
→ UPDATE ParkingSpace SET status='OCCUPIED', last_sensor_update=NOW()
→ en el próximo polling (máx 3s) el mapa lo muestra en rojo
```

### Endpoints que consume:
```
GET /api/parqueo/spaces              → todos los espacios con status
POST /api/parqueo/spaces/sensor      → recibe señal del ESP32
```

### Tablas BD involucradas:
`ParkingSpace` (SELECT y UPDATE), `ParkingSession` (JOIN para ver quién ocupa el espacio)

---

## 5. SESIONES — `/parqueo/sesiones`

### ¿Para qué sirve?
Historial completo de todas las sesiones de parqueo. Permite buscar, filtrar y ver el detalle de cualquier estancia vehicular.

### ¿Quién la usa?
Administrador y Guardia.

### ¿Qué muestra?
- Tabla con todas las sesiones: placa, propietario, espacio, zona, hora entrada, hora salida, duración, monto, estado (ACTIVE/COMPLETED/CANCELLED), si está pagado
- Filtros: por estado, por fecha, por zona, por placa
- Las sesiones ACTIVE se muestran primero (vehículos que están adentro ahora)
- Badge de color por estado: verde=ACTIVE, gris=COMPLETED, rojo=CANCELLED
- Indicador de pago: ✓ pagado / pendiente
- Se puede ver el detalle de cada sesión haciendo clic

### ¿Qué datos muestra en el detalle de una sesión?
- Información del vehículo (placa, marca, color)
- Información del usuario (nombre, carnet, rol)
- Espacio asignado y zona
- Tiempo exacto de entrada y salida
- Duración en minutos
- Monto calculado y método de pago
- Método de entrada (QR, NFC, PLATE, MANUAL, VISITOR_QR)

### Endpoints que consume:
```
GET /api/parqueo/sessions?status=ACTIVE&zone=A&date=2026-05-23
```

### Tablas BD involucradas:
`ParkingSession` (SELECT con filtros), `Vehicle` (JOIN), `User` (JOIN), `ParkingSpace` (JOIN), `Payment` (LEFT JOIN)
**Vista:** `view_sesiones_activas` para las sesiones activas

---

## 6. RESERVAS — `/parqueo/reservas`

### ¿Para qué sirve?
Permite a los usuarios reservar un espacio de parqueo con anticipación, asegurando que tendrán lugar disponible a la hora que lleguen.

### ¿Quién la usa?
Todos los roles autenticados (ADMIN, SECURITY, TEACHER, STUDENT). Los visitantes no tienen cuenta, así que no pueden reservar.

### ¿Qué tiene la pantalla?

#### Lista de reservas propias:
- Tabla con las reservas del usuario: espacio, zona, fecha, horario, estado (PENDING/CONFIRMED/CANCELLED/USED)
- Botón para cancelar reservas pendientes o confirmadas

#### Formulario de nueva reserva:
- Selector visual del campus (mapa CampusMapPicker) donde se elige la zona y el espacio específico
- Selector de fecha y hora de inicio y fin
- Campo de notas opcionales
- El sistema verifica automáticamente si hay conflicto de horario antes de confirmar

#### Proceso de reserva:
```
Usuario selecciona espacio + horario
→ POST /api/parqueo/reservations
→ BD verifica que no haya overlap (otra reserva en ese espacio y rango)
→ INSERT Reservation status=CONFIRMED
→ UPDATE ParkingSpace status=RESERVED
→ Opcionalmente envía confirmación por email
```

#### Al llegar el día de la reserva:
```
Usuario llega y el guardia escanea su QR
→ El sistema detecta que hay una reserva activa
→ Registra la sesión normalmente
→ UPDATE Reservation status=USED
→ Trigger libera el estado RESERVED del espacio (ya pasa a OCCUPIED)
```

### Endpoints que consume:
```
GET  /api/parqueo/reservations       → mis reservas
POST /api/parqueo/reservations       → crear nueva reserva
POST /api/parqueo/reservations/[id]/cancel → cancelar
GET  /api/parqueo/spaces             → espacios disponibles para el mapa
```

### Tablas BD involucradas:
`Reservation` (INSERT, UPDATE, SELECT), `ParkingSpace` (UPDATE status), `User`, `Vehicle`
**Trigger:** `trigger_expirar_reservas` libera el espacio al cancelar

---

## 7. VEHÍCULOS — `/parqueo/vehiculos`

### ¿Para qué sirve?
Gestión completa de los vehículos registrados en el sistema. Permite ver, buscar, agregar y bloquear vehículos.

### ¿Quién la usa?
Administrador (ADMIN).

### ¿Qué muestra?
- Tabla de todos los vehículos registrados con: placa, marca, modelo, color, año, propietario, estado (autorizado/blacklisted)
- Buscador por placa o por nombre del propietario
- Filtro por estado (todos / autorizados / en blacklist)
- Badge visual: verde = autorizado, rojo = en lista negra

### Acciones disponibles:
- **Ver detalle**: historial de sesiones del vehículo, cuántas veces ha entrado, monto total pagado
- **Agregar vehículo**: registrar manualmente placa + datos del vehículo + seleccionar propietario
- **Bloquear / Desbloquear**: marcar vehículo como blacklisted con un motivo. Al bloquearlo:
  - `Vehicle.blacklisted = TRUE`
  - El trigger `trigger_blacklist_alerta` registra alerta HIGH en AuditLog automáticamente
  - La próxima vez que ese vehículo intente entrar → bloqueado automáticamente
- **Soft delete**: eliminar vehículo (no se borra físicamente, se pone `deleted_at = now`)

### Endpoints que consume:
```
GET    /api/parqueo/vehicles          → lista con filtros
POST   /api/parqueo/vehicles          → registrar nuevo vehículo
PATCH  /api/parqueo/vehicles/[id]     → modificar / bloquear
```

### Tablas BD involucradas:
`Vehicle` (CRUD), `User` (JOIN propietario), `ParkingSession` (historial), `Blacklist`
**Trigger:** `trigger_blacklist_alerta` al activar blacklisted=TRUE

---

## 8. SEGURIDAD — `/parqueo/seguridad`

### ¿Para qué sirve?
Panel de seguridad con tres secciones: lista negra de vehículos, log de auditoría del sistema y actividad sospechosa detectada.

### ¿Quién la usa?
Administrador y Guardia (ADMIN, SECURITY).

### Sección 1 — Lista Negra (Blacklist):
- Tabla de todos los vehículos bloqueados: placa, motivo, fecha de bloqueo, quién lo bloqueó, estado (activo/removido)
- Botón para agregar un nuevo vehículo a la lista negra (placa + motivo)
- Botón para remover de la lista negra (desbloquear) con registro de quién lo removió y cuándo

### Sección 2 — Log de Auditoría:
- Registro cronológico de TODAS las acciones del sistema
- Cada fila: acción realizada, recurso afectado, usuario responsable, IP, fecha y hora, metadata adicional
- Acciones más frecuentes: VEHICLE_ENTRY, VEHICLE_EXIT, VEHICLE_BLACKLISTED, SUBSCRIPTION_RENEWED, LOGIN_FAILED
- No se puede modificar ni borrar (el trigger lo escribe directamente en BD, sin pasar por la app)
- Filtros por tipo de acción y por rango de fechas

### Sección 3 — Actividad Sospechosa:
- Detecta patrones anómalos: múltiples intentos fallidos de login desde misma IP, vehículos que intentaron entrar estando en blacklist, sesiones con duración inusualmente larga
- Clasificadas por severidad (CRITICAL, WARNING, INFO)

### Endpoints que consume:
```
GET  /api/parqueo/security/blacklist      → lista negra
POST /api/parqueo/security/blacklist      → agregar a blacklist
PATCH /api/parqueo/security/blacklist/[id]→ remover de blacklist
GET  /api/parqueo/security/audit         → log de auditoría
GET  /api/parqueo/security/suspicious    → actividad sospechosa
GET  /api/parqueo/security/failed-attempts → intentos fallidos
```

### Tablas BD involucradas:
`Blacklist` (CRUD), `Vehicle` (UPDATE blacklisted), `AuditLog` (SELECT — solo lectura)
**Trigger:** `trigger_blacklist_alerta` y `trigger_audit_acceso` escriben automáticamente

---

## 9. SUSCRIPCIONES — `/parqueo/suscripciones`

### ¿Para qué sirve?
Gestión de los abonos de parqueo. Los usuarios con suscripción activa no pagan por cada sesión.

### ¿Quién la usa?
Administrador (para ver todas las suscripciones y crear nuevas). Estudiantes y docentes (para ver la suya propia y renovar).

### ¿Qué muestra?
- Tabla de todas las suscripciones activas y vencidas: usuario, tipo, fecha de inicio, fecha de vencimiento, monto pagado, estado
- Indicador visual: verde=ACTIVE, gris=EXPIRED, naranja=CANCELLED, amarillo=PENDING
- Cuántos días le quedan a cada suscripción

### Tipos de suscripción:
| Tipo | Duración | Costo | Beneficio |
|---|---|---|---|
| MONTHLY | 30 días | Q150 | Parqueo gratis ilimitado por 1 mes |
| SEMESTER | 180 días | Q600 | Parqueo gratis ilimitado por 6 meses |

### Acciones disponibles:
- **Nueva suscripción**: seleccionar usuario + tipo + referencia de pago → llama al SP `sp_renovar_suscripcion`
- **Renovar**: expira la suscripción actual e inicia una nueva desde hoy
- **Cancelar**: marca la suscripción como CANCELLED

### ¿Cómo afecta al escaneo QR?
Cuando el guardia escanea el QR de un usuario con suscripción ACTIVE:
```
fn_tiene_suscripcion_activa(user_id) → TRUE
→ amount_due = 0, is_paid = TRUE
→ El usuario entra y sale gratis, sin cobro
```

### Endpoints que consume:
```
GET  /api/parqueo/subscriptions        → todas las suscripciones
POST /api/parqueo/subscriptions        → crear/renovar suscripción
```

### Tablas BD involucradas:
`ParkingSubscription` (CRUD)
**SP:** `sp_renovar_suscripcion(user_id, type, payment_ref)`
**Función:** `fn_tiene_suscripcion_activa(user_id)`
**Trigger:** `trigger_suscripcion_expirada` marca automáticamente como EXPIRED si end_date < NOW

---

## 10. TARIFAS — `/parqueo/tarifas`

### ¿Para qué sirve?
Configuración de las tarifas de cobro por hora según el rol del usuario. El administrador puede cambiarlas sin tocar el código.

### ¿Quién la usa?
Solo el Administrador (ADMIN). Es la pantalla más restringida del sistema.

### ¿Qué muestra?
- Tabla de tarifas por rol: ADMIN, SECURITY, TEACHER, STUDENT, VISITOR
- Para cada rol: tarifa por hora en Quetzales, si es gratuito, máximo de horas gratuitas
- Formulario para editar la tarifa de cada rol
- Vista previa del cálculo: "Si un STUDENT está 2h 30min = Q12.50"

### Tarifas por defecto:
| Rol | Tarifa | Observación |
|---|---|---|
| ADMIN | Q0/hora | Siempre gratis |
| SECURITY | Q0/hora | Siempre gratis |
| TEACHER | Q0/hora | Gratis hasta 8 horas; excedente cobra tarifa de STUDENT |
| STUDENT | Q5/hora | Tarifa estándar |
| VISITOR | Q10/hora | Tarifa más alta (sin cuenta registrada) |

### ¿Cómo afecta al sistema?
Al modificar una tarifa, la próxima sesión que cierre usará el nuevo valor. Las sesiones ya cerradas no cambian retroactivamente.

### Endpoints que consume:
```
GET   /api/parqueo/tariffs         → tarifas actuales
PATCH /api/parqueo/tariffs/[role]  → modificar tarifa de un rol
```

### Tablas BD involucradas:
`TariffConfig` (SELECT, UPDATE)
**Función:** `fn_calcular_tarifa(role, minutes, event_id)` usa estas tarifas

---

## 11. REPORTES — `/parqueo/reportes`

### ¿Para qué sirve?
Generación de reportes administrativos para tomar decisiones: ingresos, ocupación, usuarios frecuentes, predicción de demanda.

### ¿Quién la usa?
Solo el Administrador (ADMIN). También puede acceder la Lic. Rocío Linares como enlace USPG.

### Tipos de reportes disponibles:

#### 1. Ocupación actual:
- Gráfica de barras con % de ocupación por zona en este momento
- Datos de `view_ocupacion_por_zona`

#### 2. Reporte diario:
- Seleccionas una fecha → muestra: total de sesiones, ingresos totales, duración promedio por zona
- Útil para comparar días de semana vs fin de semana
- Usa `view_ingresos_del_dia`

#### 3. Reporte mensual:
- Seleccionas mes y año → muestra la facturación consolidada de cada usuario
- Total de sesiones, minutos y monto por estudiante/docente
- Tabla `MonthlyBill`

#### 4. Ingresos por período:
- Gráfica de línea con los ingresos día a día del último mes o semestre
- Permite ver tendencias y picos de ingreso

#### 5. Top 10 usuarios:
- Ranking de usuarios que más usan el parqueo: nombre, carnet, cantidad de sesiones, total pagado
- Útil para identificar quiénes podrían beneficiarse de una suscripción

#### 6. Predicción de demanda:
- Analiza patrones históricos de `ParkingSession.entry_time`
- Agrupa por día de semana y hora del día
- Muestra un mapa de calor: qué días/horas son más concurridos
- Ejemplo: "Los lunes a las 8 AM tienen el 87% de ocupación histórica"

#### 7. Exportar a CSV:
- Descarga directamente un archivo CSV con todas las sesiones del período seleccionado
- Útil para importar en Excel o Google Sheets para análisis adicional

### Endpoints que consume:
```
GET /api/parqueo/reports/occupancy   → ocupación por zona
GET /api/parqueo/reports/daily       → reporte del día
GET /api/parqueo/reports/monthly     → facturación mensual
GET /api/parqueo/reports/revenue     → ingresos por período
GET /api/parqueo/reports/top-users   → usuarios frecuentes
GET /api/parqueo/reports/prediction  → predicción de demanda
GET /api/parqueo/reports/export      → CSV descargable
```

### Tablas BD involucradas:
`ParkingSession`, `ParkingSpace`, `User`, `MonthlyBill`, `Payment`
**Vistas:** `view_ingresos_del_dia`, `view_ocupacion_por_zona`, `view_usuarios_con_deuda`

---

## 12. KIOSCO — `/kiosco/`

### ¿Para qué sirve?
Pantallas de autoservicio **públicas** (sin necesidad de login). Pensadas para una pantalla táctil instalada en la entrada del campus o en el parqueo mismo.

### ¿Quién la usa?
Cualquier persona — estudiantes, docentes, visitantes. Sin autenticación.

### Sub-pantallas del kiosco:

#### 12a. Inicio del kiosco — `/kiosco/`
- Pantalla de bienvenida con el logo "PARQUEO USPG"
- Dos botones grandes:
  - **"Acceder al parqueo"** → va a `/kiosco/acceso`
  - **"Buscar mi vehículo"** → va a `/kiosco/buscar`

#### 12b. Acceso al parqueo — `/kiosco/acceso`
- El usuario escanea su QR o ingresa su código manualmente
- El sistema procesa la entrada o salida (mismo endpoint `POST /api/parqueo/qr/scan`)
- Si es **salida con cobro pendiente**, el kiosco muestra el monto y un panel de pago:
  - Selección de método: Efectivo, Tarjeta, Transferencia, QR/Billetera
  - Si elige Tarjeta: campo para ingresar número de tarjeta con detección automática de VISA/MASTERCARD/AMEX
  - Botón "Confirmar pago" → llama a `POST /api/parqueo/payments`
- Si la salida es gratuita (suscripción activa, admin, docente) → muestra confirmación inmediata

#### 12c. Buscar vehículo — `/kiosco/buscar`
- Campo de búsqueda con auto-formato de placa guatemalteca
- Muestra el estado del vehículo:
  - Si está estacionado: en qué espacio, zona, desde qué hora, cuánto tiempo lleva
  - Si no está: "Vehículo no encontrado en el parqueo actualmente"
- Útil para que alguien verifique si su vehículo sigue adentro sin tener que ir al panel de admin

### Endpoints que consume:
```
POST /api/parqueo/qr/scan            → procesar entrada/salida
POST /api/parqueo/payments           → confirmar pago
GET  /api/parqueo/vehicles?placa=    → buscar por placa
```

### Tablas BD involucradas:
`User`, `Vehicle`, `ParkingSession`, `ParkingSpace`, `Payment`, `VisitorQR`

---

## RESUMEN RÁPIDO — UNA LÍNEA POR PANTALLA

| Pantalla | URL | En una línea |
|---|---|---|
| Login | `/login` | Autenticación con email/contraseña → genera JWT |
| Dashboard | `/parqueo/` | Vista general: sesiones activas, ingresos del día, alertas, gráfica por hora |
| Escáner QR | `/parqueo/escaner` | Registra entradas y salidas escaneando QR; genera QR para visitantes |
| Mapa | `/parqueo/mapa` | Mapa visual de 500 espacios actualizado cada 3 segundos |
| Sesiones | `/parqueo/sesiones` | Historial completo de todas las estancias vehiculares con filtros |
| Reservas | `/parqueo/reservas` | Reserva anticipada de espacios con verificación de disponibilidad |
| Vehículos | `/parqueo/vehiculos` | Registro y gestión de vehículos: agregar, bloquear, ver historial |
| Seguridad | `/parqueo/seguridad` | Lista negra, log de auditoría y actividad sospechosa |
| Suscripciones | `/parqueo/suscripciones` | Abonos mensuales (Q150) y semestrales (Q600) para acceso gratis |
| Tarifas | `/parqueo/tarifas` | Configuración de precios por rol (STUDENT=Q5/h, VISITOR=Q10/h) |
| Reportes | `/parqueo/reportes` | Ingresos, ocupación, top usuarios, predicción de demanda, exportar CSV |
| Kiosco inicio | `/kiosco/` | Pantalla pública de bienvenida (sin login) |
| Kiosco acceso | `/kiosco/acceso` | Autoservicio: escanear QR y pagar desde pantalla táctil |
| Kiosco búsqueda | `/kiosco/buscar` | Consultar si un vehículo está en el parqueo por placa |
