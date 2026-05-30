# GUÍA DE EXPLICACIÓN PARA EL EXAMEN — Smart Parking USPG Grupo 5
> Marlon Pappa & Javier Estrada | Presentación: 6 de junio 2026 | Lic. Rocío Linares

---

## PREGUNTAS FRECUENTES Y CÓMO RESPONDERLAS

---

### 1. "¿Qué tecnologías usaron y por qué?"

> "Nuestro sistema usa **Next.js 16 con App Router** como framework principal porque nos permite tener tanto el frontend como el backend en un solo proyecto — las API Routes de Next.js funcionan como endpoints REST que se despliegan automáticamente en Vercel como funciones serverless.
>
> Para la base de datos usamos **PostgreSQL 16** hospedado en Neon, que es PostgreSQL serverless, porque necesitábamos una base relacional robusta con soporte completo de triggers, stored procedures, vistas y funciones. Usamos **Prisma ORM** para las consultas desde el código JavaScript, y los scripts SQL puros para los objetos de base de datos más complejos.
>
> La autenticación es con **JWT** (JSON Web Tokens): token de acceso de 1 hora y token de refresco de 7 días. Las contraseñas se cifran con **bcrypt**. Para los QR usamos la librería `qrcode` y para emails usamos **Resend SDK**.
>
> El deploy es en **Vercel** con integración continua desde GitHub. La elección fue pragmática: este stack es el más demandado en el mercado guatemalteco y nos permite iterar rápido con una sola base de código."

---

### 2. "Explícame el modelo de base de datos"

> "Nuestro modelo tiene **19 tablas** y **27 tipos enumerados** (ENUMs). El diseño gira alrededor de 5 tablas centrales:
>
> - **User** — los usuarios del sistema con sus roles: ADMIN, SECURITY, TEACHER, STUDENT, VISITOR
> - **Vehicle** — los vehículos registrados, cada uno con una placa única guatemalteca y un dueño (User)
> - **ParkingSpace** — los 500 espacios físicos del parqueo distribuidos en 4 zonas (A, B, C, D)
> - **ParkingSession** — el registro de cada estancia vehicular: cuándo entró, cuándo salió, cuánto pagó
> - **Payment** — el pago asociado a cada sesión (relación 1:1 con ParkingSession)
>
> Las relaciones principales son:
> - User tiene muchos Vehicles (1:N)
> - Vehicle tiene muchas ParkingSessions (1:N)
> - ParkingSpace tiene muchas ParkingSessions (1:N)
> - ParkingSession tiene un Payment (1:1)
>
> También tenemos tablas de soporte: Reservation para reservas anticipadas, ParkingSubscription para abonos mensuales/semestrales, AuditLog para trazabilidad, Blacklist para vehículos bloqueados, VisitorQR para visitantes temporales."

---

### 3. "¿Cómo funciona la autenticación?"

> "Usamos autenticación por **JWT** en dos capas:
>
> 1. El usuario ingresa email y contraseña en `/login`
> 2. El servidor busca al usuario en la tabla `User`, compara la contraseña con el hash bcrypt usando `bcrypt.compare()`
> 3. Si es válido, genera dos tokens en `src/lib/jwt.js`:
>    - **Access Token** (1 hora): contiene { id, email, role, name } firmado con SECRET
>    - **Refresh Token** (7 días): para renovar el access token sin re-login
> 4. El middleware de Next.js protege todas las rutas `/parqueo/*` verificando el token en cada request
> 5. Los roles determinan el acceso: solo ADMIN puede gestionar tarifas, ADMIN y SECURITY pueden ver seguridad, todos pueden hacer reservas
>
> Para las tarjetas NFC: el campo `nfc_card_id` en User almacena el ID único de la tarjeta. Al acercar la tarjeta al lector, se busca ese ID en la BD y se procede como si fuera un escaneo QR."

---

### 4. "¿Cómo se registra la entrada de un vehículo?"

