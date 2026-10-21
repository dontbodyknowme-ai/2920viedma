# AGENTS.md

## Comandos de configuración

**Gestor de paquetes: npm** (el repo tiene `package-lock.json`; no usar pnpm).

### Frontend
- Instalar dependencias: `npm install`
- Iniciar servidor de desarrollo: `npm run dev` (Vite en :5173)
- Ejecutar pruebas: `npm test` (usa `vitest run`, no watch)
- Verificar tipos: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint` (ESLint 9 flat config, `--max-warnings 0`)
- Build de producción: `npm run build` (ejecuta `tsc && vite build`)
- Regenerar datos mock: `node scripts/generar-mocks.mjs`

### Backend (`cd backend`)
- `npm run dev` — levanta Fastify en :3000 (`tsx watch src/main.ts`)
- `npm run build` — compila (`tsc -p tsconfig.json && tsc -p tsconfig.scripts.json`)
- `npm run start` — `prisma migrate deploy && node dist/main.js` (producción)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `eslint .`
- `npm run test` — tests unitarios (`vitest run`, Prisma mockeado)
- `npm run db:migrate` — `prisma migrate dev` (desarrollo)
- `npm run db:deploy` — `prisma migrate deploy` (producción/CI)
- `npm run seed` — crea usuarios admin/gestor/vendedor **y el catálogo de demostración** (idempotente por `id`)
- `npm run seed:productos` — solo el catálogo. **Además borra los productos retirados** (`PRODUCTOS_RETIRADOS` en `src/demo/catalogo.ts`), que son los del catálogo de demostración que ya no existen. Es el comando que hay que correr después de cambiar el catálogo de demostración en una base que ya está sembrada: el `upsert` por `id` crea los nuevos pero no borra los viejos
- `npm run verificar:fotos` — comprueba que las 36 fotos del catálogo respondan 200 y no estén repetidas (**necesita red**, por eso es script y no test)
- `docker compose up -d db` — levanta PostgreSQL local

### Deploy / CI
- El typecheck del CI es `npm run typecheck`, **no** `npx tsc` (sin `node_modules`, `npx` baja `tsc@2.0.4` que no es TypeScript y "pasa" sin compilar)
- Node 24 es el piso: `.nvmrc`, `NODE_VERSION` en CI y las dos etapas del `backend/Dockerfile` deben coincidir
- Imagen backend: **Debian slim (`node:24-slim`), NO Alpine** (Alpine usa musl/OpenSSL 3 y Prisma no encuentra el engine)
- `Dockerfile` en la **raíz del repo** (no en `backend/`) — Railway/Render toman el contexto del "Root Directory" del panel, que se resetea solo; en la raíz el contexto es fijo por definición

---

## Estilo de código

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Comillas simples, sin puntos y comas
- Patrones funcionales; componentes puros de React
- **No hardcodear colores hex en componentes**: viven en `tailwind.config.js` (única excepción: `PALETA` en `herocanvas3d.tsx` para Three.js)

---

## Arquitectura clave (lo que un agente suele pasar por alto)

| Aspecto | Detalle |
|---------|---------|
| **Framework Frontend** | React 18 + Vite 5 + TypeScript (no Next.js) |
| **Framework Backend** | Fastify + Node 24 + PostgreSQL + Prisma (spec 004-b **COMPLETA**) |
| **Routing Frontend** | `react-router-dom` v7; `/admin` es hijo de `AdminLayout` (protege 5 rutas) |
| **Estado tienda** | `localStorage`: `vinoteca_wines` y `vinoteca_cart` (sin librería global). La clave `vinoteca_wines` **no** se renombró con el modelo: ya está en el navegador de quien visitó la tienda |
| **Estado admin (frontend)** | Sin estado local: `accessToken` solo en memoria del módulo `src/api/client.ts`, refresh en cookie httpOnly |
| **Auth real (backend)** | JWT access 15min + refresh rotativo 7d cookie httpOnly, roles `admin`/`gestor`/`vendedor` |
| **Permisos del panel (006)** | **Una tabla**: `src/utils/permisos.ts` → `puedeVer(rol, ruta)`, `seccionesVisibles(rol)`, `primeraVisible(rol)` |
| **Login con clave incorrecta (006)** | Un `401` de `/api/auth/login` **no** refresca; el gate traduce el `code` a texto. `/api/auth/me` **sí** refresca (gotcha 28) |
| **API real (frontend)** | Cliente HTTP propio en `src/api/client.ts`: intercepta 401 → refresh rotativo → reintenta una vez |
| **API real (backend)** | Fastify REST en `http://localhost:3000` (spec 004-b completa) |
| **Datos mock** | Generados con PRNG sembrado (`scripts/generar-mocks.mjs`) para consistencia |
| **Matriz de permisos (006)** | Dashboard **solo admin**; Catálogo/Clientes/Configuración admin+gestor; **Pedidos los tres**. El backend la aplica con `requireRole`; el frontend la *muestra* |
| **Gráficos** | Recharts con `import()` diferido (chunk aparte de ~376 kB) |
| **Tablas** | TanStack Table modo manual (`manualPagination/Sorting/Filtering`) |
| **Fechas** | `Date` nativo; **nunca `toISOString()` para `YYYY-MM-DD`** (UTC-3 rompe rangos). Usar `aIsoLocal` de `src/utils/fechas.ts` |
| **CSV** | Parser/escritor manual en `src/utils/csv.ts` (`papa-parse` da 404 en este registry) |
| **Animaciones** | Framer Motion; `AnimatedSection` usa `useInView`; degradación en móvil (< 640px) |

---

## Panel Admin (`/admin`) — spec 004-a (UI) + 004-b (API real) + 004-c (integrada)

