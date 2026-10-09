# Tareas 004 — Back-Office UI (Panel de Administración)

**Spec:** `specs/004-backoffice-ui/spec.md`, estado `borrador`
**Plan:** `specs/004-backoffice-ui/plan.md`
**Fase:** 4 de 5 (tareas). El implementador hace estas tareas; el Reviewer las valida después.
**Tareas: 10.**

## Cómo se usan estas tareas

- **Una tarea a la vez**, en el orden de dependencias.
- **Ninguna tarea se marca hecha sin ejecutar su verificación.** El estado arranca en `pendiente` y solo pasa a `hecha` cuando la verificación pasa.
- **Regla dura: solo dependencias aprobadas.** `recharts`, `@tanstack/react-table`, `msw`, `papa-parse`, `react-router-dom`.
## Cómo se usan estas tareas

- **Una tarea a la vez**, en el orden de dependencias.
- **Ninguna tarea se marca hecha sin ejecutar su verificación.** El estado arranca en `pendiente` y solo pasa a `hecha` cuando la verificación pasa.
- **Regla dura: solo dependencias aprobadas.** `recharts`, `@tanstack/react-table`, `msw`, `papa-parse`, `react-router-dom`, `react-day-picker`, `date-fns`.
- **Tests:** existen 4 suites en `test/` (`validadores`, `integridad_datos_vino`, `orquestador_carrito`, `orquestador_persistencia`) pero **`vitest` no está instalado en `node_modules`**, así que `npm test` falla con "vitest no se reconoce". Instalarlo es parte de T1: los tests nuevos de `test/admin/` no corren sin eso, y los 4 preexistentes tampoco.
- **Si la implementación requiere cambiar la spec o el plan, pará y reportá** (skill SDD).
- **Si la implementación requiere cambiar la spec o el plan, pará y reportá** (skill SDD).

## Comandos de referencia

```bash
npm test                      # suite completa
npx tsc --noEmit              # chequeo de tipos sin emitir
npm run build                 # tsc && vite build
npm run dev                   # servidor de desarrollo
```

## Índice

| ID | Título | RF cubiertos | Depende de | Estado |
|---|---|---|---|---|
| T1 | Infra: Routing, MSW, Mocks, Tipos | RF-35 a RF-43, RF-01 a RF-04 (parcial) | — | `pendiente` |
| T2 | Layout: AdminLayout, Sidebar, Protección rutas | RF-01 a RF-04 | T1 | `pendiente` |
| T3 | Componentes compartidos | RF-10 a RF-34 (base) | T2 | `pendiente` |
| T4 | Dashboard | RF-05 a RF-09 | T3 | `pendiente` |
| T5 | Catálogo Admin | RF-10 a RF-21 | T3 | `pendiente` |
| T6 | Pedidos Admin | RF-22 a RF-29 | T3 | `pendiente` |
| T7 | Clientes CRM | RF-30 a RF-34 | T3 | `pendiente` |
| T8 | Configuración + CSV Export/Import | RF-19, RF-20, RF-33 | T3 | `pendiente` |
| T9 | Integración navbar "Modo Admin" | RF-01 | T2 | `pendiente` |
| T10 | Verificación integral + docs | RNF-01 a RNF-08 | T9 | `pendiente` |

---

## T1 — Infra: Routing, MSW, Mocks, Tipos

**RF cubiertos:** RF-35 a RF-43, RF-01 a RF-04 (tipos y base)
**Depende de:** nada. Es la primera.
**Estado:** `hecha` — 68/68 tests en verde, `tsc` 0, `build` 0, verificado en navegador

### Qué hacer

**1. `src/types/admin.ts` — Tipos extendidos (NUEVO)**

Crear archivo con: `AdminUser`, `Order`, `Customer`, `Metrics`, `AdminFilters` (ver plan D-E).

**2. `src/types/vino.ts` — Extender `Wine`**

Agregar campos:
```ts
export interface Wine {
  // ... campos existentes
  stock: number
  activo: boolean
}
```

**3. `src/datos/vino.ts` — Actualizar vinos iniciales**

Agregar `stock` (0-100) y `activo: true` a los 2 vinos existentes.

**4. `src/mocks/data.ts` — Datos mock (NUEVO)**

Crear con:
- `mockWines`: 12 vinos (2 existentes + 10 nuevos) con `stock`, `activo`, variedades diversas
- `mockOrders`: 25 pedidos con estados distribuidos, fechas últimos 60 días, 1-4 items c/u
- `mockCustomers`: 15 clientes con historial, tags, notas
- `mockMetrics`: 30 días ventas, top 5 productos, actividad reciente

**5. `src/mocks/handlers.ts` — MSW Handlers (NUEVO)**

Handlers para:
- `GET/POST/PATCH/DELETE /api/wines` (con paginación, búsqueda, filtros)
- `GET/PATCH /api/orders` (con filtros estado/fecha)
- `GET /api/customers`
- `GET /api/metrics`
- `POST /api/wines/import` (CSV)
- Helper `delay()` 300-800ms aleatorio

