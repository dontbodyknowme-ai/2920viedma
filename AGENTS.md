# AGENTS.md

## Comandos de configuración

**Gestor de paquetes: npm** (el repo tiene `package-lock.json`; no usar pnpm).

- Instalar dependencias: `npm install`
- Iniciar servidor de desarrollo (frontend): `npm run dev`
- Iniciar servidor de desarrollo (backend): `cd backend && npm run dev`
- Ejecutar pruebas: `npm test` (usa `vitest run`, no watch)
- Verificar tipos: `npx tsc --noEmit`
- Lint: `npm run lint` (ESLint 9 flat config, `--max-warnings 0`)
- Build de producción: `npm run build` (ejecuta `tsc && vite build`)
- Regenerar datos mock: `node scripts/generar-mocks.mjs`
- Login panel admin: `POST /api/auth/login` con email + password (`admin@vinoteca.local` / `admin123` del seed)

**Backend (spec 004-b):**
- `cd backend && npm run db:migrate` — aplica migraciones Prisma
- `cd backend && npm run seed` — crea usuarios admin/gestor/vendedor
- `cd backend && npm run dev` — levanta Fastify en :3000
- `cd backend && npm run test` — tests unitarios (mock Prisma)
- `docker compose up -d db` — levanta PostgreSQL

## Estilo de código

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Comillas simples, sin puntos y comas
- Patrones funcionales; componentes puros de React
- No hardcodear colores hex en componentes: viven en `tailwind.config.js` (única excepción: `PALETA` en `herocanvas3d.tsx` para Three.js)

## Arquitectura clave (lo que un agente suele pasar por alto)

| Aspecto | Detalle |
|---------|---------|
| **Framework Frontend** | React 18 + Vite 5 + TypeScript (no Next.js) |
| **Framework Backend** | Fastify + Node 24 + PostgreSQL + Prisma (spec 004-b **COMPLETA**) |
| **Routing Frontend** | `react-router-dom` v7; `/admin` es hijo de `AdminLayout` (protege 5 rutas) |
| **Estado tienda** | `localStorage`: `vinoteca_wines` y `vinoteca_cart` (sin librería global). La clave `vinoteca_wines` **no** se renombró con el modelo: ya está en el navegador de quien visitó la tienda |
| **Estado admin (frontend)** | Sin estado local: `accessToken` solo en memoria del módulo `src/api/client.ts`, refresh en cookie httpOnly |
| **Auth real (backend)** | JWT access 15min + refresh rotativo 7d cookie httpOnly, roles admin/gestor/vendedor |
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

## Panel Admin (`/admin`) — spec 004-a (UI) + 004-b (API real) + 004-c (integrada)

**Frontend (actual, autenticado contra la API):**
- **Sin botón en la tienda pública**: se entra escribiendo `/admin`
- **Pantalla de login** (`AdminGate`), no redirect: pide email + contraseña reales
- **No hay clave en el bundle ni en `sessionStorage`**: el `accessToken` vive solo en memoria
  del módulo `src/api/client.ts` y el refresh viaja en cookie httpOnly
- **No existe flag `isAdmin` en `localStorage`** (era público y editable desde consola)

**Backend 004-b:**
- `POST /api/auth/login` → JWT access 15min + refresh rotativo 7d (cookie httpOnly)
- Roles: `admin` / `gestor` / `vendedor` (middleware `requireRole()`)
- Rate-limit login: 5 req/min/IP
- Swagger UI: `http://localhost:3000/api/docs`

**Común:**
- `ProductoAdmin` extiende `Producto` (agrega `stock` y `activo`); formulario separado: `AdminProductoForm` ≠ `ProductForm`
- 5 módulos: Dashboard, Catálogo, Pedidos, Clientes CRM, Configuración
- **Cada módulo se filtra por rol (spec 006)**: el sidebar lee
  `seccionesVisibles(user.role)` y `admin_layout.tsx` redirige a
  `primeraVisible(rol)` si la URL escrita a mano no la puede ver. **La defensa es
  el `requireRole` del backend**; la tabla es la vista, y se mantienen los dos
  lugares a propósito: si se desincronizan, el síntoma es un `403` visible
- `DataTable` genérica con paginación/filtrado/orden en servidor (backend real)
- `DateRangePicker` con react-day-picker v9 (tema oscuro, dos meses)
- Offline: `src/utils/offline.ts` guarda último response por URL; banner `AvisoOffline` + "Reintentar"

