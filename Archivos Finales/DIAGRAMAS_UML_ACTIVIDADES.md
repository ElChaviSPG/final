# Diagramas UML de Actividades — Smart Parking USPG Grupo 5
> Pega cada bloque en **https://mermaid.live** para verlo y exportarlo

---

## Diagrama 1 — Entrada de Vehículo (QR)

```mermaid
flowchart TD
    A([🚗 Vehículo llega al campus]) --> B[Guardia abre\n/parqueo/escaner]
    B --> C[Escanea QR del usuario]
    C --> D[POST /api/parqueo/qr/scan]

    D --> E{¿Usuario existe\nen el sistema?}
    E -- No --> F([❌ QR inválido o expirado])
    E -- Sí --> G{¿Vehículo en\nlista negra?}

    G -- Sí --> H([🚫 Acceso denegado\nBlacklist])
    G -- No --> I{¿Tiene deuda\npendiente?}

    I -- Sí --> J([💳 Acceso denegado\nDeuda pendiente])
    I -- No --> K{¿Ya tiene\nsesión ACTIVE?}

    K -- Sí --> L([🔄 Es una SALIDA\nver Diagrama 2])
    K -- No --> M[Buscar espacio\nDISPONIBLE más cercano]

    M --> N{¿Hay espacio\ndisponible?}
    N -- No --> O([🅿️ Parqueo lleno])
    N -- Sí --> P{¿Tiene suscripción\nACTIVE?}

    P -- Sí --> Q[amount_due = 0\nis_paid = true]
    P -- No --> R{¿Hay evento\nactivo FLAT_RATE?}

    R -- Sí --> S[amount_due = flat_rate\ndel evento]
    R -- No --> T[Tarifa normal por rol\nADMIN/TEACHER=Q0\nSTUDENT=Q5/h\nVISITOR=Q10/h]

    Q --> U
    S --> U
    T --> U

    U[🔒 Transacción Atómica\nINSERT ParkingSession status=ACTIVE\nUPDATE ParkingSpace status=OCCUPIED]

    U --> V[⚡ Trigger automático\ntrigger_audit_acceso\nINSERT AuditLog]

    V --> W([✅ Entrada registrada\nMuestra: placa, nombre,\nzona, espacio asignado])

    style A fill:#dcfce7,stroke:#16a34a
    style F fill:#fee2e2,stroke:#dc2626
    style H fill:#fee2e2,stroke:#dc2626
    style J fill:#fee2e2,stroke:#dc2626
    style O fill:#fef3c7,stroke:#d97706
    style L fill:#dbeafe,stroke:#2563eb
    style W fill:#dcfce7,stroke:#16a34a
    style U fill:#1e3a5f,color:#fff
    style V fill:#7c3aed,color:#fff
```

---

## Diagrama 2 — Salida y Pago

```mermaid
flowchart TD
    A([🚗 Vehículo quiere salir]) --> B[Guardia escanea\nel mismo QR]
    B --> C[POST /api/parqueo/qr/scan]
    C --> D{Sistema detecta\nsesión ACTIVE\nexistente}

    D -- No hay sesión --> E([❌ Sin sesión activa])
    D -- Hay sesión --> F[Calcular duración\nduration_minutes =\nnow - entry_time]

    F --> G{¿Tiene suscripción\nACTIVE?}

    G -- Sí --> H[amount_due = 0\nis_paid = true]
    G -- No --> I{¿Hay evento\nactivo FLAT_RATE?}

    I -- Sí --> J[amount_due = flat_rate]
    I -- No --> K[Calcular por rol]

    K --> K1{Rol del usuario}
    K1 -- ADMIN / SECURITY --> K2[Q0 — Exento]
    K1 -- TEACHER --> K3{¿Más de\n8 horas?}
    K3 -- No --> K4[Q0 — Gratis]
    K3 -- Sí --> K5[Excedente × Q5/hora]
    K1 -- STUDENT --> K6[duration_min/60 × Q5]
    K1 -- VISITOR --> K7[duration_min/60 × Q10]

    H --> L
    J --> L
    K2 --> L
    K4 --> L
    K5 --> L
    K6 --> L
    K7 --> L

    L{¿amount_due = 0?}

    L -- Sí gratis --> M[🔒 Transacción Atómica\nUPDATE Session status=COMPLETED\nis_paid=true\nUPDATE ParkingSpace AVAILABLE]

    L -- No hay cobro --> N[UPDATE Session\nexit_time, duration, amount_due\nstatus sigue ACTIVE]

    N --> O[💳 Guardia cobra al usuario\nEfectivo / Tarjeta / QR]
    O --> P[POST /api/parqueo/payments\nINSERT Payment status=COMPLETED]
    P --> Q[🔒 Transacción\nUPDATE Session status=COMPLETED\nUPDATE ParkingSpace AVAILABLE]

    M --> R[⚡ Trigger automático\ntrigger_liberar_espacio_al_salir\nverifica exit_time cambió]
    Q --> R

    R --> S([✅ Salida registrada\nMuestra: duración,\nmonto cobrado, espacio libre])

    style A fill:#dcfce7,stroke:#16a34a
    style E fill:#fee2e2,stroke:#dc2626
    style S fill:#dcfce7,stroke:#16a34a
    style M fill:#1e3a5f,color:#fff
    style Q fill:#1e3a5f,color:#fff
    style R fill:#7c3aed,color:#fff
```

