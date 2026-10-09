# MEMORY.md

## Contexto del Proyecto
- **Nombre:** Vinoteca High-End E-Commerce
- **Proposito:** Sitio web interactivo para una vinoteca de alta gama con catalogo de productos, carrito de compras, carga de articulos en tiempo real y navegacion con animaciones de scroll.
- **Estado Actual:** Estructura inicial configurada en `AGENTS.md`. Preparado para comenzar el desarrollo de componentes.

## Decisiones de Arquitectura y Stack
- **Framework / Bundler:** React 18 con Vite 5 y TypeScript strict.
- **Gestor de paquetes:** **npm**, no pnpm. El repo tiene `package-lock.json` y todos los comandos de este proyecto son `npm`.
- **Estilos:** Tailwind CSS con paleta personalizada en modo oscuro.
- **Animaciones:** Framer Motion (efectos parallax, revela al hacer scroll, animaciones del carrito, modales y drawers).
- **Routing:** `react-router-dom` v7. El panel vive bajo `/admin` y el layout protege las cinco rutas hijas en un solo lugar.
- **Datos del panel:** MSW v2 como API falsa, con latencia simulada de 300-800 ms. **No hay backend real todavia**: la spec 004-b lo describe y esta en `borrador`.
- **Graficos:** Recharts, con `import()` diferido: queda en un chunk de 376 kB aparte, que el principal no carga.
- **Tablas:** TanStack Table en modo manual. Los filtros, el orden y la paginacion van como query params; el cliente nunca tiene la lista entera en memoria.
- **Manejo de fechas:** objeto `Date` nativo con los getters locales. **Nunca `toISOString()` para armar `YYYY-MM-DD`**: en UTC-3 un pedido del 15 a las 23:30 es del 16 en UTC y se cae fuera del rango que el usuario eligio.
- **CSV:** escrito a mano en `src/utils/csv.ts`. `papa-parse` devuelve 404 en este registry.
- **Almacenamiento:** `localStorage` para catalogo y carrito de la tienda; **`sessionStorage` para la sesion del panel**, para que el acceso no quede dado por semanas en una maquina compartida.
- **Gestion de Estado:** hooks de React. No hay libreria de estado global ni de fetching: no estan instaladas y no se agregaron.

### Decisiones de la spec 004-a que conviene no olvidar

1. **`AdminWine extends Wine`, no al revés.** `stock` y `activo` viven en el tipo del panel porque el catalogo publico no los necesita (RF-06 de la 004-b). No se pueden agregar a `Wine`: los tests preexistentes cierran `CAMPOS_REQUERIDOS` y `CAMPOS_OPCIONALES` por los dos lados.
2. **No hay boton de acceso al panel en la tienda.** Decision del usuario (2026-10-09), en contra de RF-01. Se entra escribiendo `/admin`.
3. **Sin sesion no hay redirect: hay pantalla de clave.** El enunciado pedia rebotar a `/`; se muestra el prompt en la misma URL, porque quien la escribio a proposito esta pidiendo entrar.
4. **La contrasena no es autenticacion.** Se compara en el navegador contra un valor del bundle. Se documento asi a proposito: un mock que aparente proteger algo es peor que uno que no.
5. **Configuracion es de solo lectura** salvo la seccion de datos. No hay endpoint de configuracion y la spec no define ninguno.

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

### Back-Office (spec 004-a, implementada 2026-10-09)

**Acceso:** panel en `/admin`. **No hay boton de acceso en la tienda publica**: se entra escribiendo la URL, que pide una contrasena. La sesion vive en `sessionStorage`. La contrasena se valida en el navegador contra `VITE_ADMIN_PASSWORD` (default `admin123`) y **no es autenticacion**: esta en el bundle. Ver `src/utils/admin_acceso.ts`.