## Paleta de colores (fuente única: `tailwind.config.js`)

> **Esta seccion estuvo mucho tiempo mintiendo.** Describia la paleta oscura
> (`charcoal`, `wine`, `gold`, `cream`) que ya no existe: cuando el diseno paso a
> la marca `2920` se renombraron a `verde`, `marfil`, `carbon`, `arena` y
> `blanco`. El bloque de abajo esta corregido; si vuelven a aparecer nombres que
> no esten en `tailwind.config.js`, es que esta otra vez atras.

- **Superficies**: `marfil` `#f7f4ee` (fondo de página), `blanco` (cards y superficies)
- **Acento verde**: `verde` 400→950 (9 tonos) + `salvia` como acento de marca — botones, bordes, badges
- **Acento cálido**: `arena` para bloques destacados (banner de envío)
- **Texto**: `carbon` `#292d2f` para texto largo, `neutral` para texto secundario
- **Neutros**: grises de Tailwind, ajustados para WCAG AA (> 4.5:1) sobre `marfil`

## Tests

> **Regla general:** un test que afirma cubrir algo que no cubre es **peor que
> no tener test**. Se verifica en contra: se sabotea el código y se comprueba
> que el test falla. Ya pasó cuatro veces (ver gotchas 28-31).

### Frontend (`npm test` → `vitest run`)

- **Ubicación**: `test/**/*.test.ts` (no `.test.tsx`; JSX no compila en `.ts`)
- **Entorno**: jsdom con stubs para `ResizeObserver`, `IntersectionObserver`,
  `matchMedia` (006), `innerWidth=375` (evita Three.js). Todos en `test/andamiaje.ts`.
  El stub de `matchMedia` **lee `innerWidth`**, no devuelve `false` fijo: si
  devuelve `false`, el panel se prueba siempre como en un monitor de 2000 px y el
  drawer de móvil no se ve nunca
- **Montaje**: `montarApp()` en `test/andamiaje.ts` (sin StrictMode; evita doble sincronización a localStorage)
- **Helpers**: `pulsar`, `escribir`, `esperarSalidas` (700 ms para `AnimatePresence`)
- **Cobertura**: 221 tests en 14 archivos. `admin/stock_por_departamento` y
  `carrito_agregado` interceptan `fetch` y montan `CatalogoAdmin` / `App` enteros;
  `npm test` pasa en modo no interactivo (`watch: false`)
- **Nota 004-c**: se borraron los tests que dependían de `src/mocks/*` y de `admin_acceso.ts`.
  Con MSW eliminado no queda nada que probar ahí; la cobertura de API real vive en el backend.
- **Nota 006**: `tsconfig.json` incluye `test/` **desde la 006**. Antes era
  `["src"]` solo y el docstring de `test/andamiaje.ts` afirmaba lo contrario
  desde la spec 001 — era falso. Al incluirlo aparecieron diez `TS2339` dormidos
  en `data_table.test.ts`.

### Tests del panel (`test/admin/`)

Montan componentes de verdad. El camino no es montando `App` (necesita un
servidor) sino **interceptando `fetch`**, no el módulo `api`:

- `test/admin/andamiaje_admin.ts`: `montarAdmin`, `montarLayout`, `montarGate`,
  `fetchDeSesion`, `fetchConLogin`, `entrarPorElGate`
- Se intercepta `fetch` y no `api` a propósito: el `AuthProvider` real corre y el
  cliente HTTP real corre, y solo la red se responde con lo que el test quiere.
  Un `vi.mock` del cliente pasaría igual y dejaría en verde un `useAuth` roto
- Lo que no sea `/api/auth/*` responde **404 a propósito**: si una página pide
  datos, el test falla con el error de la API en vez de mostrar una pantalla
  vacía que el test tomaría por una pantalla correcta
- `montarGate()` existe **sin** el `AdminLayout` alrededor, y no es redundante:
  dentro del layout, mandar al gate a `/admin` y mandar a `primeraVisible(rol)`
  dan el mismo lugar en pantalla, porque el layout redirige igual. Aislado, el
  gate es lo único que decide y la pregunta tiene respuesta (comprobado: con el
  gate saboteado, los tests de punta a punta pasaban en verde)
- Las páginas del panel son **de mentira** (`<p id="pagina">`) salvo
  `montarLayoutReal`, que usa el `Dashboard` real. Va por la API, no por el DOM:
  "el dashboard no se monta ni un instante" es una afirmación sobre el frame
  intermedio, y ese frame ya pasó cuando el test mira el DOM. Con la página real
  la pregunta es "¿se pidió `/api/metrics`?", que sí tiene respuesta