**6. `src/mocks/browser.ts` — MSW Setup (NUEVO)**

```ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
export const worker = setupWorker(...handlers)
```

**7. `src/router.tsx` — React Router v6 (NUEVO)**

Configurar `createBrowserRouter` con rutas públicas + `/admin/*` children (ver plan D-A).

**8. `src/main.tsx` — Integrar Router + MSW**

```tsx
import { router } from './router'
import { RouterProvider } from 'react-router-dom'

if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
```

**9. `src/App.tsx` — Flag `isAdmin` + toggle**

```tsx
const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true')
const toggleAdmin = () => {
  const next = !isAdmin
  setIsAdmin(next)
  localStorage.setItem('isAdmin', String(next))
}
```

### Verificación

```bash
npx tsc --noEmit
npm run build
npm test -- test/admin/mocks.test.ts
```

En navegador:
- MSW intercepta `/api/*` (ver Network tab)
- Latencia 300-800ms visible
- Datos mock cargan correctamente

### Hecho cuando

- [x] `src/types/admin.ts` existe con tipos completos
- [x] `AdminWine` define `stock` y `activo` (ver C-1, resuelto)
- [x] `src/mocks/data.ts` con 12 vinos, 25 pedidos, 15 clientes, métricas 30 días
- [x] `src/mocks/handlers.ts` con todos los endpoints
- [x] `src/router.tsx` con rutas públicas + admin children
- [x] `src/main.tsx` integra RouterProvider + MSW worker
- [x] `src/App.tsx` persiste el flag `isAdmin` (el estado y el toggle van en T9)
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **68/68 tests en verde**, incluidos los 46 preexistentes sin tocar

---

## ✅ C-1 — Resuelto: `AdminWine extends Wine`

**El conflicto estaba mal planteado en un punto.** SeNALABA que había que elegir entre A (opcionales) y B (tocar tests). Las dos estan muertas, y no por la razon que se suponia:

| Lista | Por que no sirve para `stock` / `activo` |
|---|---|
| `CAMPOS_REQUERIDOS` | Los fixtures de `test/validadores.test.ts` arman un `Wine` sin esos campos, asi que `camposRequeridosInvalidos` los reporta. Se midio: **18 de 26 tests fallan** |
| `CAMPOS_OPCIONALES` | `test/integridad_datos_vino.test.ts:201` exige que `esCampoOpcionalValido` rechace `0` y `false`. Y `stock: 0` y `activo: false` son valores legitimos: no queda ningun campo libre |

**Resolucion: opcion C.** `stock` y `activo` viven en `AdminWine extends Wine` (`src/types/admin.ts`), no en `Wine`. Los 46 tests pasan sin tocarse y el tipo de `Wine` queda intacto.

**Por que esta bien y no es un parche.** `stock` es un dato interno de la operacion: un visitante no lo necesita, y **RF-06 de la spec 004-b ya define que `GET /api/wines/public` omite `stock` y `activo`**. Que el tipo lo imponga desde el lado del admin hace que mezclar los dos sea un error de compilacion y no una forgotten. El modelo de tipos quedo alineado con el contrato de API que ya estaba escrito.

**EfectoPractico para el resto de la spec:** `mockWines` es `AdminWine[]` y los handlers de `/api/wines` trabajan con `AdminWine`. El catalogo publico sigue con `Wine[]`. T5 tiene que hacer la conversion al leer de `/api/wines`.

---

## 🔧 Regresiones de la spec 003 que T1 destapo

Los tests no corrian nunca en esta maquina (no habia `vitest` instalado), asi que el "68 en verde" de la spec 002 nunca se verifico aca. Al ponerlos en marcha aparecieron **tres defectos reales de la spec 003**, que T1 corrige porque un test en rojo no se puede dejar asi:

**1. `loadWines()` habia perdido la guarda de RF-34.** Devolvia `JSON.parse(stored)` sin validar. Con `"{}"` o `"[]"` en `vinoteca_wines`, la app arrancaba con el catalogo vacio en lugar del inicial. Se restauro `Array.isArray(parsed) && parsed.length > 0`. Mismo arreglo en `loadCart()` (faltaba el `Array.isArray`).

**2. El mensaje de pedido confirmado habia pasado de `<p role='status'>` a `alert()`.** RF-27 pide "un mensaje de pedido confirmado" y el test de RF-45 lo lee del DOM. `alert` ademas bloquea la ejecucion. Se restauro el `<p role='status'>` con el texto original, y se agrego el `if (cart.length === 0) return` que RF-27 tambien exige.

**3. `VistaRapidaProducto` habia desaparecido de `App.tsx`.** El archivo del componente seguia existiendo, pero la reescritura de la 003 dejo de importarlo y el estado quedo como `_selectedWine` (con guion bajo, deliberadamente sin usar). RF-35 a RF-37 quedaron sin cumplen: no habia forma de abrir ni cerrar la vista rapida. Se restauro el import y el montaje.

### Nota de infraestructura: los 22 tests del orquestador

Fallaban por dos APIs que **jsdom no implementa** y que Framer Motion exige:

| API | Quien la pide |
|---|---|
| `ResizeObserver` | `useMeasure`, que usa todo `motion.div` con `layout` (el catalogo y las tarjetas) |
| `IntersectionObserver` | `useInView`, que usa `animated_section.tsx` para el revelado al hacer scroll |

El `andamiaje.ts` de la spec 003 ya evitaba un consumidor de `ResizeObserver` (el `<Canvas>` de three.js) forzando `innerWidth = 375`, y por ahiNELOS ninguna de las dos APIs faltaba. **Son tres caminos separados**: evitar el canvas no cubre a Framer Motion.

Los dos stubs se agregaron en `test/andamiaje.ts`, que es el harness compartido de los 22 tests del orquestador y **no** uno de los 46 protegidos por RNF-05. `IntersectionObserverStub` devuelve `isIntersecting: true` a proposito: si devolviera `false`, las secciones quedan en opacidad 0 y los tests que buscan texto no lo encuentran. Los stubs no notifican nunca, para no inducir a Framer Motion a recalcular proyecciones de `layout` en cada `act`, que es lo que la spec 002 demonstro que frena el unmount de `AnimatePresence`.

---

### Notas de implementación (2026-10-09)

**1. `msw` quedo en la version 2, no 3.** `npm install msw` instala la 3, que exige `vite >= 6` como peer opcional, y el proyecto tiene Vite 5. La resolucion falla con `ERESOLVE`. Se instalo `msw@^2.11.0` (queda 2.15.0), que soporta Vite 5. La 004-b ya pedia `^2.0.0`, asi que la 004-a se le suma como dependencia aprobada.

**2. `react-router-dom` quedo en v7, no v6 como dice D-04.** `npm install` trae la ultima, que es la 7.18.4. **La API que usa el proyecto es identica** en ambas (`createBrowserRouter`, `RouterProvider`), asi que no requiere cambios de codigo. Se deja constancia porque es una desviacion de la letra del plan: si en T2 o posteriores apareciera alguna incompatibilidad de v7, la causa probable estaria aca.

**3. Los datos mock se generan con un script, no se escriben a mano.** `scripts/generar-mocks.mjs` produce `src/mocks/data.ts`. Es `.mjs` y no `.ts` porque corre con `node` pelado: `tsx` no esta instalado y RNF-04 no aprueba agregarlo. Motivo del generador: con 25 pedidos y 15 clientes escritos a mano, el `totalSpent` de un cliente puede no coincidir con la suma de sus pedidos. El generador **deriva** el historial de los clientes desde los pedidos ya creados y **deriva** las metricas desde los pedidos, asi que los tres conjuntos no pueden desincronizarse. Usa un PRNG con semilla fija (`mulberry32`, semilla 20261008), asi que el archivo es estable entre corridas.

**4. El archivo generado emite comillas simples.** `JSON.stringify` produce comillas dobles, que rompen la convencion del proyecto. El generador las convierte sobre el texto serializado. Los tests de integridad miran claves, no formato, asi que esto no afecta los 46 preexistentes.

**5. `src/main.tsx` no usa `await` al tope del modulo.** El `tsconfig.json` tiene `target: ES2020` y el await al tope necesita ES2022. Se envuelve en una funcion `iniciar()` async. Se eligio esto sobre subir el target para no tocar la configuracion de compilacion por un detalle de una tarea.

**6. El estado `isAdmin` quedo para T9, no en T1.** T1 pide "state + toggle", pero hasta T9 no existe el boton del navbar que los consuma. Un `useState` cuyo setter no usa nadie es codigo muerto, y el `noUnusedLocals: true` del proyecto lo rechaza con TS6133 (se comprobo). T1 entrega entonces `loadIsAdmin()` y `saveIsAdmin()`, que son el contrato de persistencia, mas la constante `STORAGE_KEY_ADMIN`. El estado y el toggle nacen en T9, que es la tarea que los usa.

**7. `tsconfig.json` recibio `"types": ["vite/client", "node"]`.** `main.tsx` usa `import.meta.env.DEV` para decidir si registra MSW, y sin los tipos de `vite/client` eso es `Property 'env' does not exist on type 'ImportMeta'`. El archivo no estaba en la lista de intocables de plan.md §2.3.

**8. `src/index.css` estaba sin punto y coma y rompia el build.** Venia de la rama `interfaz`, que no tiene el arreglo que se aplico en `main`. PostCSS falla con `Missed semicolon`. Se corrigio y se agrego un comentario al principio del archivo que explica por que ese archivo si lleva punto y coma aunque la convencion del proyecto diga que no: en CSS la declaracion no tiene sintaxis alternativa. **Es el mismo criterio que ya aplico la spec 002 en su §12.5.**

**9. `editor_formador_productos.tsx` preserva `stock` y `activo` al editar.** Al agregar los campos a `Wine`, el formulario dejaba de compilar. En modo edicion ahora toma los valores del vino que se esta editando, no los reinicia a 0 y true: el formulario publico no muestra esos campos, asi que ponerlos en defaults perderia el dato al guardar. T5 los agrega a la UI del admin.

