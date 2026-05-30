# Documento de Arquitectura de Computadoras
## Sistema de Gestión de Parqueo — Smart Parking USPG
### Universidad San Pablo Guatemala — Proyecto Integrador Grupo 5

---

| Campo | Detalle |
|---|---|
| **Proyecto** | Sistema de Gestión de Parqueo USPG |
| **Versión** | 1.0 |
| **Fecha** | Mayo 2026 |
| **Autores** | Marlon Pappa, Javier Estrada |
| **Curso** | Arquitectura de Computadoras |

---

## 1. INTRODUCCIÓN

### 1.1 Propósito

Este documento describe las decisiones de arquitectura de hardware y software del Sistema de Gestión de Parqueo USPG desde la perspectiva de Arquitectura de Computadoras. Se analiza la infraestructura necesaria para soportar el sistema, los principios de diseño de procesadores y servidores aplicados, la integración de dispositivos embebidos IoT, y las estrategias de rendimiento y concurrencia implementadas.

### 1.2 Contexto del sistema

El sistema gestiona 500 espacios de parqueo con actualizaciones en tiempo real, atiende a aproximadamente 3,000 usuarios registrados (estudiantes, docentes, administrativos), procesa múltiples solicitudes simultáneas durante las horas pico (7:00–9:00 AM y 12:00–2:00 PM), y recibe señales continuas de sensores IoT instalados en cada espacio.

---

## 2. NIVELES DE ABSTRACCIÓN HARDWARE-SOFTWARE

La arquitectura von Neumann establece que toda computadora tiene cuatro componentes esenciales: Unidad Central de Procesamiento (CPU), Memoria, Unidad de Entrada/Salida y Bus de comunicación. El sistema de parqueo opera sobre múltiples niveles de esta abstracción:

```
Nivel 6 — Aplicación
  └─ Next.js 16 (JavaScript) — lógica de negocio del parqueo

Nivel 5 — Sistema Operativo
  └─ Linux (Amazon Linux 2 en Vercel/AWS Lambda)

Nivel 4 — Arquitectura de Conjunto de Instrucciones (ISA)
  └─ x86-64 (servidores Vercel) / Xtensa LX6 (ESP32)

Nivel 3 — Microarquitectura
  └─ Intel/AMD multicore con pipeline y caché L1/L2/L3

Nivel 2 — Lógica Digital
  └─ Compuertas, flip-flops, registros

Nivel 1 — Circuitos
  └─ Transistores CMOS

Nivel 0 — Física
  └─ Semiconductores de silicio
```

**Aplicación al proyecto:** El código JavaScript del sistema (Nivel 6) se compila a bytecode V8, que a su vez genera instrucciones x86-64 (Nivel 4) ejecutadas por el procesador físico (Nivel 3). Los sensores ESP32 operan en la arquitectura Xtensa de 32 bits, diferente a la x86-64 del servidor — esta es la **computación heterogénea** del sistema.

---

## 3. ARQUITECTURA DEL SERVIDOR DE PRODUCCIÓN

### 3.1 Infraestructura actual (Vercel + Neon)

El sistema de parqueo se despliega sobre la siguiente infraestructura en producción:

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET / CDN                           │
│              Vercel Edge Network (Anycast)                  │
│         ~300 puntos de presencia worldwide                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS/HTTP2
┌─────────────────────▼───────────────────────────────────────┐
│              CAPA DE COMPUTE (Vercel Functions)             │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Lambda 1 │  │ Lambda 2 │  │ Lambda 3 │  │ Lambda N │   │
│  │ Node.js  │  │ Node.js  │  │ Node.js  │  │ Node.js  │   │
│  │ (128MB)  │  │ (128MB)  │  │ (128MB)  │  │ (128MB)  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └─────────────┴─────────────┴─────────────┘          │
│                         │                                   │
│              Connection Pooler (Prisma)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ PostgreSQL wire protocol
┌─────────────────────────▼───────────────────────────────────┐
│              BASE DE DATOS (Neon Serverless)                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Primary Node (Read/Write)                          │   │
│  │  PostgreSQL 16 — SSD NVMe                           │   │
│  │  WAL (Write-Ahead Log) para durabilidad             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Read Replica (Read Only)                           │   │
│  │  Replicación streaming asíncrona                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Especificación del servidor recomendado para instalación en campus

