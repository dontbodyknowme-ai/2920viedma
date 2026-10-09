import { useCallback, useMemo, useState } from 'react'
import { useApi } from './useApi'
import { aTextoCsv, descargarCsv, nombreArchivoConFecha } from '../utils/csv'
import type { Order, OrderStatus, Paginated } from '../types/admin'

/**
 * Estado y operaciones de la tabla de pedidos.
 *
 * Igual que `useCatalogo`: los filtros, el orden y la paginacion viven en el
 * servidor. Cada cambio de filtro vuelve a la pagina 1, porque la pagina 5 de
 * un conjunto filtrado no existe y dejaria al usuario en un estado vacio con
 * resultados disponibles.
 */

export const ESTADOS_PEDIDO: ReadonlyArray<{ valor: OrderStatus; etiqueta: string }> = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'preparando', etiqueta: 'Preparando' },
  { valor: 'enviado', etiqueta: 'Enviado' },
  { valor: 'entregado', etiqueta: 'Entregado' },
  { valor: 'cancelado', etiqueta: 'Cancelado' },
  { valor: 'devuelto', etiqueta: 'Devuelto' }
]

export interface FiltrosPedidos {
  search: string
  /** Vacio = todos los estados. Varios = OR entre ellos. */
  estados: OrderStatus[]
  dateFrom: string
  dateTo: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
}

const FILTROS_VACIOS: FiltrosPedidos = {
  search: '',
  estados: [],
  dateFrom: '',
  dateTo: '',
  sortColumn: '',
  sortDirection: 'desc'
}

/**
 * Las fechas viajan en `YYYY-MM-DD`.
 *
 * El endpoint compara contra `createdAt`, que es un ISO completo. Si mandara
 * `new Date().toISOString()`, el `T00:00:00Z` que trae cortaria el dia por la
 * zona horaria: en Argentina (UTC-3) un pedido de las 20:00 pertenece al dia
 * anterior en UTC, y el admin veria pedidos fuera del rango que eligio.
 */
const construirUrl = (
  filtros: FiltrosPedidos,
  page: number,
  limit: number
): string => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  if (filtros.search.trim() !== '') params.set('search', filtros.search.trim())
  if (filtros.estados.length > 0) params.set('status', filtros.estados.join(','))
  if (filtros.dateFrom !== '') params.set('dateFrom', filtros.dateFrom)
  if (filtros.dateTo !== '') params.set('dateTo', filtros.dateTo)
  if (filtros.sortColumn !== '') {
    params.set('sortBy', filtros.sortColumn)
    params.set('sortDir', filtros.sortDirection)
  }

  return `/api/orders?${params.toString()}`
}

export interface EstadoPedidos {
  pedidos: Order[]
  total: number
  totalPaginas: number
  isLoading: boolean
  error: string | undefined
  page: number
  limit: number
  filtros: FiltrosPedidos
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSearch: (valor: string) => void
  aplicarFiltros: (cambios: Partial<FiltrosPedidos>) => void
  alternarEstado: (pedido: Order, estado: OrderStatus) => Promise<Order>
  exportarCsv: () => Promise<void>
  recargar: () => void
}

export const usePedidos = (): EstadoPedidos => {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtros, setFiltros] = useState<FiltrosPedidos>(FILTROS_VACIOS)

  const url = useMemo(() => construirUrl(filtros, page, limit), [filtros, page, limit])
  const { data, isLoading, error, refetch } = useApi<Paginated<Order>>(url)

  const refrescar = useCallback(() => {
    refetch()
  }, [refetch])

  const setSearch = useCallback((valor: string) => {
    setPage(1)
    setFiltros((previo) => ({ ...previo, search: valor }))
  }, [])

  const aplicarFiltros = useCallback((cambios: Partial<FiltrosPedidos>) => {
    setPage(1)
    setFiltros((previo) => ({ ...previo, ...cambios }))
  }, [])

  const alternarEstado = useCallback(
    async (pedido: Order, estado: OrderStatus): Promise<Order> => {
      const res = await fetch(`/api/orders/${encodeURIComponent(pedido.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: estado })
      })

      if (!res.ok) throw new Error(`No se pudo actualizar el pedido (HTTP ${res.status})`)

      const actualizado = (await res.json()) as Order
      // El PATCH devuelve el pedido entero con el timeline actualizado, asi que
      // se puede reemplazar en la lista sin volver a pedir la pagina. El refetch
      // de todas formas, para que el orden por `updatedAt` del servidor no
      // difiera de lo que hay en pantalla.
      refrescar()
      return actualizado
    },
    [refrescar]
  )

  const exportarCsv = useCallback(async (): Promise<void> => {
    // Se pide el **total filtrado**, no la pagina que se ve: exportar las 10
    // filas de la pantalla cuando el filtro dice 240 seria peor que no
    // exportar.
    const params = new URLSearchParams({ page: '1', limit: '100' })
    if (filtros.search.trim() !== '') params.set('search', filtros.search.trim())
    if (filtros.estados.length > 0) params.set('status', filtros.estados.join(','))
    if (filtros.dateFrom !== '') params.set('dateFrom', filtros.dateFrom)
    if (filtros.dateTo !== '') params.set('dateTo', filtros.dateTo)

    const res = await fetch(`/api/orders?${params.toString()}`)
    if (!res.ok) throw new Error(`No se pudo exportar (HTTP ${res.status})`)

    const cuerpo = (await res.json()) as Paginated<Order>

    const encabezados = [
      'Id',
      'Cliente',
      'Email',
      'Fecha',
      'Total',
      'Estado',
      'Unidades',
      'Ciudad'
    ]

    const filas = cuerpo.data.map((pedido) => [
      pedido.id,
      pedido.customerName,
      pedido.customerEmail,
      pedido.createdAt.slice(0, 10),
      String(pedido.total),
      pedido.status,
      String(pedido.items.reduce((suma, item) => suma + item.quantity, 0)),
      pedido.shippingAddress.city
    ])

    descargarCsv(nombreArchivoConFecha('pedidos', new Date()), aTextoCsv(filas, encabezados))
  }, [filtros])

  return {
    pedidos: data?.data ?? [],
    total: data?.total ?? 0,
    totalPaginas: data?.totalPages ?? 1,
    isLoading,
    error,
    page,
    limit,
    filtros,
    setPage,
    setLimit,
    setSearch,
    aplicarFiltros,
    alternarEstado,
    exportarCsv,
    recargar: refrescar
  }
}