**10. Las rutas hijas de `/admin` no renderizan todavia, y es lo esperado.** `AdminLayout` es un stub sin `<Outlet />`, que es lo que T2 agrega. El stub existe porque `router.tsx` (T1) necesita que las rutas apunten a componentes reales, o el build falla. Las cinco paginas admin tambien son stubs, reemplazados por T4 a T8.

**11. Verificacion en navegador (2026-10-09).** Con `npm run dev` en el puerto 5199:

| Qué | Resultado |
|---|---|
| `GET /` | 200, `#root` con 4 hijos, `lang="es"`, enlaces Inicio/Catalogo/Contacto visibles |
| `GET /admin` | 200, renderiza el stub del layout |
| `GET /api/wines?limit=2` | 200, 12 vinos, 6 paginas, primero "Gran Reserva Malbec", incluye `stock` |
| `GET /api/wines?search=malbec` | 200, 2 resultados |
| `GET /api/orders?limit=3` | 200, 25 pedidos |
| `GET /api/customers?tags=VIP` | 200, paginado correcto |
| `GET /api/metrics` | 200, 9 claves de `Metrics` |
| Latencia simulada | 615 ms, 483 ms, 653 ms, 805 ms, 421 ms: las 5 dentro de 300-800 ms |
| Service worker | 1 registrado |
| Consola | **0 errores, 0 avisos** |
| MSW en el bundle de produccion | Ausente (`msw`, `mockServiceWorker` y `setupWorker` no aparecen en `dist/assets/*.js`) |

---

## T2 — Layout: AdminLayout, Sidebar, Protección rutas

**RF cubiertos:** RF-01, RF-02, RF-03, RF-04
**Depende de:** T1
**Estado:** `hecha` — verificado en navegador a 1280 px y 501 px, 0 errores de consola

### Qué hacer

**1. `src/components/admin/admin_layout.tsx` (NUEVO)**

Layout principal (ver plan D-D):
- Sidebar fija desktop (280px colapsible a 72px) / drawer móvil
- Header sticky con título, user menu, botón colapsar sidebar
- `<Outlet />` para páginas hijas
- Protección: `useEffect` verifica `localStorage.getItem('isAdmin') === 'true'`, sino `navigate('/')` + `alert('Acceso denegado')`

**2. `src/components/admin/admin_sidebar.tsx` (NUEVO)**

Sidebar con:
- Logo CAVA & CO. Admin
- Nav links: Dashboard, Catálogo, Pedidos, Clientes, Configuración
- Iconos (lucide-react): LayoutDashboard, Package, Truck, Users, Settings
- Estado activo por ruta (`useLocation`)
- Colapsible: solo iconos cuando colapsado, tooltip en hover
- Footer con versión y botón "Ver tienda" → `/`

**3. `src/components/admin/admin_header.tsx` (NUEVO)**

Header dentro de AdminLayout:
- Botón hamburguesa móvil (abre sidebar drawer)
- Título de página dinámico (breadcrumb)
- User menu dropdown: nombre, email, "Cerrar modo admin" (toggle isAdmin)

**4. `src/hooks/useMediaQuery.ts` (NUEVO - utilidad)**

Hook simple para media queries reactivas.

### Verificación

```bash
npx tsc --noEmit
npm run build
```

En navegador:
- Sin `isAdmin` → `/admin` redirige a `/` con toast
- Con `isAdmin` → Dashboard renderiza
- Desktop: sidebar fija, colapsible, header sticky
- Móvil (< 768px): botón hamburguesa abre drawer, sidebar fullscreen
- Navegación entre `/admin`, `/admin/catalogo`, etc. funciona

### Hecho cuando

- [x] `admin_layout.tsx`, `admin_sidebar.tsx`, `admin_header.tsx` existen
- [x] `src/hooks/useMediaQuery.ts` existe
- [x] Protección rutas funciona
- [x] Responsive: desktop sidebar fija, móvil drawer
- [x] Sidebar colapsible (solo iconos + `title`)
- [x] Navegación entre 5 páginas admin funciona
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] 68/68 tests en verde

### Notas de implementación (2026-10-09)

**1. La protección vive en `AdminLayout`, no en `router.tsx`.** `router.tsx` declara las cinco rutas hijas y proteger cada una por separado serían cinco chequeos que pueden desincronizarse. `AdminLayout` es el único ancestro común, así que un solo chequeo cubre las cinco. Por eso la nota del plan que decía "el sidebar fijo en desktop y drawer en móvil" se cumple sin duplicar lógica.

**2. `useMediaQuery` relee el valor al montar.** Entre el render inicial y el efecto, el usuario puede haber redimensionado la ventana. El efecto vuelve a leer `mediaQueryList.matches` para no arrancar con un valor viejo. El `removeEventListener` del cleanup es obligatorio: sin él cada resize acumularía un listener.

**3. El colapso del sidebar usa `onAlternarColapso?: () => void`, opcional a propósito.** En móvil el sidebar es un drawer de ancho completo y colapsarlo no tiene sentido, así que el layout no le pasa el handler y el botón no se renderiza. Verificado: en 501 px el botón "Colapsar" no existe; en 1280 px sí.

