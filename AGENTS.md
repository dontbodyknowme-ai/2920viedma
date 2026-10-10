# AGENTS.md

## Comandos de configuracion
Gestor de paquetes: **npm** (el repo tiene `package-lock.json`; no usar pnpm).

- Instalar dependencias: `npm install`
- Iniciar servidor de desarrollo: `npm run dev`
- Ejecutar pruebas: `npm test`
- Verificar tipos: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build de produccion: `npm run build`
- Regenerar los datos mock: `node scripts/generar-mocks.mjs`
- Clave del panel admin: `VITE_ADMIN_PASSWORD` (default `admin123`)

## Estilo de codigo
- Modo estricto de TypeScript (TypeScript strict mode)
- Comillas simples, sin puntos y comas
- Usar patrones funcionales siempre que sea posible
- No hardcodear colores hex en los componentes: viven en `tailwind.config.js` (unica excepcion: `PALETA` en `herocanvas3d.tsx`, para los materiales de Three.js)

## Especificacion del Proyecto: E-Commerce Vinoteca de Alta Gama

### Objetivo
Construir una aplicacion web interactiva, responsiva y visualmente atractiva para una vinoteca de alta gama. El proyecto incluye interacciones con animaciones de scroll, un catalogo dinamico de productos, un modulo de carga de productos en tiempo real y un carrito de compras interactivo.

### Requerimientos de UI / UX
- **Paleta de Colores y Tema:** Estetica premium oscura sobre **negro carbon** (superficies `charcoal` neutras; fondo `#0a0a0a`/`#121212`), con los 9 rojos de la paleta como acento (`wine`, de `#AD0021` a `#4F0718`), dorado (`#D4AF37`) y blanco (`#ffffff`). Fuente unica: `tailwind.config.js`.
- **Animaciones de Scroll:** Efectos de revelado suave al hacer scroll, efectos parallax en la seccion principal/historia, barra de navegacion fija con cambio de opacidad/glassmorphism y transiciones fluidas mediante Framer Motion.
- **Diseño Responsivo:** Enfoque *mobile-first* implementado con Tailwind CSS.

### Estructura de la Pagina y Funcionalidades Clave
1. **Encabezado / Barra de Navegacion:**
   - Logo de la marca, enlaces de navegacion (Inicio, Catálogo, Contacto), barra de busqueda e icono de carrito con contador en tiempo real. **Panel lateral en móvil implementado.**
2. **Seccion Principal (Hero Section):**
   - Banner a pantalla completa con efecto parallax, titular impactante, boton de accion ("Explorar Cava") y exhibicion de botellas destacadas (3 vinos más caros).
3. **Catalogo de Productos (Cuadricula E-commerce):**
   - Tarjetas de producto con efecto de zoom sutil al pasar el cursor (hover).
   - Informacion por tarjeta: Imagen del producto, Nombre del vino, Bodega/Cepa, Cosecha/Año, Precio (formateado con moneda) y boton "Agregar al Carrito".
   - Sistema de filtros: Por tipo de vino (Tinto, Blanco, Rosado, Espumante), **rango de precio** y **cepa** (Malbec, Cabernet Sauvignon, Chardonnay, etc.).
4. **Modulo de Carga / Panel Admin:**
   - Modal o formulario para agregar o editar productos en tiempo real.
   - Campos: Nombre, Categoria/Cepa, Precio, Descripcion, Cosecha/Año y Selector de Imagen (**soporte para arrastrar archivo o ingresar URL**, prioridad a archivo).
5. **Vista de Detalle del Producto (Modal Rapido):**
   - Modal detallado al hacer clic que muestra notas de cata, maridaje sugerido e imagen en alta resolucion.
6. **Carrito de Compras (Panel Lateral / Drawer):**
   - Panel desplegable animado desde la derecha al hacer clic en el carrito.
   - Lista detallada de productos seleccionados, ajustador de cantidades, calculo automatico de subtotal/total y boton para finalizar compra.
7. **Pie de Pagina (Footer):**
   - Horarios de atencion, ubicacion, enlaces a redes sociales y aviso legal obligatorio de restriccion de edad (+18). **Con `id="contacto"` para navegación.**

### Back-Office (`/admin`) - spec 004-a, implementada
Panel de administracion con 5 modulos: Dashboard, Catalogo, Pedidos, Clientes CRM y Configuracion.

- **Acceso: sin boton en la tienda publica.** Se entra escribiendo `/admin`, que pide una contrasena (`src/components/admin/admin_gate.tsx`). La sesion vive en `sessionStorage`, no en `localStorage`, para que el acceso no quede dado por semanas en una maquina compartida.
- **La contrasena NO es autenticacion.** Se compara en el navegador contra `VITE_ADMIN_PASSWORD` y viaja en el bundle. No hay backend todavia; la spec 004-b (en `borrador`) define el reemplazo con token + 2FA.
- **Sin sesion no hay redirect:** se muestra el prompt de clave en la misma URL, no un rebote a la tienda.
- **No existe el flag `isAdmin` en `localStorage`** que hubo hasta la spec 004-a: era publico y cualquiera lo ponia en `true` desde la consola.
- **Datos:** MSW v2 como API falsa (`src/mocks/`), con latencia de 300-800 ms. Regenerables con `node scripts/generar-mocks.mjs`.
- **`stock` y `activo` viven en `AdminWine`, no en `Wine`:** el catalogo publico no los expone. El formulario del panel es `AdminWineForm`, separado del `ProductForm` publico.

### Arquitectura Tecnica
- **Framework:** Next.js o React + Vite con TypeScript.
- **Estilos:** Tailwind CSS para maquetacion, tipografia y clases de utilidad.
- **Animaciones:** Framer Motion (o GSAP) para animaciones activadas por scroll y transiciones de paneles. **Scroll reveal (`AnimatedSection`), parallax en Hero, degradación en móvil (< 640px).**
- **Gestion de Estado:** Hooks funcionales de React o Zustand para el manejo del estado local (carrito y catalogo dinamico de productos).
- **Organizacion del Codigo:** Division en componentes modulares y reutilizables (`ProductCard`, `ProductForm`, `CartDrawer`, `AnimatedSection`, `QuickViewModal`).

## Reglas y Gobernanza
- Las directrices de arquitectura, UI/UX y calidad se encuentran especificadas en [`docs/constitution.md`](./docs/constitution.md).

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