### Backend (`cd backend && npm run test` → `vitest run`)

- **Ubicación**: `backend/tests/**/*.test.ts`; entorno `node`
- **Prisma siempre mockeado** con `vi.mock('@prisma/client')` + `vi.hoisted` (el factory del
  mock corre antes que los `const`; sin `hoisted` revienta por TDZ)
- **`tests/setup.ts`** pone los defaults de `process.env` **antes** de importar el servidor:
  `config/env.ts` valida el entorno de forma eager y sin ellos no arranca ningún test
- **Cobertura**: 165 tests en 14 archivos
- `backend/tsconfig.json` incluye solo `src/**/*`: los tests **no** entran al `typecheck` ni al `build`.
  Es a propósito (el build de la imagen no debe typecheckear tests) y **no** es el
  olvido que había en el frontend. Si se cambia, va un `tsconfig` aparte, no
  agregar `tests` al de `src`
- Integraciones reales (con `DATABASE_URL_TEST`) se limpian en `beforeEach` por orden de FK
- **Los mocks de Prisma necesitan `$on`** (gotcha 22): Prisma lanza si emite un
  evento sin listener
- **`coherencia_permisos.test.ts`** cruza la tabla del frontend con los
  `requireRole` del backend, y fija los 14 contra una lista escrita a mano. El
  parser parte por declaraciones `fastify.<método>(`, **sin límite de distancia**:
  la versión anterior emparejaba con `[\s\S]{0,400}?` y un comentario de ocho
  líneas dejó `/api/metrics` sin leer, con el test en verde (gotcha 30)

## Convenciones de archivos

- `@/*` alias a `src/*` (configurado en `vite.config.ts` y `tsconfig.json`)
- Componentes en `src/components/` y `src/components/admin/`
- Páginas admin en `src/pages/admin/`
- Hooks en `src/hooks/` (`useApi`, `useCatalogo`, `usePedidos`, `useClientes`, `useMediaQuery`)
- Utilidades en `src/utils/`
- Tipos en `src/types/` (`producto.ts`, `admin.ts`)
- Datos iniciales en `src/datos/productos.ts`
- Cliente HTTP en `src/api/` (`client.ts`, `schemas.ts`); **no hay `src/mocks/`** (eliminado en 004-c)

## Reglas de gobernanza

- `docs/CONSTITUCION.md` es la fuente de verdad para arquitectura, UI/UX y calidad
- Actualizar `MEMORY.md` y `AGENTS.md` tras cada cambio (ver protocolo en MEMORY.md)
- No agregar dependencias sin necesidad demostrada (ej. `date-fns` se agregó como dep directa tras detectarse hoisting)

## Gotchas operativos

1. **`npm run lint` lintea `*.ts` y `*.js` en raíz** (incluye `vitest.config.ts`, `tailwind.config.js`)
2. **`hero.tsx` no renderiza `<HeroCanvas3D />` por debajo de 640px** (evita WebGL en tests/jsdom)
3. **`VistaRapidaProducto` se monta SIEMPRE**; su `AnimatePresence` interno decide visibilidad (montar condicionalmente rompe animación de salida)
4. **`loadWines`/`loadCart` tienen guardas contra `localStorage` corrupto** (`{}` o `[]` vacían catálogo/carrito)
5. **Escrituras offline fallan explícitamente** (no se encolan; evitaría conflictos sin resolver)
6. **Login button removido del navbar** (T2 004-c): acceso a `/admin` solo por URL directa
7. **MSW eliminado** (T7 004-c): `src/mocks/`, `public/mockServiceWorker.js` eliminados; `msw` movido a `devDependencies`
8. **Node 24 es el piso, no una preferencia** (fix CI 2026-10-11). `jsdom@30` exige `^22.22.2 || ^24.15.0 || >=26`
   y su `undici@8` llama `util.markAsUncloneable`, que no existe en Node 20: con Node 20 el job del frontend
   muere en `Test` con "unhandled errors" y **cero tests corridos**. La versión está fijada en `.nvmrc`,
   en `NODE_VERSION` del CI y en las dos etapas del `backend/Dockerfile`. Si se toca una, se tocan las tres.
