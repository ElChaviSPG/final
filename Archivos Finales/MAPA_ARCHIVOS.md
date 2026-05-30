# MAPA DE ARCHIVOS DEL PROYECTO — Smart Parking USPG Grupo 5

---

## /database/ — Scripts SQL de PostgreSQL

| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `database/01_ddl.sql` | CREATE TABLE de las 19 tablas + 27 ENUMs + 35 índices + FK constraints | Base de Datos | Todos los demás SQL |
| `database/02_dml_seeds.sql` | INSERT con datos de prueba: 1 campus, 5 usuarios, 10 vehículos, 500 espacios, 725 sesiones | Base de Datos | `01_ddl.sql` |
| `database/03_triggers.sql` | 6 triggers de negocio: bloquear deuda, liberar espacio, auditoría, blacklist, suscripción | Base de Datos | `ParkingSession`, `ParkingSpace`, `Vehicle`, `AuditLog` |
| `database/04_views.sql` | 6 vistas: sesiones activas, ingresos del día, ocupación por zona, deudas, solvencia, eventos | Base de Datos | Tablas principales + reportes |
| `database/05_stored_procedures.sql` | 5 SPs: registrar_entrada, registrar_salida, verificar_solvencia, cerrar_mes, renovar_suscripcion | Base de Datos | Lógica de negocio completa |
| `database/06_functions.sql` | 4 funciones: calcular_tarifa, espacio_disponible, tiene_suscripcion_activa, deuda_total | Base de Datos | `ParkingSession`, `ParkingSpace`, `ParkingSubscription` |

---

## /webapp/src/app/api/parqueo/ — Endpoints REST (Next.js App Router)

### Autenticación
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `auth/route.js` | POST login (bcrypt), refresh token, logout, GET perfil | Auth | `User`, `jwt.js` |

### Operaciones Core
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `sessions/route.js` | POST crea sesión de parqueo, GET lista sesiones | Parqueo Core | `ParkingSession`, `Vehicle`, `ParkingSpace` |
| `spaces/route.js` | GET lista espacios, POST crea espacio, PATCH actualiza | Espacios | `ParkingSpace`, `Campus` |
| `spaces/sensor/route.js` | POST recibe señal IoT del ESP32 (actualiza status del espacio) | IoT | `ParkingSpace` |
| `payments/route.js` | POST registra pago, GET lista pagos | Pagos | `Payment`, `ParkingSession` |

### Vehículos
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `vehicles/route.js` | GET lista vehículos con filtros, POST registra vehículo | Vehículos | `Vehicle`, `User` |

### Reservas
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `reservations/route.js` | POST crea reserva con validación de overlap, GET lista reservas | Reservas | `Reservation`, `ParkingSpace`, `User` |
| `reservations/[id]/cancel/route.js` | POST cancela una reserva y libera el espacio | Reservas | `Reservation`, `ParkingSpace` |

### QR y Visitantes
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `qr/scan/route.js` | POST escanea QR — detecta ENTRADA o SALIDA automáticamente | QR Core | `User`, `Vehicle`, `ParkingSession`, `ParkingSpace`, `VisitorQR` |
| `qr/validate/route.js` | POST valida QR sin crear sesión (preview) | QR | `User`, `VisitorQR` |
| `qr/visitor/route.js` | POST genera QR temporal para visitante con expiración 2h | Visitantes | `VisitorQR`, `User` |
| `qr/send-email/route.js` | POST envía QR por email via Resend SDK | Email | `VisitorQR`, Resend |

### Suscripciones
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `subscriptions/route.js` | POST crea suscripción (MONTHLY/SEMESTER), GET lista | Suscripciones | `ParkingSubscription`, `User` |

### Eventos Especiales
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `events/route.js` | POST crea evento con tarifa especial, GET lista | Eventos | `ParkingEvent`, tarifas |

### Seguridad
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `security/blacklist/route.js` | GET/POST lista negra de vehículos, activar/desactivar | Seguridad | `Blacklist`, `Vehicle`, `AuditLog` |
| `security/audit/route.js` | GET log de auditoría del sistema | Seguridad | `AuditLog` |
| `security/failed-attempts/route.js` | GET intentos fallidos de acceso | Seguridad | `AuditLog` |
| `security/suspicious/route.js` | GET actividad sospechosa detectada | Seguridad | `AuditLog`, `Vehicle` |

### Barreras
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `barriers/route.js` | GET lista barreras físicas del campus | Barreras IoT | `BarrierLog` |
| `barriers/[id]/command/route.js` | POST envía comando OPEN/CLOSE/BLOCK a barrera | Barreras IoT | `BarrierLog` |
| `barriers/logs/route.js` | GET historial de comandos de barreras | Barreras IoT | `BarrierLog` |

