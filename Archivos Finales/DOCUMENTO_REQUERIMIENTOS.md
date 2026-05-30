# Documento de Requerimientos de Software
## Sistema de Gestión de Parqueo — Smart Parking USPG
### Universidad San Pablo Guatemala — Proyecto Integrador Grupo 5

---

| Campo | Detalle |
|---|---|
| **Proyecto** | Sistema de Gestión de Parqueo USPG |
| **Versión** | 1.0 |
| **Fecha** | Mayo 2026 |
| **Autores** | Marlon Pappa, Javier Estrada |
| **Catedrática** | Lic. Claudia Alegre |
| **Curso** | Ingeniería de Software |
| **Enlace USPG** | Lic. Rocío Linares — Gerente Administrativa |

---

## 1. INTRODUCCIÓN

### 1.1 Propósito

Este documento describe los requerimientos funcionales y no funcionales del Sistema de Gestión de Parqueo de la Universidad San Pablo Guatemala (USPG). Está redactado siguiendo el estándar IEEE 830 para especificación de requerimientos de software (SRS).

### 1.2 Alcance

El sistema cubre el control de acceso vehicular al campus de la USPG, la gestión en tiempo real de 500 espacios de parqueo distribuidos en 4 zonas (A, B, C, D), el cobro automático de tarifas según el rol del usuario, la generación de reportes administrativos y la integración con sensores IoT (ESP32) para actualización de estados.

### 1.3 Definiciones y acrónimos

| Término | Definición |
|---|---|
| QR | Código de respuesta rápida usado para identificar usuarios |
| NFC | Near Field Communication — tecnología de tarjetas de proximidad |
| ESP32 | Microcontrolador WiFi usado como sensor IoT en los espacios |
| JWT | JSON Web Token — mecanismo de autenticación sin estado |
| LPR | License Plate Recognition — reconocimiento automático de placas |
| Sesión | Registro de una estancia vehicular desde entrada hasta salida |
| Suscripción | Abono mensual o semestral que exime al usuario del cobro por sesión |
| Zona | Sección del parqueo identificada con una letra (A, B, C, D) |
| Solvencia | Estado del usuario sin deudas pendientes de parqueo |

### 1.4 Referencias

- Sommerville, I. (2011). *Ingeniería de Software* (9ª ed.). Pearson.
- Pressman, R. (2010). *Ingeniería del Software: Un Enfoque Práctico* (7ª ed.). McGraw-Hill.
- IEEE Std 830-1998. *IEEE Recommended Practice for Software Requirements Specifications*.
- ISO/IEC 27001:2022. *Information Security Management Systems*.

### 1.5 Visión general del documento

La sección 2 describe el contexto del sistema. La sección 3 lista los requerimientos funcionales. La sección 4 lista los requerimientos no funcionales. La sección 5 describe las restricciones del sistema.

---

## 2. DESCRIPCIÓN GENERAL DEL SISTEMA

### 2.1 Perspectiva del producto

El Sistema de Gestión de Parqueo es un módulo del Proyecto Integrador de la USPG. Opera como una aplicación web completa (Next.js 16 + PostgreSQL 16) accesible desde cualquier navegador, con una interfaz de administración para el personal del campus y un kiosco público para consultas sin autenticación.

### 2.2 Funciones principales del producto

- Control de acceso vehicular mediante QR, NFC o tarjeta
- Gestión en tiempo real del estado de 500 espacios de parqueo
- Cobro automático de tarifas diferenciadas por rol de usuario
- Sistema de reservas anticipadas de espacios
- Suscripciones mensuales y semestrales
- Integración con sensores IoT (ESP32) para detección de ocupación
- Generación de reportes de ingresos, ocupación y morosidad
- Auditoría completa de accesos y acciones del sistema

### 2.3 Usuarios del sistema (Actores)

| Actor | Descripción | Acceso |
|---|---|---|
| **Administrador** | Personal de administración del campus | Total — gestión completa del sistema |
| **Guardia (Security)** | Personal de seguridad en casetas | Escáner QR, lista negra, auditoría |
| **Docente (Teacher)** | Profesores del campus | Reservas, consulta de historial propio |
| **Estudiante (Student)** | Alumnos matriculados | Reservas, suscripciones, historial propio |
| **Visitante (Visitor)** | Personas externas sin cuenta | Acceso temporal mediante QR generado por guardia |
| **Sensor IoT** | ESP32 en espacios de parqueo | Actualización automática de estados vía API |

