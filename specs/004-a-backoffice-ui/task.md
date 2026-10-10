# Tareas 004 — Back-Office UI (Panel de Administración)

**Spec:** `specs/004-backoffice-ui/spec.md`, estado `borrador`
**Plan:** `specs/004-backoffice-ui/plan.md`
**Fase:** 4 de 5 (tareas). El implementador hace estas tareas; el Reviewer las valida después.
**Tareas: 10.**

## Cómo se usan estas tareas

- **Una tarea a la vez**, en el orden de dependencias.
- **Ninguna tarea se marca hecha sin ejecutar su verificación.** El estado arranca en `pendiente` y solo pasa a `hecha` cuando la verificación pasa.
- **Regla dura: solo dependencias aprobadas.** `recharts`, `@tanstack/react-table`, `msw`, `react-router-dom`, `react-day-picker`, `date-fns`. PapaParse quedo fuera de la lista: da 404 en el registry de este proyecto.

## Cómo se usan estas tareas

- **Una tarea a la vez**, en el orden de dependencias.
- **Ninguna tarea se marca hecha sin ejecutar su verificación.** El estado arranca en `pendiente` y solo pasa a `hecha` cuando la verificación pasa.
- **Regla dura: solo dependencias aprobadas.** `recharts`, `@tanstack/react-table`, `msw`, `react-router-dom`, `react-day-picker`, `date-fns`. PapaParse quedo fuera: da 404 en el registry.
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
**Estado:** `hecha` — 110/110 tests en verde

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

- [x] 6 componentes compartidos existen en `src/components/admin/`
- [x] `src/utils/csv.ts` existe
- [x] `vitest` instalado: `npm test` corre
- [x] `@tanstack/react-table` instalado
- [x] Tests de `data_table` y `csv` pasan (42 nuevos)
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **110/110 tests en verde**, los 68 previos sin tocar

### Notas de implementación (2026-10-09)

**1. `papa-parse` no se pudo instalar: da 404 en el registry.** Se comprobo con
`npm install papa-parse@^5.4.1` y la respuesta es `E404 Not Found`. Se aplico la
alternativa que el plan D-12 ya preveia: escribir el CSV a mano con `Blob` y
`URL.createObjectURL`. **La dependencia hay que sacarla de RNF-04** en una
correccion de la spec, porque hoy nombra una libreria que no se puede bajar.

**2. `DataTable` no pagina: la pagina la API.** El endpoint devuelve
`{ data, total, page, limit, totalPages }`, asi que la tabla tiene una pagina de
10 filas de un total de 240 y **no puede filtrar en el cliente**: si el usuario
busca "Malbec" y la pagina actual no tiene ninguno, filtrar del lado del cliente
dira "sin resultados" teniendo 24 en la base. Por eso TanStack corre en modo
manual (`manualPagination`, `manualSorting`, `manualFiltering`) y toda la
intencion sube por callbacks. El test de paginacion fija esta regla: con 240
filas y pagina 2 de 25, el texto tiene que decir "Mostrando 26-50 de 240", no
"1-25 de 25".

**3. Dos bugs los encontraron los tests, no la revision a ojo.**

*La clave del filtro salia con el indice de columna.* Los filtros se leian del
`ColumnDef` crudo, pero `ColumnDef.id` es opcional y solo existe si se declaro a
mano: con `accessor('categoria')` es `undefined`. El desplegable de categoria
terminaba guardando bajo la clave `"2"`, asi que el backend recibia `?2=Tinto` y
no filtraba nada. **Se lee de `tabla.getAllLeafColumns()`**, que ya tiene el id
resuelto y el `meta` propagado. El sintoma era invisible mirando el codigo:
todo parecia bien y el unico sintoma en pantalla era "el filtro no funciona".

*El input de busqueda no emitia `onSearchChange` en el test.* React no lee
`element.value` del evento: intercepta el setter del prototipo y compara contra
el valor del render anterior. Asignar `campo.value` a mano deja ese registro
desfasado y React descarta el evento como "sin cambios". El helper
`escribirEnCampo` del test llama al setter del prototipo y despues dispara el
evento.

**4. `getRowId` recibe dos formas distintas segun el camino interno.** En unos
puntos TanStack pasa la fila envuelta en un `Row` y en otros el dato crudo. Usar
solo `fila.original` dejaba `undefined` en el camino que pasa el crudo y el
crash era `Cannot read properties of undefined (reading 'id')` dentro de la
funcion de id del consumidor. **Se aceptan las dos formas.** Ademas hizo falta
fijar `useReactTable<TData>` de forma explicita: sin eso TS infiere el generico
desde el `getRowId` y termina interpretando `TData = Row<TData>`, que no
compila.

**5. `meta.filtro` necesita augmentacion de tipos.** TanStack no tipa
`ColumnMeta`, asi que `columna.meta?.filtro` es error de TypeScript sin un
`declare module`. Va arriba del archivo, y `columnaConFiltro` /
`columnaHelper` se exportan para que las tres paginas no importen de
`@tanstack/react-table` ni recuerden la forma de `meta`.

**6. El parser de CSV no usa `split(',')`.** Eso rompia justo con el dato del
proyecto: una descripcion de vino con coma, `Vino tinto, con cuerpo`, son dos
columnas para `split` y una para el parser. Hay test de ida y vuelta con valores
que llevan coma y comillas dobles.

**7. El CSV lleva BOM a proposito.** Sin el, Excel en Windows abre los acentos
como caracteres raros, porque usa latin-1 por defecto.

**8. `StatusBadge` usa cinco colores que no estan en `tailwind.config.js`.**
`text-amber-300`, `text-emerald-300`, `text-sky-300`, `text-violet-300` y
`text-teal-300`. La paleta del tema cubre las superficies de la tienda pero no
tiene rampa para "estado del negocio", y extender el tema con cinco rampas
semanticas es una tarea de diseno aparte que esta spec no pide. Queda anotado en
el propio archivo cuales son las unicas clases a reemplazar cuando se haga.

**9. `OrderTimeline` dibuja el historial, no lo recalcula.** Si el registro de un
pedido dice tres eventos, muestra tres. CE-06 de la 004-b permite pasar de
`pendiente` a `entregado` sin pasar por `enviado`, y ese salto tiene que quedar
visible: recalcular desde el estado actual lo esconderia.