9. **El typecheck del CI es `npm run typecheck`, no `npx tsc`**. Con `node_modules` ausente, `npx` baja del
   registry el paquete `tsc@2.0.4` (que no es TypeScript) y el paso "pasa" sin compilar nada.
10. **`backend/vitest.config.ts` declara `css.postcss: { plugins: [] }` a propósito** (fix CI 2026-10-11).
    Sin eso, Vite busca `postcss.config.js` subiendo directorios desde `backend/`, encuentra el del
    frontend e intenta cargar `tailwindcss`. En local se resuelve desde el `node_modules` de la raíz y
    nadie ve el problema; en CI el job de backend solo instala `backend/node_modules` y el run muere con
    `Failed to load PostCSS config: Cannot find module 'tailwindcss'`. Vite solo saltea la búsqueda en
    disco si `css.postcss` es un objeto plano. **No borrar ese bloque.**
11. **`response.schema` en Fastify CORTA los datos** (fix 2026-10-11, el bug más caro del proyecto).
    Fastify no usa `JSON.stringify`: compila el schema con `fast-json-stringify`, que **descarta toda
    propiedad no declarada**. Un `{ type: 'object' }` a secas devuelve `{}`. Pasó con `login` (→ `user: {}`,
    sin rol: el botón "Panel Admin" no aparecía hasta recargar), `metrics` (→ `{}`: dashboard en cero),
    `wines.create/update`, `orders.get/update` y `customers.get/update`. Todo respondía **200/201 sin un
    solo error**. Por eso `json-schemas.ts` tiene `objetoLibre()` (`additionalProperties: true`) y
    `tests/unit/json_schemas.test.ts` lo verifica serializando con Fastify de verdad.
    **Nunca escribir `{ type: 'object' }` en un `response.schema`.**
12. **En Windows, `DATABASE_URL` con `localhost` no conecta** (2026-10-11). `localhost` resuelve a `::1`
    (IPv6) y el motor de Prisma no llega por ahí aunque el puerto esté publicado:
    `Can't reach database server at localhost:5432` tras ~5 s de timeout, con el puerto abierto en
    `netstat` y `Test-NetConnection` en verde. Usar **`127.0.0.1`**. En Linux/CI `localhost` sí funciona.
13. **La sesión se abre SIEMPRE por `useAuth().login()`, nunca por `api.auth.login()`** (fix 2026-10-11).
    `api.auth.login()` es una llamada cruda: devuelve los tokens pero no toca estado. El `accessToken` vive en
    el módulo `api` y el `user` en el `AuthProvider`; los dos los setea el hook. Si el gate llama a la API
    directo, `isAuthenticated` queda en `false`, `AdminLayout` vuelve a renderizar `<AdminGate />` y el
    formulario se limpia: **bucle infinito con la contraseña correcta**. Dos estados separados (módulo y
    contexto) que hay que setear juntos; por eso hay un solo camino para entrar al panel.
14. **Los errores de Fastify NO son todos 500** (fix 2026-10-11). `setErrorHandler` manejava `ZodError` y
    `AppError` y mandaba todo lo demás a `500 INTERNAL_ERROR`. JSON malformado, body vacío y schema que no
    valida*daban 500. Además `request.log.error` salía del `logger: false` de Fastify: escribir ahí es
    escribir a la nada, así que un 500 real no quedaba registrado en producción. Ahora se usa el `logger`
    del proyecto y los 4xx de Fastify se devuelven con su status real.
15. **`Content-Type: application/json` en un POST sin cuerpo rompe Fastify** (fix 2026-10-11).
    `FST_ERR_CTP_EMPTY_JSON_BODY` → 500. Por eso `POST /api/auth/logout` y `/api/auth/refresh` devolvían
    500: el cliente manda esos POST **sin body**. Por eso `request()` en `client.ts` pone el header solo si
    hay cuerpo, y `buildApp` registra un parser que acepta el cuerpo vacío como `{}` (**quitando el BOM**,
    como hacía el parser original de Fastify).
16. **`routePrefix` de Swagger necesita barra final** (fix 2026-10-11). Swagger UI sirve el HTML con rutas
    relativas (`./static/…`); entrando en `/api/docs` sin barra el navegador pide `/api/static/…` y la
    página queda sin estilos ni JS. Va `/api/docs/` más un redirect explícito desde `/api/docs`.