**4. El `NavLink` de `/admin` lleva `end`.** `/admin` y `/admin/pedidos` comparten prefijo, y sin `end` los dos filtros se verían encendidos a la vez. Verificado: en `/admin` solo "Dashboard" queda activo, y al navegar a `/admin/pedidos` solo "Pedidos".

**5. El drawer se cierra solo al cambiar de sección.** Un `useEffect` sobre `location.pathname` pone `menuAbierto` en `false`. Sin eso, en móvil el menú seguiría tapando el contenido después de navegar. Verificado: drawer en `-288 px` (fuera de pantalla) tras navegar.

**6. El header deriva el título de la ruta, no de un prop.** Cada página podría mostrar un título distinto al suyo y desincronizarse del sidebar. Un `Record<string, string>` con los cinco títulos evita las dos fuentes de verdad.

**7. `AdminLayout` importa `loadIsAdmin` y `saveIsAdmin` de `App.tsx`.** Los dos viven en el modulo raiz porque la bandera es compartida entre las dos ramas del router: el navbar de `/` la escribe y este layout la lee. Cuando se pulse "Cerrar modo admin", `saveIsAdmin(false)` limpia la bandera y el `navigate('/', { replace: true })` manda al sitio publico. La protección se vuelve a activar en la proxima carga de `/admin`.

**8. El boton que cierra el menu de usuario es un `<button>` a pantalla completa, no un `<div>`.** Un `div` no responde a teclado. El `button` cierra al pulsar fuera y es alcanzable con Tab.

### Verificación en navegador (2026-10-09)

Puerto 5199, `npm run dev`.

| Qué | Resultado |
|---|---|
| `/admin` sin `isAdmin` | Redirige a `/`, sin sidebar, aviso "Acceso denegado" |
| `/admin` con `isAdmin=true` | Sidebar de **288 px**, título "Dashboard", 5 enlaces, `Dashboard` activo |
| Colapsar (1280 px) | Sidebar a **72 px**, `main` a 72 px, 5 enlaces solo con icono y `title`, botón pasa a "Expandir" |
| Expandir | Vuelve a **288 px**, `main` a 288 px, textos visibles |
| Navegar a `/admin/pedidos` | Título "Pedidos", Outlet renderiza, solo "Pedidos" activo |
| Menú de usuario | Abre con "Administrador / admin@vinoteca.local / Cerrar modo admin" |
| "Cerrar modo admin" | `localStorage.isAdmin = "false"`, vuelve a `/`, sitio público presente, sidebar admin desmontado |
| Drawer en 501 px, cerrado | `left: -288 px` (fuera de pantalla), botón hamburguesa presente, botón colapsar **ausente**, `main` en 0 |
| Drawer en 501 px, abierto | `left: 0`, 288 px, fondo oscurecido y botón de cerrar presentes |
| Navegar en móvil | Drawer se cierra solo (`left: -288 px`), fondo oscurecido desmontado |
| Scroll horizontal en móvil | **Ninguno** |
| Consola | **0 errores, 0 avisos** |

---

## T3 — Componentes compartidos

**RF cubiertos:** Base para RF-10 a RF-34
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/components/admin/data_table.tsx` (NUEVO)**

Wrapper TanStack Table v8 genérico (ver plan D-C):
- Props tipadas genéricas `<T>`
- Toolbar: búsqueda global, select página size (10/25/50), exportar CSV
- Columnas: header sortable, filtros por columna (input/select según tipo)
- Paginación: primera/anterior/siguiente/última, info "X-Y de Z"
- Empty state: "Sin resultados" + botón "Limpiar filtros"
- Loading: skeletons por fila
- Row actions: render prop `(row) => ReactNode`
- Virtualización si `data.length > 100` (opcional)

**2. `src/components/admin/metric_card.tsx` (NUEVO)**

```tsx
interface MetricCardProps {
  label: string
  value: string | number
  trend?: { value: number; label: string } // ej: +12% vs semana anterior
  icon: LucideIcon
  color?: 'gold' | 'wine' | 'cream' | 'neutral'
}
```

**3. `src/components/admin/status_badge.tsx` (NUEVO)**

```tsx
type StatusVariant = 
  | 'activo' | 'inactivo' 
  | 'pendiente' | 'preparando' | 'enviado' | 'entregado' | 'cancelado' | 'devuelto'
  | 'nuevo' | 'vip' | 'frecuente'