**10. `descargarCsv` no hace nada sin DOM.** Los tests la invocan en jsdom, donde
`URL.createObjectURL` no existe, y ahi interesa el texto generado, no la
descarga.

---

## T4 — Dashboard

**RF cubiertos:** RF-05, RF-06, RF-07, RF-08, RF-09
**Depende de:** T3
**Estado:** `hecha` — 117/117 tests en verde, verificado en navegador

### Qué hacer

**1. `src/pages/admin/dashboard.tsx` (NUEVO)**

Página completa:
- Grid de MetricCards: Ventas hoy/semana/mes, Carritos abandonados, Ticket prom., Conversión
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

- [x] `dashboard.tsx` existe y renderiza completo
- [x] `dashboard_grafico.tsx` existe, separado y con carga diferida
- [x] `src/hooks/useApi.ts` existe
- [x] `src/utils/metricas.ts` existe con `tendenciaDe`
- [x] MetricCards usan el componente compartido
- [x] Gráfico Recharts renderiza sin errores, en su propio chunk
- [x] Top 5 y actividad reciente cargan de MSW
- [x] Skeletons durante carga
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **117/117 tests en verde** (7 nuevos de la tendencia)

### Notas de implementación (2026-10-09)

**1. Recharts va en un archivo aparte con `import()` diferido.** Queda un chunk
de **376 kB separado** del principal, que sube solo de 1.271 a 1.295 kB. Sin la
division de codigo, los 376 kB los pagaria cualquiera que entre a cualquier
pagina de la tienda, incluido un visitante que solo quiere ver el catalogo.
Ademas el `Suspense` deja pintar las metricas mientras el grafico descarga, en
vez de esperar a que cargue todo junto.

**2. `tendenciaDe` quedo en `src/utils/metricas.ts`, no en la pagina.** Es logica
pura y se testea sin montar nada. Lo que la dejaba adentro de `dashboard.tsx`:
importarla arrastraba el arbol de componentes y **Recharts** al archivo de test,
y el primer intento de testearla desde ahi fallo por eso.

**3. `tendenciaDe` devuelve `undefined` cuando no hay con que comparar, nunca `0`.**
Un `0%` en la tarjeta afirma "no cambio". Con menos de cuatro dias con ventas
la verdad es que no hay dato, y son dos cosas distintas. La tarjeta no muestra
tendencia en vez de mostrar un cero falso. Hay test para el caso.

**4. La tendencia descarta los dias sin ventas antes de comparar.** Sin eso, una
semana en la que estuvo caido el sistema contaria como caida de ventas. El test
usa `[100, 100, 0, 0, 100]`: descartando los ceros quedan 3 dias y no hay
tendencia; **sin** descartarlos la serie seria de 5, la primera mitad sumaria
200, la segunda 100, y saldria un `-50%` alucinatorio.

**5. `useApi` evita el estado obsoleto con un bandera `vigente`.** Si la url
cambia mientras la peticion anterior sigue en vuelo, la respuesta vieja llega
despues y pisa la nueva. El cleanup del `useEffect` pone `vigente = false`, y
los tres handlers lo chequean antes de escribir estado. El refetch usa un
contador y no un booleano, porque pedir dos veces seguidas tiene que relanzar
las dos.

**6. El panel hace una sola peticion, no tres.** El enunciado de T4 pedia
`/api/metrics` + `/api/orders` + `/api/customers`. **Se hizo solo
`/api/metrics`**, porque `Metrics` ya trae `topProducts` y `recentActivity`: las
dos otras peticiones serian la misma informacion dos veces, con dos esperas de
300-800 ms de MSW en paralelo. cuando los datos del panel Necesiten update, se
agrega el campo a `Metrics`.

**7. "Ventas de hoy" da `$0` con los datos mock, y es correcto.** Los 25 pedidos
se reparten en 60 dias con `restarDias(HOY, enteroEntre(0, 59))`, asi que la
probabilidad de que caiga alguno exactamente hoy es de menos de una unidad, y en
esta corrida no cayo ninguno. Poner una venta hoy a proposito para que la card
se vea mejor seria inventar un dato. El valor real aparece solo cuando hay
ventas del dia.

### Verificación en navegador (2026-10-09)

Puerto 5199, `npm run dev`, con `isAdmin` activo.

| Qué | Resultado |
|---|---|
| 5 MetricCards | Ventas de hoy `$ 0`, Ventas del mes `$ 395.000` con tendencia `▲ 5.3%`, Ticket promedio `$ 126.765`, Carritos abandonados `0`, Conversion `0.0%` |
| Gráfico Recharts | `svg.recharts-surface` presente, 1 trazo dibujado, dentro de su propio chunk |
| Secciones | "Ventas de los ultimos 30 dias", "Actividad reciente", "Productos mas vendidos" |
| Top 5 productos | 5 items con imagen, unidades y revenue: Cabernet Franc 10 un / $335.000, Pinot Noir 7 / $276.500, Malbec 6 / $270.000, Cabernet Sauvignon 4 / $248.000, Riesling 6 / $186.000 |
| Actividad reciente | 5 items con tipo, descripcion y fecha ("Pedido CAVA-1022 - Miguel Torres / 05-oct, 11:03 p. m.") |
| Consola | **0 errores, 0 avisos** |
| Bundle | Principal 1.265 kB + chunk `dashboard_grafico` 376 kB |

---

## T5 — Catálogo Admin

**RF cubiertos:** RF-10 a RF-21
**Depende de:** T3
**Estado:** `hecha` — 136/136 tests en verde, verificado en navegador

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

- [x] `catalogo.tsx` existe con DataTable completa
- [x] `admin_wine_form.tsx` tiene `stock` y `activo`
- [x] `useCatalogo.ts` existe con el CRUD completo
- [x] CRUD completo funciona vía MSW
- [x] Export/Import CSV funcionan, y el archivo exportado se puede reimportar
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **136/136 tests en verde** (+19: 11 de CSV, 8 de ids)

### Desviación del enunciado

**El enunciado pedía actualizar `editor_formador_productos.tsx` para agregar
`stock` y `activo`. No se hizo, y es deliberado.** Ese formulario produce un
`Wine`, que es lo que ve un visitante del catalogo publico. El admin necesita un
`AdminWine`, que son dos tipos distintos desde que C-1 resolvio el conflicto.
Un solo formulario para los dos necesitaria un `mostrarInventario: boolean` y
ensuciar las dos ramas de envio con casts: dos formularios, dos contratos
limpos.