> "El flujo principal es por **QR**: cada usuario tiene un código QR único en su perfil (campo `qr_code` en la tabla `User`). Cuando el guardia escanea ese QR con la interfaz en `/parqueo/escaner`:
>
> 1. El frontend hace POST a `/api/parqueo/qr/scan` con el código
> 2. El sistema busca al usuario por `qr_code`, junto con sus vehículos y si tiene sesión activa — todo en **una sola consulta con LEFT JOINs**
> 3. Verifica: ¿vehículo en lista negra? → denegar. ¿Tiene deuda pendiente? → denegar (trigger en BD lo bloquea también)
> 4. Busca el primer espacio disponible (SELECT ordenado por zona y código)
> 5. Verifica si hay evento activo con tarifa especial, y si tiene suscripción activa
> 6. En una **transacción atómica**: INSERT en ParkingSession + UPDATE ParkingSpace a OCCUPIED
> 7. El trigger `trigger_audit_acceso` registra automáticamente en AuditLog
> 8. Devuelve al guardia: placa, nombre, zona, espacio asignado
>
> Si el mismo QR se escanea y YA hay sesión activa → el sistema detecta que es una **salida** y ejecuta el flujo de cierre."

---

### 5. "¿Qué triggers tienen y para qué sirven?"

> "Tenemos **6 triggers** en `database/03_triggers.sql`:
>
> 1. **trigger_bloquear_acceso_sin_pago** (BEFORE INSERT en ParkingSession): antes de crear cualquier sesión, suma la deuda acumulada del vehículo. Si es > 0, lanza EXCEPTION y bloquea la entrada. Es nuestra primera línea de defensa en la BD.
>
> 2. **trigger_liberar_espacio_al_salir** (AFTER UPDATE en ParkingSession): cuando se registra la salida (exit_time pasa de NULL a una fecha), automáticamente actualiza el espacio a AVAILABLE. Garantiza que no queden espacios 'zombies' ocupados.
>
> 3. **trigger_expirar_reservas** (AFTER UPDATE en Reservation): si una reserva se cancela o se usa, libera el espacio automáticamente. Sin esto, habría que hacerlo manualmente en cada cancelación.
>
> 4. **trigger_audit_acceso** (AFTER INSERT en ParkingSession): genera automáticamente un registro en AuditLog con los metadatos JSON de cada entrada vehicular. Es la base de nuestro sistema de trazabilidad.
>
> 5. **trigger_blacklist_alerta** (AFTER UPDATE en Vehicle): cuando un vehículo se agrega a la lista negra, genera una alerta de severidad HIGH en AuditLog automáticamente.
>
> 6. **trigger_suscripcion_expirada** (BEFORE UPDATE en ParkingSubscription): si alguien intenta actualizar una suscripción cuya fecha de vencimiento ya pasó, la marca como EXPIRED. Previene suscripciones 'zombies' activas."

---

### 6. "¿Qué vistas crearon y por qué?"

> "Tenemos **6 vistas** en `database/04_views.sql`:
>
> 1. **view_sesiones_activas**: JOIN de ParkingSession + Vehicle + ParkingSpace + User donde status='ACTIVE'. La usamos en el dashboard para ver quién está estacionado en este momento.
>
> 2. **view_ingresos_del_dia**: agrupa sesiones completadas del día actual por zona, calcula total, promedio y duración promedio. La usan los reportes diarios.
>
> 3. **view_ocupacion_por_zona**: cuenta espacios por estado en cada zona y calcula el porcentaje de ocupación. La usan el dashboard y el mapa.
>
> 4. **view_usuarios_con_deuda**: agrupa sesiones sin pagar por usuario, suma la deuda total. La usan los reportes de morosidad.
>
> 5. **view_solvencia_parqueo**: vista más compleja — combina suscripción activa + deuda pendiente por usuario. Permite emitir certificados de solvencia.
>
> 6. **view_eventos_activos**: filtra eventos vigentes en este momento (start_time <= NOW <= end_time). La usa el sistema de tarifas para aplicar precios especiales.
>
> Las vistas simplifican las consultas del backend: en lugar de escribir un JOIN de 4 tablas en cada endpoint, simplemente hacemos SELECT FROM view_xxx."

---

### 7. "¿Cómo garantizan la integridad de los datos?"

