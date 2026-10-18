# Plan 004 — Back-Office UI (Panel de Administración)

**Spec:** `specs/004-backoffice-ui/spec.md`, estado `borrador`
**Fase:** 3 de 5 (plan). Este documento define el **CÓMO**. El QUÉ y el POR QUÉ están en la spec.
**Restricción dominante:** Solo dependencias aprobadas: `recharts`, `@tanstack/react-table`, `msw`, `papa-parse` (opcional). RNF-04.
**Tareas: 11.**

---

## 1. Estrategia de ejecución

### 1.1 La idea central

Implementar en **capas ascendentes**: primero infraestructura (routing, MSW, mocks, layout), después componentes compartidos, luego cada módulo (Dashboard → Catálogo → Pedidos → Clientes), y finalmente pulido.

```
capa 1  infra        React Router + MSW + mocks + tipos extendidos
                      │
                      ▼
capa 2  layout       AdminLayout, AdminSidebar, header, protección rutas
                      │
                      ▼
capa 3  shared       DataTable wrapper, MetricCard, StatusBadge, OrderTimeline, ConfirmDialog
                      │
                      ▼
capa 4  dashboard    MetricCards, gráfico Recharts, top productos, actividad
                      │
                      ▼
capa 5  catalogo     DataTable catálogo + CRUD (conecta formulario existente)
                      │
                      ▼
capa 6  pedidos      DataTable pedidos + drawer detalle + timeline + acciones
                      │
                      ▼
capa 7  clientes     DataTable clientes + drawer detalle + notas + tags
                      │
                      ▼
capa 8  config       Placeholder configuración + export/import CSV
                      │
                      ▼
capa 9  cierre       Verificación integral + documentación
```

### 1.2 Orden de tareas

| Tarea | Título | Depende de |
|---|---|---|
| T1 | Infra: Routing, MSW, Mocks, Tipos | — |
| T2 | Layout: AdminLayout, Sidebar, Protección rutas | T1 |
| T3 | Componentes compartidos | T2 |
| T4 | Dashboard | T3 |
| T5 | Catálogo Admin | T3 |
| T6 | Pedidos Admin | T3 |
| T7 | Clientes CRM | T3 |
| T8 | Configuración + CSV Export/Import | T3 |
| T9 | Integración navbar "Modo Admin" | T2 |
| T10 | Verificación integral + docs | T9 |

---

## 2. Mapa de archivos