Se creo `src/components/admin/admin_wine_form.tsx`. El campo `stock` y el
interruptor `activo` viven ahi y **no aparecen en el formulario publico**, que
es lo que pide RF-06 de la spec 004-b.

El nombre del hook también cambió: el enunciado decia `useWines.ts` y quedó
`useCatalogo.ts`, porque el hook tambien maneja los filtros, la paginacion, el
CSV y las mutaciones, no solo las peticiones de vinos.

### Bugs encontrados y corregidos (2026-10-09)

Todos estaban **desde T1** y ninguno lo cubria un test.

**1. El importador de CSV estaba roto entero.** Hacia
`const [encabezado, ...filas] = parsearCsv(texto)`, pero `parsearCsv` devuelve
`{ encabezados, filas }`. Desestructurar un objeto como si fuera un array lanza
`TypeError: parsearCsv(...) is not iterable`. El boton Importar CSV no habia
funcionado nunca.

**2. Ademas tenia su propio parser con `split(',')`.** Rompia con cualquier
descripcion que tuviera una coma, que es justo lo que genera el export del
propio panel. Se borro y se usa el `parsearCsv` de `src/utils/csv.ts`, que
maneja comillas, CRLF y BOM.

**3. El importador exigia encabezados en ingles.** Buscaba `name`, `winery`,
`price`, pero el export escribe `Nombre`, `Bodega`, `Precio`. Exportar y
reimportar fallaba con un error de encabezado que no decia que el archivo lo
habia generado el propio panel. Ahora cada columna se busca por una lista de
alias y acepta los dos idiomas.

**4. Exportar y reimportar duplicaba el catalogo.** El CSV exportado no
incluia la columna `id`, asi que al reimportarlo cada vino se creaba de nuevo en
lugar de actualizarse. `id` ahora es la primera columna del export.

**5. `Boolean("no")` daba `true`.** El export escribe `activo` como `si`/`no`.
Sin convertir, todo lo exportado como inactivo volvia visible en la tienda al
reimportar. Ahora se reconoce `si`, `sí`, `yes`, `true`, `1`.

**6. `duplicar` mandaba el `id` del original.** Hacia `crear({ ...vino })`, y
el `...vino` incluye el `id`. La copia nacia con el id del original, y a partir
de ahi todo fallaba **en silencio**: editar uno modificaba el otro, y borrar la
copia borraba el original. Esto lo encontro la verificacion en navegador, no un
test: la API reportaba 1 resultado y la tabla mostraba 2 filas, porque las dos
compartian la misma key de React. Ahora `duplicar` descarta el `id`.

**7. Logica de validacion duplicada.** `vinoCreateSchema` (en `handlers.ts`) y
`vinoDesdeFila` (en el importador) eran el mismo codigo en dos archivos. Con la
duplicacion, un vino podia ser valido por una puerta e invalido por la otra.
Se unifico en `src/mocks/vino_schema.ts`, que usan tanto los handlers como la
importacion.

### Verificación en navegador (2026-10-09)

Puerto 5201, `npm run dev`, con `isAdmin` activo.

| Qué | Resultado |
|---|---|
| DataTable | 12 vinos, 10 filas por pagina, columnas Nombre/Cepa/Categoria/Cosecha/Precio/Stock/Estado/Acciones |
| Crear | Modal lateral, campos precargados en blanco, 12 → 13, aviso `"Vino de Prueba QA" creado.` |
| Editar | Formulario precargado (`52500`, stock `7`, activo `true`), guardo → `$ 61.000`, stock `3`, INACTIVO |
| Buscar | `Vino de Prueba QA` → "1 vino en el catalogo", 1 fila |
| Duplicar | 13 → 14, aparece `Copia de QA Temporal`, id distinto al original |
| Eliminar | `ConfirmDialog` con CANCELAR/ELIMINAR, borra la copia, **el original queda intacto** |
| Filtro sin resultados | "Sin resultados / Proba con otros filtros. / LIMPIAR FILTROS" |
| Consola | **0 errores, 0 avisos** |

### Archivos

| Archivo | Rol |
|---|---|
| `src/pages/admin/catalogo.tsx` | La pagina: toolbar, tabla, modal, dialogo |
| `src/components/admin/admin_wine_form.tsx` | Formulario `AdminWine` con `stock` y `activo` |
| `src/hooks/useCatalogo.ts` | Filtros, paginacion, CRUD, import/export |
| `src/mocks/importar_vinos.ts` | Logica de importacion (testeable sin HTTP) |
| `src/mocks/vino_schema.ts` | Validacion y normalizacion, compartida por handlers e importacion |

---

## T6 — Pedidos Admin

**RF cubiertos:** RF-22 a RF-29
**Depende de:** T3
**Estado:** `hecha` — 159/159 tests en verde, verificado en navegador

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

- [x] `pedidos.tsx` con DataTable funciona
- [x] `order_drawer.tsx` con detalle + timeline
- [x] `date_range_picker.tsx` con react-day-picker v9
- [x] `usePedidos.ts` existe (el enunciado decia `useOrders.ts`)
- [x] Cambio estado persiste (MSW) y el drawer se actualiza
- [x] Generar etiqueta + devolucion funcionan (mock)
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **159/159 tests en verde** (+23: 10 de rango, 13 de pedidos)

### Decision de version de `react-day-picker`

**Se instalo v9.14, no v8.** El plan (D-G) decia v8. v8 exige `date-fns@^2 || ^3`
como peer dependency, o sea dos dependencias mas para el panel. v9 trabaja con
`Date` nativos y usa `date-fns@4` solo internamente (ya instalado como
dependencia transitiva, no hay que declararla). La API que se usa
(`mode='range'`, `selected: { from, to }`) es identica en las dos. Se importan
los nombres de mes y dia de `date-fns/locale`, que es lo unico que hace falta
de `date-fns`.

### Bugs encontrados y corregidos (2026-10-09)