Para una instalación **on-premise** en la USPG (alternativa al cloud), se recomienda el siguiente diseño de servidor:

#### Servidor de Aplicación (Web Server)

| Componente | Especificación | Justificación |
|---|---|---|
| **CPU** | AMD EPYC 9354 (32 cores / 64 threads) @ 2.85 GHz | Multiprocesamiento simétrico (SMP) — cada request HTTP es un hilo independiente |
| **Arquitectura CPU** | x86-64, out-of-order execution, superscalar | Ejecución especulativa mejora throughput en operaciones I/O-bound |
| **Caché L1** | 32 KB por core (instrucciones) + 32 KB (datos) | Acceso en ~4 ciclos de reloj para código frecuentemente ejecutado |
| **Caché L2** | 512 KB por core | Reduce miss rate para el hot path del escaneo QR |
| **Caché L3** | 256 MB compartida | Crítico para queries frecuentes que caben en caché (view_sesiones_activas) |
| **RAM** | 128 GB DDR5-4800 ECC | Node.js + PostgreSQL + caché de queries; ECC previene corrupción de datos |
| **Almacenamiento** | 2× 1 TB NVMe SSD (RAID 1) | Latencia <0.1ms para I/O de BD; RAID 1 para redundancia |
| **Red** | 2× 25 GbE (bonding activo-pasivo) | Alta disponibilidad de red; ancho de banda para respuestas simultáneas |
| **GPU** | NVIDIA RTX 4000 Ada (20 GB VRAM) | Aceleración de reconocimiento de placas (LPR) con CUDA |

#### Servidor de Base de Datos (DB Server)

| Componente | Especificación | Justificación |
|---|---|---|
| **CPU** | Intel Xeon Gold 6442Y (24 cores) @ 2.6 GHz | PostgreSQL usa un proceso por conexión; más cores = más conexiones concurrentes |
| **RAM** | 256 GB DDR5 ECC | shared_buffers = 64 GB (25% de RAM); effective_cache_size = 192 GB |
| **Almacenamiento WAL** | 2× 512 GB NVMe (RAID 1) | Write-Ahead Log requiere I/O secuencial rápido para durabilidad |
| **Almacenamiento datos** | 4× 2 TB NVMe (RAID 10) | Lectura aleatoria para índices B-tree; RAID 10 = rendimiento + redundancia |
| **Red** | 25 GbE dedicada hacia app server | Latencia <1ms entre app y BD en red local |

---

## 4. DISEÑO DE ESTACIONES HFC PARA LABORATORIOS

### 4.1 ¿Qué es una estación HFC en el contexto universitario?

Una estación HFC (High-Performance Computing Facility) para laboratorios universitarios con IA, simuladores y máquinas virtuales requiere un diseño que maximice el rendimiento por watt, soporte miles de hilos concurrentes y minimice la latencia de acceso a memoria.

### 4.2 Diseño para el Campus USPG

#### Laboratorio de IA y Simulación (30 estaciones)

```
┌──────────────────────────────────────────────────────────┐
│              ESTACIÓN DE TRABAJO HFC                     │
│                                                          │
│  CPU: AMD Ryzen 9 7950X (16 cores / 32 threads)         │
│  ├─ Arquitectura Zen 4, proceso 5nm                      │
│  ├─ Caché L3: 64 MB (crítico para simulaciones)          │
│  └─ TDP: 170W con DVFS (Dynamic Voltage/Freq Scaling)   │
│                                                          │
│  GPU: NVIDIA RTX 4090 (16,384 CUDA cores / 24 GB)       │
│  ├─ Para entrenamiento de modelos de IA                  │
│  ├─ Reconocimiento de placas (LPR) del parqueo          │
│  └─ Tensor Cores para inferencia en tiempo real          │
│                                                          │
│  RAM: 64 GB DDR5-6000 (4× 16 GB dual-channel)           │
│  ├─ Ancho de banda: 96 GB/s                              │
│  └─ Latencia CAS 30 (~10 ns acceso)                     │
│                                                          │
│  Almacenamiento: 2 TB NVMe PCIe 5.0                     │
│  └─ 14,000 MB/s lectura secuencial                      │
│                                                          │
│  Máquinas Virtuales: VMware ESXi / KVM                  │
│  ├─ VM 1: Ubuntu Server (servidor parqueo local)        │
│  ├─ VM 2: Windows (simuladores gráficos)                │
│  └─ VM 3: Kali Linux (laboratorio de ciberseguridad)   │
└──────────────────────────────────────────────────────────┘
```