### 2.1 Archivos a crear

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/router.tsx` | Configuración React Router v6 con rutas `/admin/*` | T1 |
| `src/mocks/handlers.ts` | MSW handlers para `/api/wines`, `/api/orders`, `/api/customers`, `/api/metrics` | T1 |
| `src/mocks/data.ts` | Datos mock: 25 pedidos, 15 clientes, 30 días métricas | T1 |
| `src/mocks/browser.ts` | Setup MSW para navegador (worker) | T1 |
| `src/types/admin.ts` | Tipos extendidos: AdminUser, Order, Customer, Metrics, AdminFilters | T1 |
| `src/components/admin/admin_layout.tsx` | Layout principal: sidebar, header, outlet, drawer móvil | T2 |
| `src/components/admin/admin_sidebar.tsx` | Navegación lateral con iconos, estado activo, colapsible | T2 |
| `src/hooks/useMediaQuery.ts` | Hook reactivo para media queries (mobile/desktop) | T2 |
| `src/hooks/useApi.ts` | Hook genérico de fetch con isLoading/error/refetch | T4 |
| `src/components/admin/data_table.tsx` | Wrapper TanStack Table genérico | T3 |
| `src/components/admin/metric_card.tsx` | Card métrica con icono, valor, tendencia, label | T3 |
| `src/components/admin/status_badge.tsx` | Badge semántico con colores por estado | T3 |
| `src/components/admin/order_timeline.tsx` | Timeline visual estados pedido | T3 |
| `src/components/admin/confirm_dialog.tsx` | Modal confirmación reutilizable | T3 |
| `src/pages/admin/dashboard.tsx` | Dashboard page: MetricCards, gráfico, top 5, actividad | T4 |
| `src/pages/admin/catalogo.tsx` | Catálogo Admin page: DataTable + actions | T5 |
| `src/pages/admin/pedidos.tsx` | Pedidos Admin page: DataTable + drawer | T6 |
| `src/pages/admin/clientes.tsx` | Clientes CRM page: DataTable + drawer | T7 |
| `src/pages/admin/configuracion.tsx` | Configuración placeholder + CSV import/export | T8 |
| `src/components/admin/date_range_picker.tsx` | Wrapper de `react-day-picker` con tema oscuro | T6 |
| `src/utils/csv.ts` | Utilidades export/import CSV (plan D-H) | T3, T8 |
| `test/admin/data_table.test.ts` | Tests lógica DataTable (filtros, orden, paginación) | T3 |
| `test/admin/mocks.test.ts` | Tests handlers MSW y datos mock | T1 |

### 2.2 Archivos a modificar

| Archivo | Qué cambia | Tarea |
|---|---|---|
| `src/main.tsx` | Wrapeo con `<RouterProvider>` y `<MSWProvider>` (dev only) | T1 |
| `src/App.tsx` | Rutas admin, flag `isAdmin`, toggle en navbar | T1, T9 |
| `src/components/barra_de_navegacion.tsx` | Botón "Modo Admin" + enlace `/admin` cuando activo | T9 |
| `src/types/producto.ts` | Agregar campo `stock: number` y `activo: boolean` a `Producto` | T1 |
| `src/datos/productos.ts` | Agregar `stock` y `activo` a productos iniciales | T1 |
| `src/components/editor_formador_productos.tsx` | Campos `stock` y `activo` en formulario | T5 |

### 2.3 Archivos que NO se tocan

| Archivo | Por qué |
|---|---|
| `src/components/carta_de_productos.tsx` | Tarjeta pública no cambia |
| `src/components/carrito_de_compras.tsx` | Carrito público no cambia |
| `src/components/vista_rapida_producto.tsx` | Vista rápida pública no cambia |
| `src/components/pie_de_pagina.tsx` | Footer público no cambia |
| `src/components/hero.tsx` / `herocanvas3d.tsx` | Hero público no cambia |
| `tailwind.config.js` | Paleta ya definida |
| `vitest.config.ts` | Config tests no cambia |

---

## 3. Decisiones de implementación

### D-A — Routing: React Router v6 con `createBrowserRouter`

```tsx
// src/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import { AdminLayout } from './components/admin/admin_layout'
import { Dashboard } from './pages/admin/dashboard'
import { CatalogoAdmin } from './pages/admin/catalogo'
import { PedidosAdmin } from './pages/admin/pedidos'
import { ClientesAdmin } from './pages/admin/clientes'
import { ConfiguracionAdmin } from './pages/admin/configuracion'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, // App pública actual
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'catalogo', element: <CatalogoAdmin /> },
      { path: 'pedidos', element: <PedidosAdmin /> },
      { path: 'clientes', element: <ClientesAdmin /> },
      { path: 'configuracion', element: <ConfiguracionAdmin /> },
    ],
  },
])
```

**Protección de rutas:** En `AdminLayout`, `useEffect` verifica `isAdmin` en localStorage. Si `false` → `navigate('/')` + `alert('Acceso denegado')`.

### D-B — MSW Handlers

```tsx
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { mockWines, mockOrders, mockCustomers, mockMetrics } from './data'

export const handlers = [
  // WINES
  http.get('/api/wines', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || '1')
    const limit = Number(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search') || ''
    const category = url.searchParams.get('category') || ''
    const varietal = url.searchParams.get('varietal') || ''
    const status = url.searchParams.get('status') || ''

    let filtered = mockWines.filter(w => {
      const matchesSearch = !search || 
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.winery.toLowerCase().includes(search.toLowerCase()) ||
        w.varietal.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !category || w.category === category
      const matchesVarietal = !varietal || w.varietal === varietal
      const matchesStatus = !status || (status === 'activo' ? w.activo : !w.activo)
      return matchesSearch && matchesCategory && matchesVarietal && matchesStatus
    })

    const total = filtered.length
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)

    return delay(HttpResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) }))
  }),

  http.post('/api/wines', async ({ request }) => {
    const body = await request.json()
    const newWine = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockWines.push(newWine)
    return delay(HttpResponse.json(newWine, { status: 201 }))
  }),

  http.patch('/api/wines/:id', async ({ params, request }) => {
    const body = await request.json()
    const idx = mockWines.findIndex(w => w.id === params.id)
    if (idx === -1) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 })
    mockWines[idx] = { ...mockWines[idx], ...body, updatedAt: new Date().toISOString() }
    return delay(HttpResponse.json(mockWines[idx]))
  }),

  http.delete('/api/wines/:id', ({ params }) => {
    const idx = mockWines.findIndex(w => w.id === params.id)
    if (idx === -1) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 })
    mockWines.splice(idx, 1)
    return delay(new HttpResponse(null, { status: 204 }))
  }),

  // ORDERS - similar pattern
  http.get('/api/orders', ({ request }) => { /* ... */ }),
  http.patch('/api/orders/:id', async ({ params, request }) => { /* ... */ }),

  // CUSTOMERS
  http.get('/api/customers', ({ request }) => { /* ... */ }),

  // METRICS
  http.get('/api/metrics', () => delay(HttpResponse.json(mockMetrics))),

  // CSV IMPORT
  http.post('/api/wines/import', async ({ request }) => { /* parse CSV, validate, bulk insert */ }),
]