17. **La imagen del backend es Debian slim, NO Alpine** (fix 2026-10-11). Con `node:24-alpine` el build
    pasaba y el contenedor **no arrancaba nunca**: `libquery_engine-linux-musl.so.node` pide `libssl.so.1.1`
    y Alpine usa musl con OpenSSL 3. `prisma generate` no carga el engine, así que el fallo aparece recién
    al arrancar, no al construir — por eso solo lo encuentra alguien que levanta la imagen.
18. **El logger no puede pedir `pino-pretty` a ciegas** (fix 2026-10-11). Es devDependency y en producción
    no está (`npm ci --omit=dev`): pedirlo tira `unable to determine transport target for "pino-pretty"` al
    importar el módulo y el backend no levanta. La guarda es **disponibilidad**, no solo `NODE_ENV` — si
    `NODE_ENV` queda en `development` (que es lo que dice `.env.example`) la app tampoco arranca.
    Por eso `logger.ts` hace `require.resolve('pino-pretty')` antes de usarlo.
19. **El `Dockerfile` tiene que estar en la raiz del repo, no en `backend/`** (2026-10-12, corregido 2026-10-13). Railway y Render toman el **contexto de build** del "Root Directory", que es un ajuste **del panel**. Ninguno de los dos deja declararlo en un archivo (el schema de `railway.json` solo tiene `dockerfilePath`), asi que con el Dockerfile en `backend/` habia que configurarlo a mano: se reseteo solo tres veces.
    El reset es **silencioso**. El contexto cae a la raiz, donde `package.json`, `tsconfig.json` y `src/` existen **pero son los del frontend**, asi que el build los copia sin quejarse y solo revienta cuando llega a `prisma/`, que existe unicamente en `backend/`:
    ```
    failed to compute cache key: ... "/prisma": not found
    ```
    Con el `Dockerfile` en la raiz, el contexto es la raiz **por definicion** y no hay nada que configurar en ningun panel. Hay un test que resuelve **cada `COPY` contra el disco** y otro que comprueba que entre **todo lo que los `tsconfig` declaran como entrada**: ese segundo existe porque el `COPY backend/scripts` falto entero, y el primero no lo veia (no apuntaba a algo inexistente, faltaba). `.dockerignore` en la raiz es obligatorio (los dos `node_modules` son 663 MB) y **los patrones de archivos que existen en los dos lados van con `/` adelante**: sin barra matchean en cualquier nivel y un `src` a secas se lleva `backend/src`.
20. **Un build fallido deja sirviendo el deploy anterior, con exito** (2026-10-12). La plataforma no levanta la imagen nueva y conserva la vieja: `/health` da 200, la API responde y el panel dice "Deployment successful" —refiriéndose al deploy viejo. El unico sintoma es que **los cambios del repo "no aplican"**. Por eso "el healthcheck da 200" **no** significa "el deploy se aplicó".
21. **Un "redeploy" no es "traé lo nuevo"** (2026-10-12). El botón `Redeploy` de Railway re-ejecuta el **mismo commit**, no resuelve la cabeza de la rama: repetirlo da el mismo `snapshot sha256` y el mismo `image digest`, es literalmente el mismo build. Para traer un commit nuevo hay que disparar el deploy desde el evento del push.
22. **Prisma Client no loguea nada por defecto** (2026-10-12). `new PrismaClient()` sin `log` no emite ni los errores de conexion. Hay que registrar los eventos con `log: [{ emit: 'event', level: 'error' }]` **y** `$on(...)` listeners antes de la primera query, porque Prisma lanza si un evento se emite sin listener. Los listeners van al `logger` del proyecto, no a stdout, por el mismo motivo que `logger: false` en Fastify. Cuidado: los mocks de `@prisma/client` en los tests tienen que exponer `$on` o revientan.
23. **Renombrar un servicio libera su dominio autogenerado** (2026-10-12). El dominio viejo pasa a 404 y `PUBLIC_API_URL` queda apuntando a la nada. Si ya hay dominio cargado, renombrar es caro.
24. **Un healthcheck con `SELECT 1` no detecta que falten las tablas** (2026-10-13). Por eso las migraciones corren en el arranque y no a mano: con el esquema sin crear la base responde, el healthcheck pasa, el deploy queda "sano" y la primera consulta real revienta con `relation does not exist`. `prisma migrate deploy` toma un advisory lock, asi que correrlas en cada arranque es seguro.
25. **`prisma migrate deploy` necesita una conexión SIN pooler** (2026-10-13). El pooler de Neon es PgBouncer en modo *transaction*: la conexión real vuelve al pool al terminar cada transacción, y el **advisory lock de sesión** que toma la migración **se queda puesto** en ella. Queda una sesión `idle` retenida con el lock tomado y el siguiente `migrate deploy` revienta:
    ```
    Timed out trying to acquire a postgres advisory lock
    (SELECT pg_advisory_lock(72707369)). Elapsed: 10000ms.
    ```
    O sea que **el primer deploy funciona y el segundo muere siempre**. Se separa con `directUrl` en el datasource: la app usa `url` (pooled), las migraciones usan `directUrl`. Y si ya quedó un lock huérfano, hay que cerrarle la sesión a mano (`pg_terminate_backend`): los locks son de base de datos, no de conexión, así que **arreglar el código no deshace el estado que dejó el bug anterior**.
