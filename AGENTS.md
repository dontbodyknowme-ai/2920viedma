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
| **Estado tienda** | `localStorage`: `vinoteca_wines` y `vinoteca_cart` (sin librería global) |
| **Estado admin (frontend)** | Sin estado local: `accessToken` solo en memoria del módulo `src/api/client.ts`, refresh en cookie httpOnly |
| **Auth real (backend)** | JWT access 15min + refresh rotativo 7d cookie httpOnly, roles admin/gestor/vendedor |
| **API real (frontend)** | Cliente HTTP propio en `src/api/client.ts`: intercepta 401 → refresh rotativo → reintenta una vez |
| **API real (backend)** | Fastify REST en `http://localhost:3000` (spec 004-b completa) |
| **Datos mock** | Generados con PRNG sembrado (`scripts/generar-mocks.mjs`) para consistencia |
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
- `AdminWine` extiende `Wine` (agrega `stock` y `activo`); formulario separado: `AdminWineForm` ≠ `ProductForm`
- 5 módulos: Dashboard, Catálogo, Pedidos, Clientes CRM, Configuración
- `DataTable` genérica con paginación/filtrado/orden en servidor (backend real)
- `DateRangePicker` con react-day-picker v9 (tema oscuro, dos meses)
- Offline: `src/utils/offline.ts` guarda último response por URL; banner `AvisoOffline` + "Reintentar"

## Paleta de colores (fuente única: `tailwind.config.js`)

- **Superficies**: `charcoal` = negro carbón neutro (`#2E2E2E` → `#0A0A0A`); fondo página `charcoal-950` `#0A0A0A`, cards `charcoal-800/900`
- **Acento rojo**: `wine` 400→950 (9 tonos, `#AD0021` a `#4F0718`) — botones, bordes, badges
- **Dorado**: `gold` (`#F0D98C` → `#AA8C2C`) — acento de marca
- **Blanco**: `white` (`#ffffff` + 100-300) para `bg-white`/`text-white`
- **Texto largo**: `cream` (`#FDFBF7`) — menos fatigante sobre oscuro
- **Neutros**: grises puros más claros que Tailwind para WCAG AA (> 4.5:1) sobre `#0A0A0A`

## Tests

### Frontend (`npm test` → `vitest run`)

- **Ubicación**: `test/**/*.test.ts` (no `.test.tsx`; JSX no compila en `.ts`)
- **Entorno**: jsdom con stubs para `ResizeObserver`, `IntersectionObserver`, `innerWidth=375` (evita Three.js)
- **Montaje**: `montarApp()` en `test/andamiaje.ts` (sin StrictMode; evita doble sincronización a localStorage)
- **Helpers**: `pulsar`, `escribir`, `esperarSalidas` (700 ms para `AnimatePresence`)
- **Cobertura**: 105 tests en 6 archivos (`csv`, `data_table`, `dashboard`, `date_range`,
  `integridad_datos_vino`, `validadores`); `npm test` pasa en modo no interactivo (`watch: false`)
- **Nota 004-c**: se borraron los tests que dependían de `src/mocks/*` y de `admin_acceso.ts`.
  Con MSW eliminado no queda nada que probar ahí; la cobertura de API real vive en el backend.

### Backend (`cd backend && npm run test` → `vitest run`)

- **Ubicación**: `backend/tests/**/*.test.ts`; entorno `node`
- **Prisma siempre mockeado** con `vi.mock('@prisma/client')` + `vi.hoisted` (el factory del
  mock corre antes que los `const`; sin `hoisted` revienta por TDZ)
- **`tests/setup.ts`** pone los defaults de `process.env` **antes** de importar el servidor:
  `config/env.ts` valida el entorno de forma eager y sin ellos no arranca ningún test
- **Cobertura**: 42 tests en 3 archivos (`unit/esquemas`, `modules/autenticacion`, `modules/roles`)
- `backend/tsconfig.json` incluye solo `src/**/*`: los tests **no** entran al `typecheck` ni al `build`
- Integraciones reales (con `DATABASE_URL_TEST`) se limpian en `beforeEach` por orden de FK

## Convenciones de archivos

- `@/*` alias a `src/*` (configurado en `vite.config.ts` y `tsconfig.json`)
- Componentes en `src/components/` y `src/components/admin/`
- Páginas admin en `src/pages/admin/`
- Hooks en `src/hooks/` (`useApi`, `useCatalogo`, `usePedidos`, `useClientes`, `useMediaQuery`)
- Utilidades en `src/utils/`
- Tipos en `src/types/` (`vino.ts`, `admin.ts`)
- Datos iniciales en `src/datos/vino.ts`
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