> "Usamos múltiples capas de integridad:
>
> **En la base de datos:**
> - **PRIMARY KEY** en todas las tablas (UUID generado automáticamente)
> - **FOREIGN KEY** con referencias explícitas entre tablas (ON DELETE controlado)
> - **UNIQUE** en placa, email, qr_code, nfc_card_id para evitar duplicados
> - **NOT NULL** en campos obligatorios
> - **CHECK** implícito en ENUMs (PostgreSQL solo acepta valores válidos del tipo)
> - **Triggers BEFORE INSERT** que validan reglas de negocio antes de insertar
> - **Transacciones atómicas** (BEGIN/COMMIT) en operaciones que afectan múltiples tablas
>
> **En el código:**
> - Validaciones en cada API Route antes de tocar la BD
> - JWT verificado en cada request (middleware)
> - Soft delete con `deleted_at` en lugar de borrado físico (User, Vehicle)
> - bcrypt para contraseñas (nunca en texto plano)
>
> **Ejemplo concreto:** cuando un vehículo entra, primero el código verifica la lista negra, luego el trigger BEFORE INSERT verifica la deuda, luego la transacción atómica garantiza que si falla la creación de sesión, el espacio no queda como OCCUPIED."

---

### 8. "¿Cómo funciona el tiempo real del mapa?"

> "El mapa en `/parqueo/mapa` muestra los 500 espacios coloreados por estado: verde (AVAILABLE), rojo (OCCUPIED), amarillo (RESERVED), gris (MAINTENANCE).
>
> El 'tiempo real' se logra con **polling HTTP** — el frontend hace GET a `/api/parqueo/spaces` cada **3 segundos** usando `setInterval`. No usamos WebSockets porque el nivel de concurrencia de la USPG no lo justifica: 500 espacios y ~200 usuarios simultáneos máximo.
>
> Para la **integración IoT**: el ESP32 (o nuestro script `demo-iot.sh` que lo simula) envía POST a `/api/parqueo/spaces/sensor` con `{ space_code: 'A-002', status: 'OCCUPIED' }`. Eso actualiza el campo `status` y `last_sensor_update` en ParkingSpace. En el próximo polling del mapa (máximo 3 segundos después) el espacio ya aparece en el nuevo color.
>
> El endpoint del sensor no requiere autenticación JWT para facilitar la integración con microcontroladores — usa una API key en el header."

---

### 9. "¿Cómo calculan el cobro?"

> "El cálculo de tarifas tiene una jerarquía de prioridades:
>
> 1. **Suscripción activa** → Q0 (gratis, sin importar la duración)
> 2. **Evento activo con FLAT_RATE** → tarifa fija del evento (ej: Q25 por graduación)
> 3. **Evento activo con tarifa HOURLY** → tarifa propia del evento
> 4. **Tarifa normal por rol:**
>    - ADMIN y SECURITY → Q0 (exentos)
>    - TEACHER → Q0 hasta 8 horas; lo que exceda → tarifa de STUDENT
>    - STUDENT → Q5 por hora
>    - VISITOR → Q10 por hora
>
> **Fórmula:** `monto = (duration_minutes / 60) × tarifa_horaria`
>
> La duración se calcula como: `Math.ceil((exit_time - entry_time) / 60000)` — siempre redondeando hacia arriba (a favor del parqueo).
>
> Los Q5 y Q10 son los valores por defecto configurables. El ADMIN puede cambiarlos desde `/parqueo/tarifas` sin tocar código — están en la tabla `TariffConfig` en la BD."

---

### 10. "¿Cómo se integra con los otros grupos?"

> "El sistema expone **50+ endpoints REST** documentados en `docs/API.md`. Los otros grupos del proyecto integrador pueden consumirlos así:
>
> - **Grupo de Biblioteca** puede verificar si un estudiante tiene solvencia de parqueo antes de prestarle libros → `GET /api/parqueo/security/solvency/{carnet}`
> - **Grupo de Cafetería** puede verificar quién está en el campus → sesiones activas en tiempo real
> - **Grupo de Administración** puede consultar ingresos y reportes → `GET /api/parqueo/reports/*`
> - **Sistemas de Control de Acceso** pueden recibir señales de barreras → `POST /api/parqueo/barriers/{id}/command`
>
> La autenticación entre sistemas sería con JWT de larga duración (service token) generado por el ADMIN.
>
> Para el **kiosco público** (sin login): las páginas en `/kiosco/` permiten consultar disponibilidad y hacer reservas básicas sin necesitar cuenta."

---

### 11. "¿Qué metodología de desarrollo usaron?"