**Frontend (actual, autenticado contra la API):**
- **Sin botón en la tienda pública**: se entra escribiendo `/admin`
- **Pantalla de login** (`AdminGate`), no redirect: pide email + contraseña reales
- **No hay clave en el bundle ni en `sessionStorage`**: el `accessToken` vive solo en memoria del módulo `src/api/client.ts` y el refresh viaja en cookie httpOnly
- **No existe flag `isAdmin` en `localStorage`** (era público y editable desde consola)

**Backend 004-b:**
- `POST /api/auth/login` → JWT access 15min + refresh rotativo 7d (cookie httpOnly)
- Roles: `admin` / `gestor` / `vendedor` (middleware `requireRole()`)
- Rate-limit login: 5 req/min/IP
- Swagger UI: `http://localhost:3000/api/docs/`

**Común:**
- `ProductoAdmin` extiende `Producto` (agrega `stock` y `activo`); formulario separado: `AdminProductoForm` ≠ `ProductForm`
- 5 módulos: Dashboard, Catálogo, Pedidos, Clientes CRM, Configuración
- **Cada módulo se filtra por rol (spec 006)**: el sidebar lee `seccionesVisibles(user.role)` y `admin_layout.tsx` redirige a `primeraVisible(rol)` si la URL escrita a mano no la puede ver. **La defensa es el `requireRole` del backend**; la tabla es la vista, y se mantienen los dos lugares a propósito: si se desincronizan, el síntoma es un `403` visible
- `DataTable` genérica con paginación/filtrado/orden en servidor (backend real)
- `DateRangePicker` con react-day-picker v9 (tema oscuro, dos meses)
- Offline: `src/utils/offline.ts` guarda último response por URL; banner `AvisoOffline` + "Reintentar"
- **Escrituras offline fallan explícitamente** (no se encolan; evitaría conflictos sin resolver)

---

## Paleta de colores (fuente única: `tailwind.config.js`)

> Esta sección describe la paleta **clara** actual (rediseño 2026-10-17). La paleta oscura anterior (`charcoal`, `wine`, `gold`, `cream`) **ya no existe**; el código debe migrar a estos nombres, no conviven dos paletas.

- **Superficies**: `marfil` `#f7f4ee` (fondo de página), `blanco` `#ffffff` (cards y superficies), `arena` `#e5d8c5` (bloques promocionales)
- **Acento verde**: `verde` 50→950 (9 tonos) + `salvia` `#75866a` (acento secundario) + `profundo` `#405747` (botones principales) — botones, bordes, badges
- **Texto**: `carbon` `#292d2f` para texto largo, `neutral` para texto secundario
- **Neutros**: grises puros (`neutral` 200–900), ajustados para WCAG AA (> 4.5:1) sobre `marfil`

---

## Tests

> **Regla general:** un test que afirma cubrir algo que no cubre es **peor que no tener test**. Se verifica en contra: se sabotea el código y se comprueba que el test falla.

### Frontend (`npm test` → `vitest run`)

- **Ubicación**: `test/**/*.test.ts` (no `.test.tsx`; JSX no compila en `.ts`)
- **Entorno**: jsdom con stubs para `ResizeObserver`, `IntersectionObserver`, `matchMedia` (lee `innerWidth`, no devuelve `false` fijo), `innerWidth=375`. Todos en `test/andamiaje.ts`.
- **Montaje**: `montarApp()` en `test/andamiaje.ts` (envuelto en `AuthProvider`, **sin StrictMode**; evita doble sincronización a localStorage)
- **Helpers**: `pulsar`, `escribir`, `esperarSalidas` (700 ms para `AnimatePresence`)
- **Cobertura**: 240 tests en 18 archivos. `admin/stock_por_departamento` y `carrito_agregado` interceptan `fetch` y montan `CatalogoAdmin` / `App` enteros
- **Un test de función no cubre la pantalla**: `test/producto.test.ts` mide `subtituloProducto` y `test/tarjeta_producto_sin_bodega.test.ts` mide la tarjeta. Los dos existen porque el segundo es el que agarra la regresión (gotcha 45)
- **Nota 004-c**: se borraron los tests que dependían de `src/mocks/*` y de `admin_acceso.ts`. Con MSW eliminado no queda nada que probar ahí; la cobertura de API real vive en el backend.
- **Nota 006**: `tsconfig.json` incluye `test/` **desde la 006**. Antes era `["src"]` solo y el docstring de `test/andamiaje.ts` afirmaba lo contrario — era falso. Al incluirlo aparecieron diez `TS2339` dormidos en `data_table.test.ts`.

### Tests del panel (`test/admin/`)

Montan componentes de verdad. El camino no es montando `App` (necesita un servidor) sino **interceptando `fetch`**, no el módulo `api`:

- `test/admin/andamiaje_admin.ts`: `montarAdmin`, `montarLayout`, `montarGate`, `fetchDeSesion`, `fetchConLogin`, `entrarPorElGate`
- Se intercepta `fetch` y no `api` a propósito: el `AuthProvider` real corre y el cliente HTTP real corre, y solo la red se responde con lo que el test quiere. Un `vi.mock` del cliente pasaría igual y dejaría en verde un `useAuth` roto
- Lo que no sea `/api/auth/*` responde **404 a propósito**: si una página pide datos, el test falla con el error de la API en vez de mostrar una pantalla vacía que el test tomaría por una pantalla correcta
- `montarGate()` existe **sin** el `AdminLayout` alrededor, y no es redundante: dentro del layout, mandar al gate a `/admin` y mandar a `primeraVisible(rol)` dan el mismo lugar en pantalla, porque el layout redirige igual. Aislado, el gate es lo único que decide y la pregunta tiene respuesta (comprobado: con el gate saboteado, los tests de punta a punta pasaban en verde)
- Las páginas del panel son **de mentira** (`<p id="pagina">`) salvo `montarLayoutReal`, que usa el `Dashboard` real. Va por la API, no por el DOM: "el dashboard no se monta ni un instante" es una afirmación sobre el frame intermedio, y ese frame ya pasó cuando el test mira el DOM. Con la página real la pregunta es "¿se pidió `/api/metrics`?", que sí tiene respuesta