26. **`SameSite=Lax` mata la sesión en cuanto el frontend y la API están en dominios distintos** (2026-10-13). `Lax` manda la cookie solo en navegaciones de primer nivel, no en un `fetch` desde JavaScript. Con la tienda en `vercel.app` y la API en `onrender.com` (sitios distintos), `/api/auth/refresh` llegaba sin cookie → 401 → el gate volvía a pedir la contraseña en cada recarga. En local `localhost:5173` y `localhost:3000` son el mismo sitio y **el bug es invisible**. Necesita `SameSite=None` **con** `Secure`: los navegadores rechazan `None` sin `Secure`.
27. **Una variable de entorno con el valor equivocado no rompe nada, apaga cosas** (2026-10-13). `NODE_ENV` sin poner en Render hizo que la cookie saliera `SameSite=Lax` y sin `Secure`, y que `CORS_ORIGIN` dejara de ser obligatoria. Los dos fallos son silenciosos: la app levanta, `/health` da 200, y el síntoma aparece del lado del navegador. Por eso `env.ts` avisa por `stderr` cuando `NODE_ENV !== production` pero `PUBLIC_API_URL` es `https://`.
28. **Un `401` del login se reportaba como "sesión expirada"** (2026-10-14, spec 006/T7). `client.ts` refrescaba ante **todo** `401`. En `/api/auth/login` un `401` **es la respuesta**, no el síntoma: no hay sesión que renovar. El refresh fallaba y el `throw` tapaba el mensaje del backend, así que la contraseña incorrecta llegaba a pantalla como *"Sesión expirada. Inicie sesión nuevamente."* — que manda a recargar la página, justo lo que ya se hizo. Y el arreglo no era de una línea: `app.ts` manda `message: error.message`, y en `UnauthorizedError('INVALID_CREDENTIALS')` el `message` **es** el código, así que sin traducción el gate pasaba a mostrar `INVALID_CREDENTIALS`. La regla que quedó: **una persona nunca lee un identificador en este panel**. Y la condición es **por ruta**, no "si no hay token en memoria": después de un F5 no hay token, y esa es exactamente la razón por la que el refresh por cookie existe.
29. **`tsconfig.json` no incluía `test/`, y el docstring decía que sí** (2026-10-14, spec 006). `include` era `["src"]` desde el proyecto, y `test/andamiaje.ts` afirmaba que `tsc` detectaba los errores de tipos de los tests "porque `tsconfig.json` incluye `test/` (RF-10, CA-10)". No lo incluía. Se comprobó de la peor forma: un test llamaba a `entrarCon`, definido dentro de otro `describe`, y **`npm run typecheck` pasó en verde**; lo reventó `npm test` con un `ReferenceError`. Al incluir `test/` aparecieron diez `TS2339` dormidos en `data_table.test.ts` (`disabled` y `options` no existen en `HTMLElement`). **Un comentario que afirma algo que no existe es la misma mentira que la UI, y más chica: se lee una vez y no molesta a nadie.**
30. **El parser del cruce de permisos se rompió con un comentario** (2026-10-14, spec 006/T4). `coherencia_permisos.test.ts` emparejaba `'/api/...'` con el `requireRole` de a 400 caracteres. **El comentario de ocho líneas explicando por qué el `gestor` no ve la facturación dejó a `/api/metrics` sin leer.** El test seguía verde: la tabla del frontend y el backend "coincidían" porque el backend no estaba en el mapa. Además aplanaba a la ruta, y perdía que `DELETE /api/wines/:id` es **solo admin** mientras `PATCH /api/wines/:id` es admin+gestor. Ahora parte por declaraciones `fastify.<método>(`, sin tope. **Un parser que depende de la distancia entre dos cosas se rompe con el primer comentario útil.**
31. **Dos mecanismos redundantes hacen indistinguibles los tests** (2026-10-14, spec 006/T3). El layout redirige a `primeraVisible(rol)` y el gate navega al destino permitido: los dos dan **el mismo lugar en pantalla**. Un test de punta a punta ("entrar como gestor y ver dónde queda") pasaba en verde con cualquiera de los dos. Recién con el gate montado **aislado** (`montarGate()`, sin `AdminLayout`) la pregunta tuvo respuesta. Y hay un caso donde dos mecanismos se cubren: `return null` durante el redirect se verifica por la **API** ("¿se pidió `/api/metrics`?"), no por el DOM — el frame intermedio ya pasó cuando el test mira el DOM.
32. **`/admin/*` con `path: '*'` montaba el Dashboard para cualquiera** (2026-10-14, spec 006/T3). `router.tsx` tenía `{ path: '*', element: <Dashboard /> }` dentro del panel, así que `/admin/secreto` le daba el dashboard a un `vendedor`: una sección vedada servida por un atajo. `puedeVer` no conoce esa ruta y por eso redirige. Un `catchAll` que sirve contenido en vez de una página vacía es un permiso con otro nombre.

