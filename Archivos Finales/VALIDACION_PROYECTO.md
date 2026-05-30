# VALIDACIÓN DEL PROYECTO — Smart Parking USPG Grupo 5
> Generado: 2026-05-23 | Presentación: 6 junio 2026

---

## ENTREGABLE 1 — Bases de Datos I (Catedrática: Claudia Alegre)

| Requerimiento | ¿Existe? | Dónde está | Observación |
|---|---|---|---|
| Modelo ER completo | ⚠️ | No hay imagen/diagrama .png o .drawio | El esquema relacional existe en `database/01_ddl.sql` pero NO hay un diagrama visual ER entregable |
| Scripts DDL (CREATE TABLE, índices, constraints) | ✅ | `database/01_ddl.sql` | 19 tablas, 27 ENUMs, 35+ índices, FK, UNIQUE, NOT NULL, CHECK |
| Scripts DML (INSERT seeds, UPDATE, DELETE) | ✅ | `database/02_dml_seeds.sql` | 1 campus, 5 usuarios, 10 vehículos, 500 espacios, 720+ sesiones históricas |
| Triggers BEFORE/AFTER | ✅ | `database/03_triggers.sql` | 6 triggers: bloquear acceso sin pago (BEFORE INSERT), liberar espacio (AFTER UPDATE), expirar reserva (AFTER UPDATE), auditoría entrada (AFTER INSERT), alerta blacklist (AFTER UPDATE), expirar suscripción (BEFORE UPDATE) |
| Vistas | ✅ | `database/04_views.sql` | 6 vistas: sesiones activas, ingresos del día, ocupación por zona, usuarios con deuda, solvencia parqueo, eventos activos |
| Stored Procedures | ✅ | `database/05_stored_procedures.sql` | 5 SPs: registrar_entrada, registrar_salida, verificar_solvencia, cerrar_mes, renovar_suscripcion |
| Funciones | ✅ | `database/06_functions.sql` | 4 funciones: calcular_tarifa, espacio_disponible, tiene_suscripcion_activa, deuda_total |
| Índices optimizados | ✅ | `database/01_ddl.sql` | 35+ índices en placa, status, vehicle_id, entry_time, user_id, etc. |
| JOINs (INNER, LEFT, RIGHT) | ✅ | `database/04_views.sql`, `database/05_stored_procedures.sql` | INNER JOIN y LEFT JOIN en todas las vistas; las 4 tablas principales se unen entre sí |
| Relaciones 1:1, 1:N, N:M | ✅ | `database/01_ddl.sql` | 1:N User→Vehicle, 1:N User→ParkingSession, 1:1 ParkingSession→Payment, implícito N:M via sesiones |
| Sublenguajes SQL (DQL, DML, DDL, DCL) | ⚠️ | DDL/DML/DQL presentes, DCL ausente | No hay scripts GRANT/REVOKE. 🚨 URGENTE agregar DCL |
| Restricciones PK, FK, UNIQUE, NOT NULL, CHECK | ✅ | `database/01_ddl.sql` | Todas las restricciones presentes. CHECK implícito en ENUMs |
| Metadatos / catálogo de la BD | ⚠️ | No hay archivo de catálogo | Podría generarse con `SELECT * FROM information_schema.tables` pero no hay documento |

**Subtotal BD I: 11/13 ✅ — 2 pendientes**

---

## ENTREGABLE 2 — Ingeniería de Software (Catedrática: Claudia Alegre)

| Requerimiento | ¿Existe? | Dónde está | Observación |
|---|---|---|---|
| Documento de requerimientos | ⚠️ | `docs/01_vision_general.md` tiene contexto | No hay documento formal RF/RNF con plantilla IEEE. 🚨 URGENTE |
| Casos de uso detallados | ⚠️ | `docs/03_flujos_principales.md` tiene flujos | Hay flujos descriptos en texto pero no hay diagrama UML formal de casos de uso |
| Diagramas de actividades UML | ❌ | No existe | No hay diagramas .drawio, .png ni .puml de actividades UML |
| Diseño arquitectónico (3 capas) | ✅ | `docs/01_vision_general.md` + estructura carpetas | Arquitectura 3 capas clara: Presentación (pages), Lógica (API routes), Datos (Prisma+PostgreSQL) |
| Plan de pruebas | ✅ | `webapp/src/app/api/parqueo/**/*.spec.js` | 25+ archivos de prueba Jest. Cobertura de rutas críticas |
| Definición IS (Sommerville/Pressman/IEEE) | ❌ | No existe | No hay marco teórico en ningún documento |
| Ciclo de vida / modelo en cascada o incremental | ❌ | No existe | No hay descripción del ciclo de vida usado |
| Metodología de desarrollo | ❌ | No existe | No se documenta la metodología usada |
| Levantado de requerimientos | ⚠️ | Implícito en los módulos del sistema | No hay entrevistas, encuestas ni documento formal de levantado |

