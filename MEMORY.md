# MEMORY.md

## Contexto del Proyecto
- **Nombre:** Vinoteca High-End E-Commerce
- **Proposito:** Sitio web interactivo para una vinoteca de alta gama con catalogo de productos, carrito de compras, carga de articulos en tiempo real y navegacion con animaciones de scroll.
- **Estado Actual:** **004-c COMPLETA y mergeada a `main`** (commits `575cb29`, `a6dc1ce`). Frontend consumiendo la API real; MSW eliminado. Pendiente: deploy.

## Decisiones de Arquitectura y Stack
- **Framework / Bundler:** React 18 con Vite 5 y TypeScript strict.
- **Gestor de paquetes:** **npm**, no pnpm. El repo tiene `package-lock.json` y todos los comandos de este proyecto son `npm`.
- **Estilos:** Tailwind CSS con paleta personalizada en modo oscuro.
- **Animaciones:** Framer Motion (efectos parallax, revela al hacer scroll, animaciones del carrito, modales y drawers).
- **Routing:** `react-router-dom` v7. El panel vive bajo `/admin` y el layout protege las cinco rutas hijas en un solo lugar.
- **Backend:** **Fastify + Node 24 + PostgreSQL + Prisma** (spec 004-b **COMPLETA**). API REST en `http://localhost:3000`. Desde 004-c el frontend **consume esa API real**; MSW quedo eliminado (`src/mocks/` y `public/mockServiceWorker.js` no existen mas).
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

### Decisiones de la spec 004-c que conviene no olvidar

1. **`backend/` es una carpeta propia con su `package.json`, no un monorepo.** No se mueve: el
   Dockerfile, `docker-compose.yml` y las migraciones de Prisma ya apuntan ahi.
2. **`NodeNext` + extension `.js` en los imports relativos del backend.** Con `NodeNext` el
   compilador no resuelve `'./x'` a `x.ts`; sin la extension el build pasa en local y falla en CI.
3. **`price` en pesos enteros, no en centavos**, para que el contrato del backend sea el mismo que
   ya usaba el frontend. Los esquemas Zod de `shared/schemas.ts` rechazan `45000.5`.
4. **El carrito sigue en `localStorage`.** Es estado de la tienda, no del servidor: no hay endpoint
   de carrito en la 004-b y no se invento uno.
5. **`src/mocks/` y `public/mockServiceWorker.js` se eliminaron, no se desactivaron.** Un mock que
   queda en el repo es un mock que alguien vuelve a prender sin darse cuenta.
6. **`AuthModal.tsx` se creo y se borro.** No hay modal de login en la tienda: el acceso es por URL.

## Componentes y Estructura
- [x] `Navbar` - Navegacion fija con efecto de vidrio/opacidad al hacer scroll y contador de carrito en vivo. **Enlaces de navegación (Inicio, Catálogo, Contacto) con panel lateral en móvil implementado.**
- [x] `Hero` - Seccion principal en **disposicion partida**: texto a la izquierda (parallax), botella 3D a la derecha. Titular, copy y boton 'Explorar Cava'. Sin props.
- [x] `BotellasDestacadas` - Los 3 vinos mas caros, en **su propia seccion debajo del hero**, en flujo normal. Grid responsive, precio sobre la foto, entrada en cascada al hacer scroll.
- [x] `ProductCatalog` - Grilla e-commerce responsiva con filtros por tipo (Tinto, Blanco, Rosado, Espumante), cepa y rango de precio.
- [x] `ProductCard` - Tarjeta interactiva con zoom sutil en hover, detalles de bodega/cosecha, boton 'Agregar al Carrito' y boton 'Editar' (solo admin).
- [x] `ProductForm` - Modal/Formulario de carga/edicion de productos con soporte para URLs e subida de archivos de imagen (drag & drop). Modo edicion con carga de datos, titulo dinamico y validacion de precio > 0.
- [x] `CartDrawer` - Panel lateral deslizable animado con lista de productos, ajuste de cantidad y calculo de total.
- [x] `ProductDetailModal` - Vista rapida de producto con notas de cata, maridaje e imagen ampliada.
- [x] `Footer` - Informacion de contacto, horarios, redes sociales y aviso legal obligatorio (+18). **Agregado `id="contacto"` para navegación.**
- [x] `AnimatedSection` - Wrapper de animación scroll-reveal con Framer Motion (`useInView`), degradación a transiciones simples en móvil (< 640px).

### Back-Office (spec 004-a, implementada 2026-10-09) + Backend Real (spec 004-b, 2026-10-10)