33. **`overflow-x: hidden` en `html`/`body` desarma el `position: sticky`** (2026-10-17). Se agrego como "red" contra el scroll horizontal y rompio el navbar pegado. No es que "casi": `overflow-x: hidden` con `overflow-y: visible` **no se puede dejar**, porque los dos ejes no pueden quedar en `visible`/`clip` al mismo tiempo y el `visible` se convierte en `auto`. Con eso `body` pasa a ser contenedor de scroll, y el `sticky` resuelve contra el scrollport de su contenedor mas cercano —que no es el que scrollea la pagina—, asi que el navbar se iba con el scroll en vez de quedarse arriba.
    **Como se detecta** (no hay test que lo agarre: jsdom no carga el CSS del proyecto, y `position` computed tampoco dice si va a pegar):
    ```js
    window.scrollTo(0, 600)
    document.querySelector('header').getBoundingClientRect().top   // -600 = se fue;  0 = pegado
    ```
    Ese `-600` con la pagina scrolleada 600 px es un navbar **desperdigado**, igual que si no fuera `sticky`. Y la red no hacia falta: medido a 320/390/486/1440 px, `scrollWidth === clientWidth` y ningun elemento es mas ancho que el viewport. **Un elemento mas ancho que la pantalla se corrige en el elemento**, no escondiendolo en el `body`.
34. **Ocultar el navbar con `translate` en un `sticky` deja el hueco** (2026-10-17). El `sticky` participa del flujo: aplicarle un `-translate-y-full` y nada más, el header sigue reservando su alto y el hero arranca 134 px más abajo, con un rectángulo vacío en medio de la pantalla. Va `max-h-0` + `overflow-hidden`.
    Y en el mismo componente: **si el `<header>` lleva `initial`/`animate` de Framer Motion, su `transform` inline le gana a cualquier clase de Tailwind** y el `-translate-y-full` deja de hacer nada sin que se note por que. O el header se mueve con CSS y no lleva esas props, o el movimiento se hace con `animate={{ y: ... }}`.
35. **Un `z.enum` de la API es una puerta que no se puede abrir** (2026-10-17). `category` era `z.enum(['Tinto', 'Blanco', 'Rosado', 'Espumante'])`, y habia un test **fijando** que `'Orange'` fuera rechazado — o sea, el enum estaba protegido a proposito. Mientras la tienda fue una vinateria eso cerraba bien. Cuando paso a ser un kiosco, **el enum era el bug**: cargar una cerveza, una gaseosa o una galletita daba `400` y no habia forma de venderlas. El enum en Prisma ya se habia sacar en la spec 011 (`category` es `String`), pero **el de Zod se quedo**, y esa diferencia es invisible: el uno acepta texto libre y el otro no.
    La regla que quedo: **el enum en la frontera y el `String` en la base tienen que moverse juntos.** Si uno ya es texto libre, el otro tambien; y el test que fijaba el enum viejo hay que invertirlo, no borrar — "rechaza 'Cerveza'" es exactamente la afirmacion que hay que dejar de poder hacer.
    Y de ahi sale la siguiente: `vintage`, `winery` y `varietal` eran **obligatorios**, porque todos los productos eran vinos. Concederles valor a una gaseosa (`2024`, `"Bodega X"`, `"Blend"`) es escribir informacion falsa en la base, asi que pasaron a nullable - y con eso `esCampoOpcionalValido` tuvo que **aceptar `null`**, que antes rechazaba a proposito. `null` paso de ser "dato roto" a ser "este producto no tiene bodega".