### 2.4 Restricciones generales

- El sistema debe funcionar en navegadores modernos sin instalar software adicional
- La base de datos debe ser PostgreSQL 16 o superior
- El deploy se realiza en Vercel (frontend + API) con Neon (base de datos serverless)
- Las contraseñas nunca se almacenan en texto plano
- Todos los accesos quedan registrados en el AuditLog

---

## 3. REQUERIMIENTOS FUNCIONALES

> **Notación:** RF-XX = Requerimiento Funcional número XX
> **Prioridad:** Alta / Media / Baja
> **Estado:** Implementado ✅ / Parcial ⚠️ / Pendiente ❌

---

### RF-01 — Autenticación de usuarios
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe permitir a los usuarios autenticarse con correo electrónico y contraseña. El sistema debe generar un token de acceso JWT con vigencia de 1 hora y un token de refresco con vigencia de 7 días. Las contraseñas deben almacenarse cifradas con bcrypt.

**Archivo:** `webapp/src/app/api/parqueo/auth/route.js`
**Tablas:** `User`

---

### RF-02 — Control de acceso por roles (RBAC)
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe restringir el acceso a funcionalidades según el rol del usuario:
- ADMIN: acceso total
- SECURITY: escáner, lista negra, barreras, auditoría
- TEACHER: reservas, historial propio, suscripciones
- STUDENT: reservas, historial propio, suscripciones
- VISITOR: acceso temporal sin cuenta

**Archivo:** Middleware de Next.js + cada `route.js`

---

### RF-03 — Registro de entrada vehicular
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe registrar la entrada de un vehículo al campus mediante los métodos: QR personal, tarjeta NFC, lectura de placa (PLATE) o ingreso manual. Al registrar la entrada, el sistema debe:
1. Verificar que el vehículo no esté en lista negra
2. Verificar que el vehículo no tenga deuda pendiente
3. Asignar automáticamente el primer espacio disponible
4. Marcar el espacio como OCCUPIED
5. Crear un registro en ParkingSession con status ACTIVE
6. Registrar la acción en AuditLog

**Archivo:** `webapp/src/app/api/parqueo/qr/scan/route.js`, `sessions/route.js`
**Tablas:** `ParkingSession` (INSERT), `ParkingSpace` (UPDATE), `AuditLog` (trigger)

---

### RF-04 — Registro de salida y cálculo de cobro
**Prioridad:** Alta | **Estado:** ✅ Implementado

Al detectar la salida de un vehículo (segundo escaneo del mismo QR), el sistema debe:
1. Calcular la duración en minutos (exit_time − entry_time)
2. Determinar el monto según la siguiente prioridad:
   - Suscripción activa → Q0
   - Evento activo con tarifa fija → flat_rate del evento
   - Tarifa por rol: ADMIN/SECURITY=Q0, TEACHER=Q0 (hasta 8h), STUDENT=Q5/hora, VISITOR=Q10/hora
3. Cerrar la sesión (status COMPLETED)
4. Liberar el espacio (status AVAILABLE)

**Archivo:** `webapp/src/app/api/parqueo/qr/scan/route.js`
**Tablas:** `ParkingSession` (UPDATE), `ParkingSpace` (UPDATE via trigger)

---

### RF-05 — Gestión de espacios de parqueo
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe gestionar 500 espacios distribuidos en 4 zonas (A, B, C, D) con los tipos: STANDARD, VIP, HANDICAPPED, ELECTRIC, RESERVED, TEACHER. Cada espacio tiene un estado: AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE. El administrador puede activar/desactivar espacios y cambiarlos a mantenimiento.

**Archivo:** `webapp/src/app/api/parqueo/spaces/route.js`
**Tablas:** `ParkingSpace`

---

### RF-06 — Mapa interactivo en tiempo real
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe mostrar un mapa visual del campus con todos los espacios coloreados según su estado (verde=disponible, rojo=ocupado, amarillo=reservado, gris=mantenimiento). El mapa debe actualizarse automáticamente cada 3 segundos mediante polling HTTP.