**Acceso:** panel en `/admin`. **No hay boton de acceso en la tienda publica**: se entra escribiendo la URL, que pide una contrasena. La sesion vive en `sessionStorage`. 

- **Frontend (actual):** login real contra la API (`POST /api/auth/login`, email + password). El `accessToken` vive **solo en memoria del modulo** `src/api/client.ts`; el refresh viaja en cookie httpOnly, asi que no hay nada que leer desde `sessionStorage` ni desde la consola.
- **Backend 004-b (listo para 004-c):** `POST /api/auth/login` → JWT + refresh rotativo en cookie httpOnly, roles `admin`/`gestor`/`vendedor`, rate-limit 5 req/min.

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

### Backend (spec 004-b, implementada 2026-10-10)

```
backend/
├── src/
│   ├── config/env.ts           # Zod env validation
│   ├── main.ts                 # Entry point
│   ├── app.ts                  # Fastify factory + error handler
│   ├── routes.ts               # Registro centralizado módulos
│   ├── plugins/index.ts        # helmet, cors, rate-limit, swagger
│   ├── utils/errors.ts         # AppError hierarchy
│   ├── utils/logger.ts         # Pino structured logs
│   ├── modules/
│   │   ├── auth/               # JWT + refresh rotativo, roles
│   │   ├── wines/              # CRUD + import CSV + público
│   │   ├── orders/             # Timeline + roles
│   │   ├── customers/          # Search + tags + notas
│   │   ├── metrics/            # Agregaciones paralelas
│   │   ├── upload/             # Sharp → WebP → S3 signed URL
│   │   └── health/             # /health endpoint
├── prisma/schema.prisma        # 8 modelos (User, Wine, Order, etc.)
├── scripts/seed.ts             # Admin/gestor/vendedor
├── scripts/migrate-from-localstorage.ts
├── tests/setup.ts              # Defaults de process.env + Prisma (solo con DATABASE_URL_TEST)
├── tests/unit/esquemas.test.ts     # 20 tests de los schemas Zod
├── tests/modules/autenticacion.test.ts # 12 tests de authService (Prisma mockeado)
├── tests/modules/roles.test.ts       # 10 tests de authenticate/requireRole
├── vitest.config.ts            # OJO: `css.postcss: { plugins: [] }` es obligatorio
├── Dockerfile                  # Multi-stage (node:24-alpine)
├── docker-compose.yml          # DB + backend
└── .github/workflows/ci.yml    # GitHub Actions CI
```

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
  - Gestor de paquetes: `npm`
- Paleta de colores (fuente unica en `tailwind.config.js`):
  - Superficies: `charcoal` negro carbon neutro (`#2E2E2E` → `#0A0A0A`); fondo de pagina `charcoal-950` `#0A0A0A`, cards `#1E1E1E`/`#121212`, `body` `#121212`. **Decidido 2026-10-09:** al usuario no le gusto el fondo rojo de un primer pase y pidio "volver al negro carbon en vez de rojo".
  - Acento rojo: los 9 rojos de la imagen, `wine` 400→950 (botones, bordes, badges, estados seleccionados).
  - Blanco (agregado a pedido del usuario): rampa `white` (`#ffffff`, 100-300). Definida para que `bg-white`/`text-white` resuelvan; el texto largo sobre oscuro sigue en `cream` (`#FDFBF7`), menos fatigante.
  - Dorado (acento de la marca): `gold` (`#F0D98C`, `#E5C158`, `#D4AF37`, `#AA8C2C`).
  - Neutros: grises puros, mas claros que los de Tailwind para alcanzar WCAG AA (> 4.5:1) sobre el negro carbon.
  - Excepcion a "sin hex en componentes": `PALETA` en `herocanvas3d.tsx` (Three.js no lee el config).