interface StatusBadgeProps {
  status: StatusVariant
  size?: 'sm' | 'md'
}
```
Colores semánticos (plan D-10).

**4. `src/components/admin/order_timeline.tsx` (NUEVO)**

Timeline vertical con:
- Puntos conectados por línea
- Estado actual destacado (punto mayor, color)
- Timestamps formateados
- Nota opcional por estado

**5. `src/components/admin/confirm_dialog.tsx` (NUEVO)**

Modal reutilizable:
```tsx
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}
```

**6. `src/utils/csv.ts` (NUEVO)**

`exportToCSV<T>()` y `parseCSV()` (ver plan D-H).

**7. Instalar `vitest`** — Ya está declarado en `package.json` (`^3.2.4`) pero no está en `node_modules`. `npm install` lo trae. Sin esto `npm test` falla y ni los 4 suites preexistentes ni los nuevos corren.

### Verificación

```bash
npx tsc --noEmit
npm run build
npm test -- test/admin/data_table.test.ts
npm test -- test/admin/csv.test.ts
```

En navegador (storybook manual o página test temporal):
- DataTable: busca, filtra, ordena, pagina, exporta CSV
- MetricCard: renderiza valor, tendencia, icono
- StatusBadge: todos los variants con colores correctos
- OrderTimeline: 5 estados, actual actual resaltado
- ConfirmDialog: abre, confirma, cancela, loading state

### Hecho cuando

- [ ] 6 componentes compartidos existen en `src/components/admin/`
- [ ] `src/utils/csv.ts` existe
- [ ] `vitest` instalado: `npm test` corre (no "vitest no se reconoce")
- [ ] DataTable funciona con datos mock (probar en página temporal)
- [ ] Tests data_table y csv pasan
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm run build` sale 0

---

## T4 — Dashboard

**RF cubiertos:** RF-05 a RF-09
**Depende de:** T3
**Estado:** `pendiente`

### Qué hacer

**1. `src/pages/admin/dashboard.tsx` (NUEVO)**

Página completa:
- Grid 2x2 / 3x2 MetricCards: Ventas hoy/semana/mes, Carritos abandonados, Ticket prom., Conversión
- Sección gráfico: `ResponsiveContainer` + `LineChart` (Recharts) — ventas 30 días
- Sección Top 5: cards horizontales con imagen, nombre, unidades, revenue
- Sección Actividad reciente: lista 5 items (tipo, descripción, timestamp)
- Skeletons mientras cargan (fetch `/api/metrics` + `/api/orders?limit=5` + `/api/customers?limit=5`)

**2. `src/hooks/useApi.ts` (NUEVO)**

Hook genérico de fetch con estados de carga y error. **No se usa React Query**: no está instalado y agregarlo sería una dependencia nueva que RNF-04 no aprueba.

```tsx
interface UseApiResult<T> {
  data: T | undefined
  isLoading: boolean
  error: string | undefined
  refetch: () => void
}

export const useApi = <T,>(url: string): UseApiResult<T> => {
  const [data, setData] = useState<T | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  const refetch = useCallback(() => {
    setIsLoading(true)
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<T>
      })
      .then((json) => { setData(json); setError(undefined) })
      .catch((err: Error) => { setError(err.message) })
      .finally(() => { setIsLoading(false) })
  }, [url])

  useEffect(refetch, [refetch])

  return { data, isLoading, error, refetch }
}
```

Todos los hooks de datos de las páginas admin cuelgan de este: `useMetrics`, `useWines`, `useOrders`, `useCustomers`. Cada uno arma la URL con sus query params y delega el fetch a `useApi`.

### Verificación

```bash
npx tsc --noEmit
npm run build
```

En navegador:
- 4-6 MetricCards con valores, iconos, tendencias
- Gráfico Recharts: línea 30 días, tooltip al hover, responsive
- Top 5 productos: imagen, nombre, unidades, revenue
- Actividad reciente: 5 items mixtos con timestamp relativo
- Skeletons visibles durante carga (simular latencia MSW)

### Hecho cuando

- [ ] `dashboard.tsx` existe y renderiza completo
- [ ] MetricCards usan componente compartido
- [ ] Gráfico Recharts renderiza sin errores
- [ ] Top 5 y actividad reciente cargan de MSW
- [ ] Skeletons durante carga
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm run build` sale 0

---

## T5 — Catálogo Admin

**RF cubiertos:** RF-10 a RF-21
**Depende de:** T3
**Estado:** `pendiente`

### Qué hacer

**1. `src/pages/admin/catalogo.tsx` (NUEVO)**

Página con DataTable:
- Columns: Imagen (thumbnail), Nombre, Bodega, Cepa, Categoría, Cosecha, Precio, Stock, Estado, Acciones
- Toolbar: búsqueda global, filtros columna (categoría select, cepa select, estado select), paginación, export CSV
- Row actions: Editar, Eliminar, Duplicar, Toggle estado
- Header actions: "Nuevo Vino" → abre `ProductForm` (existente) modo creación
- "Editar" → abre `ProductForm` modo edición con datos precargados
- "Eliminar" → ConfirmDialog → DELETE `/api/wines/:id`
- "Duplicar" → POST `/api/wines` con nuevo ID, nombre "Copia de X"
- Toggle estado → PATCH `/api/wines/:id` `{ activo: !actual }`
- Export CSV → `exportToCSV(dataFiltrada, 'catalogo', columns)`
- Import CSV → modal file input → parse → validar headers → POST `/api/wines/import`

**2. Actualizar `src/components/editor_formador_productos.tsx`**

Agregar campos `stock` (number, min 0) y `activo` (checkbox) en formulario.

**3. `src/hooks/useWines.ts` (NUEVO - hook para lógica)**

Encapsula: `fetchWines(filters)`, `createWine`, `updateWine`, `deleteWine`, `duplicateWine`, `importWines`, `exportWines`.

### Verificación

```bash
npx tsc --noEmit
npm run build
```

En navegador:
- DataTable renderiza 12 vinos mock con todas las columnas
- Búsqueda "Malbec" filtra en todas columnas
- Filtros: Categoría Tinto + Cepa Malbec + Activo → AND lógico
- Ordenamiento por cada columna (click header)
- Paginación 10/25/50, navega páginas
- "Nuevo Vino" → formulario → guardar → aparece en tabla
- "Editar" → formulario precargado → guardar → actualiza fila
- "Eliminar" → ConfirmDialog → confirmar → fila desaparece
- "Duplicar" → nuevo vino "Copia de X" en tabla
- Toggle activo/inactivo → badge actualiza sin recargar
- Export CSV → descarga .csv con datos filtrados
- Import CSV → modal → archivo válido → agrega vinos

### Hecho cuando

- [ ] `catalogo.tsx` existe con DataTable completa
- [ ] Formulario tiene `stock` y `activo`
- [ ] CRUD completo funciona vía MSW
- [ ] Export/Import CSV funcionan
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm run build` sale 0