**Página:** `/parqueo/mapa`
**Endpoint:** `GET /api/parqueo/spaces`

---

### RF-07 — Integración con sensores IoT
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe recibir señales de sensores ESP32 instalados en los espacios de parqueo. El sensor envía el código del espacio y su nuevo estado (OCCUPIED/AVAILABLE). El sistema debe actualizar el estado en la base de datos y registrar la hora del último reporte del sensor.

**Endpoint:** `POST /api/parqueo/spaces/sensor`
**Tablas:** `ParkingSpace` (campos status, last_sensor_update)

---

### RF-08 — Sistema de reservas de espacios
**Prioridad:** Alta | **Estado:** ✅ Implementado

Los usuarios autenticados (excepto VISITOR) deben poder reservar un espacio con anticipación especificando zona, espacio, fecha y hora de inicio/fin. El sistema debe verificar que no existan reservas que se traslapen en el mismo espacio y período. Al confirmar la reserva, el espacio pasa a estado RESERVED.

**Archivo:** `webapp/src/app/api/parqueo/reservations/route.js`
**Tablas:** `Reservation` (INSERT), `ParkingSpace` (UPDATE)

---

### RF-09 — Cancelación de reservas
**Prioridad:** Media | **Estado:** ✅ Implementado

El usuario o el administrador deben poder cancelar una reserva pendiente o confirmada. Al cancelar, el espacio debe liberarse automáticamente (vía trigger `trigger_expirar_reservas`).

**Archivo:** `webapp/src/app/api/parqueo/reservations/[id]/cancel/route.js`

---

### RF-10 — Suscripciones de parqueo
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe permitir a los usuarios (STUDENT, TEACHER) adquirir suscripciones de parqueo con dos modalidades:
- MONTHLY: 30 días de acceso ilimitado por Q150
- SEMESTER: 180 días de acceso ilimitado por Q600

Los usuarios con suscripción activa no deben pagar por ninguna sesión durante la vigencia.

**Archivo:** `webapp/src/app/api/parqueo/subscriptions/route.js`
**Tablas:** `ParkingSubscription`

---

### RF-11 — Acceso de visitantes con QR temporal
**Prioridad:** Alta | **Estado:** ✅ Implementado

El guardia debe poder generar un código QR temporal para un visitante externo ingresando el nombre del visitante y la placa de su vehículo. El QR debe tener una vigencia de 2 horas y solo puede usarse una vez. El sistema debe poder enviar el QR al visitante por correo electrónico.

**Archivo:** `webapp/src/app/api/parqueo/qr/visitor/route.js`
**Tablas:** `VisitorQR`

---

### RF-12 — Lista negra de vehículos
**Prioridad:** Alta | **Estado:** ✅ Implementado

El administrador o el guardia deben poder agregar vehículos a la lista negra indicando el motivo. Los vehículos en lista negra deben ser bloqueados automáticamente al intentar ingresar. El sistema debe registrar automáticamente una alerta de severidad HIGH en el AuditLog cuando se agrega un vehículo (trigger `trigger_blacklist_alerta`).

**Archivo:** `webapp/src/app/api/parqueo/security/blacklist/route.js`
**Tablas:** `Blacklist`, `Vehicle` (campo blacklisted)

---

### RF-13 — Registro y consulta de pagos
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe registrar cada pago asociado a una sesión con el monto, método de pago (CASH, CARD, TRANSFER, QR_CODE, MOBILE) y estado (PENDING, COMPLETED, FAILED, REFUNDED). Cada sesión puede tener máximo un pago (relación 1:1).

**Archivo:** `webapp/src/app/api/parqueo/payments/route.js`
**Tablas:** `Payment`

---

### RF-14 — Dashboard administrativo
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe mostrar al administrador un dashboard con métricas en tiempo real:
- Total de espacios disponibles/ocupados y porcentaje de ocupación
- Número de sesiones activas en este momento
- Ingresos totales del día
- Ocupación por zona (A, B, C, D)
- Vehículos en lista negra

**Archivo:** `webapp/src/app/api/parqueo/dashboard/route.js`

---