**1. El filtro multi-estado no funcionaba.** El handler comparaba
`pedido.status === estado` contra la cadena entera `"pendiente,enviado"`, que
no es ningun estado. La tabla salia vacia **sin error visible**: el admin veia
que no habia pedidos cuando si los habia. Ahora `status` se parte por coma y se
compara con OR.

**2. Las fechas se comparaban por el dia UTC.** `dateFrom`/`dateTo` viajan como
`YYYY-MM-DD` **locales** (ver `aIsoLocal`), pero `createdAt` es un ISO en UTC, y
se comparaba con `createdAt.slice(0,10)`. Un pedido hecho el 15 a las 23:30 en
Buenos Aires es `2026-01-16T02:30:00Z`: con `slice` contaba como del 16 y caia
fuera de un rango "del 1 al 15" que el usuario acababa de elegir. Sin error ni
aviso: el admin veia un dia menos del que hay.

El fix esta en los dos lados con la misma regla: `aIsoLocal(new Date(createdAt))`.
La funcion vive en `src/utils/fechas.ts` y la usan tanto el componente como el
filtro, porque son dos consumidores que no se conocen entre si y no pueden
divergir.

El test de esto **falla con el codigo viejo y pasa con el nuevo**: se comprobo
revirtiendo `diaDe` a `slice(0,10)` y viendo que el suite se rompia.

**3. El rango invertido no se corrigia.** El calendario entrega `from` mayor que
`to` cuando el usuario arranca por el dia de la derecha. Se mandaba asi y el
backend no devolvia nada: de nuevo, pareceria que no hay pedidos. `normalizarRango`
lo invierte.

**4. El calendario no se reabria en el mes correcto.** Se usaba
`defaultMonth`, que en react-day-picker solo aplica en el primer montaje del
componente. Como el calendario se abre y se cierra varias veces, en la segunda
apertura seguia mostrando el mes en que se cargo la pagina. Ahora `month` y
`onMonthChange` estan controlados y cada apertura arranca en el mes del filtro o
en el mes actual.

**5. El drawer mostraba el pedido viejo al cambiar el estado.** El `PATCH`
devuelve el pedido completo con el timeline ya actualizado, pero el drawer
seguia dibujando el `Order` del estado anterior: el `select` volvia a
"pendiente" y el historial no mostraba el evento nuevo, al lado de un aviso que
decia "ahora esta enviado". Ahora la respuesta del `PATCH` reemplaza el pedido
abierto.

**6. El drawer y el modal de devolucion compartian el estado de error.** Un
fallo al cambiar el estado aparecia dentro del modal de devolucion, que no
tenia nada que ver. Ahora son `error` y `errorDevolucion` separados.

### Verificación en navegador (2026-10-09)

Puerto 5205, `npm run dev`, con `isAdmin` activo.

| Qué | Resultado |
|---|---|
| DataTable | 25 pedidos, "Mostrando 1-10 de 25 pedidos", columnas Pedido/Cliente/Fecha/Total/Estado/Acciones |
| Filtro multi-estado | 6 checks. "Pendiente" → 3 pedidos, contador "Estado 1". + "Enviado" → 7 pedidos, contador "Estado 2" |
| DateRangePicker | 2 meses visibles ("octubre 2026", "noviembre 2026"), dias en espanol, futuros deshabilitados |
| Rango | 05/09 a 20/09 → 7 pedidos, ambos extremos incluidos, aviso "Mostrando del 2026-09-05 al 2026-09-20." |
| Drawer | CAVA-1001, secciones Cliente / Envio / Productos (4 unidades) / Estado / Historial / Operaciones, 2 items con imagen |
| Cambio de estado | select → "enviado", timeline de 1 a 2 eventos con "ESTADO ACTUAL" en el nuevo, badge coherente |
| Generar etiqueta | Aviso "Etiqueta generada (mock) para CAVA-1001." |
| Devolucion: sin items | "Elegi al menos un producto a devolver." |
| Devolucion: sin motivo | "Escribi el motivo de la devolucion." |
| Devolucion: completa | Estado → "devuelto", timeline con 2 eventos, badge DEVUELTO en la tabla |
| Consola | **0 errores, 0 avisos** |

### Archivos

| Archivo | Rol |
|---|---|
| `src/pages/admin/pedidos.tsx` | La pagina: toolbar, tabla, multi-estado, drawer |
| `src/components/admin/order_drawer.tsx` | Detalle + cambio de estado + etiqueta + devolucion |
| `src/components/admin/date_range_picker.tsx` | Wrapper de react-day-picker v9 con tema oscuro |
| `src/hooks/usePedidos.ts` | Filtros, paginacion, cambio de estado, export |
| `src/utils/fechas.ts` | `aIsoLocal`, compartido por el componente y el filtro |
| `src/mocks/filtros.ts` | Filtrado de los tres recursos (testeable sin HTTP) |

---

## T7 — Clientes CRM

**RF cubiertos:** RF-30 a RF-34
**Depende de:** T3
**Estado:** `hecha` — 177/177 tests en verde, verificado en navegador

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

- [x] `clientes.tsx` con DataTable funciona
- [x] `customer_drawer.tsx` con 3 tabs funcionales
- [x] `useClientes.ts` existe
- [x] Notas y tags persisten (MSW)
- [x] Export CSV funciona
- [x] CE-04 verificado: cliente sin email muestra aviso en fila y en drawer
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **177/177 tests en verde** (+18: 17 de clientes, 1 de busqueda por `customerId`)

### Bugs encontrados y corregidos (2026-10-09)

**1. El filtro de tags no encontraba nada.** Las tags de los datos mock estaban
capitalizadas (`'VIP'`, `'Frecuente'`, `'Nuevo'`, `'Mayorista'`) pero el filtro
normaliza a minusculas antes de comparar: `normalizar('VIP')` es `'vip'`, que no
es igual a `'VIP'`. Marcar cualquier tag dejaba la tabla vacia **sin error**.
Ademas `EtiquetaCliente` en `src/types/admin.ts` es
`'nuevo' | 'vip' | 'frecuente' | 'mayorista'` en minusculas: los datos no cumplian
el tipo que el panel declara usar. Se regenero `data.ts` con minusculas.

El test se comprobo **revirtiendo los datos a mayusculas y viendo que falla**.