### Backend (`cd backend && npm run test` → `vitest run`)

- **Ubicación**: `backend/tests/**/*.test.ts`; entorno `node`
- **Prisma siempre mockeado** con `vi.mock('@prisma/client')` + `vi.hoisted` (el factory del mock corre antes que los `const`; sin `hoisted` revienta por TDZ)
- **`tests/setup.ts`** pone los defaults de `process.env` **antes** de importar el servidor: `config/env.ts` valida el entorno de forma eager y sin ellos no arranca ningún test
- **Cobertura**: 191 tests en 16 archivos
- `backend/tsconfig.json` incluye solo `src/**/*`: los tests **no** entran al `typecheck` ni al `build`. Es a propósito (el build de la imagen no debe typecheckear tests) y **no** es el olvido que había en el frontend. Si se cambia, va un `tsconfig` aparte, no agregar `tests` al de `src`
- Integraciones reales (con `DATABASE_URL_TEST`) se limpian en `beforeEach` por orden de FK
- **Los mocks de Prisma necesitan `$on`** (gotcha 22): Prisma lanza si emite un evento sin listener
- **`coherencia_permisos.test.ts`** cruza la tabla del frontend con los `requireRole` del backend, y fija las 14 rutas contra una lista escrita a mano. El parser parte por declaraciones `fastify.<método>(`, **sin límite de distancia**: la versión anterior emparejaba con `[\s\S]{0,400}?` y un comentario de ocho líneas dejó `/api/metrics` sin leer, con el test en verde (gotcha 30)

---

## Convenciones de archivos

- `@/*` alias a `src/*` (configurado en `vite.config.ts` y `tsconfig.json`)
- Componentes en `src/components/` y `src/components/admin/`
- Páginas admin en `src/pages/admin/`
- Hooks en `src/hooks/` (`useApi`, `useCatalogo`, `usePedidos`, `useClientes`, `useMediaQuery`, `useAuth`)
- Utilidades en `src/utils/` (`producto.ts` tiene `subtituloProducto` y `tieneAnada`: cómo se rotula un producto que no es vino)
- Tipos en `src/types/` (`producto.ts`, `admin.ts`)
- Datos iniciales en `src/datos/productos.ts`
- Cliente HTTP en `src/api/` (`client.ts`, `schemas.ts`); **no hay `src/mocks/`** (eliminado en 004-c)
- Backend: `backend/src/modules/{auth,products,orders,customers,metrics,upload,health}/routes.ts`

---

## Reglas de gobernanza

- `docs/CONSTITUCION.md` es la fuente de verdad para arquitectura, UI/UX y calidad
- Actualizar `MEMORY.md` y `AGENTS.md` tras cada cambio (ver protocolo en MEMORY.md)
- No agregar dependencias sin necesidad demostrada (ej. `date-fns` se agregó como dep directa tras detectarse hoisting)

---

## Gotchas operativos (verificados, no especulativos)