### RF-15 — Reportes de ingresos y ocupación
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe generar los siguientes reportes:
- Reporte diario de sesiones e ingresos por zona
- Reporte mensual de facturación por usuario
- Reporte de ingresos por período
- Top 10 usuarios por frecuencia de uso
- Predicción de demanda basada en patrones históricos
- Exportación a CSV

**Archivos:** `webapp/src/app/api/parqueo/reports/*/route.js`
**Vistas usadas:** `view_ingresos_del_dia`, `view_ocupacion_por_zona`

---

### RF-16 — Auditoría del sistema
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe registrar automáticamente en el AuditLog todas las acciones relevantes: entradas vehiculares, salidas, intentos fallidos, vehículos en lista negra, renovaciones de suscripción. Cada registro debe incluir: acción, recurso afectado, usuario que realizó la acción, metadata en JSON, dirección IP y user agent.

**Trigger:** `trigger_audit_acceso` (AFTER INSERT en ParkingSession)
**Tablas:** `AuditLog`

---

### RF-17 — Gestión de eventos especiales
**Prioridad:** Media | **Estado:** ✅ Implementado

El administrador debe poder crear eventos especiales (graduaciones, conferencias) con tarifas diferenciadas. Un evento puede tener tarifa fija (FLAT_RATE) o tarifa por hora propia. Durante un evento activo, el sistema aplica automáticamente la tarifa del evento sobre la tarifa normal.

**Archivo:** `webapp/src/app/api/parqueo/events/route.js`
**Tablas:** `ParkingEvent`
**Vista:** `view_eventos_activos`

---

### RF-18 — Facturación mensual
**Prioridad:** Media | **Estado:** ✅ Implementado

El sistema debe consolidar mensualmente las sesiones de cada usuario en una factura (MonthlyBill) con el total de sesiones, minutos y monto. El administrador debe poder cerrar el período mensual mediante el stored procedure `sp_cerrar_mes`.

**Archivo:** `webapp/src/app/api/parqueo/billing/route.js`
**Tablas:** `MonthlyBill`
**SP:** `sp_cerrar_mes(year, month)`

---

### RF-19 — Notificaciones al usuario
**Prioridad:** Media | **Estado:** ✅ Implementado

El sistema debe generar notificaciones para los usuarios en los siguientes eventos: parqueo lleno, suscripción próxima a vencer, vehículo agregado a lista negra, acceso inválido detectado, pago requerido.

**Archivo:** `webapp/src/app/api/parqueo/notifications/route.js`
**Tablas:** `Notification`

---

### RF-20 — Gestión de barreras físicas
**Prioridad:** Media | **Estado:** ✅ Implementado

El sistema debe poder enviar comandos a las barreras físicas del campus (OPEN, CLOSE, BLOCK) y registrar cada comando en el BarrierLog con el operador que lo ejecutó, la fuente del trigger (QR, PLATE, NFC, MANUAL) y la sesión asociada.

**Archivo:** `webapp/src/app/api/parqueo/barriers/[id]/command/route.js`
**Tablas:** `BarrierLog`

---

### RF-21 — Reemplazo de tarjeta NFC
**Prioridad:** Baja | **Estado:** ✅ Implementado

El sistema debe gestionar solicitudes de reemplazo de tarjeta NFC perdida, dañada o robada. El proceso incluye: solicitud por el usuario, cobro de Q50 por reemplazo, procesamiento por el administrador y actualización del nfc_card_id en el perfil del usuario.

**Archivo:** `webapp/src/app/api/parqueo/cards/replace/route.js`
**Tablas:** `CardReplacement`

---

### RF-22 — Verificación de solvencia
**Prioridad:** Alta | **Estado:** ✅ Implementado

El sistema debe poder verificar el estado de solvencia de un usuario consultando por carnet universitario. La consulta debe retornar: si tiene suscripción activa, cuánto debe, si está al día. Implementado mediante el stored procedure `sp_verificar_solvencia`.

**SP:** `sp_verificar_solvencia(carnet)`
**Vista:** `view_solvencia_parqueo`

---

## 4. REQUERIMIENTOS NO FUNCIONALES

---

### RNF-01 — Rendimiento de consultas críticas
**Categoría:** Rendimiento | **Estado:** ✅ Implementado

