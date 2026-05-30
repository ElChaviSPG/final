# Modelo de Base de Datos — Smart Parking USPG
## Grupo 5 — Módulo Parqueo

**Fecha:** 23 de mayo de 2026  
**Motor:** PostgreSQL  
**ORM:** Prisma

---

## Diagrama de Relaciones (ERD)

```
User ──────────────────┬──── Vehicle ────────── ParkingSession ──── Payment
 │                     │          │                    │
 ├── Reservation ───────┘          └── Blacklist       └── ParkingSpace ── Campus
 ├── Notification                                           │
 ├── AuditLog                      Reservation ────────────┘
 ├── VisitorQR
 ├── ParkingSubscription
 ├── ParkingEvent
 ├── MonthlyBill
 └── BarrierLog
```

---

## Tablas


### `Vehicle` — Vehículos registrados

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → User) | Dueño del vehículo |
| `placa` | String (unique) | Placa del vehículo |
| `brand` | String? | Marca |
| `model` | String? | Modelo |
| `color` | String? | Color |
| `year` | Int? | Año |
| `is_authorized` | Boolean | Si tiene autorización para ingresar |
| `blacklisted` | Boolean | Si está en lista negra |
| `blacklist_reason` | String? | Razón de blacklist |
| `created_at` | DateTime | Fecha de creación |
| `deleted_at` | DateTime? | Soft delete |

---

### `ParkingSpace` — Espacios de parqueo

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `code` | String (unique) | Código del espacio (ej: A-001) |
| `campus_id` | UUID (FK → Campus) | Campus al que pertenece |
| `zone` | Enum | `A`, `B`, `C`, `D` |
| `floor` | Int | Nivel/piso (0 = planta baja) |
| `type` | Enum | `STANDARD`, `VIP`, `HANDICAPPED`, `ELECTRIC`, `RESERVED`, `TEACHER` |
| `status` | Enum | `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE` |
| `is_active` | Boolean | Si está habilitado |
| `lat` | Float? | Latitud GPS |
| `lng` | Float? | Longitud GPS |
| `last_sensor_update` | DateTime? | Última actualización por sensor IoT |

---

### `ParkingSession` — Sesiones de parqueo ⭐

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `vehicle_id` | UUID (FK → Vehicle) | Vehículo estacionado |
| `space_id` | UUID (FK → ParkingSpace) | Espacio ocupado |
| `user_id` | UUID? (FK → User) | Usuario dueño |
| `entry_time` | DateTime | Hora de entrada |
| `exit_time` | DateTime? | Hora de salida |
| `entry_method` | Enum | `QR`, `PLATE`, `NFC`, `MANUAL`, `VISITOR_QR` |
| `status` | Enum | `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `duration_minutes` | Int? | Duración en minutos |
| `amount_due` | Float? | **Monto a cobrar (quetzales)** |
| `is_paid` | Boolean | `false` = pendiente de pago |
| `notes` | String? | Notas adicionales |
| `created_at` | DateTime | Fecha de creación |

---

### `Payment` — Pagos ⭐

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `session_id` | UUID (FK → ParkingSession, unique) | Sesión pagada |
| `user_id` | UUID (FK → User) | Usuario que paga |
| `amount` | Float | Monto cobrado |
| `payment_method` | Enum | `CASH`, `CARD`, `TRANSFER`, `QR_CODE`, `MOBILE` |
| `status` | Enum | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| `transaction_reference` | String? | Referencia del sistema externo |
| `paid_at` | DateTime? | Timestamp del pago |
| `created_at` | DateTime | Fecha de creación |

---

### `Reservation` — Reservas de espacios

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → User) | Usuario que reserva |
| `vehicle_id` | UUID? (FK → Vehicle) | Vehículo asociado |
| `space_id` | UUID (FK → ParkingSpace) | Espacio reservado |
| `start_time` | DateTime | Inicio de la reserva |
| `end_time` | DateTime | Fin de la reserva |
| `status` | Enum | `PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `USED` |
| `type` | Enum | `STANDARD`, `PERSONAL`, `EVENT`, `SPECIAL_VISIT` |
| `notes` | String? | Notas |
| `created_at` | DateTime | Fecha de creación |

---

### `VisitorQR` — QR temporales para visitantes

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `qr_code` | String (unique) | Código QR generado |
| `generated_by_user_id` | UUID (FK → User) | Guardia que lo generó |
| `visitor_name` | String | Nombre del visitante |
| `vehicle_plate` | String | Placa del vehículo visitante |
| `purpose` | String? | Propósito de la visita |
| `expires_at` | DateTime | Expiración (2 horas desde generación) |
| `is_used` | Boolean | Si ya fue escaneado |
| `used_at` | DateTime? | Cuándo fue usado |
| `session_id` | UUID? (FK → ParkingSession) | Sesión generada al entrar |

---

### `ParkingSubscription` — Suscripciones mensuales/semestrales

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → User) | Usuario suscrito |
| `type` | Enum | `MONTHLY`, `SEMESTER` |
| `status` | Enum | `ACTIVE`, `EXPIRED`, `CANCELLED`, `PENDING` |
| `start_date` | DateTime | Inicio de suscripción |
| `end_date` | DateTime | Fin de suscripción |
| `amount_paid` | Decimal | Monto pagado |
| `payment_reference` | String? | Referencia de pago |
| `auto_renew` | Boolean | Renovación automática |