- [x] `AdminGate` - Pantalla de pedido de contrasena (`/admin` sin sesion).
- [x] `AvisoOffline` - Banner permanente de modo offline, con "Reintentar". Marca los datos como desactualizados.
- [x] `AdminLayout` - Sidebar colapsible en escritorio / drawer en movil, header, `<Outlet>`. Es el unico lugar de proteccion: cubre las cinco rutas hijas.
- [x] `AdminSidebar` / `AdminHeader` - Navegacion del panel y "Cerrar sesion".
- [x] `DataTable` - Tabla generica sobre TanStack Table, **paginada y filtrada en el servidor** (`manualPagination`/`manualSorting`/`manualFiltering`). Estados vacio y de carga.
- [x] `MetricCard` / `MetricCardSkeleton` - Tarjetas de metricas del dashboard.
- [x] `StatusBadge` - Badge de color semantico para estados de pedido, de producto y etiquetas de cliente.
- [x] `OrderTimeline` - Historial de estados de un pedido. **Dibuja el registro, no lo recalcula** (ver CE-03).
- [x] `ConfirmDialog` - Confirmacion modal.
- [x] `DateRangePicker` - Rango de fechas sobre react-day-picker v9, tema oscuro, dos meses.
- [x] `AdminWineForm` - Alta/edicion de vino del panel. **Separado de `ProductForm` a proposito**: produce `AdminWine` (con `stock` y `activo`), no `Wine`.
- [x] `OrderDrawer` - Detalle de pedido: items, cliente, direccion, estado, timeline, etiqueta y devolucion.
- [x] `CustomerDrawer` - Detalle de cliente en 3 pestanas (pedidos/notas/datos) mas `ChipTag`.
- [x] Paginas: `dashboard.tsx`, `catalogo.tsx`, `pedidos.tsx`, `clientes.tsx`, `configuracion.tsx`.

### Utilidades y datos (spec 004-a)