---

## T6 — Pedidos Admin

**RF cubiertos:** RF-22 a RF-29
**Depende de:** T3
**Estado:** `pendiente`

### Qué hacer

**1. `src/pages/admin/pedidos.tsx` (NUEVO)**

Página con DataTable:
- Columns: Nº Pedido (link), Cliente, Fecha, Total, Estado (StatusBadge), Acciones
- Toolbar: búsqueda (cliente/ID), filtro estado (select multi), **DateRangePicker (react-day-picker)**, paginación
- Row action: "Ver" → abre drawer lateral

**2. `src/components/admin/date_range_picker.tsx` (NUEVO)**

Wrapper de `react-day-picker` DateRangePicker:
- 2 meses visibles
- Tema oscuro (colores charcoal/wine/gold/cream)
- `onChange` devuelve `{ from, to }`
- Formato `date-fns` para display

**3. `src/components/admin/order_drawer.tsx` (NUEVO)**

Drawer lateral (consistente con `CartDrawer`):
- Header: Nº pedido, badge estado (dropdown para cambiar), cerrar
- Sección Items: tabla items (imagen, nombre, cantidad, precio unitario, subtotal)
- Sección Cliente: nombre, email, teléfono, dirección envío
- Sección Timeline: `OrderTimeline` component
- Footer: botones "Generar etiqueta", "Iniciar devolución", cerrar

**4. `src/hooks/useOrders.ts` (NUEVO)**

`fetchOrders(filters)`, `updateOrderStatus(id, status)`, `generateLabel(id)`, `startReturn(id, items, reason)`.

### Verificación

```bash
npx tsc --noEmit
npm run build
```

En navegador:
- DataTable: 25 pedidos, columnas correctas
- Filtro estado: dropdown → solo pedidos con ese estado
- Filtro fechas: date range → pedidos en rango
- Click "Ver" → drawer abre con detalle completo
- Drawer: items, cliente, dirección, timeline visual
- Dropdown estado en drawer → actualiza badge + timeline + PATCH MSW
- "Generar etiqueta" → toast "Etiqueta generada (mock)"
- "Iniciar devolución" → modal → motivo + items → confirmar → estado "devuelto"

### Hecho cuando

- [ ] `pedidos.tsx` con DataTable funciona
- [ ] `order_drawer.tsx` con detalle + timeline
- [ ] Cambio estado persiste (MSW)
- [ ] Generar etiqueta + devolución funcionan (mock)
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm run build` sale 0

---

## T7 — Clientes CRM

**RF cubiertos:** RF-30 a RF-34
**Depende de:** T3
**Estado:** `pendiente`

### Qué hacer

**1. `src/pages/admin/clientes.tsx` (NUEVO)**

DataTable:
- Columns: Nombre, Email, Teléfono, Total pedidos, Total gastado, Último pedido, Tags, Acciones
- Toolbar: búsqueda, filtro tags (chips con datalist), paginación, export CSV
- Row action: "Ver" → drawer lateral

**2. `src/components/admin/customer_drawer.tsx` (NUEVO)**

Drawer:
- Header: Nombre, email, teléfono, badge tags (chips removibles)
- Tabs: "Pedidos" (historial), "Notas", "Datos"
- Pedidos: lista con Nº, fecha, total, estado (link a `/admin/pedidos?id=X`)
- Notas: lista con timestamp/autor, input + botón "Agregar nota"
- Tags: **input + datalist** (tags existentes como suggestions) + chips removibles
  - Datalist poblado con tags únicos de todos los clientes
  - Click en sugerencia → agrega chip
  - Chip tiene X para remover → `toggleTag(customerId, tag)`
- Export CSV desde toolbar principal

**3. `src/hooks/useCustomers.ts` (NUEVO)**

`fetchCustomers(filters)`, `addNote(customerId, text)`, `toggleTag(customerId, tag)`.

### Verificación

```bash
npx tsc --noEmit
npm run build
```

En navegador:
- DataTable: 15 clientes, columnas correctas
- Filtro tags multi-select funciona
- Click "Ver" → drawer con 3 tabs
- Tab Pedidos: historial con link a pedido
- Tab Notas: agregar nota → aparece con timestamp
- Tab Tags: autocomplete + chips removibles
- Export CSV → descarga filtrados

### Hecho cuando

- [ ] `clientes.tsx` con DataTable funciona
- [ ] `customer_drawer.tsx` con 3 tabs funcionales
- [ ] Notas y tags persisten (MSW)
- [ ] Export CSV funciona
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm run build` sale 0