1. **`npm run lint` lintea `*.ts` y `*.js` en raíz** (incluye `vitest.config.ts`, `tailwind.config.js`)
2. **`hero.tsx` no renderiza `<HeroCanvas3D />`** (evita WebGL en tests/jsdom)
3. **`VistaRapidaProducto` se monta SIEMPRE**; su `AnimatePresence` interno decide visibilidad (montar condicionalmente rompe animación de salida)
4. **`loadWines`/`loadCart` tienen guardas contra `localStorage` corrupto** (`{}` o `[]` vacían catálogo/carrito)
5. **Escrituras offline fallan explícitamente** (no se encolan; evitaría conflictos sin resolver)
6. **Login button removido del navbar** (T2 004-c): acceso a `/admin` solo por URL directa
7. **MSW eliminado** (T7 004-c): `src/mocks/`, `public/mockServiceWorker.js` eliminados; `msw` movido a `devDependencies`
8. **Node 24 es el piso, no una preferencia** (fix CI 2026-10-11). `jsdom@30` exige `^22.22.2 || ^24.15.0 || >=26` y su `undici@8` llama `util.markAsUncloneable`, que no existe en Node 20: con Node 20 el job del frontend muere en `Test` con "unhandled errors" y **cero tests corridos**. La versión está fijada en `.nvmrc`, en `NODE_VERSION` del CI y en las dos etapas del `backend/Dockerfile`. Si se toca una, se tocan las tres.
9. **El typecheck del CI es `npm run typecheck`, no `npx tsc`**. Con `node_modules` ausente, `npx` baja del registry el paquete `tsc@2.0.4` (que no es TypeScript) y el paso "pasa" sin compilar nada.
10. **`backend/vitest.config.ts` declara `css.postcss: { plugins: [] }` a propósito** (fix CI 2026-10-11). Sin eso, Vite busca `postcss.config.js` subiendo directorios desde `backend/`, encuentra el del frontend e intenta cargar `tailwindcss`. En local se resuelve desde el `node_modules` de la raíz y nadie ve el problema; en CI el job de backend solo instala `backend/node_modules` y el run muere con `Failed to load PostCSS config: Cannot find module 'tailwindcss'`. Vite solo saltea la búsqueda en disco si `css.postcss` es un objeto plano. **No borrar ese bloque.**
11. **`response.schema` en Fastify CORTA los datos** (fix 2026-10-11, el bug más caro del proyecto). Fastify no usa `JSON.stringify`: compila el schema con `fast-json-stringify`, que **descarta toda propiedad no declarada**. Un `{ type: 'object' }` a secas devuelve `{}`. Pasó con `login` (→ `user: {}`, sin rol: el botón "Panel Admin" no aparecía hasta recargar), `metrics` (→ `{}`: dashboard en cero), `wines.create/update`, `orders.get/update` y `customers.get/update`. Todo respondía **200/201 sin un solo error**. Por eso `json-schemas.ts` tiene `objetoLibre()` (`additionalProperties: true`) y `tests/unit/json_schemas.test.ts` lo verifica serializando con Fastify de verdad. **Nunca escribir `{ type: 'object' }` en un `response.schema`.**
12. **En Windows, `DATABASE_URL` con `localhost` no conecta** (2026-10-11). `localhost` resuelve a `::1` (IPv6) y el motor de Prisma no llega por ahí aunque el puerto esté publicado: `Can't reach database server at localhost:5432` tras ~5 s de timeout, con el puerto abierto en `netstat` y `Test-NetConnection` en verde. Usar **`127.0.0.1`**. En Linux/CI `localhost` sí funciona.
13. **La sesión se abre SIEMPRE por `useAuth().login()`, nunca por `api.auth.login()`** (fix 2026-10-11). `api.auth.login()` es una llamada cruda: devuelve los tokens pero no toca estado. El `accessToken` vive en el módulo `api` y el `user` en el `AuthProvider`; los dos los setea el hook. Si el gate llama a la API directo, `isAuthenticated` queda en `false`, `AdminLayout` vuelve a renderizar `<AdminGate />` y el formulario se limpia: **bucle infinito con la contraseña correcta**. Dos estados separados (módulo y contexto) que hay que setear juntos; por eso hay un solo camino para entrar al panel.
14. **Los errores de Fastify NO son todos 500** (fix 2026-10-11). `setErrorHandler` manejaba `ZodError` y `AppError` y mandaba todo lo demás a `500 INTERNAL_ERROR`. JSON malformado, body vacío y schema que no valida daban 500. Además `request.log.error` salía del `logger: false` de Fastify: escribir ahí es escribir a la nada, así que un 500 real no quedaba registrado en producción. Ahora se usa el `logger` del proyecto y los 4xx de Fastify se devuelven con su status real.
15. **`Content-Type: application/json` en un POST sin cuerpo rompe Fastify** (fix 2026-10-11). `FST_ERR_CTP_EMPTY_JSON_BODY` → 500. Por eso `POST /api/auth/logout` y `/api/auth/refresh` devolvían 500: el cliente manda esos POST **sin body**. Por eso `request()` en `client.ts` pone el header solo si hay cuerpo, y `buildApp` registra un parser que acepta el cuerpo vacío como `{}` (**quitando el BOM**, como hacía el parser original de Fastify).
16. **`routePrefix` de Swagger necesita barra final** (fix 2026-10-11). Swagger UI sirve el HTML con rutas relativas (`./static/…`); entrando en `/api/docs` sin barra el navegador pide `/api/static/…` y la página queda sin estilos ni JS. Va `/api/docs/` más un redirect explícito desde `/api/docs`.
17. **La imagen del backend es Debian slim, NO Alpine** (fix 2026-10-11). Con `node:24-alpine` el build pasaba y el contenedor **no arrancaba nunca**: `libquery_engine-linux-musl.so.node` pide `libssl.so.1.1` y Alpine usa musl con OpenSSL 3. `prisma generate` no carga el engine, así que el fallo aparece recién al arrancar, no al construir — por eso solo lo encuentra alguien que levanta la imagen.
18. **El logger no puede pedir `pino-pretty` a ciegas** (fix 2026-10-11). Es devDependency y en producción no está (`npm ci --omit=dev`): pedirlo tira `unable to determine transport target for "pino-pretty"` al importar el módulo y el backend no levanta. La guarda es **disponibilidad**, no solo `NODE_ENV` — si `NODE_ENV` queda en `development` (que es lo que dice `.env.example`) la app tampoco arranca. Por eso `logger.ts` hace `require.resolve('pino-pretty')` antes de usarlo.
19. **El `Dockerfile` tiene que estar en la raiz del repo, no en `backend/`** (2026-10-12, corregido 2026-10-13). Railway y Render toman el **contexto de build** del "Root Directory", que es un ajuste **del panel**. Ninguno de los dos deja declararlo en un archivo (el schema de `railway.json` solo tiene `dockerfilePath`), así que con el Dockerfile en `backend/` había que configurarlo a mano: se reseteó solo tres veces. El reset es **silencioso**. El contexto cae a la raíz, donde `package.json`, `tsconfig.json` y `src/` existen **pero son los del frontend**, así que el build los copia sin quejarse y solo revienta cuando llega a `prisma/`, que existe únicamente en `backend/`: `failed to compute cache key: ... "/prisma": not found`. Con el `Dockerfile` en la raíz, el contexto es la raíz **por definición** y no hay nada que configurar en ningún panel. Hay un test que resuelve **cada `COPY` contra el disco** y otro que comprueba que entre **todo lo que los `tsconfig` declaran como entrada**: ese segundo existe porque el `COPY backend/scripts` faltó entero, y el primero no lo veía (no apuntaba a algo inexistente, faltaba). `.dockerignore` en la raíz es obligatorio (los dos `node_modules` son 663 MB) y **los patrones de archivos que existen en los dos lados van con `/` adelante**: sin barra matchean en cualquier nivel y un `src` a secas se lleva `backend/src`.
20. **Un build fallido deja sirviendo el deploy anterior, con éxito** (2026-10-12). La plataforma no levanta la imagen nueva y conserva la vieja: `/health` da 200, la API responde y el panel dice "Deployment successful" —refiriéndose al deploy viejo. El único síntoma es que **los cambios del repo "no aplican"**. Por eso "el healthcheck da 200" **no** significa "el deploy se aplicó".
21. **Un "redeploy" no es "traé lo nuevo"** (2026-10-12). El botón `Redeploy` de Railway re-ejecuta el **mismo commit**, no resuelve la cabeza de la rama: repetirlo da el mismo `snapshot sha256` y el mismo `image digest`, es literalmente el mismo build. Para traer un commit nuevo hay que disparar el deploy desde el evento del push.
22. **Prisma Client no loguea nada por defecto** (2026-10-12). `new PrismaClient()` sin `log` no emite ni los errores de conexión. Hay que registrar los eventos con `log: [{ emit: 'event', level: 'error' }]` **y** `$on(...)` listeners antes de la primera query, porque Prisma lanza si un evento se emite sin listener. Los listeners van al `logger` del proyecto, no a stdout, por el mismo motivo que `logger: false` en Fastify. Cuidado: los mocks de `@prisma/client` en los tests tienen que exponer `$on` o revientan.
23. **Renombrar un servicio libera su dominio autogenerado** (2026-10-12). El dominio viejo pasa a 404 y `PUBLIC_API_URL` queda apuntando a la nada. Si ya hay dominio cargado, renombrar es caro.
24. **Un healthcheck con `SELECT 1` no detecta que falten las tablas** (2026-10-13). Por eso las migraciones corren en el arranque y no a mano: con el esquema sin crear la base responde, el healthcheck pasa, el deploy queda "sano" y la primera consulta real revienta con `relation does not exist`. `prisma migrate deploy` toma un advisory lock, así que correrlas en cada arranque es seguro.
25. **`prisma migrate deploy` necesita una conexión SIN pooler** (2026-10-13). El pooler de Neon es PgBouncer en modo *transaction*: la conexión real vuelve al pool al terminar cada transacción, y el **advisory lock de sesión** que toma la migración **se queda puesto** en ella. Queda una sesión `idle` retenida con el lock tomado y el siguiente `migrate deploy` revienta: `Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)). Elapsed: 10000ms.` O sea que **el primer deploy funciona y el segundo muere siempre**. Se separa con `directUrl` en el datasource: la app usa `url` (pooled), las migraciones usan `directUrl`. Y si ya quedó un lock huérfano, hay que cerrarle la sesión a mano (`pg_terminate_backend`): los locks son de base de datos, no de conexión, así que **arreglar el código no deshace el estado que dejó el bug anterior**.
26. **`SameSite=Lax` mata la sesión en cuanto el frontend y la API están en dominios distintos** (2026-10-13). `Lax` manda la cookie solo en navegaciones de primer nivel, no en un `fetch` desde JavaScript. Con la tienda en `vercel.app` y la API en `onrender.com` (sitios distintos), `/api/auth/refresh` llegaba sin cookie → 401 → el gate volvía a pedir la contraseña en cada recarga. En local `localhost:5173` y `localhost:3000` son el mismo sitio y **el bug es invisible**. Necesita `SameSite=None` **con** `Secure`: los navegadores rechazan `None` sin `Secure`.
27. **Una variable de entorno con el valor equivocado no rompe nada, apaga cosas** (2026-10-13). `NODE_ENV` sin poner en Render hizo que la cookie saliera `SameSite=Lax` y sin `Secure`, y que `CORS_ORIGIN` dejara de ser obligatoria. Los dos fallos son silenciosos: la app levanta, `/health` da 200, y el síntoma aparece del lado del navegador. Por eso `env.ts` avisa por `stderr` cuando `NODE_ENV !== production` pero `PUBLIC_API_URL` es `https://`.
28. **Un `401` del login se reportaba como "sesión expirada"** (2026-10-14, spec 006/T7). `client.ts` refrescaba ante **todo** `401`. En `/api/auth/login` un `401` **es la respuesta**, no el síntoma: no hay sesión que renovar. El refresh fallaba y el `throw` tapaba el mensaje del backend, así que la contraseña incorrecta llegaba a pantalla como *"Sesión expirada. Inicie sesión nuevamente."* — que manda a recargar la página, justo lo que ya se hizo. Y el arreglo no era de una línea: `app.ts` manda `message: error.message`, y en `UnauthorizedError('INVALID_CREDENTIALS')` el `message` **es** el código, así que sin traducción el gate pasaba a mostrar `INVALID_CREDENTIALS`. La regla que quedó: **una persona nunca lee un identificador en este panel**. Y la condición es **por ruta**, no "si no hay token en memoria": después de un F5 no hay token, y esa es exactamente la razón por la que el refresh por cookie existe.
29. **`tsconfig.json` no incluía `test/`, y el docstring decía que sí** (2026-10-14, spec 006). `include` era `["src"]` desde el proyecto, y `test/andamiaje.ts` afirmaba que `tsc` detectaba los errores de tipos de los tests "porque `tsconfig.json` incluye `test/` (RF-10, CA-10)". No lo incluía. Se comprobó de la peor forma: un test llamaba a `entrarCon`, definido dentro de otro `describe`, y **`npm run typecheck` pasó en verde**; lo reventó `npm test` con un `ReferenceError`. Al incluir `test/` aparecieron diez `TS2339` dormidos en `data_table.test.ts` (`disabled` y `options` no existen en `HTMLElement`). **Un comentario que afirma algo que no existe es la misma mentira que la UI, y más chica: se lee una vez y no molesta a nadie.**
30. **El parser del cruce de permisos se rompió con un comentario** (2026-10-14, spec 006/T4). `coherencia_permisos.test.ts` emparejaba `'/api/...'` con el `requireRole` de a 400 caracteres. **El comentario de ocho líneas explicando por qué el `gestor` no ve la facturación dejó a `/api/metrics` sin leer.** El test seguía verde: la tabla del frontend y el backend "coincidían" porque el backend no estaba en el mapa. Además aplanaba a la ruta, y perdía que `DELETE /api/wines/:id` es **solo admin** mientras `PATCH /api/wines/:id` es admin+gestor. Ahora parte por declaraciones `fastify.<método>(`, sin tope. **Un parser que depende de la distancia entre dos cosas se rompe con el primer comentario útil.**
31. **Dos mecanismos redundantes hacen indistinguibles los tests** (2026-10-14, spec 006/T3). El layout redirige a `primeraVisible(rol)` y el gate navega al destino permitido: los dos dan **el mismo lugar en pantalla**. Un test de punta a punta ("entrar como gestor y ver dónde queda") pasaba en verde con cualquiera de los dos. Recién con el gate montado **aislado** (`montarGate()`, sin `AdminLayout`) la pregunta tuvo respuesta. Y hay un caso donde dos mecanismos se cubren: `return null` durante el redirect se verifica por la **API** ("¿se pidió `/api/metrics`?"), no por el DOM — el frame intermedio ya pasó cuando el test mira el DOM.
32. **`/admin/*` con `path: '*'` montaba el Dashboard para cualquiera** (2026-10-14, spec 006/T3). `router.tsx` tenía `{ path: '*', element: <Dashboard /> }` dentro del panel, así que `/admin/secreto` le daba el dashboard a un `vendedor`: una sección vedada servida por un atajo. `puedeVer` no conoce esa ruta y por eso redirige. Un `catchAll` que sirve contenido en vez de una página vacía es un permiso con otro nombre.
33. **`overflow-x: hidden` en `html`/`body` desarma el `position: sticky`** (2026-10-17). Se agregó como "red" contra el scroll horizontal y rompió el navbar pegado. `overflow-x: hidden` con `overflow-y: visible` **no se puede dejar**, porque los dos ejes no pueden quedar en `visible`/`clip` al mismo tiempo y el `visible` se convierte en `auto`. Con eso `body` pasa a ser contenedor de scroll, y el `sticky` resuelve contra el scrollport de su contenedor más cercano —que no es el que scrollea la página—, así que el navbar se iba con el scroll en vez de quedarse arriba. Detección: `window.scrollTo(0, 600); document.querySelector('header').getBoundingClientRect().top` → `-600` = se fue; `0` = pegado. Y la red no hacía falta: medido a 320/390/486/1440 px, `scrollWidth === clientWidth` y ningún elemento es más ancho que el viewport. **Un elemento más ancho que la pantalla se corrige en el elemento, no escondiéndolo en el `body`.**
34. **Ocultar el navbar con `translate` en un `sticky` deja el hueco** (2026-10-17). El `sticky` participa del flujo: aplicarle un `-translate-y-full` y nada más, el header sigue reservando su alto y el hero arranca 134 px más abajo, con un rectángulo vacío en medio de la pantalla. Va `max-h-0` + `overflow-hidden`. Y en el mismo componente: **si el `<header>` lleva `initial`/`animate` de Framer Motion, su `transform` inline le gana a cualquier clase de Tailwind** y el `-translate-y-full` deja de hacer nada sin que se note por qué. O el header se mueve con CSS y no lleva esas props, o el movimiento se hace con `animate={{ y: ... }}`.
35. **Un `z.enum` de la API es una puerta que no se puede abrir** (2026-10-17). `category` era `z.enum(['Tinto', 'Blanco', 'Rosado', 'Espumante'])`, y había un test **fijando** que `'Orange'` fuera rechazado — o sea, el enum estaba protegido a propósito. Cuando pasó a ser un kiosco, **el enum era el bug**: cargar una cerveza, una gaseosa o una galletita daba `400` y no había forma de venderlas. El enum en Prisma ya se había sacado en la spec 011 (`category` es `String`), pero **el de Zod se quedó**, y esa diferencia es invisible: el uno acepta texto libre y el otro no. La regla que quedó: **el enum en la frontera y el `String` en la base tienen que moverse juntos.** Si uno ya es texto libre, el otro también; y el test que fijaba el enum viejo hay que invertirlo, no borrar — "rechaza 'Cerveza'" es exactamente la afirmación que hay que dejar de poder hacer. Y de ahí sale la siguiente: `vintage`, `winery` y `varietal` eran **obligatorios**, porque todos los productos eran vinos. Concederles valor a una gaseosa (`2024`, `"Bodega X"`, `"Blend"`) es escribir información falsa en la base, así que pasaron a nullable — y con eso `esCampoOpcionalValido` tuvo que **aceptar `null`**, que antes rechazaba a propósito. `null` pasó de ser "dato roto" a ser "este producto no tiene bodega".
36. **`CAMPOS_REQUERIDOS` con `toHaveLength` es lo que avisa de un cambio de modelo** (2026-10-17). Ese número está a propósito y no es decorativo: cuando `winery`/`varietal`/`vintage` volvieron opcionales, el test fijo en 10 falló y obligó a decidir explícitamente que pasaban a `CAMPOS_OPCIONALES`. Sin el número, el único aviso sería un fixture sin el campo —y eso lo ve `tsc` **solo si el campo es requerido**, que es justo el caso que no aplica cuando el campo nuevo es opcional. El riesgo del otro lado es peor: si se sacan de `CAMPOS_REQUERIDOS` y no entran en `CAMPOS_OPCIONALES`, quedan **en ninguna de las dos listas** y `integridad_datos_producto.test.ts` los trata como propiedades fuera del contrato. Hay un test para eso ("los que se volvieron opcionales están en CAMPOS_OPCIONALES").
37. **Un rename se verifica mirando lo que el rename no toca** (2026-10-18). El paso de `Wine` a `Producto` (modelo, tabla, rutas, tipos, archivos) salió bien, y sin embargo quedaron **cuatro cosas rotas** que ni `tsc` ni los tests detectaron: **`Wine` de `lucide-react`** (el icono se llama `Wine` porque es una copa, y `Producto` no existe en el paquete); **la clave de un mock de Prisma** (`prismaFalso.wine` se renombró a `prismaFalso.product` en los usos, pero la **clave del objeto** seguía siendo `wine:` — compilaba y fallaba en runtime con `undefined.findMany` en 15 tests); **textos de interfaz** (`Editar Vino`, `Cargar Nuevo Vino`, `Guardar Vino` son **strings**, no identificadores, así que un rename de símbolos no los toca); **un import que apunta a un archivo mal nombrado** (`datos/vino.ts` → `datos/productos.ts` con `git mv`, y el import quedó en `datos/producto` singular). La lección: **un rename de identificadores no renombra strings, claves de objeto ni imports**. Los tres se buscan a mano, y el de la clave del mock es el que no da ningún aviso del compilador.
38. **Un rename de ruta deja al test de coherencia sin poder detectar el error** (2026-10-18). `coherencia_permisos.test.ts` cruza la tabla del frontend con los `requireRole` del backend, y su segundo `describe` **fija 14 rutas contra una lista escrita a mano**. Al renombrar `/api/wines` a `/api/products` se renombraron **las dos**: el código y la lista. Los tests pasan y **eso no prueba nada** sobre el rename —los dos lados se movieron juntos, que es justo lo que ese test existe para impedir. La única forma de comprobarlo es **contar a mano**: las declaraciones `fastify.<método>(` con `requireRole` en `src/modules/*/routes.ts` contra las 14 de `ESPERADO`.
39. **La documentación vieja sobrevive a los commits que la invalidan** (2026-10-18). La sección de paleta de `AGENTS.md` describía `charcoal`/`wine`/`gold`/`cream` mucho tiempo después de que el diseño los cambiara a `verde`/`marfil`/`carbon`/`arena`/`blanco`. No hay test que la revise, así que el único aviso es que alguien vaya a leerla y le mienta. **Un doc que describe el estado anterior es el mismo bug que un docstring que afirma algo que no existe.** Y el mismo rename dejó una frase sin sentido en un gotcha: "todos los productos eran productos". Un reemplazo mecánico de `vino` por `producto` no sabe cuándo la palabra era un **dato** y cuándo era un **comentario**. Hay que leer el diff de los `.md`.
40. **`npm start` migraba pero no sembraba** (2026-10-18). Es `prisma migrate deploy && node dist/main.js`, y el seed de productos era un script que alguien corría **a mano, una vez, acordándose**. Un deploy que lo olvidaba dejaba la tienda con **cero productos y sin un solo error en los logs**: la migración había funcionado, `/health` daba 200, el deploy figuraba sano. El único síntoma era que un visitante no encontraba nada que buscar. Por eso `src/demo/bootstrap.ts` siembra **al arrancar, y solo si `product.count() === 0`**. La condición importa más que el seed: con un producto en la base no hace nada, y así el dueño del negocio edita precios a mano sin que el próximo deploy se los revierta. El caso raro —borra todos los productos a propósito y el siguiente arranque los vuelve a sembrar— es el precio de que la app se llene sola, y `SEED_CATALOGO=false` lo desactiva. Y `scripts/` **no puede** importar de `src/`: cada tsconfig tiene su `rootDir`, así que el catálogo de demostración vive en `src/demo/` y no en `scripts/`. `deploy.test.ts` lo fija.
41. **Una foto que carga bien puede ser la foto que no es** (2026-10-18). El catálogo de demostración tiene las URLs de Unsplash escritas a mano, y de 20 productos **4 dan 404** (malo visible: se ve el icono de imagen rota) y **2 mostraban otra cosa**: la "Cerveza Artesanal IPA" tenía una foto de un apicultor con su colmena, y el "Chocolate Amargo 70%" una de chocolate **blanco**. Las dos respondían 200. **Un 200 es un 200, no importa lo que muestre**, así que ningún test de URLs las agarra. Por eso existe `npm run verificar:fotos`, que además es **script y no test**: necesita red, y en `npm test` un test que falla cuando se cae internet no informa nada sobre el código. Lo que el script **no** verifica es que la foto sea del producto — eso no se puede automatizar sin falsos positivos — así que imprime el nombre al lado de la miniatura para que sean comparables de a ojo.
42. **La búsqueda compara `i` con `í`** (2026-10-18). Escribir `regaleria` no encontraba nada aunque la etiqueta del filtro dijera **"Regalería"**, y en español la tilde casi nunca se escribe. El síntoma es de los peores que puede tener un buscador: **no hay error, no hay estado raro, no hay nada que reportar**. El usuario escribe, no ve resultados, y concluye que el producto no existe. Se arregló con `normalizarTexto` (`NFD` + borrar el rango `0300`-`036f`), que además empeora un caso: la `ñ` **no** se descompone, así que "manana" y "mañana" siguen siendo cadenas distintas. Por eso el test busca las dos formas. Y se agregó la **descripción** a los campos de búsqueda: es lo único que hay para un producto sin marca ni cepa, que es la mitad del catálogo.
43. **La copia más cara es la que se desincroniza en silencio** (2026-10-18). El test de bootstrap empezó reimplementando la búsqueda del frontend —concatenar campos y hacer `includes`— y falló con *"blanco no encuentra nada"*: se le había olvidado `tipoVino`. O sea, **una segunda copia de `filtrarVinos`**. Lo que quedó son reglas sobre los **datos** (ninguna categoría con menos de dos productos, ids únicos, fotos sin repetir, `tipoVino` solo en "Vinos"), que solo se pueden comprobar acá y que dicen algo real: una categoría con un solo producto hace que la búsqueda no sirva, porque con esos datos un `filtrarVinos` que devolviera el catálogo entero daría el mismo resultado y ningún test lo notaría. La regla que sale de ahí: **ningún filtro puede llevar a un lugar vacío**. Un botón que devuelve cero no es un filtro, es un error con forma de botón. Y por eso `Espumante` dejó de ser una categoría —los espumantes van en "Vinos" y se distinguen por `tipoVino`—, y `Energizantes` pasó a ser un **grupo** de verdad: antes los productos lo tenían en `null` y el filtro de grupo lo ofrecía igual, con lo que llevaba a cero resultados.
44. **Una foto de marca no sale de un banco de imágenes genérico** (2026-10-21). Las fotos del catálogo son de Unsplash, y para un vino o una cerveza alcanza: con que la imagen sea "de algo de esa clase" ya está. Para las **marcas** no: el pedido fue el *Monster original, verde con negro*, y Unsplash no tiene la lata **negra con el logo verde** —tiene la de sabor, la de zero, la de pipeline, y una IPA con foto de apicultor. Poner la lata equivocada es el mismo bug de la IPA con la colmena: **carga perfecto y no es el producto**, y ningún test de URLs lo agarra porque un 200 es un 200.
    Por eso las tres marcas (Monster, Speed, Red Bull) sacan la foto de **Wikimedia Commons** con un helper aparte, `W()`, en `backend/src/demo/catalogo.ts`. Y por eso `verificar-fotos` tiene que entender las **dos** formas de escribir una foto: `U('1506377')` (Unsplash) y `W('0/06/Archivo.jpg/960px-Archivo.jpg')` (Wikimedia). Si se pierde el helper, la ruta de Wikimedia se reconstruye con el prefijo de Unsplash y da una imagen de otra cosa —o un 404— sin que nadie entienda por qué.
    **El ancho del thumbnail tiene que ser uno de los que Wikimedia ya tiene generado**: uno inventado responde **400**, no 404, y el error dice "Bad Request" sin mencionar el ancho.
    Y las fotos de Wikimedia son **CC BY-SA 4.0**: hay que atribuir. Los créditos están en `CREDITOS_FOTOS_WIKIMEDIA` (mismo archivo) y `catalogo_energizantes.test.ts` verifica que no se agregue una foto de marca sin su crédito.
