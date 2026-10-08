# MEMORY.md

## Contexto del Proyecto
- **Nombre:** Vinoteca High-End E-Commerce
- **Proposito:** Sitio web interactivo para una vinoteca de alta gama con catalogo de productos, carrito de compras, carga de articulos en tiempo real y navegacion con animaciones de scroll.
- **Estado Actual:** Estructura inicial configurada en `AGENTS.md`. Preparado para comenzar el desarrollo de componentes.

## Decisiones de Arquitectura y Stack
- **Framework / Bundler:** React con Vite y TypeScript (soporta `pnpm dev` y `pnpm test`).
- **Estilos:** Tailwind CSS con paleta personalizada en modo oscuro.
- **Animaciones:** Framer Motion (efectos parallax, revela al hacer scroll, animaciones del carrito y modales).
- **Gestion de Estado:** React Context API o Zustand (para persistencia del carrito de compras y catalogo dinamico).
- **Almacenamiento de Datos:** `localStorage` para almacenamiento local en tiempo real del catalogo de productos y carrito.

## Componentes y Estructura
- [ ] `Navbar` - Navegacion fija con efecto de vidrio/opacidad al hacer scroll y contador de carrito en vivo.
- [ ] `Hero` - Seccion principal con efecto parallax, titular impactante, boton 'Explorar Cava' y botellas destacadas.
- [ ] `ProductCatalog` - Grilla e-commerce responsiva con filtros por tipo (Tinto, Blanco, Rosado, Espumante), cepa y rango de precio.
- [ ] `ProductCard` - Tarjeta interactiva con zoom sutil en hover, detalles de bodega/cosecha y boton 'Agregar al Carrito'.
- [ ] `ProductForm` - Modal/Formulario de carga/edicion de productos con soporte para URLs e subida de archivos de imagen.
- [ ] `CartDrawer` - Panel lateral deslizable animado con lista de productos, ajuste de cantidad y calculo de total.
- [ ] `ProductDetailModal` - Vista rapida de producto con notas de cata, maridaje e imagen ampliada.
- [ ] `Footer` - Informacion de contacto, horarios, redes sociales y aviso legal obligatorio (+18).

## Convenciones y Preferencias
- Estilo de codigo configurado en `AGENTS.md`:
  - TypeScript strict mode
  - Comillas simples
  - Sin puntos y comas (no semicolons)
  - Patrones funcionales
  - Gestor de paquetes: `pnpm`
- Paleta de colores:
  - Fondo/Base: Negro carbon (`#121212` / `bg-neutral-900`)
  - Primario/Acento: Borgoña / Vino profundo (`#5B132B` / `#800020`)
  - Detalles: Dorado tenue (`#D4AF37`) y texto crema (`#FDFBF7`)

## Bitacora de Cambios / Notas
- *2026-10-05:* Creado el archivo AGENTS.md en español con la especificacion completa del proyecto y los comandos `pnpm`.
- *2026-10-05:* Configurado MEMORY.md sincronizado con el stack tecnico (Vite + React + TS, Tailwind CSS, Framer Motion y Zustand/Context).
- *2026-10-05:* Creado y ubicado el documento de gobernanza en `docs/constitution.md`.