#### Servidor HPC del laboratorio (1 nodo maestro)

| Componente | Especificación |
|---|---|
| CPU | 2× AMD EPYC 9654 (96 cores cada uno = 192 cores totales) |
| RAM | 1.5 TB DDR5 ECC (12 canales × 128 GB) |
| GPU | 4× NVIDIA A100 80 GB (NVLink) para IA distribuida |
| Interconect | InfiniBand HDR 200 Gb/s entre nodos |
| Almacenamiento | Sistema de archivos paralelo (Lustre/GPFS) 100 TB |

### 4.3 Eficiencia Energética — DVFS (Dynamic Voltage and Frequency Scaling)

El DVFS es una técnica que ajusta dinámicamente el voltaje y la frecuencia del procesador según la carga de trabajo:

```
Carga alta (hora pico 7–9 AM):
  CPU → frecuencia máxima (5.7 GHz turbo)
  Voltaje → 1.35V
  Consumo → 170W
  Throughput → máximo

Carga baja (madrugada):
  CPU → frecuencia mínima (400 MHz)
  Voltaje → 0.75V
  Consumo → 15W
  Ahorro energético → 91%
```

**Aplicación al sistema de parqueo:** El servidor Node.js consume más CPU durante las horas pico de entrada (7–9 AM) cuando cientos de escaneos QR llegan simultáneamente. En horas nocturnas, el servidor apenas procesa polling del mapa. DVFS permite que el hardware se adapte automáticamente, reduciendo el costo eléctrico del campus.

---

## 5. MULTIPROCESAMIENTO Y CONCURRENCIA

### 5.1 Modelo de procesamiento del sistema

El sistema de parqueo maneja concurrencia en múltiples niveles:

#### Nivel 1 — Concurrencia en el servidor de aplicación

```
                    ┌─────────────────┐
  Request 1 (QR)   │                 │  Thread Pool
  Request 2 (mapa) │   Node.js       │  (libuv)
  Request 3 (QR)   │   Event Loop    │──────────────┐
  Request 4 (IoT)  │   (1 hilo)      │              │
  ...              │                 │  Worker 1    │
                   └────────┬────────┘  Worker 2    │
                            │           Worker 3    │
                   I/O      │           Worker 4    │
                 asíncrono  │                       │
                            ▼                       │
                   ┌─────────────────┐              │
                   │  PostgreSQL     │◄─────────────┘
                   │  (multi-process)│
                   └─────────────────┘
```

Node.js usa un modelo de **Event Loop de un solo hilo** con I/O no bloqueante. Esto significa que mientras espera la respuesta de PostgreSQL (operación I/O), el event loop puede atender otros requests. Esto permite manejar miles de conexiones concurrentes con un solo proceso.

#### Nivel 2 — Concurrencia en PostgreSQL

PostgreSQL usa un modelo **multi-proceso** (no multi-hilo): cada conexión cliente genera un proceso hijo independiente en el sistema operativo. Esto garantiza que un query lento no bloquee a otros usuarios.

```
PostgreSQL Master Process
├── Postmaster (gestor de conexiones)
├── Background Writer (escribe páginas sucias a disco)
├── WAL Writer (escribe Write-Ahead Log)
├── Autovacuum (limpieza automática de filas muertas)
├── Worker Process 1 ← Conexión del app server 1
├── Worker Process 2 ← Conexión del app server 2
├── Worker Process 3 ← Conexión del app server 3
└── Worker Process N ← Conexión del app server N
```

#### Nivel 3 — Connection Pooling con Prisma

Para evitar crear un proceso PostgreSQL por cada Lambda de Vercel (que se destruyen y recrean constantemente), Prisma implementa connection pooling:

```javascript
// webapp/src/lib/prisma.js
const prisma = new PrismaClient();
// Un solo cliente reutilizado en todo el ciclo de vida
// Máximo 10 conexiones simultáneas al pool
```

