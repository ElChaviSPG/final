# Documento de Integración — Módulo de Pagos
## Grupo 5 (Parqueo) → Grupo 6 (Pagos)

**Fecha:** 23 de mayo de 2026  
**Versión:** 1.0  
**URL base de producción:** `https://final-blond-ten.vercel.app`

---

## 1. Contexto

El sistema de parqueo registra sesiones de estacionamiento con un monto calculado según el rol del usuario y la tarifa configurada. Cuando el monto es mayor a Q0.00, la sesión queda en estado **pendiente de pago** (`is_paid: false`).

El Grupo 6 es responsable de procesar el cobro y notificar al sistema de parqueo una vez confirmado el pago.

---

## 2. Flujo de integración

```
[Usuario sale del parqueo]
        ↓
[Sistema parqueo calcula monto_due]
        ↓
[Sesión queda ACTIVE + is_paid: false]
        ↓
[Grupo 6 recibe datos de cobro]
        ↓
[Usuario paga en sistema Grupo 6]
        ↓
[Grupo 6 llama POST /api/parqueo/payments]
        ↓
[Parqueo marca is_paid: true + libera espacio]
```

---

## 3. Obtener sesiones pendientes de pago

### `GET /api/parqueo/payments?status=PENDING`

Retorna pagos pendientes. También se puede filtrar por usuario.

**Query params opcionales:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `status` | string | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| `user_id` | UUID | Filtrar por usuario |
| `page` | int | Paginación (default: 1) |
| `limit` | int | Resultados por página (default: 20) |

**Respuesta exitosa `200`:**
```json
{
  "success": true,
  "data": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "id": "pago-uuid",
        "session_id": "sesion-uuid",
        "user_id": "usuario-uuid",
        "amount": 15.50,
        "payment_method": "MOBILE",
        "status": "PENDING",
        "transaction_reference": null,
        "paid_at": null,
        "session": {
          "id": "sesion-uuid",
          "entry_time": "2026-05-23T08:00:00Z",
          "exit_time": "2026-05-23T09:33:00Z",
          "duration_minutes": 93,
          "amount_due": 15.50,
          "space": {
            "code": "A-001",
            "zone": "A"
          },
          "vehicle": {
            "placa": "P-123ABC"
          }
        },
        "user": {
          "id": "usuario-uuid",
          "first_name": "Juan",
          "last_name": "Pérez",
          "email": "est001@uspg.edu.gt"
        }
      }
    ]
  }
}
```

---

## 4. Confirmar un pago ← **Endpoint principal**

### `POST /api/parqueo/payments`

Registra el pago de una sesión. Marca la sesión como pagada y libera el espacio de parqueo.

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `session_id` | UUID | ✅ | ID de la sesión de parqueo |
| `payment_method` | string | ✅ | Ver valores válidos abajo |
| `transaction_reference` | string | ❌ | Referencia/ID del pago en el sistema del Grupo 6 |
| `user_id` | UUID | ❌ | ID del usuario (si no se envía, se obtiene de la sesión) |

**Valores válidos para `payment_method`:**
- `CASH` — efectivo
- `CARD` — tarjeta
- `TRANSFER` — transferencia bancaria
- `QR_CODE` — pago por QR
- `MOBILE` — pago móvil

**Ejemplo de request:**
```json
{
  "session_id": "3f7a1c2d-4e5b-6789-abcd-ef0123456789",
  "payment_method": "MOBILE",
  "transaction_reference": "TXN-GRP6-20260523-00123"
}
```

**Respuesta exitosa `201`:**
```json
{
  "success": true,
  "data": {
    "id": "pago-uuid",
    "session_id": "3f7a1c2d-4e5b-6789-abcd-ef0123456789",
    "user_id": "usuario-uuid",
    "amount": 15.50,
    "payment_method": "MOBILE",
    "status": "COMPLETED",
    "transaction_reference": "TXN-GRP6-20260523-00123",
    "paid_at": "2026-05-23T10:05:00Z",
    "created_at": "2026-05-23T10:05:00Z"
  },
  "message": "Pago confirmado"
}
```

**Respuestas de error:**

| Código | Mensaje | Causa |
|---|---|---|
| `400` | `"Sesión no encontrada"` | `session_id` inválido o no existe |
| `400` | `"Ya existe un pago para esta sesión"` | La sesión ya fue pagada |
| `400` | `"La sesión aún está activa"` | El usuario no ha salido todavía |

---

## 5. Modelo de datos relevante

### Tabla `ParkingSession`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Usuario dueño del vehículo |
| `vehicle_id` | UUID | Vehículo estacionado |
| `entry_time` | DateTime | Hora de entrada |
| `exit_time` | DateTime | Hora de salida (null si sigue adentro) |
| `duration_minutes` | Int | Minutos de permanencia |
| `amount_due` | Float | Monto a cobrar en quetzales |
| `is_paid` | Boolean | `false` = pendiente de pago |
| `status` | Enum | `ACTIVE`, `COMPLETED`, `CANCELLED` |

### Tabla `Payment`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador del pago |
| `session_id` | UUID | Sesión asociada (único) |
| `user_id` | UUID | Usuario que paga |
| `amount` | Float | Monto cobrado |
| `payment_method` | Enum | Método de pago |
| `status` | Enum | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| `transaction_reference` | String | Referencia del sistema externo |
| `paid_at` | DateTime | Timestamp del pago confirmado |

---

## 6. Tarifas vigentes por rol

| Rol | Tarifa | Notas |
|---|---|---|
| `STUDENT` (Estudiante) | Q5.00/hora | Cobro por hora |
| `VISITOR` (Visitante) | Q10.00/hora | Cobro por hora |
| `TEACHER` (Catedrático) | Gratuito | Hasta 8 horas; excedente a tarifa STUDENT |
| `ADMIN` | Gratuito | Sin límite |
| `SECURITY` | Gratuito | Sin límite |

> Las tarifas son configurables por el administrador del sistema. Los montos `amount_due` devueltos en la sesión ya están calculados con la tarifa correcta.

---

## 7. Notas importantes

1. **El `session_id` lo obtiene el sistema de parqueo** al escanear el QR de salida. Si Grupo 6 necesita consultar sesiones pendientes de un usuario, usar el endpoint GET con `user_id`.

2. **El campo `amount_due` ya está calculado** — no necesitan recalcular. Solo cobrar ese monto y confirmar.

3. **`transaction_reference` es clave** para trazabilidad — enviar siempre el ID de la transacción del sistema de Grupo 6.

4. **Una sesión solo puede tener un pago** — llamar el endpoint dos veces con el mismo `session_id` retornará error.

---

## 8. Contacto técnico

**Grupo 5 — Módulo Parqueo**  
Repositorio: `g-uspg/final` (rama `parqueo`)  