// Helper para latencia aleatoria 300-800ms
const delay = (response: HttpResponse) => 
  new Promise(r => setTimeout(() => r(response), 300 + Math.random() * 500))
```

### D-C — DataTable Wrapper (TanStack Table v8)

```tsx
// src/components/admin/data_table.tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onSortChange: (sorting: SortingState) => void
  onFilterChange: (filters: Record<string, string>) => void
  searchValue: string
  onSearchChange: (value: string) => void
  isLoading?: boolean
  rowActions?: (row: T) => React.ReactNode
  getRowId: (row: T) => string
}
```

Features incluidas:
- `useReactTable` con `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`
- Toolbar: búsqueda global, select items por página, exportar CSV
- Columnas: header con sort, filtro por columna (select/input según tipo)
- Empty state con "Limpiar filtros"
- Loading state con skeletons por fila

### D-D — AdminLayout

```tsx
// src/components/admin/admin_layout.tsx
export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Protección
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    if (!isAdmin) {
      toast.error('Acceso denegado')
      navigate('/')
    }
  }, [navigate])

  return (
    <div className='min-h-screen bg-charcoal-900'>
      {/* Sidebar fija desktop / drawer móvil */}
      <aside className={cn(
        'fixed top-0 left-0 z-40 h-screen bg-charcoal-950 border-r border-wine-900/50 transition-transform duration-300',
        isMobile
          ? sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
          : collapsed ? 'w-20' : 'w-72'
      )}>
        <AdminSidebar collapsed={collapsed} onToggleCollapse={setCollapsed} />
      </aside>

      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div className='fixed inset-0 z-30 bg-black/50' onClick={() => setSidebarOpen(false)} />
      )}

      {/* Header + Content */}
      <div className={cn('transition-all duration-300', !isMobile && (collapsed ? 'ml-20' : 'ml-72'))}>
        <header className='sticky top-0 z-30 bg-charcoal-950/90 backdrop-blur border-b border-wine-900/50'>
          <div className='flex items-center justify-between px-6 py-4'>
            <button onClick={() => setSidebarOpen(true)} className='md:hidden'>
              <Menu className='w-6 h-6 text-cream-100' />
            </button>
            <h1 className='font-serif text-xl text-cream-100'>CAVA & CO. Admin</h1>
            <div className='flex items-center gap-4'>
              <AdminUserMenu />
            </div>
          </div>
        </header>
        <main className='p-6'>{children}</main>
      </div>
    </div>
  )
}
```

### D-E — Tipos extendidos (`src/types/admin.ts`)

```tsx
import type { Producto } from '../types/producto'

export interface AdminUser {
  isAdmin: boolean
  name: string
  email: string
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  items: Array<{ wineId: string; wineName: string; quantity: number; price: number; imageUrl: string }>
  total: number
  status: 'pendiente' | 'preparando' | 'enviado' | 'entregado' | 'cancelado' | 'devuelto'
  shippingAddress: { street: string; city: string; zip: string; phone: string }
  timeline: Array<{ status: Order['status']; timestamp: string; note?: string }>
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastOrderAt: string | null
  tags: string[]
  notes: Array<{ id: string; text: string; author: string; createdAt: string }>
  createdAt: string
}

export interface Metrics {
  salesToday: number
  salesWeek: number
  salesMonth: number
  abandonedCarts: number
  avgTicket: number
  conversion: number
  salesLast30Days: Array<{ date: string; revenue: number; orders: number }>
  topProducts: Array<{ wineId: string; name: string; imageUrl: string; units: number; revenue: number }>
  recentActivity: Array<{ type: 'order' | 'customer'; id: string; description: string; timestamp: string }>
}

export interface AdminFilters {
  search: string
  category: string
  varietal: string
  status: string
  dateFrom: string
  dateTo: string
}
```

### D-F — Datos Mock (`src/mocks/data.ts`)

- **mockWines:** 12 productos (extendidos de `PRODUCTOS_INICIALES` + 10 nuevos) con `stock: 0-100`, `activo: true/false`
- **mockOrders:** 25 pedidos con distribución realista de estados, fechas últimos 60 días, items 1-4 por pedido
- **mockCustomers:** 15 clientes con historial (1-8 pedidos), tags (VIP, Frecuente, Nuevo), notas
- **mockMetrics:** 30 días ventas con tendencia realista, top 5 productos calculados de mockOrders

### D-G — Date Range Picker

En `src/components/admin/date_range_picker.tsx` (NUEVO - T6):

```tsx
import { DateRangePicker } from 'react-day-picker'
import { format } from 'date-fns'