- [x] `src/mocks/` - API falsa con MSW v2 (`handlers`, `data`, `filtros`, `importar_vinos`, `vino_schema`, `browser`).
- [x] `scripts/generar-mocks.mjs` - Genera `data.ts` con PRNG sembrado, para que el historial de clientes y las metricas se deriven de los pedidos y no se desincronicen.
- [x] `src/hooks/` - `useApi`, `useMediaQuery`, `useCatalogo`, `usePedidos`, `useClientes`.
- [x] `src/utils/csv.ts` - Parser y escritor de CSV **escrito a mano** (`papa-parse` da 404 en este registry; ver D-12). Maneja comillas, comas internas, CRLF y BOM.
- [x] `src/utils/csv_export.ts` - Generadores de CSV del panel, compartidos por las tablas y por Configuracion.
- [x] `src/utils/fechas.ts` - `aIsoLocal`, compartida por el DateRangePicker y por el filtro del servidor (mismo criterio de dia).
- [x] `src/utils/metricas.ts` - `tendenciaDe`. Devuelve `undefined` cuando no hay con que comparar, nunca `0`.
- [x] `src/utils/tienda.ts` - Identidad de la tienda, fuente unica (la usa el footer y Configuracion).
- [x] `src/utils/offline.ts` - Respaldo en `localStorage` indexado por URL, estado global y suscriptores. `exigirConexion()` hace fallar las escrituras sin servidor.
- [x] `src/utils/admin_acceso.ts` - Contrasena y sesion del panel.
- [x] `src/types/admin.ts` - `AdminWine`, `Order`, `Customer`, `Metrics`, `Paginated`, `ImportResult`, `OrderStatus`.

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
- *2026-10-09:* **Spec 004-a (Back-Office) completa.** 10 tareas, 200 tests, `tsc` 0, `lint` 0, `build` 0. Rama `spec-004-a`.
  - **T1** Infra: `react-router-dom` v7, MSW v2, tipos `AdminWine`/`Order`/`Customer`/`Metrics`, mocks generados por `scripts/generar-mocks.mjs` con PRNG sembrado. Arregladas 3 regresiones de la spec 003 que nunca seHabian detectado (`loadWines`/`loadCart` sin guardas RF-34, mensaje de checkout, `VistaRapidaProducto` caido de `App.tsx`).
  - **T2** Layout: `AdminLayout`, `AdminSidebar`, `AdminHeader`, `useMediaQuery`. La proteccion vive en el layout y no en el router: es el unico ancestro comun de las cinco rutas hijas.
  - **T3** Componentes compartidos: `DataTable`, `MetricCard`, `StatusBadge`, `OrderTimeline`, `ConfirmDialog`, `utils/csv.ts`.
  - **T4** Dashboard: metricas, grafico Recharts en chunk aparte, top 5 y actividad. `tendenciaDe` devuelve `undefined` cuando no hay dato, nunca `0%` falso.
  - **T5** Catalogo: CRUD completo, import/export CSV. **6 bugs del mock corregidos**: el importador de CSV nunca funciono (desestructuraba un objeto como tupla, y ademas tenia su propio parser con `split(',')`), no aceptaba los encabezados en espanol que genera el export, el export no llevaba `id` (reimportar duplicaba el catalogo), `Boolean("no")` daba `true`, y `duplicar` mandaba el `id` del original (borrar la copia borraba el original).
  - **T6** Pedidos: multi-estado, `DateRangePicker` con react-day-picker v9, drawer con timeline, etiqueta y devolucion. **Bugs**: el filtro multi-estado comparaba contra la cadena entera y no encontraba nada; las fechas se comparaban por el dia UTC y un pedido del 15 a la noche caia fuera del rango del 15; el rango invertido no se corregia; el calendario no se reabria en el mes correcto (`defaultMonth` solo aplica al primer montaje); el drawer mostraba el pedido viejo al cambiar el estado.
  - **T7** Clientes CRM: drawer de 3 pestanas, notas, tags. **Bugs**: los tags de los mocks estaban capitalizados (`'VIP'`) y el filtro normaliza a minusculas, asi que no encontraba ninguno; no habia ni un cliente sin email, asi que CE-04 no se podia ver; la busqueda de pedidos no buscaba por `customerId` y la pestana de pedidos salia siempre en 0.
  - **T8** Configuracion: 4 secciones, 3 exports y 1 import. Se extrajo la logica de CSV a `utils/csv_export.ts` porque estaba triplicada en los hooks y habria sido una cuarta copia. Se creo `utils/tienda.ts` porque el footer tenia el email escrito dos veces en el mismo componente.
  - **T9** Acceso por contrasena. **Decision del usuario: no hay boton de acceso al panel en la tienda publica** (contra RF-01). Se entra escribiendo `/admin`, que pide contrasena. Sesion en `sessionStorage`. Se elimino el flag `isAdmin` de `localStorage`, que era un flag publico que cualquiera ponia en `true` desde la consola.
  - **T10** Verificacion integral y documentacion. **`npm run lint` encontre 4 archivos con problemas que no se habian revisado en 9 tareas**: genericos vestigiales en una augmentation de TanStack, un helper sin uso en un test, un BOM invisible escrito como caracter literal en `csv.ts` (en vez de `﻿`, que ademas no compila sin flag `u`), y el service worker generado de MSW linteado. Ademas: **`date-fns` se importaba sin declararse como dependencia**, funcionando solo por hoisting; ahora es dependencia directa (RNF-04 la aprobaba). **CA-37/CE-05 (fallback offline) quedo sin implementar**: se reporta en el task.md.
  - **Correccion de encabezado:** T8 decia cubrir "RF-19, RF-20, RF-33". RF-33 es de tags (hecho en T7) y los RF de CSV son RF-20, RF-21 y RF-34, ya implementados en T5 y T7. T8 no cubria ningun RF sin hacer.