---

### `ParkingEvent` — Eventos especiales en el campus

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `name` | String | Nombre del evento |
| `event_date` | DateTime | Fecha del evento |
| `start_time` | DateTime | Hora de inicio |
| `end_time` | DateTime | Hora de fin |
| `tariff_mode` | Enum | `HOURLY`, `FLAT_RATE` |
| `flat_rate` | Decimal? | Tarifa fija (si aplica) |
| `affected_zones` | String | Zonas afectadas |
| `status` | Enum | `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |

---

### `TariffConfig` — Tarifas por rol (editables)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `role` | Enum (unique) | Rol al que aplica |
| `hourly_rate` | Decimal | Tarifa por hora en quetzales |
| `is_free` | Boolean | Si es gratuito |
| `max_free_hours` | Int? | Horas gratuitas máximas (TEACHER = 8) |

**Valores actuales:**

| Rol | Tarifa | Gratis |
|---|---|---|
| `ADMIN` | Q0/h | Sí |
| `SECURITY` | Q0/h | Sí |
| `TEACHER` | Q0/h | Sí (hasta 8h; excedente a Q5/h) |
| `STUDENT` | Q5/h | No |
| `VISITOR` | Q10/h | No |

---

### `MonthlyBill` — Facturas mensuales

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → User) | Usuario |
| `month` | Int | Mes (1-12) |
| `year` | Int | Año |
| `total_sessions` | Int | Total de sesiones en el mes |
| `total_minutes` | Int | Total de minutos estacionado |
| `total_amount` | Decimal | Total a pagar |
| `status` | Enum | `OPEN`, `CLOSED`, `PAID`, `OVERDUE` |
| `due_date` | DateTime | Fecha límite de pago |
| `paid_at` | DateTime? | Fecha de pago |

---

### `AuditLog` — Registro de auditoría

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID? (FK → User) | Usuario que ejecutó la acción |
| `action` | String | Acción realizada |
| `resource` | String? | Recurso afectado |
| `resource_id` | String? | ID del recurso |
| `metadata` | JSON? | Datos adicionales |
| `ip_address` | String? | IP de origen |
| `created_at` | DateTime | Timestamp |

---

### `Blacklist` — Lista negra de vehículos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `vehicle_id` | UUID (FK → Vehicle) | Vehículo bloqueado |
| `reason` | String | Motivo |
| `added_by_user_id` | UUID (FK → User) | Admin que lo agregó |
| `is_active` | Boolean | Si sigue activo |
| `removed_at` | DateTime? | Cuándo fue removido |

---

### `Campus` — Campus universitario

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `name` | String | Nombre del campus |
| `address` | String | Dirección |
| `lat` | Float | Latitud |
| `lng` | Float | Longitud |
| `total_spaces` | Int | Total de espacios |

---

### `Notification` — Notificaciones del sistema

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID? (FK → User) | Destinatario |
| `type` | Enum | `PARKING_FULL`, `VISITOR_EXPIRING`, `OVERSTAY`, `PAYMENT_REQUIRED`, etc. |
| `title` | String | Título |
| `message` | String | Contenido |
| `is_read` | Boolean | Si fue leída |
| `metadata` | JSON? | Datos adicionales |

---

### `CardReplacement` — Reposición de tarjetas NFC

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → User) | Usuario solicitante |
| `old_nfc_token` | String? | Token anterior |
| `new_nfc_token` | String? | Token nuevo |
| `reason` | Enum | `LOST`, `DAMAGED`, `STOLEN`, `REASSIGNMENT` |
| `replacement_fee` | Decimal | Costo de reposición (Q50 default) |
| `fee_paid` | Boolean | Si ya pagó la reposición |

---

### `BarrierLog` — Log de apertura/cierre de barreras

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `barrier_id` | String | ID de la barrera física |
| `action` | Enum | `OPEN`, `CLOSE`, `BLOCK`, `ERROR` |
| `trigger_source` | Enum | `QR`, `PLATE`, `NFC`, `MANUAL`, `SYSTEM`, `PAYMENT` |
| `operator_id` | UUID? (FK → User) | Operador que lo activó |
| `session_id` | String? | Sesión relacionada |

---

## Relaciones principales

| Tabla origen | Campo | Tabla destino | Tipo |
|---|---|---|---|
| `Vehicle` | `user_id` | `User` | N:1 |
| `ParkingSession` | `vehicle_id` | `Vehicle` | N:1 |
| `ParkingSession` | `space_id` | `ParkingSpace` | N:1 |
| `ParkingSession` | `user_id` | `User` | N:1 |
| `Payment` | `session_id` | `ParkingSession` | 1:1 |
| `Payment` | `user_id` | `User` | N:1 |
| `Reservation` | `user_id` | `User` | N:1 |
| `Reservation` | `space_id` | `ParkingSpace` | N:1 |
| `ParkingSpace` | `campus_id` | `Campus` | N:1 |
| `VisitorQR` | `session_id` | `ParkingSession` | 1:1 |
| `ParkingSubscription` | `user_id` | `User` | N:1 |
| `MonthlyBill` | `user_id` | `User` | N:1 |

---

## Contacto técnico


