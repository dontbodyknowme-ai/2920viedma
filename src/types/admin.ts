import type { Producto } from './producto'

/**
 * El producto como lo ve el panel de administracion.
 *
 * `stock` y `activo` viven ACA y no en `Producto`, y eso es deliberado:
 *
 * - `stock` es un dato interno de la operacion. No hay razon para mandarlo al
 *   navegador de un visitante, y RF-06 de la spec 004-b define que el endpoint
 *   publico los omite. Que el tipo loimponga desde el lado del admin hace que
 *   unificar los dos sea un error de compilación, no una forgotencia.
 * - `activo` decide si el producto aparece en el catalogo. Es lo que permite sacarlo
 *   de la venta sin borrarlo del historial de pedidos.
 *
 * La alternativa era agregar los dos campos a `Producto`, y se descarto: los tests
 * preexistentes fijan el contrato de `Producto` y lo cierran por los dos lados.
 * `CAMPOS_REQUERIDOS` no puede incluirlos porque los fixtures de
 * `test/validadores.test.ts` arman un `Producto` sin ellos y RNF-05 protege su
 * contenido. Y `CAMPOS_OPCIONALES` tampoco, porque
 * `test/integridad_datos_producto.test.ts` exige que `esCampoOpcionalValido(0)` y
 * `esCampoOpcionalValido(false)` den `false`, y `stock: 0` y `activo: false` son
 * valores legitimos. Las dos listas quedan fuera, asi que el campo tiene que
 * vivir en un tipo aparte.
 */
export interface ProductoAdmin extends Producto {
  /** Unidades disponibles. 0 es un valor valido, no "desconocido". */
  stock: number
  /** Si el producto se ofrece en el catalogo. */
  activo: boolean
}

// Estados de pedido. Fijos por D-15 de la spec 004-a: no son configurables.
export type OrderStatus =
  | 'pendiente'
  | 'preparando'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'devuelto'

export interface AdminUser {
  isAdmin: boolean
  name: string
  email: string
}

export interface OrderItem {
  productoId: string
  productoNombre: string
  imageUrl: string
  quantity: number
  price: number
}

export interface OrderTimelineEntry {
  status: OrderStatus
  timestamp: string
  author: string
  note?: string
}

export interface ShippingAddress {
  street: string
  city: string
  zip: string
  phone: string
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  shippingAddress: ShippingAddress
  timeline: OrderTimelineEntry[]
  createdAt: string
  updatedAt: string
}

export interface CustomerNote {
  id: string
  text: string
  author: string
  createdAt: string
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
  notes: CustomerNote[]
  createdAt: string
}

export interface DailySale {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  productoId: string
  name: string
  imageUrl: string
  units: number
  revenue: number
}

export interface RecentActivity {
  type: 'order' | 'customer'
  id: string
  description: string
  timestamp: string
}

// Los dos ultimos campos siempre valen 0 hasta que exista tracking de
// carritos y de sesiones, que esta fuera de alcance (RF-13 de la spec 004-b).
export interface Metrics {
  salesToday: number
  salesWeek: number
  salesMonth: number
  abandonedCarts: number
  avgTicket: number
  conversion: number
  salesLast30Days: DailySale[]
  topProducts: TopProduct[]
  recentActivity: RecentActivity[]
}

// Forma de la respuesta paginada de los endpoints de administracion.
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminFilters {
  search: string
  category: string
  varietal: string
  status: string
  dateFrom: string
  dateTo: string
}

export interface ImportResult {
  created: number
  updated: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}

// Reexportado para que los componentes admin no tengan que importar de dos
// lugares distintos cuando solo necesitan el tipo del producto.
export type { Producto }