- *2026-10-09 (tarde):* **Cerrada la spec 004-a.** Se implemento **CA-37 / CE-05 (fallback offline)**, que T10 habia reportado como pendiente.
  - `src/utils/offline.ts` guarda en `localStorage` lo ultimo que llego del servidor, **indexado por URL**. Por URL y no por recurso: las tablas piden distinto segun filtro y pagina, y con una clave por recurso el fallback mostraria la pagina 3 sin filtro bajo el titulo "Tinto".
  - `src/components/admin/aviso_offline.tsx`: banner permanente que marca los datos como desactualizados, con boton "Reintentar". El `alert('Modo offline')` que pide CE-05 se dispara **una vez por paso a offline**, no en cada fetch.
  - **Las escrituras no se encolan**: offline, crear o editar falla con mensaje explicito. Encolar traeria conflictos sin resolver (el servidor pudo cambiar entre que se guarda y que se manda).
  - **Bug encontrado al implementarlo:** `useApi` dejaba los datos viejos en pantalla cuando el fetch fallaba sin respaldo. Con un filtro nuevo, la tabla mostraba las filas del filtro anterior debajo del mensaje de error, como si fueran el resultado.
  - Tests: **224 de 224**, `tsc` 0, `lint` 0, `build` OK.
  - Anotado en `specs/003-mejoras-ux/spec.md` (sin tocar codigo): **el hero quedo cargado.** El titulo "CAVA & CO." tapa la animacion 3D y la fila de botellas destacadas compite por el mismo espacio de un `min-h-screen`. El usuario quiere volver a la interfaz anterior sin destacadas, pero decidio **anotarlo y dejarlo para despues**.
- *2026-10-08:* Implementada Tarea 8 (T8) - Verificación integral y documentación. Todas las tareas de la spec 003 completadas: T1 (Filtros por precio y cepa), T2 (Edición de productos), T3 (Carga de imagen por archivo drag & drop), T4 (Enlaces de navegación), T5 (AnimatedSection scroll-reveal), T6 (Parallax en Hero), T7 (Botellas destacadas). Verificación: `npx tsc --noEmit` y `npm run build` pasan. No se instalaron dependencias nuevas. Se actualizó `MEMORY.md` y `AGENTS.md`.
- *2026-10-08:* Implementada Tarea 4 (T4) - Enlaces de navegación. Se agregaron enlaces a la barra de navegación (Inicio, Catálogo, Contacto) con scroll suave y offset para no tapar el encabezado por la barra fija. En móvil se implementó panel lateral (drawer) con Framer Motion (`AnimatePresence` + `motion.aside`) que anima desde la derecha, se cierra al hacer click en enlace, en la X o en el fondo. Se creó componente `Footer` (`pie_de_pagina.tsx`) con `id="contacto"` como destino de navegación. Se actualizó `App.tsx` para incluir el Footer.
- *2026-10-08:* Implementada Tarea 2 (T2) - Edicion de productos (solo admin). Se extendio `ProductForm` con props `onUpdateWine` y `wineToEdit`, agregado `useEffect` para cargar datos del vino a editar, titulo dinamico ('Editar Vino' / 'Cargar Nuevo Vino'), boton 'Guardar Cambios' en modo edicion, validacion de precio > 0. En `App.tsx` agregado estado `vinoAEditar` y funcion `actualizarWine`. En `ProductCard` agregado boton 'Editar' visible cuando se pasa `onEditWine`. Conectado flujo completo: click en 'Editar' en tarjeta -> abre formulario en modo edicion -> guarda con `actualizarWine` manteniendo mismo ID.
- *2026-10-08:* Implementada Tarea 1 (T1) - Filtros por precio y cepa. Se agregaron: `src/utils/filtros.ts` con funcion `filtrarVinos`, extendido `WineFilterState` en `src/types/vino.ts` con `minPrice`, `maxPrice` y `selectedVarietals`, actualizado `carta_de_catalogo.tsx` con inputs numericos para precio minimo/maximo, chips toggle para cepas disponibles, botones "Limpiar" para restablecer filtros, y conectado todo en `App.tsx` con nuevos props y estado.
- *2026-10-05:* Creado el archivo AGENTS.md en espanol con la especificacion completa del proyecto y los comandos `pnpm`.
- *2026-10-05:* Configurado MEMORY.md sincronizado con el stack tecnico (Vite + React + TS, Tailwind CSS, Framer Motion y Zustand/Context).
- *2026-10-05:* Creado y ubicado el documento de gobernanza en `docs/constitution.md`.