**2. No habia ningun cliente sin email, asi que CE-04 no se podia ver.** CE-04
pide que se pueda guardar un cliente sin email ni telefono y que la fila lo
avise. Con 15 clientes todos completos, el caso nunca aparecia en el panel y la
advertencia era codigo muerto. El generador ahora deja al ultimo cliente
(`cli-15`, "Silvia Rojas") sin email ni telefono, como el que se registro en el
mostrador.

**3. La busqueda de pedidos no buscaba por `customerId`.** El drawer del CRM
pide los pedidos del cliente con `?search=<id>`, pero `customerId` no aparece en
ningun campo visible del pedido: la busqueda no encontraba nada y la pestana
"Pedidos" salia en `(0)` para todos. Ahora `customerId` entra en la busqueda.

El pedido que llega igual se filtra por `customerId` en el hook, porque la
busqueda por texto es por nombre o email y dos clientes pueden llamarse igual.

### Decisiones

**1. El orden de la tabla se aplica en memoria, no en el servidor.** Catalogo y
pedidos ordenan en el servidor porque son cientos de filas. Clientes son 15 en
total: ordenar en el servidor seria una peticion extra para colocar 15
elementos que ya estan en memoria. Si el numero de clientes creciera, pasa al
servidor igual que las otras dos tablas.

**2. `StatusBadge` no se usa para los tags del cliente.** Solo acepta las cuatro
etiquetas del tema (`nuevo`, `vip`, `frecuente`, `mayorista`) y el CRM deja
agregar tags libres. Se creo `ChipTag`, que es neutro y ademas tiene el boton de
quitar. Se exporta desde `customer_drawer.tsx` para que la tabla lo use tambien.

**3. Las notas se agregan y los tags se reemplazan completos.** No es una
inconsistencia: RF-32 dice "agrega nota" (el historial es acumulativo) y RF-33
dice "actualiza tags" (el conjunto de tags es el estado completo). Van al mismo
`PATCH` con campos distintos, y el mock los trata distinto.

**4. Las notas se muestran de mas reciente a mas antigua.** La que se acaba de
escribir es la que el admin quiere releer. El `Customer` las trae en orden de
insercion, asi que el drawer las invierte para mostrar.

### Verificación en navegador (2026-10-09)

Puerto 5207, `npm run dev`, con `isAdmin` activo.

| Qué | Resultado |
|---|---|
| DataTable | 15 clientes, "Mostrando 1-10 de 15 clientes", columnas Nombre/Email/Telefono/Pedidos/Total gastado/Ultimo pedido/Tags/Acciones |
| Filtro de tags | `vip` → 5 clientes, contador "Tags 1". `vip + mayorista` → 1 cliente, contador "Tags 2", con ambas tags |
| Drawer | "Maria Gomez", 3 pestanas: Pedidos (1), Notas (2), Datos |
| Pestana Pedidos | CAVA-1015, 30/08/26, DEVUELTO, $ 82.000, con link a `/admin/pedidos?id=` |
| Pestana Notas | 2 notas con autor y fecha, ordenadas de mas reciente a mas antigua |
| Nota vacia | "La nota no puede estar vacia." |
| Agregar nota | 3 notas, contador "Notas (3)", campo limpiado, "09/10/26, 12:12 p. m." |
| Tags: sugereridas | datalist con `mayorista`, `nuevo`, `vip` |
| Tags: agregar | header pasa de `vip` a `vip, mayorista` |
| Tags: quitar | `Quitar tag vip` lo elimina |
| CE-04 | Fila "Silvia Rojas / **Sin email** / — / —"; drawer: "Este cliente no tiene email ni telefono. No se podra avisarle de novedades por mail." |
| Consola | **0 errores, 0 avisos** |

### Archivos

| Archivo | Rol |
|---|---|
| `src/pages/admin/clientes.tsx` | La pagina: toolbar, filtro de tags, tabla, orden en memoria |
| `src/components/admin/customer_drawer.tsx` | Drawer con 3 pestanas + `ChipTag` |
| `src/hooks/useClientes.ts` | Filtros, paginacion, notas, tags, export |

---

## T8 — Configuración + CSV Export/Import

**RF cubiertos:** RF-20, RF-21, RF-34 (los de CSV)
**Depende de:** T3
**Estado:** `hecha` — 200/200 tests en verde, verificado en navegador

### Corrección del encabezado de la tarea

El encabezado decia **"RF cubiertos: RF-19, RF-20, RF-33"**. Eso estaba mal:

- **RF-19** es *"cambia estado activo/inactivo"*, que se hizo en T5.
- **RF-20** es *"Exportar CSV"*, hecho en T5.
- **RF-33** es *"agrega/quita tag del cliente"*, hecho en T7, y **no tiene nada que ver con CSV**.
- Los RF reales de CSV son **RF-20** (exportar), **RF-21** (importar) y **RF-34** (exportar clientes).

**Los tres ya estaban implementados en T5 y T7.** T8 no cubria ningun RF sin
hacer: era la pagina de Configuracion y exponer los CSV desde ahi.

### Decisiones

**1. General, Estados y Categorias son de solo lectura, y no se van a volver
editables sin backend.** El enunciado pedia "Lista editable" para los estados y
"Gestion" para las categorias. No hay endpoint de configuracion y la 004-a no
define ninguno. Poner inputs guardando en un `useState` seria un formulario que
dice "Guardar" y no guarda nada: peor que mostrar el dato, porque el usuario
cree que lo cambio.

Los estados ademas son fijos por **D-15 de la propia spec**, que dice que no son
configurables. La seccion lo dice explicitamente para que quede claro que no es
una omision.

**2. La logica de CSV se extrajo a `src/utils/csv_export.ts`.** Estaba duplicada
dentro de `useCatalogo`, `useClientes` y `usePedidos`. Con la pagina de
Configuracion exponiendo los mismos botones, la copia habria sido una cuarta: las
cuatro divergen en el primer cambio, y el archivo que baja el admin desde
Configuracion dejaria de coincidir con el que baja desde el catalogo.

Cada generador (`csvCatalogo`, `csvClientes`, `csvPedidos`) recibe los datos ya
cargados y devuelve texto. **No piden nada**: pedir es responsabilidad de quien
lo usa, porque cada pantalla pide con filtros distintos.