Las consultas más frecuentes del sistema (búsqueda por QR, búsqueda por placa, verificación de espacio disponible) deben responder en menos de 100 ms bajo carga normal. Se logra mediante 35+ índices optimizados en los campos de búsqueda frecuente (placa, status, entry_time, user_id, qr_code).

**Evidencia:** `database/01_ddl.sql` — índices `Vehicle_placa_idx`, `ParkingSession_status_idx`, `User_qr_code` (UNIQUE implícito)

---

### RNF-02 — Disponibilidad del sistema
**Categoría:** Disponibilidad | **Estado:** ✅ Implementado

El sistema debe estar disponible el 99.9% del tiempo durante horario de operación del campus (6:00 AM – 10:00 PM, lunes a sábado). Se garantiza mediante deploy en Vercel (serverless con auto-scaling) y base de datos en Neon (PostgreSQL serverless con réplicas automáticas).

---

### RNF-03 — Seguridad de autenticación
**Categoría:** Seguridad | **Estado:** ✅ Implementado

- Las contraseñas deben almacenarse con hash bcrypt (factor de costo mínimo 10)
- Los tokens JWT deben tener expiración máxima de 1 hora para access tokens
- Todas las rutas de API deben verificar el token en cada request
- El sistema no debe exponer contraseñas, hashes ni tokens en logs

**Evidencia:** `webapp/src/lib/jwt.js`, uso de `bcryptjs` en auth route

---

### RNF-04 — Integridad de datos
**Categoría:** Integridad | **Estado:** ✅ Implementado

Las operaciones que modifican múltiples tablas deben ejecutarse dentro de transacciones atómicas (BEGIN/COMMIT). Si alguna operación falla, todas las modificaciones deben revertirse. Implementado con `prisma.$transaction([...])` en todas las operaciones críticas (entrada, salida, reserva).

**Evidencia:** `qr/scan/route.js`, `sessions/route.js`, `reservations/route.js`

---

### RNF-05 — Trazabilidad y auditoría
**Categoría:** Seguridad | **Estado:** ✅ Implementado

Toda acción relevante del sistema debe quedar registrada en AuditLog con: usuario responsable, tipo de acción, recurso afectado, metadata en JSONB, timestamp, IP y user agent. El registro de entradas vehiculares se realiza automáticamente mediante trigger (sin posibilidad de omitirlo desde la aplicación).

**Evidencia:** `database/03_triggers.sql` — `trigger_audit_acceso`

---

### RNF-06 — Escalabilidad
**Categoría:** Escalabilidad | **Estado:** ✅ Implementado

El sistema debe soportar al menos 500 usuarios concurrentes sin degradación de rendimiento. La arquitectura serverless de Vercel escala horizontalmente de forma automática. El connection pooling de Prisma previene el agotamiento de conexiones en la base de datos.

---

### RNF-07 — Usabilidad
**Categoría:** Usabilidad | **Estado:** ✅ Implementado

La interfaz del escáner (`/parqueo/escaner`) debe permitir al guardia registrar una entrada o salida en menos de 5 segundos desde el escaneo del QR. La interfaz debe ser operable desde tablets y dispositivos móviles (diseño responsive con Tailwind CSS).

---

### RNF-08 — Compatibilidad de navegadores
**Categoría:** Portabilidad | **Estado:** ✅ Implementado

El sistema debe funcionar correctamente en las últimas dos versiones de Chrome, Firefox, Safari y Edge. No debe requerir plugins ni extensiones adicionales.

---

### RNF-09 — Tiempo real del mapa
**Categoría:** Rendimiento | **Estado:** ✅ Implementado

El mapa de espacios debe reflejar cambios de estado en un máximo de 3 segundos después de que ocurran. Se logra mediante polling HTTP con intervalo de 3 segundos en el frontend.

**Evidencia:** `webapp/src/app/parqueo/mapa/page.js` — `setInterval(fetch, 3000)`

---

### RNF-10 — Confidencialidad de datos personales
**Categoría:** Seguridad | **Estado:** ✅ Implementado

Los datos personales de los usuarios (nombre, carnet, correo, vehículo) solo deben ser accesibles por usuarios con rol ADMIN o SECURITY, o por el propio usuario. La API no debe exponer datos de otros usuarios a roles no autorizados.

---

