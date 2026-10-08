# AGENTS.md

## Comandos de configuracion
- Instalar dependencias: `npm install`
- Iniciar servidor de desarrollo: `npm run dev`
- Compilar para produccion: `npm run build`
- Ejecutar pruebas: `npm test`
- Ejecutar linter: `npm run lint`
- Chequear tipos sin emitir: `npx tsc --noEmit`

## Estilo de codigo
- Modo estricto de TypeScript (TypeScript strict mode)
- Comillas simples, sin puntos y comas
- Usar patrones funcionales siempre que sea posible
- Cero colores hexadecimales en los componentes: los colores salen de las utilidades de `tailwind.config.js` (`bg-wine-700`, `text-gold-400`, `bg-charcoal-950`, etc.), nunca de estilos en linea
- Tests de componentes: importar `act` desde `react` (nunca desde `react-dom/test-utils`, que esta deprecado), declarar `IS_REACT_ACT_ENVIRONMENT` en `globalThis`, y envolver **todo** `.click()` en `act`
- Las suites viven en `test/**/*.test.ts` y no en `.test.tsx`: `vitest.config.ts` solo recolecta esos archivos, asi que un `.test.tsx` pasaria sin ejecutarse. Por eso se monta con `createElement(App)` y no con JSX

## Especificacion del Proyecto: E-Commerce Vinoteca de Alta Gama

### Objetivo
Construir una aplicacion web interactiva, responsiva y visualmente atractiva para una vinoteca de alta gama. El proyecto incluye interacciones con animaciones de scroll, un catalogo dinamico de productos, un modulo de carga de productos en tiempo real y un carrito de compras interactivo.

### Requerimientos de UI / UX
- **Paleta de Colores y Tema:** Estetica premium oscura (tonos borgoña/vino profundo, negro carbon, acentos en dorado tenue y texto en crema/blanco calido).
- **Animaciones de Scroll:** Efectos de revelado suave al hacer scroll, efectos parallax en la seccion principal/historia, barra de navegacion fija con cambio de opacidad/glassmorphism y transiciones fluidas mediante Framer Motion.
- **Diseño Responsivo:** Enfoque *mobile-first* implementado con Tailwind CSS.

### Estructura de la Pagina y Funcionalidades Clave
1. **Encabezado / Barra de Navegacion:**
   - Logo de la marca, enlaces de navegacion, barra de busqueda e icono de carrito con contador en tiempo real.
   - El buscador es visible tambien en movil: por debajo de 768 px baja a su propia fila, y desde 768 px vuelve a la fila unica con el resto de la barra.
2. **Seccion Principal (Hero Section):**
   - Banner a pantalla completa con efecto parallax, titular impactante, boton de accion ("Explorar Cava") y exhibicion de botellas destacadas.
3. **Catalogo de Productos (Cuadricula E-commerce):**
   - Tarjetas de producto con efecto de zoom sutil al pasar el cursor (hover).
   - Informacion por tarjeta: Imagen del producto, Nombre del vino, Bodega/Cepa, Cosecha/Año, Precio (formateado con moneda) y boton "Agregar al Carrito".
   - Sistema de filtros: Por tipo de vino (Tinto, Blanco, Rosado, Espumante), rango de precio y cepa (Malbec, Cabernet Sauvignon, Chardonnay, etc.).
4. **Modulo de Carga / Panel Admin:**
   - Modal o formulario para agregar o editar productos en tiempo real.
   - Campos: Nombre, Categoria/Cepa, Precio, Descripcion, Cosecha/Año y Selector de Imagen (soporte para arrastrar archivo o ingresar URL).
5. **Vista de Detalle del Producto (Modal Rapido):**
   - Modal detallado al hacer clic que muestra notas de cata, maridaje sugerido e imagen en alta resolucion.
6. **Carrito de Compras (Panel Lateral / Drawer):**
   - Panel desplegable animado desde la derecha al hacer clic en el carrito.
   - Lista detallada de productos seleccionados, ajustador de cantidades, calculo automatico de subtotal/total y boton para finalizar compra.