36. **`CAMPOS_REQUERIDOS` con `toHaveLength` es lo que avisa de un cambio de modelo** (2026-10-17). Ese numero esta a proposito y no es decorativo: cuando `winery`/`varietal`/`vintage` volvieron opcionales, el test fijo en 10 fallo y obligo a decidir explicitamente que pasaban a `CAMPOS_OPCIONALES`. Sin el numero, el unico aviso seria un fixture sin el campo —y eso lo ve `tsc` **solo si el campo es requerido**, que es justo el caso que no aplica cuando el campo nuevo es opcional.
    El riesgo del otro lado es peor: si se sacan de `CAMPOS_REQUERIDOS` y no entran en `CAMPOS_OPCIONALES`, quedan **en ninguna de las dos listas** y `integridad_datos_producto.test.ts` los trata como propiedades fuera del contrato. Hay un test para eso ("los que se volvieron opcionales estan en CAMPOS_OPCIONALES").
37. **Un rename se verifica mirando lo que el rename no toca** (2026-10-18). El paso de `Wine` a `Producto`
    (modelo, tabla, rutas, tipos, archivos) salio bien, y sin embargo quedaron **cuatro cosas rotas** que ni
    `tsc` ni los tests detectaron:

    - **`Wine` de `lucide-react`**: el icono se llama `Wine` porque es una copa, y `Producto` no existe en
      el paquete. Renombrarlo da un error de import, no un nombre raro.
    - **La clave de un mock de Prisma**: `prismaFalso.wine` se renombro a `prismaFalso.product` en los
      usos, pero la **clave del objeto** seguia siendo `wine:`. Compilaba —el mock es un objeto plano con
      `vi.fn()`— y fallaba en runtime con `undefined.findMany`, en 15 tests a la vez.
    - **Textos de interfaz**: `Editar Vino`, `Cargar Nuevo Vino`, `Guardar Vino` son **strings**, no
      identificadores, asi que un rename de simbolos no los toca. Quedaron diciendo Vino en un kiosco.
    - **Un import que apunta a un archivo mal nombrado**: `datos/vino.ts` -> `datos/productos.ts` con
      `git mv`, y el import quedo en `datos/producto` (singular). Da un error de tipos, ese si.

    La leccion: **un rename de identificadores no renombra strings, claves de objeto ni imports**. Los tres
    se buscan a mano, y el de la clave del mock es el que no da ningun aviso del compilador.
38. **Un rename de ruta deja al test de coherencia sin poder detectar el error** (2026-10-18).
    `coherencia_permisos.test.ts` cruza la tabla del frontend con los `requireRole` del backend, y su segundo
    `describe` **fija 14 rutas contra una lista escrita a mano**. Al renombrar `/api/wines` a `/api/products`
    se renombraron **las dos**: el codigo y la lista. Los 166 tests pasan y **eso no prueba nada** sobre el
    rename —los dos lados se movieron juntos, que es justo lo que ese test existe para impedir.
    La unica forma de comprobarlo es **contar a mano**: las declaraciones `fastify.<metodo>(` con
    `requireRole` en `src/modules/*/routes.ts` contra las 14 de `ESPERADO`. Para un rename es barato; para
    un cambio de permisos no sirve de nada, porque ahi lo que importa es el *rol* de cada una y el test si lo
    fijaba.
39. **La documentacion vieja sobrevive a los commits que la invalidan** (2026-10-18). La seccion de paleta de
    `AGENTS.md` describia `charcoal`/`wine`/`gold`/`cream` mucho tiempo despues de que el diseno los
    cambiara a `verde`/`marfil`/`carbon`/`arena`/`blanco`. No hay test que la revise, asi que el unico aviso
    es que alguien vaya a leerla y le mienta. **Un doc que describe el estado anterior es el mismo bug que
    un docstring que afirma algo que no existe.**
    Y el mismo rename dejo una frase sin sentido en un gotcha: "todos los productos eran productos". Un
    reemplazo mecanico de `vino` por `producto` no sabe cuando la palabra era un **dato** y cuando era un
    **comentario**. Hay que leer el diff de los `.md`.