interface DateRangePickerProps {
  from: Date | undefined
  to: Date | undefined
  onChange: (range: { from: Date | undefined; to: Date | undefined }) => void
}

export const AdminDateRangePicker = ({ from, to, onChange }: DateRangePickerProps) => (
  <DateRangePicker
    mode="range"
    selected={{ from, to }}
    onSelect={onChange}
    numberOfMonths={2}
    classNames={{
      root: 'bg-charcoal-950 border border-wine-900/50 rounded-xl p-4',
      month: 'text-cream-100',
      day: 'text-cream-100 hover:bg-wine-700/50',
      selected: 'bg-wine-700 text-cream-100',
      today: 'border-gold-500',
    }}
  />
)
```

Requiere `date-fns` para formateo.

---

### D-H — CSV Utils (`src/utils/csv.ts`)

```tsx
export const exportToCSV = <T,>(data: T[], filename: string, columns: Array<{ key: keyof T; label: string }>) => {
  const headers = columns.map(c => c.label).join(',')
  const rows = data.map(row => columns.map(c => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const parseCSV = (text: string): Record<string, string>[] => {
  // Parser simple: split lines, split by comma, handle quotes
  // Para producción usar PapaParse, aquí versión mínima
}
```

---

## 4. Estrategia de tests

### Tests automatizados (vitest + jsdom)

| Archivo | Qué testea |
|---|---|
| `test/admin/data_table.test.ts` | `createColumnHelper`, filtros, ordenamiento, paginación, `getRowId` |
| `test/admin/mocks.test.ts` | Handlers MSW devuelven shape correcto, latencia simulada, paginación |
| `test/admin/csv.test.ts` | `exportToCSV` genera CSV válido, `parseCSV` parsea headers + rows |

### Tests en navegador (CA)

Todos los CA de la spec se verifican manualmente en navegador como en specs anteriores.

---

## 5. Trazabilidad RF → Tarea

| RF | Tarea | Verificación |
|---|---|---|
| RF-01 a RF-04 | T1, T2, T9 | CA-01, CA-02, CA-03 |
| RF-05 a RF-09 | T4 | CA-04 a CA-08 |
| RF-10 a RF-21 | T5 | CA-09 a CA-20 |
| RF-22 a RF-29 | T6 | CA-21 a CA-28 |
| RF-30 a RF-34 | T7 | CA-29 a CA-33 |
| RF-35 a RF-43 | T1 | CA-34 a CA-37 |
| RNF-01 a RNF-08 | T10 | CA-38 a CA-41 |

---

## 6. Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **TanStack Table v8 learning curve** | Retraso en T3 | Empezar T3 temprano, usar ejemplos oficiales |
| R2 | **MSW no intercepta en dev** | Fallback no funciona | Verificar `worker.start({ onUnhandledRequest: 'bypass' })` en `main.tsx` solo dev (MSW v2) |
| R3 | **Recharts bundle size** | Chunk grande | Dynamic import `const Recharts = lazy(() => import('recharts'))` |
| R4 | **Mock data inconsistente** | Tests flaky | Single source of truth en `src/mocks/data.ts`, helpers para crear datos |
| R5 | **Drawer focus trap** | Accesibilidad | `focus-trap-react` o implementación nativa `useEffect` + `tabIndex` |
| R6 | **CSV import validation** | Datos corruptos | Validar headers obligatorios, tipos, mostrar errores por fila |

---

## 7. Dependencias a agregar (aprobadas)

```json
{
  "dependencies": {
    "react-router-dom": "^6.20.0",
    "recharts": "^2.10.0",
    "@tanstack/react-table": "^8.10.0",
    "papa-parse": "^5.4.0",
    "react-day-picker": "^8.10.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "msw": "^2.0.0",
    "@types/papa-parse": "^5.3.0"
  }
}
```

> **Nota:** `react-router-dom` ya podría estar en package.json. Verificar antes de instalar.

---

## 8. Comandos de verificación por tarea

```bash
# Cada tarea
npx tsc --noEmit
npm run build

# T1 específico
npm test -- test/admin/mocks.test.ts

# T3 específico
npm test -- test/admin/data_table.test.ts

# Final
npm run build
npx tsc --noEmit
npm run lint  # si configurado
```