## Bitacora de Cambios / Notas
- *2026-10-11:* **Spec 004-d: verificacion end-to-end. El backend arranco en Windows y aparecio el bug mas caro del proyecto.** Rama `spec-004-d-verificacion-e2e`.
  - **El puerto 3000 nunca fue el problema.** Mi hipotesis de que Hyper-V/WSL2 reservaban el rango era falsa: `netsh interface ipv4 show excludedportrange` no lista el 3000. El servidor arranca y escucha bien (`0.0.0.0:3000`, `GET /api/docs` → 200).
  - **La causa real era `localhost` en la `DATABASE_URL`.** En Windows `localhost` resuelve a `::1` (IPv6) y el motor de Prisma no conecta por ahi, aunque el puerto este publicado: `Can't reach database server at localhost:5432` tras ~5 s, con `netstat` y `Test-NetConnection` en verde. Con `127.0.0.1` funciona al instante. En Linux/CI `localhost` anda, asi que nunca se manifesto alla.
  - **`response.schema` de Fastify CORTA los datos — y todo respondia 200.** Fastify no serializa con `JSON.stringify`: compila el schema con `fast-json-stringify`, que descarta lo no declarado, y los schemas de `json-schemas.ts` eran placeholders `{ type: 'object' }` (que no declara ninguna propiedad). Resultado: `login` → `"user":{}`, `metrics` → `{}`, `wines.create` → `{}`, y tambien `orders.get/update` y `customers.get/update`. **Sin un solo error ni en el log.** El efecto en el panel: `hasRole('admin')` daba `false`, asi que el boton "Panel Admin" no aparecia al loguearse y **si aparecia al recargar** (cuando entra por `/auth/me`, que si tenia schema completo). El dashboard leia todas las tarjetas en cero. Fix: helper `objetoLibre()` (`additionalProperties: true`) en todos los responses.
  - **Test de regresion** `tests/unit/json_schemas.test.ts`: arma una app de Fastify real con cada `response.schema` y verifica que la respuesta conserve los datos. Probado en contra: sacando `additionalProperties` fallan 7 de 11, exactamente los endpoints rotos.
  - **Leccion:** 147 tests unitarios, 0 errores de typecheck, lint limpio, build OK, CI verde — y la app seguia rota. Un test que verifica el codigo de respuesta HTTP es distinto de uno que verifica el status.
  - **Bug del login (lo reporto el usuario como "no me deja entrar con admin123").** La password era correcta: el backend contestaba 200 con token y cookie. El problema es que `AdminGate` llamaba a `api.auth.login()` **crudo** en vez de `useAuth().login()`. La llamada cruda devuelve los tokens pero no toca estado: el `accessToken` vive en el modulo `api` y el `user` en el `AuthProvider`, y los dos los setea el hook. Con la llamada directa, `isAuthenticated` queda en `false`, `AdminLayout` (linea 73: `if (!autorizado) return <AdminGate />`) vuelve a renderizar el gate y el formulario se limpia -> **bucle infinito con la password correcta**. Era el unico lugar del proyecto que llamaba a la API de auth por fuera del hook.
- *2026-10-11:* **CI arreglado.** Los 3 checks de GitHub Actions estaban rojos despues del merge de 004-c. Tres causas distintas, ninguna en el codigo de la app:
  - **Frontend — Node 20 vs `jsdom@30`.** El job moria en `Test` con `webidl.util.markAsUncloneable is not a function`, 6 unhandled errors y 0 tests corridos. `jsdom@30.1.2` exige `^22.22.2 || ^24.15.0 || >=26` y su `undici@8` llama a `util.markAsUncloneable`, que nacio en Node 22.13. Local pasaba porque el usuario corre Node 26. Node 24 fijado en `.nvmrc`, `NODE_VERSION` y las dos etapas del `backend/Dockerfile`.
  - **Backend — no habia tests.** `tests/` solo tenia `setup.ts`; `integration/` y `modules/` estaban vacias y git no trackea carpetas vacias, asi que `vitest run` salia con "No test files found" y codigo 1. Agregados **42 tests** (`unit/esquemas`, `modules/autenticacion`, `modules/roles`) con Prisma mockeado via `vi.hoisted`.
  - **Backend — fuga del `postcss.config.js` del frontend.** Vite busca la config de PostCSS subiendo directorios desde `backend/`, encontraba la de la raiz y pedia `tailwindcss`. Local se resolvía desde el `node_modules` de la raiz; en CI el job de backend solo instala `backend/node_modules`. Fix: `css.postcss: { plugins: [] }` en `backend/vitest.config.ts` (Vite solo saltea la busqueda en disco si `css.postcss` es un objeto plano).
  - De paso: el typecheck del CI paso de `npx tsc` a `npm run typecheck`, porque con `node_modules` ausente `npx` baja el paquete `tsc@2.0.4` (que no es TypeScript) y el paso "pasa" sin compilar nada.
  - La leccion general: **los dos jobs fallaron por el entorno, no por el codigo**, y los dos bugs eran "funciona en mi maquina" — version de Node y `node_modules` de un proyecto hermano.
