import type {
  WineCreateInput,
  WineUpdateInput,
  WineQuery,
  ImportResult,
  OrderQuery,
  OrderUpdateInput,
  CustomerQuery,
  CustomerUpdateInput
} from './schemas.js'

/** ============================================================
 *  Tipos inferidos de los schemas Zod
 *  ============================================================ */

export type {
  WineCreateInput,
  WineUpdateInput,
  WineQuery,
  ImportResult,
  OrderQuery,
  OrderUpdateInput,
  CustomerQuery,
  CustomerUpdateInput
}

/** ============================================================
 *  Tipos de respuesta (shape que consume el frontend)
 *  ============================================================ */

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Wine {
  id: string
  name: string
  winery: string
  varietal: string
  category: 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante'
  /** Grupo de la tienda. Eje distinto de `category`: un Malbec es Tinto y Bebidas. */
  departamento: string
  vintage: number
  price: number
  description: string | null
  tastingNotes: string | null
  foodPairing: string | null
  imageUrl: string
  stock: number
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface PublicWine {
  id: string
  name: string
  winery: string
  varietal: string
  category: 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante'
  /** Grupo de la tienda. Eje distinto de `category`: un Malbec es Tinto y Bebidas. */
  departamento: string
  vintage: number
  price: number
  description: string | null
  tastingNotes: string | null
  foodPairing: string | null
  imageUrl: string
}

export interface OrderItem {
  wineId: string
  wineName: string
  imageUrl: string
  quantity: number
  price: number
}

export interface OrderTimelineEntry {
  id: string
  status: string
  note: string | null
  author: string
  createdAt: string
}

export interface Order {
  id: string
  customerId: string
  customer: Customer
  items: OrderItem[]
  total: number
  status: 'pendiente' | 'preparando' | 'enviado' | 'entregado' | 'cancelado' | 'devuelto'
  shippingAddress: Record<string, unknown>
  timeline: OrderTimelineEntry[]
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  totalOrders: number
  totalSpent: number
  lastOrderAt: string | null
  tags: string[]
  notes: Note[]
  orders: Order[]
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  text: string
  author: string
  customerId: string
  createdAt: string
}

export interface Metrics {
  salesToday: number
  salesWeek: number
  salesMonth: number
  abandonedCarts: number
  avgTicket: number
  conversion: number
  salesLast30Days: Array<{ date: string; total: number }>
  topProducts: Array<{ wineId: string; name: string; revenue: number; count: number }>
  recentActivity: Array<{
    id: string
    type: 'order' | 'customer'
    description: string
    timestamp: string
    amount?: number
  }>
}

export interface UploadResponse {
  id: string
  url: string
}

export interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  uptime: number
  db: 'connected' | 'disconnected'
}

/** ============================================================
 *  Auth
 *  ============================================================ */

export type UserRole = 'admin' | 'gestor' | 'vendedor'

export interface JwtPayload {
  sub: string
  role: 'admin' | 'gestor' | 'vendedor'
  email: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: PublicUser
}

export interface PublicUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'gestor' | 'vendedor'
}