**3. `src/utils/tienda.ts` creo para que la identidad no este en dos lugares.** El
footer tenia `hola@cava-co.com` escrito dos veces en el mismo componente, una en
el `mailto:` y otra en el texto. Configuracion lo necesitaba tambien. Con tres
copias, el primer cambio de dominio deja alguna desactualizada y un `mailto:`
que no coincide con lo que se ve manda el mensaje al lugar equivocado sin avisar.
El footer ahora usa la constante.

**4. Se muestran dos zonas horarias.** La de la tienda y la del navegador. No es
redundancia: los filtros de fechas calculan los dias con la hora local de quien
mira (`aIsoLocal`), no con la de la tienda. Mostrar solo una haria pensar que el
filtro usa esa.

**5. La exportacion de Configuracion es sin filtros.** Exporta todo. El boton de
la tabla exporta lo filtrado. La seccion lo dice, para que no se descarte el
boton de la tabla buscando un filtro global que no existe.

### Bugs encontrados

Ninguno de codigo. Los de T5 (import/export) ya estaban corregidos y los tests
de T5 siguen en verde.

Lo que si aparecio al escribir los tests: **ningun cliente de los mocks tiene
`lastOrderAt: null`**. Con 25 pedidos sobre 15 clientes, todos compraron, asi
que el caso "cliente que todavia no compro" no aparece nunca en el panel. El
test de la celda vacia lo arma a mano en vez de buscarlo en los datos, porque el
comportamiento hay que probarlo igual: un cliente recien registrado lo va a
tener.

### Verificación en navegador (2026-10-09)

Puerto 5211, `npm run dev`, con sesion abierta.

| Qué | Resultado |
|---|---|
| Secciones | General, Estados de pedido, Categorias y cepas, Datos |
| General | Cava & Co, hola@cava-co.com, ARS (pesos argentinos), America/Argentina/Mendoza, **America/Buenos_Aires** (la del navegador) |
| Estados | 6 chips: pendiente, preparando, enviado, entregado, cancelado, devuelto, con nota de D-15 |
| Categorias y cepas | Derivadas del catalogo, con conteos |
| Botones | `EXPORTAR CATALOGO 12`, `EXPORTAR CLIENTES 15`, `EXPORTAR PEDIDOS 25`, `IMPORTAR CATALOGO` |
| Export catalogo | 13 lineas. Encabezado `Id,Nombre,Bodega,Cepa,Categoria,Cosecha,Precio,Stock,Activo,Descripcion`. 12 filas |
| Export clientes | 16 lineas. `Id,Nombre,Email,Telefono,Pedidos,Total gastado,Ultimo pedido,Tags`. 15 filas |
| Export pedidos | 26 lineas. `Id,Cliente,Email,Fecha,Total,Estado,Unidades,Ciudad`. 25 filas |
| Aviso | "Exportar pedidos: listo." |
| **Import con id** | Fila con `Id=1` **actualiza** el vino existente: 12 → 13, aviso "Importacion: 1 creados, 1 actualizados." |
| **Import sin id** | Fila sin id **crea** uno nuevo con UUID propio |
| `Activo: no` | El vino importado quedo con `activo: false`, no con `true` |
| Consola | **0 errores, 0 avisos** |

### Archivos

| Archivo | Rol |
|---|---|
| `src/pages/admin/configuracion.tsx` | La pagina: 4 secciones, 3 exports y 1 import |
| `src/utils/csv_export.ts` | `csvCatalogo`, `csvClientes`, `csvPedidos`, `descargarComo` |
| `src/utils/tienda.ts` | Identidad de la tienda, fuente unica |

### Hecho cuando

- [x] `configuracion.tsx` existe con las 4 secciones
- [x] CSV export/import funcionan desde Configuracion y desde las tablas
- [x] El generador es el mismo en los dos lugares, no una copia
- [x] La identidad de la tienda esta en un solo archivo
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **200/200 tests en verde** (+13 de CSV)

---

## T9 — Acceso al panel por contraseña

**RF cubiertos:** RF-01, RF-02
**Depende de:** T2
**Estado:** `hecha` — 187/187 tests en verde, verificado en navegador

### Desviación del enunciado, aprobada por el usuario

El enunciado pedía **agregar un botón "Modo Admin" a la navbar pública**, que
cualquier visitante pudiera tocar para entrar al panel. **No se hizo, y no se
hará.**

La razón que dio el usuario: no quiere un botón al que puedan entrar todos.

Lo que había que resolver no era solo el botón. El flag `isAdmin` de T1 estaba en
`localStorage` y cualquiera podía ponerlo en `true` desde la consola del
navegador. O sea que ese botón no era una barrera: era una invitación.

Un botón "Modo Admin" en la navbar además le dice a cualquier visitante que hay
una sección restringida y que está a un clic de entrar.

### Qué quedó

**1. No hay ningún acceso al panel desde la tienda.** La navbar pública no se
tocó. `src/components/barra_de_navegacion.tsx` sigue teniendo el botón
"+ Cargar Vino" de la spec 003, que no tiene relación con admin.

**2. Se entra escribiendo `/admin`.** Ahi se muestra `AdminGate`, que pide la
contraseña.

**3. Sin sesión no hay redirect, hay una pantalla de clave.** El enunciado
pedía rebotar a `/` con `alert('Acceso denegado')`. Se muestra el prompt en la
misma URL: quien escribió `/admin` a propósito está pidiendo entrar, y
responderle "anda a la tienda" contesta otra cosa. El mensaje de error va debajo
del campo, en `role='alert'`, no en un `alert()` que corta la pantalla.

**4. La sesión va en `sessionStorage`, no en `localStorage`.** Dura lo que la
pestaña. Con `localStorage`, en una máquina compartida el acceso quedaría dado
por semanas sin que nadie volviera a pedir la clave.

**5. La contraseña sale de `VITE_ADMIN_PASSWORD`, con default `admin123`.**
Está en el bundle de JavaScript y cualquiera que abra la consola la lee. Está
documentado en el propio archivo que **esto no es autenticación** y que la
razón es que todavía no hay backend contra el cual validar.

**6. `AdminHeader` dice "Cerrar sesión", no "Cerrar modo admin".** Con un modo
que ya no existe, el nombre viejo mentía.

