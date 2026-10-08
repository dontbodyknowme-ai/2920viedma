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
- [x] `Navbar` - Navegacion fija con efecto de vidrio/opacidad al hacer scroll y contador de carrito en vivo. **Enlaces de navegación (Inicio, Catálogo, Contacto) con panel lateral en móvil implementado.**
- [x] `Hero` - Seccion principal con efecto parallax, titular impactante, boton 'Explorar Cava' y botellas destacadas.
- [x] `ProductCatalog` - Grilla e-commerce responsiva con filtros por tipo (Tinto, Blanco, Rosado, Espumante), cepa y rango de precio.
- [x] `ProductCard` - Tarjeta interactiva con zoom sutil en hover, detalles de bodega/cosecha, boton 'Agregar al Carrito' y boton 'Editar' (solo admin).
- [x] `ProductForm` - Modal/Formulario de carga/edicion de productos con soporte para URLs e subida de archivos de imagen (drag & drop). Modo edicion con carga de datos, titulo dinamico y validacion de precio > 0.
- [x] `CartDrawer` - Panel lateral deslizable animado con lista de productos, ajuste de cantidad y calculo de total.
- [x] `ProductDetailModal` - Vista rapida de producto con notas de cata, maridaje e imagen ampliada.
- [x] `Footer` - Informacion de contacto, horarios, redes sociales y aviso legal obligatorio (+18). **Agregado `id="contacto"` para navegación.**
- [x] `AnimatedSection` - Wrapper de animación scroll-reveal con Framer Motion (`useInView`), degradación a transiciones simples en móvil (< 640px).

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
- *2026-10-08:* Implementada Tarea 8 (T8) - Verificación integral y documentación. Todas las tareas de la spec 003 completadas: T1 (Filtros por precio y cepa), T2 (Edición de productos), T3 (Carga de imagen por archivo drag & drop), T4 (Enlaces de navegación), T5 (AnimatedSection scroll-reveal), T6 (Parallax en Hero), T7 (Botellas destacadas). Verificación: `npx tsc --noEmit` y `npm run build` pasan. No se instalaron dependencias nuevas. Se actualizó `MEMORY.md` y `AGENTS.md`.
- *2026-10-08:* Implementada Tarea 4 (T4) - Enlaces de navegación. Se agregaron enlaces a la barra de navegación (Inicio, Catálogo, Contacto) con scroll suave y offset para no tapar el encabezado por la barra fija. En móvil se implementó panel lateral (drawer) con Framer Motion (`AnimatePresence` + `motion.aside`) que anima desde la derecha, se cierra al hacer click en enlace, en la X o en el fondo. Se creó componente `Footer` (`pie_de_pagina.tsx`) con `id="contacto"` como destino de navegación. Se actualizó `App.tsx` para incluir el Footer.
- *2026-10-08:* Implementada Tarea 2 (T2) - Edicion de productos (solo admin). Se extendio `ProductForm` con props `onUpdateWine` y `wineToEdit`, agregado `useEffect` para cargar datos del vino a editar, titulo dinamico ('Editar Vino' / 'Cargar Nuevo Vino'), boton 'Guardar Cambios' en modo edicion, validacion de precio > 0. En `App.tsx` agregado estado `vinoAEditar` y funcion `actualizarWine`. En `ProductCard` agregado boton 'Editar' visible cuando se pasa `onEditWine`. Conectado flujo completo: click en 'Editar' en tarjeta -> abre formulario en modo edicion -> guarda con `actualizarWine` manteniendo mismo ID.
- *2026-10-08:* Implementada Tarea 1 (T1) - Filtros por precio y cepa. Se agregaron: `src/utils/filtros.ts` con funcion `filtrarVinos`, extendido `WineFilterState` en `src/types/vino.ts` con `minPrice`, `maxPrice` y `selectedVarietals`, actualizado `carta_de_catalogo.tsx` con inputs numericos para precio minimo/maximo, chips toggle para cepas disponibles, botones "Limpiar" para restablecer filtros, y conectado todo en `App.tsx` con nuevos props y estado.
- *2026-10-05:* Creado el archivo AGENTS.md en espanol con la especificacion completa del proyecto y los comandos `pnpm`.
- *2026-10-05:* Configurado MEMORY.md sincronizado con el stack tecnico (Vite + React + TS, Tailwind CSS, Framer Motion y Zustand/Context).
- *2026-10-05:* Creado y ubicado el documento de gobernanza en `docs/constitution.md`.