Sin connection pooling, 100 Lambdas simultáneas crearían 100 procesos en PostgreSQL → colapso. Con pooling, esas 100 Lambdas comparten un pool de 10 conexiones → eficiente.

### 5.2 Manejo de condiciones de carrera

Cuando dos vehículos intentan ocupar el mismo espacio simultáneamente, el sistema previene condiciones de carrera mediante **transacciones atómicas con bloqueo implícito**:

```javascript
// qr/scan/route.js — Transacción atómica
const [session] = await prisma.$transaction([
  prisma.parkingSession.create({ data: sessionData }),
  prisma.parkingSpace.update({
    where: { id: space.id },
    data: { status: 'OCCUPIED' }
  }),
]);
```

PostgreSQL usa **MVCC (Multi-Version Concurrency Control)**: cada transacción ve una snapshot consistente de los datos. Si dos transacciones intentan actualizar el mismo espacio, una espera a que la otra confirme (COMMIT) antes de proceder. Esto garantiza que nunca dos vehículos ocupen el mismo espacio.

---

## 6. ARQUITECTURA DE MEMORIA Y LATENCIA

### 6.1 Jerarquía de memoria en el servidor de BD

La latencia de acceso a datos varía dramáticamente según el nivel de la jerarquía de memoria:

| Nivel | Tamaño | Latencia | Ejemplo en el sistema |
|---|---|---|---|
| Registros CPU | 32 bytes | 0.3 ns | Variables locales en funciones SQL |
| Caché L1 | 32 KB/core | 1 ns | Instrucciones del hot path de queries |
| Caché L2 | 512 KB/core | 4 ns | Código de funciones PostgreSQL frecuentes |
| Caché L3 | 256 MB shared | 12 ns | Páginas de índices B-tree frecuentemente accedidos |
| RAM (shared_buffers) | 64 GB | 60 ns | Páginas de ParkingSession activas |
| SSD NVMe | 1 TB | 0.1 ms | Páginas frías de AuditLog histórico |
| Red (Neon cloud) | — | 5 ms | Queries desde Vercel a Neon en otra región |

### 6.2 Optimización de latencia con índices B-tree

Los índices en PostgreSQL son estructuras B-tree almacenadas en disco pero cacheadas en `shared_buffers` (RAM). Una búsqueda en una tabla de 1 millón de filas:

```
Sin índice (sequential scan):
  Leer 1,000,000 filas × 8 KB/página = 8 GB de I/O
  Tiempo: ~8,000 ms

Con índice B-tree en 'placa':
  Altura del árbol = log₂(1,000,000) ≈ 20 niveles
  Leer 20 páginas × 8 KB = 160 KB de I/O
  Tiempo: ~2 ms (si está en caché: <0.1 ms)
```

**En el sistema:** El índice `Vehicle_placa_idx` convierte la búsqueda por placa de O(n) a O(log n). Con 10,000 vehículos registrados, esto reduce la búsqueda de ~10,000 comparaciones a ~14 comparaciones.

### 6.3 PostgreSQL shared_buffers — Caché en RAM

```
# Configuración recomendada para servidor USPG (256 GB RAM):
shared_buffers = 64 GB          # 25% de RAM
effective_cache_size = 192 GB   # Lo que el OS cachea también
work_mem = 256 MB               # Memoria por operación de sort/hash
maintenance_work_mem = 4 GB     # Para VACUUM, CREATE INDEX
max_connections = 200           # Procesos PostgreSQL máximos
```

Las vistas más consultadas (`view_sesiones_activas`, `view_ocupacion_por_zona`) son lo suficientemente pequeñas para caber completamente en `shared_buffers`, eliminando el acceso a disco en condiciones normales.

---

## 7. SISTEMA EMBEBIDO IoT — ESP32

### 7.1 Arquitectura del microcontrolador ESP32

El ESP32 es el microcontrolador seleccionado para los sensores de los espacios de parqueo. Su arquitectura es fundamentalmente diferente a la del servidor:

```
┌─────────────────────────────────────────────────┐
│                   ESP32-WROOM-32                 │
│                                                  │
│  CPU: Xtensa LX6 dual-core @ 240 MHz            │
│  ├─ Core 0: Protocolo WiFi (dedicado)           │
│  └─ Core 1: Lógica de la aplicación             │
│                                                  │
│  Arquitectura: RISC (32-bit)                    │
│  Pipeline: 5 etapas (Fetch, Decode, Execute,    │
│            Memory, Writeback)                   │
│                                                  │
│  Memoria:                                        │
│  ├─ ROM: 448 KB (código de boot)                │
│  ├─ RAM: 520 KB SRAM                            │
│  └─ Flash: 4 MB (programa del sensor)           │
│                                                  │
│  Periféricos usados:                            │
│  ├─ GPIO → sensor ultrasónico HC-SR04           │
│  ├─ WiFi 802.11 b/g/n → envío HTTP a la API    │
│  └─ ADC → lectura analógica de sensores         │
│                                                  │
│  Consumo energético:                            │
│  ├─ Activo (WiFi TX): 240 mA                   │
│  ├─ Activo (sin WiFi): 80 mA                   │
│  └─ Deep Sleep: 10 µA (DVFS extremo)           │
└─────────────────────────────────────────────────┘
```

### 7.2 Flujo de datos del sensor al servidor

```
[Espacio A-042]
    │
    │ Onda ultrasónica
    ▼
[Sensor HC-SR04]
    │ Señal digital (echo pulse)
    │ Si distancia < 30 cm → OCCUPIED
    │ Si distancia > 30 cm → AVAILABLE
    ▼
[ESP32 Core 1]
    │ Compara con estado anterior
    │ Si cambió → prepara HTTP request
    │ Si igual → vuelve a dormir (Deep Sleep 5s)
    ▼
[ESP32 Core 0 — WiFi]
    │ POST https://final-blond-ten.vercel.app/api/parqueo/spaces/sensor
    │ Headers: { "x-api-key": "ESP32_SECRET" }
    │ Body: { "space_code": "A-042", "status": "OCCUPIED" }
    ▼
[Vercel Lambda — spaces/sensor/route.js]
    │ UPDATE "ParkingSpace" SET status='OCCUPIED', last_sensor_update=NOW()
    │ WHERE code = 'A-042'
    ▼
[PostgreSQL — Neon]
    │ Dato persistido en disco (WAL)
    ▼
[Mapa /parqueo/mapa — polling cada 3s]
    │ GET /api/parqueo/spaces
    ▼
[Guardia ve espacio A-042 en rojo en max 3 segundos]
```

### 7.3 Comparación de arquitecturas CPU: Servidor vs ESP32

| Característica | Servidor (AMD EPYC) | ESP32 |
|---|---|---|
| Arquitectura ISA | x86-64 (CISC) | Xtensa LX6 (RISC) |
| Frecuencia | 2.85 GHz (boost 4.0 GHz) | 240 MHz |
| Cores | 32 cores / 64 threads | 2 cores |
| RAM | 128 GB DDR5 | 520 KB SRAM |
| Consumo | 280W TDP | 0.24W activo |
| Costo | ~$4,000 | ~$5 |
| Rol | Procesar lógica de negocio compleja | Leer sensor y enviar señal |
| Paradigma | Von Neumann completo | Von Neumann simplificado |

Esta diferencia ilustra el concepto de **computación heterogénea**: tareas diferentes requieren hardware diferente. El ESP32 es ideal para leer sensores y enviar señales simples. El servidor x86-64 es necesario para ejecutar JOINs complejos, criptografía JWT y lógica de negocio.

---

## 8. COMPUTACIÓN HETEROGÉNEA EN EL SISTEMA

El sistema de parqueo implementa computación heterogénea usando tres tipos de procesadores con capacidades complementarias:

### 8.1 CPU (x86-64) — Servidor Vercel/AWS
**Para qué:** Lógica de negocio, validaciones, JWT, respuestas HTTP
- Maneja el Event Loop de Node.js
- Ejecuta las 50+ API Routes
- Procesa las transacciones SQL
- Verifica tokens JWT con algoritmo HS256