**7. Se borró `loadIsAdmin` / `saveIsAdmin` de `src/App.tsx`.** El flag de
`localStorage` quedó muerto. No se sustituyó por otro flag: si alguien tiene el
`isAdmin: 'true'` pegado en el `localStorage` de una versión anterior, el test
`un flag antiguo en localStorage no abre el panel` verifica que ya no abre nada.

### Qué falta hacer de verdad

Nada de lo de esta tarea es un control de acceso real. Cuando exista la API de
la spec 004-b:

1. `POST /api/auth/login` con usuario y contraseña → token.
2. El token se manda en cada request y el backend lo valida. El bundle deja de
   contener la contraseña.
3. `sessionStorage` pasa a contener el token, con expiración.
4. 2FA en el login, como pidió el usuario.

`src/utils/admin_acceso.ts` tiene las cuatro cosas anotadas en el encabezado
para que el reemplazo sea directo.

### Archivos

| Archivo | Rol |
|---|---|
| `src/utils/admin_acceso.ts` | Clave, sesión en `sessionStorage`, abrir/cerrar sesión |
| `src/components/admin/admin_gate.tsx` | Pantalla de pedido de contraseña |

### Verificación en navegador (2026-10-09)

Puerto 5209, `npm run dev`, con `sessionStorage` y `localStorage` limpios.

| Qué | Resultado |
|---|---|
| **Navbar pública** | 24 links y botones, **0** con la palabra "admin". El HTML del `nav` no contiene "admin" en ningún lugar |
| `/admin` sin sesión | "Administracion" / "Esta seccion es restringida.", input `type=password`, botón "Entrar" deshabilitado, **sin sidebar y sin `main`** detrás |
| Aviso del pie | "Acceso de prueba. La contrasena se valida en el navegador y no protege datos reales." |
| Clave incorrecta | `role=alert`: "Contrasena incorrecta.", campo limpiado, `aria-invalid="true"`, `sessionStorage` sigue vacío, el gate sigue montado |
| Clave correcta | `sessionStorage: 'abierta'`, sin gate, sidebar presente, Dashboard con las 5 métricas |
| "Cerrar sesion" | Vuelve a `/`, `sessionStorage` limpio |
| `/admin/pedidos` sin sesión | Gate mostrado, **0 filas de tabla**, ningún `h2` de la página: los datos no llegan a renderizar |
| Consola | **0 errores, 0 avisos** |

### Hecho cuando

- [x] No hay botón de acceso al panel en la tienda
- [x] `/admin` pide contraseña
- [x] La contraseña abre la sesión y muestra el panel
- [x] Las 5 rutas hijas están cubiertas por el mismo gate
- [x] "Cerrar sesión" funciona
- [x] El flag antiguo `isAdmin` ya no abre nada
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] **187/187 tests en verde** (+10 de acceso)

---

## T10 — Verificación integral + docs

**RF cubiertos:** RNF-01 a RNF-08
**Depende de:** T9
**Estado:** `hecha` con una salvedad — **CA-37 quedó sin implementar**

### Verificación automática

| Qué | CA | Resultado |
|---|---|---|
| `npm test` | — | **200 de 200**, 14 archivos |
| `npx tsc --noEmit` | CA-39 | **0 errores** |
| `npm run lint` | CA-40 | **0 problemas** |
| `npm run build` | CA-38 | **OK**, 25 s |
| Dependencias | CA-41 | Solo las 6 aprobadas por RNF-04 |

### Bugs encontrados en T10

**`npm run lint` no se habia corrido en ninguna de las 9 tareas anteriores**, y
encontro 4 archivos con problemas:

1. **`data_table.tsx` — genericos "sin usar" en `ColumnMeta`.** Es un falso
   positivo: es una *augmentation de modulo* y TypeScript exige que los type
   parameters coincidan con los de TanStack (`ColumnMeta<TData extends RowData,
   TValue>`). Se discoverto porque **primero se sakaron** y el error fue TS2428.
   Volvieron con un `eslint-disable` comentado.

2. **`csv.ts` — BOM invisible escrito como caracter literal.** El export escribe
   `﻿` al principio del CSV para que Excel abra los acentos bien, y el parser lo
   quita. Es correcto, pero invisible: no se distingue de un espacio. Ahora es
   `﻿`, que ademas es lo unico que compila sin flag `u`.

3. **`clientes.test.ts` — helper `url` sin uso.** Quedo de un test que se
   reescribio en T7. Borrado.

4. **`public/mockServiceWorker.js` — `eslint-disable` sin efecto.** Lo genera
   `npx msw init`, no es codigo del proyecto y se regenera con ese comando.
   Excluido de lint.

**5. `date-fns` se importaba sin declararse.** `date_range_picker.tsx` hace
`import { es } from 'date-fns/locale'`, pero `date-fns` no era dependencia
directa: funcionaba **solo por hoisting**, que es casualidad, no garantia.
RNF-04 la aprobaba, asi que ahora es dependencia directa.

### CA-37 / CE-05: fallback offline — IMPLEMENTADO