### RNF-11 — Soft delete (no borrado físico)
**Categoría:** Integridad | **Estado:** ✅ Implementado

Los registros de usuarios y vehículos no deben eliminarse físicamente de la base de datos. Se debe usar borrado lógico mediante el campo `deleted_at` (TIMESTAMPTZ). Esto garantiza trazabilidad completa del historial.

**Evidencia:** `database/01_ddl.sql` — campo `deleted_at` en `User` y `Vehicle`

---

### RNF-12 — Tiempo de respuesta de la API
**Categoría:** Rendimiento | **Estado:** ✅ Implementado

Los endpoints REST de operaciones CRUD simples deben responder en menos de 200 ms. Los endpoints de reportes que agregan datos históricos pueden tomar hasta 2 segundos. Los endpoints críticos de escaneo QR deben responder en menos de 500 ms incluyendo todas las validaciones.

---

### RNF-13 — Mantenibilidad del código
**Categoría:** Mantenibilidad | **Estado:** ✅ Implementado

El código debe seguir una estructura consistente: todas las respuestas HTTP se generan mediante los helpers en `src/lib/response.js` (res.ok, res.created, res.error, res.notFound, res.unauthorized). Todas las consultas a la base de datos se realizan a través del cliente Prisma centralizado en `src/lib/prisma.js`.

---

### RNF-14 — Persistencia ante fallos
**Categoría:** Confiabilidad | **Estado:** ✅ Implementado

En caso de fallo del servidor de aplicación, los datos ya registrados en la base de datos no deben perderse. Las transacciones confirmadas (COMMIT) deben ser permanentes. Neon PostgreSQL garantiza durabilidad mediante Write-Ahead Log (WAL) y backups automáticos.

---

### RNF-15 — Seguridad del endpoint IoT
**Categoría:** Seguridad | **Estado:** ⚠️ Parcial

El endpoint de sensores IoT (`/api/parqueo/spaces/sensor`) debe autenticarse con una API Key en el header para prevenir inyección falsa de estados. Actualmente el endpoint valida el formato del request pero la verificación de API Key está pendiente de implementación completa.

---

## 5. RESTRICCIONES DEL SISTEMA

| # | Restricción |
|---|---|
| RC-01 | El sistema debe desplegarse en Vercel como plataforma de hosting |
| RC-02 | La base de datos debe ser PostgreSQL 16 (Neon serverless en producción) |
| RC-03 | El lenguaje de desarrollo es JavaScript (sin TypeScript) con Next.js 16 |
| RC-04 | Las placas de vehículos deben seguir el formato guatemalteco |
| RC-05 | El sistema opera en zona horaria GMT-6 (Guatemala) |
| RC-06 | Los QR de visitante tienen vigencia máxima de 2 horas no configurable |
| RC-07 | La capacidad máxima del campus es de 500 espacios (configurable por administrador) |
| RC-08 | Los tokens de acceso JWT no pueden exceder 1 hora de vigencia por seguridad |

---

## 6. CASOS DE USO PRINCIPALES

### CU-01 — Registrar entrada vehicular
| Campo | Detalle |
|---|---|
| **Actor principal** | Guardia (SECURITY) |
| **Precondición** | El guardia está autenticado en `/parqueo/escaner` |
| **Flujo principal** | 1. Guardia escanea QR del usuario → 2. Sistema verifica lista negra y deuda → 3. Sistema asigna espacio disponible → 4. Sistema crea sesión y ocupa espacio → 5. Pantalla confirma entrada con espacio asignado |
| **Flujo alternativo A** | Si vehículo en lista negra → sistema muestra alerta de bloqueo |
| **Flujo alternativo B** | Si no hay espacios → sistema informa parqueo lleno |
| **Flujo alternativo C** | Si el QR ya tiene sesión activa → sistema procesa como SALIDA |
| **Postcondición** | ParkingSession ACTIVE creada, ParkingSpace OCCUPIED |
| **RF relacionados** | RF-03, RF-12 |

---