45. **Un producto que no es vino no tiene bodega, ni añada, ni separador** (2026-10-21). Los componentes escribían `{producto.winery} • {producto.varietal}` y `{producto.vintage}` a secas, así que para una gaseosa, un energizante o unas papas la tarjeta de la grilla mostraba **" • "** y un badge con la forma de un año y nada adentro. **La mitad del catálogo no es vino**: gaseosas, jugos, aguas, cervezas, energizantes, chocolates, papas. Todos se mostraban con la basura de arriba.
    La regla quedó en `src/utils/producto.ts`: `subtituloProducto()` escribe **lo que hay** (bodega → cepa, separado por " • ") y devuelve `null` si no hay nada, para que el que lo usa **omita la línea entera**; `tieneAnada()` decide si el badge de la añada va o no. Ojo con la distinción de `vista_rapida_producto.tsx` (D-N): un **string vacío** es un dato *presente* para la descripción, que se muestra aunque esté vacía. Acá lo que se decide es **qué se imprime**.
    Y el test de pantalla (`test/tarjeta_producto_sin_bodega.test.ts`) existe por una razón puntual: los tests de `subtituloProducto` miden la función, así que **seguirían en verde** si alguien vuelve a escribir `{producto.winery} • {producto.varietal}` en la tarjeta. El que agarra esa regresión es el que mira el DOM.
46. **El `upsert` por `id` crea los productos nuevos pero no borra los viejos** (2026-10-21). Cambiar el catálogo de demostración y volver a sembrar deja los productos que se reemplazaron **huérfanos en la base**: no se crean (no están en el catálogo) pero tampoco se borran, y el filtro los muestra al lado de los nuevos. El caso fue reemplazar dos energizantes genéricos por tres de marca.
    La solución es una lista explícita, `PRODUCTOS_RETIRADOS` en `backend/src/demo/catalogo.ts`, y `sembrarCatalogo` la borra con `deleteMany` sobre **esa lista**. El detalle que importa: la lista son **ids que el catálogo de demostración creó alguna vez**, nunca "todo lo que no está en el catálogo" —esa segunda regla se llevaría por delante los productos que cargó el dueño, que es justo lo que el seed jamás debe hacer.
    Y de paso: `sembrarCatalogo` ahora devuelve `retirados` además de `creados` y `actualizados`, así que **el mock de Prisma de los tests necesita `deleteMany`** que devuelva `{ count }`. Sin eso, `retirados` es `undefined` y el log dice "undefined retirados".