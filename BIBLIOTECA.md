# Módulo de Biblioteca - Documentación de Estado Actual

Este documento describe el estado de implementación del **Módulo de Biblioteca** en el sistema actual de la USPG.

---

## 📊 Estado de Implementación: **Esqueleto / Placeholder (En Construcción)**

Actualmente, el módulo de biblioteca está en una **fase inicial de maquetación (esquema o placeholder)**. Tiene puntos de acceso visuales integrados en la interfaz de usuario, pero no cuenta con lógica de negocio, componentes interactivos ni conexión a base de datos.

### 📌 Puntos de Integración en el Proyecto

El módulo está enlazado en los siguientes archivos del proyecto:

1. **Acceso desde el Dashboard Principal**:
   * **Archivo**: [page.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/page.js#L26-L31)
   * **Descripción**: Una tarjeta en el menú principal que enlaza a `/biblioteca` con la descripción: *"Material disponible, préstamos y estudiantes."*

2. **Acceso desde el Menú Lateral (Sidebar)**:
   * **Archivos**: 
     * [Sidebar.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/components/Sidebar.js#L10)
     * [menu.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/lib/navigation/menu.js#L6)
   * **Descripción**: Opción con el icono de libro (`fa-book`) que redirige a la ruta del módulo.

3. **Vista de la Página (Frontend)**:
   * **Archivo**: [page.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/biblioteca/page.js)
   * **Descripción**: Renderiza una tarjeta de Bootstrap/AdminLTE con el título **"Biblioteca"** y el texto temporal **"Módulo en construcción..."**.

---

## 🗄️ Base de Datos (Prisma Schema)

Actualmente **no existen modelos de base de datos** creados para la biblioteca en ninguno de los esquemas del proyecto:
* [schema.prisma (Webapp)](file:///Users/gortiz/Documents/uspg/final/webapp/prisma/schema.prisma)
* [schema.prisma (Raíz)](file:///Users/gortiz/Documents/uspg/final/prisma/schema.prisma)

---

## 🚀 Propuesta de Diseño para el Futuro

Para implementar completamente el módulo de biblioteca, se sugiere el siguiente diseño e integración:

### 1. Modelos de Base de Datos Sugeridos (Prisma)
Se pueden añadir los siguientes modelos al archivo `schema.prisma`:

```prisma
// Modelo para catalogar los libros
model Libro {
  id             Int        @id @default(autoincrement())
  titulo         String
  autor          String
  isbn           String     @unique
  editorial      String?
  anioPublicacion Int?
  cantidadTotal  Int        @default(1)
  disponibles    Int        @default(1)
  
  prestamos      Prestamo[]
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@map("libro")
}

// Modelo para el registro de préstamos de libros
model Prestamo {
  id                    String        @id @default(uuid())
  usuarioId             String        @map("usuario_id")
  libroId               Int           @map("libro_id")
  fechaPrestamo         DateTime      @default(now()) @map("fecha_prestamo")
  fechaDevolucionLimite DateTime      @map("fecha_devolucion_limite")
  fechaDevolucionReal   DateTime?     @map("fecha_devolucion_real")
  estado                EstadoPrestamo @default(ACTIVO)
  notas                 String?

  usuario               Usuario       @relation(fields: [usuarioId], references: [id])
  libro                 Libro         @relation(fields: [libroId], references: [id])

  @@map("prestamo")
}

enum EstadoPrestamo {
  ACTIVO
  DEVUELTO
  ATRASADO
  PERDIDO
}
```

### 2. Flujo de Vistas a Desarrollar
* **Vista Pública (Estudiantes/Catedráticos)**: Catálogo de libros con buscador, filtros de categorías y un botón para solicitar préstamo de copias disponibles.
* **Vista de Administración (Bibliotecario/Admin)**:
  * CRUD para catalogar libros (Título, autor, ISBN, stock).
  * Panel de control para registrar entregas y devoluciones de libros.
  * Reporte de alumnos con préstamos vencidos (conectado con el sistema de multas/sanciones si se requiere).