7. **Pie de Pagina (Footer):**
   - Horarios de atencion, ubicacion, enlaces a redes sociales y aviso legal obligatorio de restriccion de edad (+18).

### Estado de la Implementacion (2026-10-06)

Los **siete bloques** de arriba estan implementados y verificados en navegador: la barra de navegacion con buscador y contador, el hero con su botella 3D, el catalogo con filtro por categoria y busqueda por texto, el formulario de carga de vinos, la vista rapida de producto, el carrito lateral y el pie de pagina. El estado vive en el componente raiz (`src/App.tsx`) con hooks funcionales y se persiste en `localStorage` en las claves `vinoteca_wines` y `vinoteca_cart`, con `try`/`catch` para que un dato corrupto no rompa el arranque. Hay **cobertura automatizada** de los validadores, de la integridad de los datos de vino y de la logica de estado del orquestador (carrito y persistencia), en `test/`.

Lo de esta lista que **todavia no esta implementado**, y que la spec `002-app-que-compile` dejo explicitamente fuera de alcance (§3.2) para que la promesa de §1 sea cumplible:

| Pendiente | Nota |
|---|---|
| Filtro por rango de precio y por cepa | Hoy solo hay filtro por categoria y busqueda por texto |
| Subida de imagen arrastrando un archivo | El formulario solo acepta la URL de la imagen |
| Enlaces de navegacion entre secciones | La barra solo tiene el logo como enlace |
| Edicion de productos existentes | El formulario solo crea vinos nuevos |
| Animaciones de revelado al hacer scroll y efecto parallax del hero | Requieren el componente `AnimatedSection`, que no existe en el repositorio |
| Exhibicion de botellas destacadas en el hero | La botella 3D de `herocanvas3d.tsx` cubre el requisito visual |

### Arquitectura Tecnica
- **Framework:** Next.js o React + Vite con TypeScript.
- **Estilos:** Tailwind CSS para maquetacion, tipografia y clases de utilidad.
- **Animaciones:** Framer Motion (o GSAP) para animaciones activadas por scroll y transiciones de paneles.
- **Gestion de Estado:** Hooks funcionales de React o Zustand para el manejo del estado local (carrito y catalogo dinamico de productos).
- **Organizacion del Codigo:** Division en componentes modulares y reutilizables (`ProductCard`, `ProductForm`, `CartDrawer`, `VistaRapidaProducto`, `PieDePagina`). Cada componente vive en `src/components/` con nombre de archivo en espanol y `snake_case`, que **no** coincide con el nombre del componente que exporta (por ejemplo, `carta_de_productos.tsx` exporta `ProductCard`).

## Reglas y Gobernanza
- Las directrices de arquitectura, UI/UX y calidad se encuentran especificadas en [`docs/CONSTITUCION.md`](./docs/CONSTITUCION.md).

## Protocolo de Actualizacion Continua (AGENTS.md & MEMORY.md)

Cada vez que realices una tarea, modificacion, refactorizacion o agregues codigo/archivos al proyecto, DEBES seguir estas reglas sin excepcion:

1. **Sincronizacion de MEMORY.md:**
   - Registra el cambio en la seccion `## Bitacora de Cambios / Notas` con la fecha actual y un resumen claro de lo realizado.
   - Si creaste o modificaste un componente, actualiza la lista de verificacion en `## Componentes y Estructura`.
   - Si cambio la arquitectura, el estado del proyecto o el stack, actualiza `## Decisiones de Arquitectura y Stack`.

2. **Mantenimiento de AGENTS.md:**
   - Si se introducen nuevos comandos de ejecucion/testeo, agregalos a `## Setup commands`.
   - Si se adoptan nuevas convenciones de codigo, patrones o reglas de estilo, actualiza `## Code style`.
   - Si cambia el alcance general de las funcionalidades, manten actualizada la seccion de especificaciones.

3. **Ejecucion Automatica:**
   - La actualizacion de ambos archivos debe hacerse inmediatamente al finalizar la modificacion de codigo solicitada, dentro del mismo flujo de trabajo.