- *2026-10-10:* **Spec 004-b (Backend API Real) COMPLETA.** 9 tareas, 33 archivos backend, 9726 líneas agregadas. Commit `0bafd9c` pusheado a `main`.
  - T1: Infra (Prisma 8 modelos, Docker, seed, migraciones)
  - T2: Auth JWT + refresh rotativo, roles admin/gestor/vendedor, rate-limit, Swagger
  - T3: Vinos admin CRUD + import CSV streaming (papaparse, upsert por id)
  - T4: Vinos públicos `GET /api/wines/public` (solo activos)
  - T5: Pedidos CRUD + timeline atómico, roles vendedor restringido
  - T6: Clientes search+tags, notas append-only, tags replace
  - T7: Métricas agregaciones paralelas, shape `Metrics` exacto frontend
  - T8: Upload Sharp→WebP→S3 signed URL, validaciones mimetype/tamaño
  - T9: Script migración localStorage→PostgreSQL, GitHub Actions CI, Docker multi-stage
  - TypeScript strict, build OK, typecheck OK, migraciones aplicadas, seed OK

- *2026-10-09 (noche):* **Fondo y superficies de vuelta al negro carbon.** Al usuario no le gusto el fondo rojo del primer pase (`#35030F`) y pidio "volver al negro carbon en vez de rojo". Los 9 rojos siguen como acento; solo cambia la superficie:
  - `charcoal` deja de ser los 5 rojos mas oscuros y vuelve al gris neutro: `#2E2E2E`/`#262626`/`#1E1E1E`/`#121212`/`#0A0A0A`. `charcoal-800/900/950` recuperan los valores previos a la paleta (`#1e1e1e`/`#121212`/`#0a0a0a`); `600/700` (que codigo usa para hovers y no existian antes) se definen como grises.
  - `neutral` pierde el tinte vino y pasa a grises puros (`400` `#a3a3a3`, `500` `#8f8f8f` = 5.15:1 sobre `#1e1e1e`), manteniendo WCAG AA sobre las superficies carbon.
  - `src/index.css`: `:root` y `body` vuelven a `#121212` (el valor previo a la paleta; habian quedado en `#35030F`).
  - No cambian `wine` (9 rojos), `gold`, `white` ni `cream`. La 3D no toca el fondo (el canvas es alfa, la botella sigue siendo roja/vino como marca).
  - Reauditado en navegador: 0 fallas de contraste en `/` y las 5 rutas de `/admin`. 224/224 tests, `tsc` 0, `lint` 0, `build` OK.
- *2026-10-09 (noche):* **Paleta de la marca aplicada** (los 9 rojos de la imagen + blanco y dorado, a pedido del usuario).
  - **`tailwind.config.js` quedo como fuente unica de la paleta.** Se elimino el bloque `@layer utilities` de `src/index.css` que pisaba las utilidades de Tailwind con hex hardcodeados y ya divergentes (`wine-900` era `#3d0a16` en CSS contra `#3a0a1a` en el config; `gold-500`, `#c9a02e` contra `#d4af37`). Ese bloque, agregado sin avisar en un commit de la spec 003, es la razon de que hasta ahora "cambiar la paleta" no cambiara nada.
  - Rampas nuevas: `wine` con los 9 rojos (400→950); `charcoal` = los 5 rojos mas oscuros, para que las superficies tengan temperatura de vino en vez de gris; `white` (`#ffffff` + 100-300) agregada a pedido del usuario; `gold-300` (el codigo ya la usaba sin estar definida); `neutral` sobreescrito con grises calidos **mas claros**, porque el fondo nuevo (`#35030F`) es mas claro que el viejo (`#0a0a0a`) y con el gris de Tailwind el texto secundario caia por debajo de AA.
  - `PALETA` en `herocanvas3d.tsx` duplica los hex: Three.js no puede leer el config. Documentado ahi y en `AGENTS.md`.
  - **Auditoria de contraste en navegador (medicion de estilos computados, no capturas):** 0 fallas en `/` y en las 5 rutas de `/admin` despues de tres arreglos, ninguno introducido por la paleta sino expuesto por ella:
    1. Aviso +18 del footer: `text-wine-500/80` daba **1.73:1**, ilegible (ya estaba roto con la paleta anterior: era `#800020` sobre `#0a0a0a`, 1.8:1) → `text-gold-400` (10.3:1).
    2. "CAVA & CO. v1.0" del sidebar: `text-neutral-700` a **2.13:1** a 10 px → `text-neutral-500`.
    3. `neutral-500` ajustado de `#9b858d` a `#A08B93`: daba 4.46:1 sobre `bg-charcoal-800`, **0.04 por debajo** de AA. El `neutral-400` (`#ad979e`) sigue siendo mas claro, asi que la rampa no se invierte.
  - La paleta en si quedo commiteada por el usuario (`c3cf120`, "botella"); los tres arreglos y esta documentacion estan en el working tree.
  - 224/224 tests, `tsc` 0, `lint` 0, `build` OK.
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
- *2026-10-09 (tarde):* **Hero rediseñado a disposicion partida.** A pedido del usuario: "poné las botellas destacadas más abajo, que no queden encima de nada; el hero a la izquierda y el HeroCanvas3D a la derecha, como en las versiones anteriores".
  - **No hay version previa que restaurar**: `hero.tsx` en el primer commit (6a45f39) esta truncado en 124 bytes, y `interfaz`, `main` y `spec-003` tienen la misma version de 4394 bytes que la de antes del cambio. La disposicion se reconstruyo desde cero.
  - Hero en `lg:grid-cols-2`: texto a la izquierda, canvas a la derecha. El canvas ya no esta en `absolute inset-0`. Titulo de `text-8xl` a `text-6xl`.
  - Las botellas destacadas se movieron a `src/components/botellas_destacadas.tsx`, en su propia seccion debajo, en flujo normal. `Hero` dejo de recibir props y ahora es `Hero()`. RF-22/23/24 siguen cumplidas: cambia **donde**, no **que**.
  - La flecha de scroll estaba en `absolute bottom-12` centrada, encima de las botellas; ahora cuelga del boton.
  - Se saco el hero de su `AnimatedSection`: es la primera pantalla y el reveal por scroll lo dejaba fuera de vista al cargar.
  - Verificado en navegador: titulo `left 80→640`, canvas `left 712→1296`, sin interseccion. En movil se apila sin scroll horizontal.
  - Se muestran 2 botellas y no 3 porque `INITIAL_WINES` tiene 2 vinos. Los 12 del panel son mock de MSW.