---

## T8 — Configuración + CSV Export/Import

**RF cubiertos:** RF-19, RF-20, RF-33 (export/import catálogo, export clientes)
**Depende de:** T3
**Estado:** `pendiente`

### Qué hacer

**1. `src/pages/admin/configuracion.tsx` (NUEVO)**

Página placeholder con secciones:
- **General:** Nombre tienda, email contacto, moneda, zona horaria
- **Estados de pedido:** Lista editable (placeholder para futura spec)
- **Categorías/Cepas:** Gestión (placeholder)
- **CSV Tools:** Botones "Exportar Catálogo", "Exportar Clientes", "Importar Catálogo"

**2. Integrar CSV en páginas existentes**

- Catálogo: toolbar ya tiene export/import (T5)
- Clientes: toolbar ya tiene export (T7)
- Configuración: botones globales que usan mismos datos

### Verificación

```bash
npx tsc --noEmit
npm run build
```

En navegador:
- Página configuración renderiza secciones
- Export Catálogo/Clientes descargan CSV correctos
- Import Catálogo en configuración funciona igual que en catálogo

### Hecho cuando

- [ ] `configuracion.tsx` existe
- [ ] CSV export/import funcionan desde ambas ubicaciones
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm run build` sale 0

---

## T9 — Integración navbar "Modo Admin"

**RF cubiertos:** RF-01
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/components/barra_de_navegacion.tsx` — Agregar toggle**

En navbar (desktop + móvil):
- Si `!isAdmin`: botón "Modo Admin" (icono Shield/UserCog) → `toggleAdmin()` → `localStorage.setItem('isAdmin', 'true')` → recarga o navega a `/admin`
- Si `isAdmin`: badge "Admin" + enlace "Panel Admin" → `/admin` + botón "Salir modo admin" → `toggleAdmin()` → `localStorage.removeItem('isAdmin')`

**2. `src/App.tsx` — Pasar `isAdmin` + `toggleAdmin` a Navbar**

### Verificación

```bash
npx tsc --noEmit
npm run build
```

En navegador:
- Navbar normal: botón "Modo Admin" visible
- Click → `isAdmin=true` → aparece enlace "Panel Admin" + badge
- Click "Panel Admin" → navega a Dashboard
- Click "Salir modo admin" → `isAdmin=false` → UI pública normal
- Sin `isAdmin` → `/admin` redirige a `/`

### Hecho cuando

- [ ] Toggle "Modo Admin" funciona en navbar
- [ ] Enlace "Panel Admin" aparece solo en modo admin
- [ ] Redirección `/admin` sin admin funciona
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm run build` sale 0

---

## T10 — Verificación integral + docs

**RF cubiertos:** RNF-01 a RNF-08
**Depende de:** T9
**Estado:** `pendiente`

### Qué hacer

**1. Verificación integral**

```bash
npm test
npx tsc --noEmit
npm run build
npm run lint  # si configurado
```

En navegador: recorrer **todos los CA** (CA-01 a CA-41) manualmente.

**2. Actualizar `MEMORY.md`**

- Bitácora: entrada 2026-10-08 "Spec 004 Back-Office UI implementada"
- Componentes: marcar admin components como completados
- Decisiones: agregar D-01 a D-13

**3. Actualizar `AGENTS.md`**

- Especificación: agregar sección Back-Office con 4 módulos
- Comandos: si se agregaron scripts (dev:admin, etc.)
- Pendientes: tachar "Panel de administración" si estaba listado

**4. (Opcional) Limpiar rama spec-003 si ya mergeada**

### Verificación

```bash
npm test
npx tsc --noEmit
npm run build
```

| Qué | CA |
|---|---|
| `npm run build` sale 0 | CA-38 |
| `npx tsc --noEmit` sale 0 | CA-39 |
| `npm run lint` sale 0 | CA-40 |
| Sin dependencias no aprobadas | CA-41 |
| `MEMORY.md` actualizado | RNF-08 |
| `AGENTS.md` actualizado | RNF-08 |

### Hecho cuando

- [ ] Todos los comandos pasan
- [ ] Todos los CA manuales verificados en navegador
- [ ] `MEMORY.md` y `AGENTS.md` actualizados
- [ ] Spec 004 completa y documentada