> "Usamos un **modelo incremental** con sprints de una semana. Siguiendo los principios de Ingeniería de Software de Sommerville:
>
> - **Fase 1 — Levantado de requerimientos:** Identificamos los actores (ADMIN, SECURITY, TEACHER, STUDENT, VISITOR) y los casos de uso principales: gestión de acceso, cobro de tarifas, reservas, reportes.
> - **Fase 2 — Diseño:** Diseñamos el modelo ER con las 19 tablas, la arquitectura de 3 capas y los casos de uso UML.
> - **Fase 3 — Implementación incremental:** Primero el core (sesiones, espacios, usuarios), luego QR y visitantes, luego reservas, finalmente reportes y seguridad.
> - **Fase 4 — Pruebas:** 25+ archivos de prueba Jest en `webapp/src/app/api/parqueo/**/*.spec.js`.
>
> La arquitectura sigue el patrón de **3 capas**: Presentación (Next.js pages), Lógica de Negocio (API Routes + lib/), y Datos (PostgreSQL + Prisma)."

---

### 12. "¿Qué consideraciones de seguridad tiene el sistema?"

> "Aplicamos múltiples controles alineados con **ISO/IEC 27001**:
>
> **Autenticación y autorización:**
> - JWT con expiración (1h access, 7d refresh) — principio de menor privilegio
> - bcrypt para hash de contraseñas (factor de costo 12)
> - RBAC (Role-Based Access Control) en cada endpoint
>
> **Integridad de datos:**
> - Transacciones atómicas — sin estados inconsistentes
> - Soft delete en lugar de borrado físico — trazabilidad completa
> - AuditLog con cada acción del sistema, incluyendo IP y user agent
>
> **Control de acceso físico:**
> - Lista negra de vehículos (tabla Blacklist + campo `blacklisted` en Vehicle)
> - QR únicos por usuario — no reutilizables entre personas
> - QR de visitante con expiración de 2 horas
>
> **Disponibilidad:**
> - Deploy en Vercel (auto-scaling) + Neon (PostgreSQL serverless con réplicas)
> - Índices optimizados para <10ms en las consultas más críticas
>
> **Riesgos identificados del sistema IoT:**
> - El endpoint del sensor no requiere JWT → riesgo de inyección falsa de estados
> - Mitigación: API key en header + validación de space_code
> - Riesgo de ataque de repetición en QR estáticos → mitigado con blacklist de sesiones activas"

---

### 13. "¿Cómo escalaría este sistema?"

> "El diseño actual ya soporta la USPG, pero para escalar a una universidad más grande:
>
> **Base de datos:**
> - **Particionamiento** de ParkingSession por mes (la tabla crece más rápido) — PostgreSQL soporta partition by range(entry_time)
> - **Réplicas de lectura** para reportes (Neon los soporta) — separar escritura de lectura
> - Los **índices** ya están optimizados para las consultas más frecuentes
>
> **Aplicación:**
> - Vercel escala automáticamente en funciones serverless — aguanta picos de demanda
> - **Caché de respuestas** (Redis) para el dashboard que no cambia en segundos
> - Prisma connection pooling para miles de conexiones simultáneas
>
> **Hardware (Arquitectura de Computadoras):**
> - Servidor con **múltiples cores** (AMD EPYC o Intel Xeon) para manejar miles de hilos concurrentes
> - **PostgreSQL** usa un proceso por conexión — en alta concurrencia se usa PgBouncer como connection pooler
> - **SSD NVMe** para reducir latencia de I/O en las consultas de sesiones activas
> - Los sensores IoT (ESP32) se benefician de arquitectura **edge computing** — procesar localmente antes de enviar a la nube"

---

### 14. "¿Qué IoT tienen?"

> "Tenemos un sistema de sensores IoT integrado con **ESP32** (microcontrolador WiFi):
>
> **Arquitectura:**
> - Cada espacio de parqueo tiene un sensor ultrasónico HC-SR04 conectado a un ESP32
> - El ESP32 detecta si el espacio está ocupado (distancia < umbral) o libre
> - Envía una señal HTTP POST a `/api/parqueo/spaces/sensor` cada vez que cambia el estado
>
> **Endpoint del sensor:**
> ```
> POST /api/parqueo/spaces/sensor
> Body: { "space_code": "A-002", "status": "OCCUPIED" }
> ```
> Actualiza `ParkingSpace.status` y `ParkingSpace.last_sensor_update` en tiempo real.
>
> **Simulación:**
> - El archivo `demo-iot.sh` simula el comportamiento del ESP32 — envía 10 señales aleatorias en un loop
> - `reset-demo.sh` restaura todos los espacios a AVAILABLE para demos
>
> **Integración con el mapa:**
> - El mapa en `/parqueo/mapa` hace polling cada 3 segundos y refleja los cambios del sensor
> - El campo `last_sensor_update` permite detectar sensores que dejaron de reportar"