- *2026-10-08:* Implementada Tarea 8 (T8) - Verificación integral y documentación. Todas las tareas de la spec 003 completadas: T1 (Filtros por precio y cepa), T2 (Edición de productos), T3 (Carga de imagen por archivo drag & drop), T4 (Enlaces de navegación), T5 (AnimatedSection scroll-reveal), T6 (Parallax en Hero), T7 (Botellas destacadas). Verificación: `npx tsc --noEmit` y `npm run build` pasan. No se instalaron dependencias nuevas. Se actualizó `MEMORY.md` y `AGENTS.md`.
- *2026-10-08:* Implementada Tarea 4 (T4) - Enlaces de navegación. Se agregaron enlaces a la barra de navegación (Inicio, Catálogo, Contacto) con scroll suave y offset para no tapar el encabezado por la barra fija. En móvil se implementó panel lateral (drawer) con Framer Motion (`AnimatePresence` + `motion.aside`) que anima desde la derecha, se cierra al hacer click en enlace, en la X o en el fondo. Se creó componente `Footer` (`pie_de_pagina.tsx`) con `id="contacto"` como destino de navegación. Se actualizó `App.tsx` para incluir el Footer.
- *2026-10-08:* Implementada Tarea 2 (T2) - Edicion de productos (solo admin). Se extendio `ProductForm` con props `onUpdateWine` y `wineToEdit`, agregado `useEffect` para cargar datos del vino a editar, titulo dinamico ('Editar Vino' / 'Cargar Nuevo Vino'), boton 'Guardar Cambios' en modo edicion, validacion de precio > 0. En `App.tsx` agregado estado `vinoAEditar` y funcion `actualizarWine`. En `ProductCard` agregado boton 'Editar' visible cuando se pasa `onEditWine`. Conectado flujo completo: click en 'Editar' en tarjeta -> abre formulario en modo edicion -> guarda con `actualizarWine` manteniendo mismo ID.
- *2026-10-08:* Implementada Tarea 1 (T1) - Filtros por precio y cepa. Se agregaron: `src/utils/filtros.ts` con funcion `filtrarVinos`, extendido `WineFilterState` en `src/types/vino.ts` con `minPrice`, `maxPrice` y `selectedVarietals`, actualizado `carta_de_catalogo.tsx` con inputs numericos para precio minimo/maximo, chips toggle para cepas disponibles, botones "Limpiar" para restablecer filtros, y conectado todo en `App.tsx` con nuevos props y estado.
- *2026-10-05:* Creado el archivo AGENTS.md en espanol con la especificacion completa del proyecto y los comandos `pnpm`.
- *2026-10-05:* Configurado MEMORY.md sincronizado con el stack tecnico (Vite + React + TS, Tailwind CSS, Framer Motion y Zustand/Context).
- *2026-10-05:* Creado y ubicado el documento de gobernanza en `docs/constitution.md`.