### CU-02 — Registrar salida y cobrar
| Campo | Detalle |
|---|---|
| **Actor principal** | Guardia (SECURITY) |
| **Precondición** | Existe una sesión ACTIVE para el vehículo |
| **Flujo principal** | 1. Guardia escanea el mismo QR → 2. Sistema calcula duración y monto → 3. Guardia cobra al usuario → 4. Sistema registra pago → 5. Sesión se cierra y espacio se libera |
| **Flujo alternativo A** | Si usuario tiene suscripción → monto = Q0, salida inmediata sin cobro |
| **Flujo alternativo B** | Si hay evento activo → se aplica tarifa del evento |
| **Postcondición** | ParkingSession COMPLETED, ParkingSpace AVAILABLE, Payment COMPLETED |
| **RF relacionados** | RF-04, RF-13 |

---

### CU-03 — Reservar espacio
| Campo | Detalle |
|---|---|
| **Actor principal** | Estudiante / Docente |
| **Precondición** | Usuario autenticado |
| **Flujo principal** | 1. Usuario selecciona zona y espacio en el mapa → 2. Ingresa fecha y horario → 3. Sistema verifica disponibilidad → 4. Sistema crea reserva y bloquea espacio → 5. Sistema envía confirmación opcional por email |
| **Flujo alternativo A** | Si espacio ya reservado en ese horario → sistema rechaza con mensaje de conflicto |
| **Postcondición** | Reservation CONFIRMED, ParkingSpace RESERVED |
| **RF relacionados** | RF-08, RF-09 |

---

### CU-04 — Generar QR para visitante
| Campo | Detalle |
|---|---|
| **Actor principal** | Guardia (SECURITY) |
| **Precondición** | Guardia autenticado en `/parqueo/escaner` |
| **Flujo principal** | 1. Guardia ingresa nombre y placa del visitante → 2. Sistema genera QR con vigencia 2h → 3. Guardia muestra/imprime el QR → 4. Visitante usa el QR para ingresar |
| **Flujo alternativo A** | Guardia envía QR por email al visitante vía Resend |
| **Postcondición** | VisitorQR creado con is_used=false, expires_at=now+2h |
| **RF relacionados** | RF-11 |

---

### CU-05 — Consultar reporte de ingresos
| Campo | Detalle |
|---|---|
| **Actor principal** | Administrador |
| **Precondición** | Usuario con rol ADMIN autenticado |
| **Flujo principal** | 1. Admin va a `/parqueo/reportes` → 2. Selecciona tipo y período → 3. Sistema consulta BD con JOINs y vistas → 4. Sistema presenta datos tabulados con totales → 5. Admin puede exportar a CSV |
| **Postcondición** | Reporte generado y visualizado |
| **RF relacionados** | RF-15 |

---

## 7. MATRIZ DE TRAZABILIDAD

| Requerimiento | Archivo de implementación | Tabla(s) BD | Prueba |
|---|---|---|---|
| RF-01 | `api/parqueo/auth/route.js` | User | `auth/route.spec.js` |
| RF-03 | `api/parqueo/qr/scan/route.js` | ParkingSession, ParkingSpace | `qr/scan/route.spec.js` |
| RF-04 | `api/parqueo/qr/scan/route.js` | ParkingSession, Payment | `qr/scan/route.spec.js` |
| RF-05 | `api/parqueo/spaces/route.js` | ParkingSpace | `spaces/route.spec.js` |
| RF-07 | `api/parqueo/spaces/sensor/route.js` | ParkingSpace | `spaces/sensor/route.spec.js` |
| RF-08 | `api/parqueo/reservations/route.js` | Reservation, ParkingSpace | `reservations/route.spec.js` |
| RF-10 | `api/parqueo/subscriptions/route.js` | ParkingSubscription | `subscriptions/route.spec.js` |
| RF-11 | `api/parqueo/qr/visitor/route.js` | VisitorQR | `qr/visitor/route.spec.js` |
| RF-12 | `api/parqueo/security/blacklist/route.js` | Blacklist, Vehicle | `security/blacklist/route.spec.js` |
| RF-14 | `api/parqueo/dashboard/route.js` | Múltiples + vistas | `dashboard/route.spec.js` |
| RF-15 | `api/parqueo/reports/*/route.js` | ParkingSession, MonthlyBill | `reports/*/route.spec.js` |
| RF-16 | `database/03_triggers.sql` | AuditLog | Trigger automático |
| RF-22 | `database/05_stored_procedures.sql` | User, ParkingSession, ParkingSubscription | SP directo |