---

### 15. "¿Qué pruebas hicieron?"

> "Tenemos **25+ archivos de pruebas unitarias** con **Jest** en `webapp/src/app/api/parqueo/**/*.spec.js`. Cada archivo de ruta tiene su archivo `.spec.js` correspondiente.
>
> **Tipos de pruebas:**
> - Pruebas unitarias de los endpoints API (mock de Prisma)
> - Pruebas de los helpers de respuesta (`src/lib/response.spec.js`)
> - Pruebas de JWT (`src/lib/jwt.spec.js`)
> - Pruebas de casos de error: vehículo no encontrado, espacio no disponible, deuda pendiente
>
> **Casos de prueba cubiertos:**
> - Entrada exitosa de vehículo (QR válido, espacio disponible)
> - Rechazo por lista negra
> - Rechazo por deuda pendiente
> - Salida con cálculo de monto correcto
> - Reserva sin overlap
> - Reserva con conflicto de horario (debe rechazar)
> - Login con credenciales correctas e incorrectas
>
> Para ejecutar: `cd webapp && npm test`"

---

## CONCEPTOS DE CLASE QUE APARECEN EN EL PROYECTO

### Bases de Datos I
- **DDL:** `database/01_ddl.sql` — todos los CREATE TABLE, CREATE INDEX, ENUMs
- **DML:** `database/02_dml_seeds.sql` — INSERT con datos de prueba, UPDATE en triggers y SPs
- **DQL:** Las vistas y stored procedures tienen SELECT con JOIN, GROUP BY, HAVING, WHERE, ORDER BY
- **Triggers BEFORE/AFTER:** `database/03_triggers.sql` — 6 triggers, 3 BEFORE y 3 AFTER
- **Vistas:** `database/04_views.sql` — 6 vistas que simplifican consultas complejas
- **Stored Procedures:** `database/05_stored_procedures.sql` — 5 procedimientos almacenados
- **Funciones:** `database/06_functions.sql` — 4 funciones reutilizables
- **Índices:** 35+ índices en campos de búsqueda frecuente (placa, status, entry_time, user_id)
- **JOINs:** INNER JOIN y LEFT JOIN en todas las vistas y stored procedures
- **Constraints:** PK, FK, UNIQUE, NOT NULL en `01_ddl.sql`
- **Relaciones 1:1, 1:N:** User→Vehicles (1:N), Session→Payment (1:1)

### Ingeniería de Software
- **Arquitectura 3 capas:** Presentación (Next.js pages) / Lógica (API Routes) / Datos (PostgreSQL)
- **Casos de uso:** 5 actores identificados con flujos principales y alternativos
- **Requerimientos funcionales:** gestión de acceso, cobro, reservas, reportes, seguridad
- **Requerimientos no funcionales:** disponibilidad 99.9% (Vercel), seguridad JWT, rendimiento <100ms
- **Plan de pruebas:** 25+ test files Jest con casos de éxito y error
- **Modelo incremental:** se puede ver en el historial de commits de git

### Arquitectura de Computadoras
- **Multiprocesamiento:** Vercel escala en múltiples instancias (hilos concurrentes)
- **Latencia de memoria:** Índices en PostgreSQL reducen búsquedas de O(n) a O(log n)
- **Concurrencia:** `prisma.$transaction([...])` maneja concurrencia a nivel de BD con bloqueos
- **Computación serverless:** Neon PostgreSQL + Vercel Functions = computación bajo demanda
- **IoT edge:** ESP32 procesa señal del sensor localmente antes de enviar a la nube

### Seminario Estado Actual de la Tecnología
- **Sistema IoT funcional:** ESP32 + sensores ultrasónicos + endpoint REST
- **Seguridad IoT:** El endpoint `/spaces/sensor` usa API key — vector de ataque controlado
- **Ciberseguridad:** JWT, bcrypt, AuditLog, lista negra — controles de acceso
- **ISO 27001 (control A.9 — Control de Acceso):** RBAC por roles en todos los endpoints
- **Riesgos IA/IoT:** spoofing de señales de sensor, replay attacks en QR estáticos