Se implemento en una tanda aparte, a pedido del usuario ("cerra todo lo que
falta").

**Archivos:**
- `src/utils/offline.ts` — respaldo en `localStorage`, estado global y
  suscriptores.
- `src/components/admin/aviso_offline.tsx` — banner permanente con "Reintentar".
- `src/hooks/useApi.ts` — opcion `respaldo`.
- `exigirConexion()` en las 5 mutaciones (catalogo, pedidos, clientes, import).

#### La decision que CE-05 no toma

CE-05 dice *"fallback a localStorage directo, `alert('Modo offline')`"* y nada
mas. Un fallback que muestra datos viejos **como si fueran actuales** es peor
que un error: el admin edita sobre datos que el servidor ya no tiene y no se
entera. Por eso hay dos cosas y no una:

1. Los datos se muestran **marcados como desactualizados** con un banner
   permanente en el header del panel. No se puede usar el panel creyendo que se
   ve la verdad.
2. El `alert` de CE-05 se dispara **una vez por paso a offline**, no en cada
   `fetch` que falla. Con cinco paginas cargando, habria que confirmar cinco
   veces lo mismo.

#### El respaldo esta indexado por URL, y no por recurso

Las tablas piden URLs distintas segun filtro y pagina. **Con una sola clave por
recurso, el fallback miente:** si el admin filtra por "Tinto" y se queda sin red,
se le muestra la ultima respuesta guardada, que puede ser la pagina 3 sin
filtro, y la tabla ostensibly muestra "Tinto" con datos que no son de Tinto. Sin
error, sin aviso.

Indexado por URL, offline sirve **exactamente la misma consulta** que se pidio.
Si no hay respaldo para esa URL, se muestra el error.

Tope de 40 entradas por recurso: sin tope, un admin que recorre filtros y
paginas durante dias llenaria el `localStorage`.

#### Las escrituras NO se encolan

Offline, crear o editar **falla** con un mensaje explicito. Encolar para mandar
cuando vuelva la red parece gratis, pero entre que se guarda y que se manda el
servidor pudo cambiar: el vino se creo, otro lo elimino, y el `PATCH` lo pisa.
Resolver ese conflicto no esta decidido en ninguna spec.

Fallo con mensaje claro es preferible: el admin sabe que no se guardo y
reintenta cuando vuelva la red, en vez de creer que quedo aplicado.

#### Bug encontrado al implementarlo

`useApi` **dejaba los datos viejos en pantalla cuando el fetch fallaba sin
respaldo.** Con un filtro nuevo, la tabla mostraba las filas del filtro anterior
**debajo** del mensaje de error, como si fueran el resultado de la busqueda. Se
agrego `setData(undefined)` en la rama de error. Hay test.

#### Verificacion

| Qué | Resultado |
|---|---|
| Tests | **224 de 224** (15 del store + 9 del hook) |
| `tsc` / `lint` / `build` | 0 / 0 / OK |
| `guardarRespaldo` guarda por URL | `admin_respaldo_vinos` con la clave `"/api/wines?page=1&limit=10"` |
| Banner offline | "Modo offline. Se muestran los ultimos datos guardados en este navegador..." con boton REINTENTAR, **por encima del header** |
| `alert` de CE-05 | Se dispara **una vez**, con el texto que pide la CE |
| Volver a online | El banner desaparece |
| Escritura offline | "Sin conexion con el servidor: los cambios no se pueden guardar." y el formulario **sigue abierto**, sin perder lo escrito |

La emulacion de red Offline del DevTools **no sirve** para esto: corta tambien
el HTML y los modulos, asi que la pagina no carga. Se verifico el banner
importando `/src/utils/offline.ts` por la ruta de Vite, que devuelve la misma
instancia del modulo que usa la app.

### Verificacion en navegador (2026-10-09)

Puerto 5213, `npm run dev`.

| CA | Qué | Resultado |
|---|---|---|
| CA-01 | Acceso con contrasena | `/admin` → clave → Dashboard |
| CA-01b | Sin boton en la tienda | `/` con 0 enlaces y el HTML del `nav` sin la palabra "admin" |
| CA-02 | Rutas protegidas | Las 5 hijas muestran el gate sin sesion |
| CA-03 | Responsive | A 501 px: sidebar en `translateX(-288)`, boton de menu, main a ancho completo. Abierto muestra los 6 links, cierra con la X. A 1375 px: sidebar fija en `left: 0` |
| CA-04 | MetricCards | 5 con valores |
| CA-05 | Grafico Recharts | `svg.recharts-surface` presente |
| CA-06 | Top 5 productos | 5 con imagen |
| CA-07 | Actividad reciente | 5 items |
| CA-09 | Catalogo | 12 vinos, "Mostrando 1-10 de 12", 8 columnas |
| CA-21 | Pedidos | 25 pedidos, 6 columnas |
| CA-29 | Clientes | 15 clientes, 8 columnas |
| CA-36 | Sesion sobrevive recarga | `sessionStorage: 'abierta'` tras recargar |
| CA-37 | Fallback offline | Banner "Modo offline" con Reintentar, `alert` una sola vez, escritura rechazada. Ver la seccion de CE-05 |
| — | Consola | **0 errores, 0 avisos** en todas las paginas |

Los CA de interaccion (CA-10 a CA-20, CA-22 a CA-28, CA-30 a CA-33) se
verificaron **durante la tarea que los implemento** (T5, T6, T7, T8), cada una
con su tabla en la seccion correspondiente de este archivo. CA-34 y CA-35
(MSW intercepta `fetch`, latencia 300-800 ms) se verifican por construccion:
`esperar(300, 800)` esta en cada handler de `src/mocks/handlers.ts`.

### Documentacion

**`MEMORY.md`**
- Componentes: 11 del panel + 11 utilidades/datos del back-office.
- Decisiones: se reescribio la seccion de arquitectura con el stack real, y se
  agregaron las 5 decisiones de la 004-a que conviene no olvidar.
- Bitacora: entrada del 2026-10-09 con **las 10 tareas**, no solo la ultima.

**`AGENTS.md`**
- Comandos: **`pnpm` → `npm`** (el repo tiene `package-lock.json`; los comandos
  de pnpm no funcionan), mas `npx tsc --noEmit`, `npm run lint`, el comando de
  regenerar mocks y el de la clave.
- Especificacion: seccion Back-Office con los 5 modulos y las reglas de acceso.

### Deuda saldada

El protocolo de `AGENTS.md` pide actualizar `MEMORY.md` y `AGENTS.md` despues de
**cada** tarea. **No se habia hecho en ninguna de T1 a T9.** Con T10 queda
saldada: la bitacora cubre las 10 tareas de la 004-a, no solo la ultima.

### Hecho cuando

- [x] `npm test`, `tsc`, `lint` y `build` en 0
- [x] Recorrido de los CA en navegador, 0 errores de consola
- [x] `MEMORY.md` con las 10 tareas de la 004-a
- [x] `AGENTS.md` con comandos reales y la seccion Back-Office
- [x] Dependencias declaradas y dentro de RNF-04
- [x] CA-37 / CE-05 fallback offline implementado

**Las 10 tareas de la 004-a estan completas.** Queda fuera del alcance de esta
spec, y anotado en `specs/003-mejoras-ux/spec.md`, el problema del hero: el titulo
tapa la animacion 3D y las botellas destacadas cargan el diseño. El usuario
decidio **anotarlo y dejarlo para después**, sin tocar la interfaz.

### Hecho cuando

- [ ] Todos los comandos pasan
- [ ] Todos los CA manuales verificados en navegador
- [ ] `MEMORY.md` y `AGENTS.md` actualizados
- [ ] Spec 004 completa y documentada