---

## Diagrama 3 — Visitante con QR Temporal

```mermaid
flowchart TD
    A([👤 Visitante externo\nquiere ingresar]) --> B[Guardia va a\n/parqueo/escaner]
    B --> C[Sección: Generar QR Visitante]
    C --> D[Ingresa nombre del visitante\ny placa del vehículo]
    D --> E[POST /api/parqueo/qr/visitor]

    E --> F[INSERT VisitorQR\nqr_code = VIS-timestamp-NOMBRE\nexpires_at = now + 2 horas\nis_used = false]

    F --> G[Genera imagen QR\nen base64 con librería qrcode]

    G --> H{¿Enviar por email?}
    H -- Sí --> I[POST /api/parqueo/qr/send-email\nResend SDK envía imagen]
    H -- No --> J[Guardia muestra QR\nen pantalla / imprime]

    I --> J

    J --> K([🕐 Visitante llega\ny presenta el QR])
    K --> L[Guardia escanea\nPOST /api/parqueo/qr/scan]

    L --> M{¿is_used = false\nY expires_at > now?}
    M -- QR expirado --> N([❌ QR expirado\nGenerar uno nuevo])
    M -- Ya usado --> O{¿Hay sesión\nACTIVE?}
    O -- Sí --> P([🔄 Es una SALIDA\nver Diagrama 2 con\ntarifa VISITOR Q10/h])
    O -- No --> N

    M -- Válido --> Q{¿Vehículo ya\nregistrado en BD?}
    Q -- Sí --> S
    Q -- No --> R[Crear User VISITOR\ntemporary + Vehicle\ncon la placa]

    R --> S[🔒 Transacción Atómica\nINSERT ParkingSession\nentry_method = VISITOR_QR\nUPDATE ParkingSpace OCCUPIED\nUPDATE VisitorQR is_used=true]

    S --> T[UPDATE VisitorQR\nsession_id = session.id]

    T --> U([✅ Visitante ingresado\nTarifa: Q10/hora\nExpira en 2h])

    style A fill:#fef3c7,stroke:#d97706
    style N fill:#fee2e2,stroke:#dc2626
    style P fill:#dbeafe,stroke:#2563eb
    style U fill:#dcfce7,stroke:#16a34a
    style S fill:#1e3a5f,color:#fff
```

---

## Diagrama 4 — Reserva de Espacio

```mermaid
flowchart TD
    A([👤 Usuario quiere\nreservar un espacio]) --> B[Va a /parqueo/reservas]
    B --> C[Ve mapa interactivo\nCampusMapPicker]
    C --> D[Selecciona zona,\nespacio, fecha y hora]
    D --> E[POST /api/parqueo/reservations]

    E --> F{¿Usuario\nautenticado?}
    F -- No --> G([❌ No autorizado\nRedirecciona a /login])
    F -- Sí --> H[Verificar overlap:\nSELECT COUNT FROM Reservation\nWHERE space_id = X\nAND status IN CONFIRMED,PENDING\nAND NOT end<=start OR start>=end]

    H --> I{¿Hay conflicto\nde horario?}
    I -- Sí --> J([⚠️ Espacio ya reservado\nen ese horario])
    I -- No --> K{¿El espacio está\ndisponible?}

    K -- OCCUPIED/MAINTENANCE --> L([❌ Espacio no disponible])
    K -- AVAILABLE/RESERVED --> M[🔒 Transacción Atómica\nINSERT Reservation status=CONFIRMED\nUPDATE ParkingSpace status=RESERVED]

    M --> N{¿Enviar QR\npor email?}
    N -- Sí --> O[POST /api/parqueo/qr/send-email\nenvía confirmación con Resend]
    N -- No --> P

    O --> P([✅ Reserva confirmada\nEspacio bloqueado hasta\nla hora acordada])

    P --> Q([🕐 Usuario llega\na la hora reservada])
    Q --> R[Escanea QR →\nFlujo normal de entrada\nDiagrama 1]

    R --> S[UPDATE Reservation\nstatus = USED]
    S --> T[⚡ Trigger automático\ntrigger_expirar_reservas\nParkingSpace → AVAILABLE\nluego → OCCUPIED por la sesión]

    T --> U([✅ Reserva utilizada\nSesión activa creada])

    style A fill:#dbeafe,stroke:#2563eb
    style G fill:#fee2e2,stroke:#dc2626
    style J fill:#fef3c7,stroke:#d97706
    style L fill:#fee2e2,stroke:#dc2626
    style M fill:#1e3a5f,color:#fff
    style T fill:#7c3aed,color:#fff
    style U fill:#dcfce7,stroke:#16a34a
    style P fill:#dcfce7,stroke:#16a34a
```