### 8.2 GPU (NVIDIA CUDA) — Reconocimiento de placas
**Para qué:** Procesamiento paralelo masivo de imágenes
- Las cámaras LPR (License Plate Recognition) envían frames de video
- La GPU procesa miles de píxeles en paralelo usando CUDA cores
- Una GPU RTX 4000 tiene 6,144 CUDA cores vs 32 cores del CPU
- Esto permite reconocer una placa en <50ms

```
Frame de cámara (1920×1080 px = 2,073,600 píxeles)
    ↓
GPU — 6,144 CUDA cores procesan en paralelo
    ↓
Red neuronal (YOLO v8 optimizada con TensorRT)
    ↓
Resultado: placa detectada "P-123ABC" en 35ms
    ↓
POST /api/parqueo/sessions con entry_method='PLATE'
```

### 8.3 Microcontrolador (ESP32) — Sensores IoT
**Para qué:** Lectura de sensores y transmisión de datos simples
- Consume 50,000× menos energía que el servidor
- Puede operar con batería (Deep Sleep entre lecturas)
- 1 ESP32 por espacio = 500 ESP32 en todo el campus

---

## 9. DISEÑO PARA ALTA CONCURRENCIA

### 9.1 Estimación de carga del sistema

```
Usuarios registrados: ~3,000
Vehículos registrados: ~2,500
Horas pico: 7:00–9:00 AM y 12:00–2:00 PM
Entradas simultáneas máximas: ~200 vehículos/hora = 3.3/min = 0.055/seg

Requests HTTP estimados (hora pico):
├─ Escaneos QR: 200/hora
├─ Polling del mapa (por sesión abierta): 20 usuarios × 20 req/min = 400 req/min
├─ Polling dashboard: 5 usuarios × 2 req/min = 10 req/min
├─ Señales ESP32: 500 sensores × 1 req/5min = 100 req/min
└─ Total estimado: ~510 requests/minuto ≈ 8.5 requests/segundo

Vercel maneja hasta 1,000 req/seg por defecto → capacidad suficiente.
```

### 9.2 Estrategias de escalabilidad implementadas

#### Escalado horizontal automático (Vercel)
Vercel escala horizontalmente creando nuevas instancias Lambda de forma automática cuando aumenta la carga. No hay un único servidor que pueda saturarse.

#### Connection pooling (Prisma)
```javascript
// Sin pooling: 100 Lambdas = 100 procesos PostgreSQL = colapso
// Con pooling: 100 Lambdas comparten pool de 10 conexiones
const prisma = global.prisma ?? new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});
```

#### Queries paralelos en el dashboard
```javascript
// dashboard/route.js — 4 queries en paralelo, no secuencial
const [spaces, sessions, revenue, zones] = await Promise.all([
  prisma.parkingSpace.groupBy({ by: ['status'], _count: true }),
  prisma.parkingSession.count({ where: { status: 'ACTIVE' } }),
  prisma.parkingSession.aggregate({ _sum: { amount_due: true } }),
  prisma.$queryRaw`SELECT * FROM view_ocupacion_por_zona`,
]);
// Tiempo total = max(t1, t2, t3, t4) en lugar de t1+t2+t3+t4
```

#### Índices para reducir I/O
Los 35+ índices en la base de datos reducen el trabajo del CPU y del disco al hacer búsquedas O(log n) en lugar de O(n).

---

## 10. SEGURIDAD A NIVEL DE ARQUITECTURA

### 10.1 Aislamiento de procesos
Cada Lambda de Vercel corre en un contenedor aislado (microVM con Firecracker). Un crash en el proceso de un request no afecta a otros usuarios.

### 10.2 Cifrado en tránsito
Toda comunicación usa TLS 1.3 (HTTPS). Esto incluye:
- Navegador ↔ Vercel (usuarios)
- Vercel ↔ Neon (base de datos) via SSL
- ESP32 ↔ Vercel (sensores) via HTTPS

### 10.3 Cifrado en reposo
Neon PostgreSQL cifra los datos en disco con AES-256. Los backups también están cifrados.

### 10.4 Separación CPU/memoria entre usuarios
El modelo serverless garantiza que el espacio de memoria de un request no sea accesible por otro request. No hay memoria compartida entre sesiones de diferentes usuarios.

---

## 11. RESUMEN DE COMPONENTES POR CAPA

