# Guía de Branding y Estilos - USPG Admin

Este documento sirve como referencia para mantener la consistencia visual del sistema. Cualquier ajuste o nuevo módulo debe seguir estas reglas para no romper la estética institucional.

## 🎨 Paleta de Colores Institucionales

- **Corinto (Primario):** `#800020`
  - Uso: Fondo de iconos activos, barras indicadoras, títulos de secciones internas.
- **Gris Oscuro (Fondo Sistema):** `#1a1a2e` (Dark Mode)
- **Gris Claro (Contraste):** `#e0e0e0`
  - Uso: Títulos en el Dashboard sobre fondo oscuro.
- **Blanco:** `#ffffff`
  - Uso: Iconos activos, texto sobre fondos oscuros.

## 📐 Componentes UI

### 1. Tarjetas del Dashboard (Grid Principal)
Deben usar la clase `.dashboard-card` definida en `globals.css`.
- **Efectos:** Glassmorphism sutil, bordes redondeados (`12px`).
- **Hover:** Elevación (`translateY(-5px)`), aumento de brillo y sombra profunda.
- **Tipografía:** 
  - Títulos: Gris claro (`#e0e0e0`) en Dark Mode, Negro (`#333333`) en Light Mode.
  - Subtítulos: Gris tenue, todo en mayúsculas, espaciado de letras (`1px`).

### 2. Sidebar (Navegación)
- **Selección Activa:** Fondo Corinto para el icono, barra vertical Corinto a la derecha, texto en blanco (Dark) o Gris Oscuro (Light).
- **Iconos:** Siempre deben ser FontAwesome (`fa fa-icon-name`). El icono seleccionado **siempre** debe ser blanco.

### 3. Header
- **Fondo:** Siempre `transparent` para heredar el color del sistema.
- **Tipografía:** Usar `font-weight: 500` para títulos de navegación superior.

## 🌓 Gestión de Temas (Light/Dark)

El sistema utiliza la clase `.dark-mode` en el elemento `body`. 
- **NO hardcodear colores** en los componentes. Usar los selectores de `globals.css` que dependen de `.dark-mode` o `:not(.dark-mode)`.
- **Ejemplo de lógica:**
  ```css
  .dark-mode .mi-elemento { background: #1a1a2e; }
  body:not(.dark-mode) .mi-elemento { background: #ffffff; }
  ```

## 📝 Reglas de Oro para el Equipo de Desarrollo

1. **Tipografía:** No cambiar la fuente base del template (Inter/Roboto). Mantener los pesos (`bold` para títulos, `normal` para descripción).
2. **Iconografía:** Usar fondos Corinto (`#800020`) para resaltar acciones principales o estados activos.
3. **Botones:** Los botones principales deben seguir la estética de las tarjetas (bordes redondeados, transiciones suaves).
4. **Espaciado:** Mantener el padding de las tarjetas en `2rem 1.5rem` para dar "aire" al diseño.

---
*Cualquier duda sobre los estilos globales, consultar el archivo `src/app/globals.css`.*