**Subtotal IS: 2/9 ✅ — 7 pendientes (mayoría son documentos a redactar)**

---

## ENTREGABLE 3 — Arquitectura de Computadoras

| Requerimiento | ¿Existe? | Dónde está | Observación |
|---|---|---|---|
| Diseño de estaciones HFC para laboratorios con IA | ❌ | No existe | No hay documento de hardware |
| Diseño de servidores web de alto tráfico | ⚠️ | `docs/06_despliegue_y_configuracion.md` menciona Vercel/Neon | No hay diseño técnico de hardware/servidor |
| Prioridad en rendimiento y concurrencia | ⚠️ | Implícito en WebSockets + pooling de Prisma | No está documentado formalmente |
| Miles de hilos / latencia optimizada | ⚠️ | Los índices de BD optimizan latencia | No hay análisis formal |
| Múltiples VMs | ❌ | No existe | No hay diseño de virtualización |
| Niveles de abstracción HW-SW | ❌ | No existe | No hay documento |
| CPU + GPU + Aceleradores IA | ❌ | No existe | No hay especificación de hardware con IA |
| Eficiencia energética (DVFS) | ❌ | No existe | No documentado |
| Computación heterogénea | ❌ | No existe | No documentado |
| Multiprocesamiento / von Neumann | ❌ | No existe | No documentado |

**Subtotal AC: 0/10 ✅ — 10 pendientes (todo es un documento a redactar) 🚨 URGENTE**

---

## ENTREGABLE 4 — Seminario Estado Actual de la Tecnología

| Requerimiento | ¿Existe? | Dónde está | Observación |
|---|---|---|---|
| Sistema Embebido IoT funcional | ✅ | `demo-iot.sh` + `webapp/src/app/api/parqueo/spaces/sensor/` | Script bash simula ESP32; endpoint `/spaces/sensor` recibe señales de ocupación real |
| Dispositivos IoT como vectores de ataque | ⚠️ | `docs/05_iot_y_demo.md` | Menciona el sistema IoT pero no analiza riesgos de seguridad formalmente |
| Ciberseguridad (Data Poisoning, ataques adversarios) | ⚠️ | Blacklist, JWT, bcrypt en el código | Controles existen pero no hay análisis documental de riesgos IA |
| ISO/IEC 27001 | ❌ | No existe | No hay referencia a ISO 27001 en ningún documento |
| IA como herramienta de defensa | ❌ | No existe | No documentado |
| Análisis de riesgos del sistema embebido | ❌ | No existe | No hay análisis formal de riesgos IoT |
| Inyección de Prompts / ataques adversarios | ❌ | No existe | No documentado |

**Subtotal Seminario: 1/7 ✅ — 6 pendientes**

---

## RESUMEN DE LO QUE FALTA

### ❌ No existe en el proyecto (crear desde cero):

1. 🚨 **Diagrama ER visual** — imagen o PDF del modelo relacional (BD I)
2. 🚨 **Scripts DCL** — `GRANT SELECT ON view_sesiones_activas TO rol_guardia;` etc. (BD I)
3. 🚨 **Documento de Requerimientos Funcionales/No Funcionales** con formato IEEE (IS)
4. 🚨 **Diagramas UML de Actividades** — al menos 3: entrada, salida, reserva (IS)
5. 🚨 **Diagrama de Casos de Uso** formal con actores y relaciones (IS)
6. 🚨 **Documento de Arquitectura de Computadoras** — diseño servidor, HFC, IA acelerada (AC)
7. 🚨 **Análisis de Riesgos IoT + ISO 27001** — documento de ciberseguridad (Seminario)
8. **Catálogo/metadatos de la BD** — consultas al information_schema (BD I)
9. **Metodología de desarrollo** — describir qué modelo usaron (IS)

### ⚠️ Existe parcialmente (completar o mejorar):

1. Documento de despliegue menciona infraestructura pero falta análisis formal AC
2. Los flujos en `docs/03_flujos_principales.md` son buenos pero faltan como diagramas UML
3. El IoT funciona pero no tiene análisis de seguridad documentado

---

## PRIORIDAD DE ACCIONES (más urgente primero)

| Prioridad | Acción | Tiempo estimado | Para entregable |
|---|---|---|---|
| 1 | Diagrama ER visual (usar draw.io o dbdiagram.io) | 2 horas | BD I |
| 2 | Scripts DCL (5 líneas de GRANT) | 30 min | BD I |
| 3 | Documento Arquitectura de Computadoras | 3 horas | AC |
| 4 | Documento Requerimientos RF/RNF | 2 horas | IS |
| 5 | Diagramas UML Actividades (3 flujos) | 2 horas | IS |
| 6 | Análisis Riesgos IoT + ISO 27001 | 2 horas | Seminario |
| 7 | Catálogo BD (information_schema) | 1 hora | BD I |
| 8 | Metodología de desarrollo | 1 hora | IS |
