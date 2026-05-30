# Guía de Estructura y Uso de Prisma - USPG

Este documento explica cómo está organizado el proyecto y cómo utilizar Prisma ORM para gestionar la base de datos de forma eficiente y segura.

## 📂 Estructura del Proyecto

El proyecto está organizado en una estructura monorepositorio simplificada:

*   **`/prisma`**: Contiene la definición del esquema de la base de datos (`schema.prisma`).
*   **`/webapp`**: Directorio principal de la aplicación Next.js (Frontend y API).
    *   **`/src/app`**: Rutas de la aplicación (App Router).
    *   **`/src/components`**: Componentes reutilizables (Sidebar, Shell, UI).
    *   **`/public`**: Activos estáticos (Logo USPG, assets del template).
*   **`SKILL_BRANDING.md`**: Guía crítica de diseño para mantener los colores Corinto y estilos institucionales.

---

## 💎 Introducción a Prisma

Prisma es el ORM (Object-Relational Mapping) que utilizamos para interactuar con la base de datos. En lugar de escribir SQL puro, definimos modelos en un lenguaje sencillo y Prisma genera código Javascript/Typescript para nosotros.

### 1. Configuración de la Base de Datos
Para conectar una base de datos real (PostgreSQL, MySQL, SQL Server), edita el archivo `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql" // Cambia según tu BD
  url      = env("DATABASE_URL")
}
```

Luego, añade el `DATABASE_URL` en tu archivo `.env` en la raíz.

### 2. Comandos Esenciales de Prisma

Debes ejecutar estos comandos desde la **raíz** del proyecto:

*   **`npx prisma generate`**: Genera el cliente de Prisma. Ejecútalo cada vez que cambies el archivo `schema.prisma`.
*   **`npx prisma db push`**: Sincroniza tu esquema local con la base de datos real (ideal para desarrollo rápido).
*   **`npx prisma studio`**: Abre una interfaz visual en tu navegador para ver y editar los datos de tu base de datos.

### 3. Ejemplo de Uso en el Código

Para usar Prisma en tus rutas de Next.js (Server Components o API Routes):

```javascript
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function getUsuarios() {
  const users = await prisma.user.findMany()
  return users
}
```

### 4. Flujo de Trabajo Recomendado
1.  **Define tu modelo** en `schema.prisma` (ej: `model Estudiante`, `model Nota`).
2.  **Sincroniza** con `npx prisma db push`.
3.  **Genera el cliente** con `npx prisma generate`.
4.  **Consulta los datos** usando el objeto `prisma` en tu código.

---

## ⚠️ Notas Importantes
*   **Seguridad**: Nunca subas el archivo `.env` con credenciales reales al repositorio.
*   **Consistencia**: Antes de crear tablas nuevas, revisa si puedes relacionarlas con los modelos existentes para mantener la integridad de los datos académicos.
