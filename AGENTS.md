# AGENTS.md

## Comandos de configuración

**Gestor de paquetes: npm** (el repo tiene `package-lock.json`; no usar pnpm).

- Instalar dependencias: `npm install`
- Iniciar servidor de desarrollo: `npm run dev`
- Ejecutar pruebas: `npm test` (usa `vitest run`, no watch)
- Verificar tipos: `npx tsc --noEmit`
- Lint: `npm run lint` (ESLint 9 flat config, `--max-warnings 0`)
- Build de producción: `npm run build` (ejecuta `tsc && vite build`)
- Regenerar datos mock: `node scripts/generar-mocks.mjs`
- Clave panel admin: `VITE_ADMIN_PASSWORD` (default `admin123`)

## Estilo de código

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Comillas simples, sin puntos y comas
- Patrones funcionales; componentes puros de React
- No hardcodear colores hex en componentes: viven en `tailwind.config.js` (única excepción: `PALETA` en `herocanvas3d.tsx` para Three.js)

## Arquitectura clave (lo que un agente suele pasar por alto)

| Aspecto | Detalle |
|---------|---------|
| **Framework** | React 18 + Vite 5 + TypeScript (no Next.js) |
| **Routing** | `react-router-dom` v7; `/admin` es hijo de `AdminLayout` (protege 5 rutas) |
| **Estado tienda** | `localStorage`: `vinoteca_wines` y `vinoteca_cart` (sin librería global) |
| **Estado admin** | `sessionStorage` (no `localStorage`); clave validada en navegador contra `VITE_ADMIN_PASSWORD` |
| **API mock** | MSW v2 en `src/mocks/` (latencia 300-800 ms); handlers en `handlers.ts` |
| **Datos mock** | Generados con PRNG sembrado (`scripts/generar-mocks.mjs`) para consistencia |
| **Gráficos** | Recharts con `import()` diferido (chunk aparte de ~376 kB) |
| **Tablas** | TanStack Table modo manual (`manualPagination/Sorting/Filtering`) |
| **Fechas** | `Date` nativo; **nunca `toISOString()` para `YYYY-MM-DD`** (UTC-3 rompe rangos). Usar `aIsoLocal` de `src/utils/fechas.ts` |
| **CSV** | Parser/escritor manual en `src/utils/csv.ts` (`papa-parse` da 404 en este registry) |
| **Animaciones** | Framer Motion; `AnimatedSection` usa `useInView`; degradación en móvil (< 640px) |

## Panel Admin (`/admin`) — spec 004-a implementada

- **Sin botón en la tienda pública**: se entra escribiendo `/admin`
- **Pantalla de clave** (`AdminGate`), no redirect: la sesión vive en `sessionStorage`
- **La contraseña NO es autenticación**: se compara en el bundle, no hay backend
- **No existe flag `isAdmin` en `localStorage`** (era público y editable desde consola)
- **`AdminWine` extiende `Wine`** (agrega `stock` y `activo`); formulario separado: `AdminWineForm` ≠ `ProductForm`
- 5 módulos: Dashboard, Catálogo, Pedidos, Clientes CRM, Configuración
- `DataTable` genérica con paginación/filtrado/orden en servidor (MSW)
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

- **Ubicación**: `test/**/*.test.ts` (no `.test.tsx`; JSX no compila en `.ts`)
- **Entorno**: jsdom con stubs para `ResizeObserver`, `IntersectionObserver`, `innerWidth=375` (evita Three.js)
- **Montaje**: `montarApp()` en `test/andamiaje.ts` (sin StrictMode; evita doble sincronización a localStorage)
- **Helpers**: `pulsar`, `escribir`, `esperarSalidas` (700 ms para `AnimatePresence`)
- **Cobertura**: 224 tests; `npm test` pasa en modo no interactivo (`watch: false`)

## Convenciones de archivos

- `@/*` alias a `src/*` (configurado en `vite.config.ts` y `tsconfig.json`)
- Componentes en `src/components/` y `src/components/admin/`
- Páginas admin en `src/pages/admin/`
- Hooks en `src/hooks/` (`useApi`, `useCatalogo`, `usePedidos`, `useClientes`, `useMediaQuery`)
- Utilidades en `src/utils/`
- Tipos en `src/types/` (`vino.ts`, `admin.ts`)
- Datos iniciales en `src/datos/vino.ts`
- Mocks MSW en `src/mocks/`

## Reglas de gobernanza

- `docs/CONSTITUCION.md` es la fuente de verdad para arquitectura, UI/UX y calidad
- Actualizar `MEMORY.md` y `AGENTS.md` tras cada cambio (ver protocolo en MEMORY.md)
- No agregar dependencias sin necesidad demostrada (ej. `date-fns` se agregó como dep directa tras detectarse hoisting)

## Gotchas operativos

1. **`npm run lint` lintea `*.ts` y `*.js` en raíz** (incluye `vitest.config.ts`, `tailwind.config.js`)
2. **`public/mockServiceWorker.js` está en `ignores`** (generado por `npx msw init`, no editar a mano)
3. **`hero.tsx` no renderiza `<HeroCanvas3D />` por debajo de 640px** (evita WebGL en tests/jsdom)
4. **`VistaRapidaProducto` se monta SIEMPRE**; su `AnimatePresence` interno decide visibilidad (montar condicionalmente rompe animación de salida)
5. **`loadWines`/`loadCart` tienen guardas contra `localStorage` corrupto** (`{}` o `[]` vacían catálogo/carrito)
6. **Escrituras offline fallan explícitamente** (no se encolan; evitaría conflictos sin resolver)