### Reportes
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `reports/occupancy/route.js` | GET ocupación actual por zona | Reportes | `ParkingSpace`, vistas |
| `reports/daily/route.js` | GET reporte diario de sesiones e ingresos | Reportes | `ParkingSession`, `view_ingresos_del_dia` |
| `reports/monthly/route.js` | GET reporte mensual con totales | Reportes | `MonthlyBill`, `ParkingSession` |
| `reports/revenue/route.js` | GET ingresos agrupados por período | Reportes | `ParkingSession`, `Payment` |
| `reports/top-users/route.js` | GET top 10 usuarios por uso | Reportes | `User`, `ParkingSession` |
| `reports/prediction/route.js` | GET predicción de demanda por horas históricas | Reportes | `ParkingSession` (histórico) |
| `reports/export/route.js` | GET exporta datos a CSV | Reportes | `ParkingSession`, `User` |

### Otros
| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `dashboard/route.js` | GET métricas consolidadas para el dashboard | Dashboard | Múltiples tablas + vistas |
| `users/route.js` | GET/POST gestión de usuarios del sistema | Usuarios | `User` |
| `notifications/route.js` | GET/POST notificaciones para usuario | Notificaciones | `Notification`, `User` |
| `billing/route.js` | GET/POST facturación mensual | Facturación | `MonthlyBill`, `User` |
| `tariffs/route.js` | GET/PATCH configuración de tarifas por rol | Tarifas | `TariffConfig` |
| `cards/replace/route.js` | POST solicitud de reemplazo de tarjeta NFC | NFC | `CardReplacement`, `User` |

---

## /webapp/src/lib/ — Utilidades y servicios

| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `lib/prisma.js` | Singleton del cliente Prisma (evita conexiones múltiples en dev) | ORM | Todos los routes |
| `lib/jwt.js` | Firma y verifica JWT: signAccessToken(), signRefreshToken(), verifyToken() | Auth | `auth/route.js`, middleware |
| `lib/response.js` | Helpers estándar: res.ok(), res.created(), res.error(), res.notFound(), res.unauthorized() | HTTP | Todos los routes |
| `lib/api.js` | Instancia Axios con interceptor que agrega Bearer token automáticamente | HTTP Client | Frontend pages |
| `lib/utils.js` | Funciones utilitarias generales | Utilidades | Varios |
| `lib/subscriptionJob.js` | Job en background para expirar suscripciones vencidas | Suscripciones | `ParkingSubscription` |

---

## /webapp/src/app/ — Páginas del panel admin

| Ruta | Qué hace | Módulo | Rol requerido |
|---|---|---|---|
| `parqueo/dashboard/` | Dashboard principal con métricas y mapa | Admin | ADMIN, SECURITY |
| `parqueo/mapa/` | Mapa interactivo de espacios en tiempo real (polling 3s) | Mapa | ADMIN, SECURITY |
| `parqueo/escaner/` | Interfaz del guardia para escanear QR (entrada/salida) | Escáner | SECURITY, ADMIN |
| `parqueo/reservas/` | Gestión de reservas con mapa de selección | Reservas | Todos los roles |
| `parqueo/vehiculos/` | Gestión de vehículos registrados | Vehículos | ADMIN |
| `parqueo/seguridad/` | Lista negra y auditoría de seguridad | Seguridad | ADMIN, SECURITY |
| `parqueo/reportes/` | Generación y visualización de reportes | Reportes | ADMIN |
| `parqueo/tarifas/` | Configuración de tarifas por rol | Tarifas | ADMIN |
| `parqueo/eventos/` | Gestión de eventos especiales | Eventos | ADMIN |
| `parqueo/suscripciones/` | Gestión de suscripciones mensuales/semestrales | Suscripciones | ADMIN |
| `kiosco/` | Kiosco público de consulta (sin login requerido) | Kiosco | Público |
| `login/` | Página de autenticación | Auth | Público |

---

## /prisma/ — ORM

| Archivo | Qué hace | Módulo | Se relaciona con |
|---|---|---|---|
| `prisma/schema.prisma` | Definición de modelos para Prisma (actualmente en modo SQLite básico — la BD real usa los SQL) | ORM | `database/01_ddl.sql` |

---

## /docs/ — Documentación existente

| Archivo | Qué documenta |
|---|---|
| `docs/01_vision_general.md` | Stack, estructura, zonas, credenciales de prueba |
| `docs/02_base_de_datos.md` | Descripción del esquema de BD y tablas |
| `docs/03_flujos_principales.md` | Flujos de entrada, salida, visitante, reserva, IoT, tarifas |
| `docs/04_paginas_y_api.md` | Catálogo de páginas UI y endpoints API |
| `docs/05_iot_y_demo.md` | Integración IoT con ESP32, demo-iot.sh |
| `docs/06_despliegue_y_configuracion.md` | Guía de despliegue en Vercel + Neon |
| `docs/07_preguntas_frecuentes.md` | FAQ del proyecto |
| `docs/API.md` | Referencia completa de API (655 líneas) |

---

## Raíz del proyecto

| Archivo | Qué hace |
|---|---|
| `demo-iot.sh` | Simula señales del ESP32 enviando POSTs al endpoint `/spaces/sensor` |
| `reset-demo.sh` | Limpia datos de prueba en la BD |
| `docker-compose.yml` | Levanta PostgreSQL local + Adminer para desarrollo |
| `GUIA_EXAMEN_PARQUEO.md` | Guía de examen anterior |
| `INVENTARIO.md` | Inventario general del proyecto |
| `.env.example` | Template de variables de entorno necesarias |