---

## Diagrama 5 — Autenticación y Control de Acceso

```mermaid
flowchart TD
    A([👤 Usuario accede\nal sistema]) --> B[Va a /login]
    B --> C[Ingresa email\ny contraseña]
    C --> D[POST /api/parqueo/auth]

    D --> E{¿Usuario existe\nen BD?}
    E -- No --> F([❌ Credenciales inválidas])
    E -- Sí --> G[bcrypt.compare\ncontraseña vs password_hash]

    G --> H{¿Contraseña\ncorrecta?}
    H -- No --> I([❌ Credenciales inválidas])
    H -- Sí --> J{¿is_active = true?}

    J -- No --> K([🚫 Cuenta desactivada])
    J -- Sí --> L[Generar tokens JWT\nAccess Token: 1 hora\nRefresh Token: 7 días\nPayload: id, email, role]

    L --> M[UPDATE User\nlast_login_at = NOW]
    M --> N([✅ Login exitoso\nRedirecciona según rol])

    N --> O{Rol del usuario}
    O -- ADMIN --> P[/parqueo/dashboard\nAcceso total]
    O -- SECURITY --> Q[/parqueo/escaner\n/parqueo/seguridad]
    O -- TEACHER --> R[/parqueo/reservas\nVista docente]
    O -- STUDENT --> S[/parqueo/reservas\nVista estudiante]

    P --> T{Cada request\nal API}
    Q --> T
    R --> T
    S --> T

    T --> U[Middleware verifica\nAuthorization: Bearer token]
    U --> V{¿Token válido\ny no expirado?}
    V -- No --> W[POST /api/parqueo/auth/refresh\ncon Refresh Token]
    W --> X{¿Refresh válido?}
    X -- No --> Y([🔒 Sesión expirada\nVolver a /login])
    X -- Sí --> Z[Nuevo Access Token\n1 hora más]
    Z --> T
    V -- Sí --> AA{¿Rol autorizado\npara esta ruta?}
    AA -- No --> AB([🚫 Forbidden 403])
    AA -- Sí --> AC([✅ Request procesado])

    style A fill:#dbeafe,stroke:#2563eb
    style F fill:#fee2e2,stroke:#dc2626
    style I fill:#fee2e2,stroke:#dc2626
    style K fill:#fee2e2,stroke:#dc2626
    style Y fill:#fee2e2,stroke:#dc2626
    style AB fill:#fee2e2,stroke:#dc2626
    style L fill:#1e3a5f,color:#fff
    style AC fill:#dcfce7,stroke:#16a34a
    style N fill:#dcfce7,stroke:#16a34a
```

---

## Diagrama 6 — Sensor IoT (ESP32) en Tiempo Real

```mermaid
flowchart TD
    A([⚡ Sensor HC-SR04\ndetecta cambio]) --> B{¿Distancia\n< umbral?}
    B -- Sí → ocupado --> C[ESP32 prepara señal\nstatus = OCCUPIED]
    B -- No → libre --> D[ESP32 prepara señal\nstatus = AVAILABLE]

    C --> E[POST /api/parqueo/spaces/sensor\nBody: space_code, status]
    D --> E

    E --> F{¿API Key\nválida?}
    F -- No --> G([❌ 401 Unauthorized])
    F -- Sí --> H[Buscar ParkingSpace\nWHERE code = space_code]

    H --> I{¿Espacio\nexiste?}
    I -- No --> J([❌ 404 Not Found])
    I -- Sí --> K[UPDATE ParkingSpace\nstatus = nuevo_status\nlast_sensor_update = NOW]

    K --> L([✅ 200 OK])

    L --> M([🗺️ Mapa /parqueo/mapa\nhace polling cada 3 segundos])
    M --> N[GET /api/parqueo/spaces]
    N --> O[SELECT * FROM ParkingSpace\nWHERE campus_id = X\nORDER BY zone, code]
    O --> P[Frontend colorea espacios\n🟢 AVAILABLE\n🔴 OCCUPIED\n🟡 RESERVED\n⚫ MAINTENANCE]
    P --> Q([👁️ Guardia ve cambio\nen pantalla en max 3s])

    style A fill:#fef3c7,stroke:#d97706
    style G fill:#fee2e2,stroke:#dc2626
    style J fill:#fee2e2,stroke:#dc2626
    style K fill:#1e3a5f,color:#fff
    style L fill:#dcfce7,stroke:#16a34a
    style Q fill:#dcfce7,stroke:#16a34a
```

---

## Cómo usar estos diagramas

1. Ve a **https://mermaid.live**
2. Borra el contenido por defecto
3. Copia el bloque ` ```mermaid ... ``` ` del diagrama que quieras
4. Pégalo — el diagrama aparece a la derecha
5. Exporta con el botón **PNG** o **SVG**

> Para el examen se recomienda imprimir los **Diagramas 1, 2 y 4** (entrada, salida y reserva) que son los flujos más preguntados por los catedráticos.