```
┌──────────────────────────────────────────────────────────────┐
│  CAPA USUARIO                                                │
│  Navegador web (Chrome/Firefox) en PC, tablet, móvil        │
│  CPU: cualquier x86-64 o ARM moderno                        │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS / TLS 1.3
┌──────────────────────▼───────────────────────────────────────┐
│  CAPA EDGE (CDN)                                             │
│  Vercel Edge Network — ~300 nodos globales                  │
│  CPU: x86-64, ARM64 (Graviton en AWS)                       │
│  Función: TLS termination, caché de assets estáticos        │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP interno
┌──────────────────────▼───────────────────────────────────────┐
│  CAPA COMPUTE (Serverless)                                   │
│  Vercel Functions (AWS Lambda bajo el capó)                 │
│  CPU: Intel Xeon / AMD EPYC (compartido, multi-tenant)      │
│  RAM: 128 MB por función (escalable)                        │
│  Runtime: Node.js 22 LTS                                    │
│  Framework: Next.js 16 App Router                           │
└──────────────────────┬───────────────────────────────────────┘
                       │ PostgreSQL wire protocol / TLS
┌──────────────────────▼───────────────────────────────────────┐
│  CAPA DATOS                                                  │
│  Neon Serverless PostgreSQL 16                               │
│  CPU: AMD EPYC (Neon managed)                               │
│  RAM: shared_buffers para caché de páginas                  │
│  Almacenamiento: SSD NVMe con WAL                           │
│  19 tablas, 35+ índices, 6 triggers, 5 SPs, 4 funciones    │
└──────────────────────────────────────────────────────────────┘
                       ▲
                       │ HTTPS / POST
┌──────────────────────┴───────────────────────────────────────┐
│  CAPA IoT                                                    │
│  500× ESP32-WROOM-32                                        │
│  CPU: Xtensa LX6 dual-core 240 MHz (RISC)                  │
│  RAM: 520 KB SRAM                                           │
│  Sensor: HC-SR04 ultrasónico                               │
│  Conectividad: WiFi 802.11 b/g/n                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 12. GLOSARIO DE TÉRMINOS DE ARQUITECTURA DE COMPUTADORAS

| Término | Definición aplicada al proyecto |
|---|---|
| **Von Neumann** | Modelo base de toda la arquitectura: CPU + Memoria + I/O + Bus. Tanto el servidor como el ESP32 siguen este modelo |
| **ISA** | Instruction Set Architecture. El servidor usa x86-64 (CISC), el ESP32 usa Xtensa (RISC) |
| **Pipeline** | El CPU divide la ejecución en etapas (Fetch→Decode→Execute→Memory→Writeback) para procesar múltiples instrucciones simultáneamente |
| **Multicore/SMP** | El servidor tiene 32 cores que ejecutan código en paralelo real (Symmetric Multi-Processing) |
| **DVFS** | Dynamic Voltage/Frequency Scaling — ajusta voltaje y frecuencia según carga para ahorrar energía |
| **Computación heterogénea** | El sistema usa CPU (lógica), GPU (imágenes) y MCU (sensores) — cada procesador optimizado para su tarea |
| **Caché L1/L2/L3** | Jerarquía de memoria de alta velocidad que reduce accesos a RAM |
| **MVCC** | Multi-Version Concurrency Control — mecanismo de PostgreSQL para manejar transacciones concurrentes sin bloqueos excesivos |
| **WAL** | Write-Ahead Log — garantiza durabilidad en PostgreSQL: el cambio se registra en log antes de escribirse en disco |
| **Connection pooling** | Reutilización de conexiones a BD para evitar el overhead de crear/destruir procesos PostgreSQL |
| **Deep Sleep** | Modo de ultra bajo consumo del ESP32 (10 µA) cuando no hay actividad del sensor |
| **CUDA** | Compute Unified Device Architecture — plataforma de NVIDIA para programar la GPU con miles de hilos paralelos |
| **TensorRT** | Librería de NVIDIA que optimiza redes neuronales para inferencia en GPU con latencia mínima |
| **RAID 10** | Combinación de RAID 1 (espejo) y RAID 0 (striping) — rendimiento + redundancia para el almacenamiento de BD |
| **B-tree** | Estructura de datos de los índices PostgreSQL — búsqueda O(log n) en lugar de O(n) |
