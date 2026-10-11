import { useCallback, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useApi } from './useApi'
import { csvClientes, descargarComo } from '../utils/csv_export'
import { exigirConexion } from '../utils/offline'
import type { Customer, Order, Paginated } from '../types/admin'

/**
 * Estado y operaciones de la tabla de clientes.
 *
 * Igual que `useCatalogo` y `usePedidos`: los filtros y la paginacion viven en
 * el servidor, y cada cambio de filtro vuelve a la pagina 1.
 *
 * **Las notas se agregan y nunca se reemplazan; los tags se reemplazan
 * completos.** No es una inconsistencia: son dos semanticas distintas. RF-32
 * dice "agrega nota" (el historial de notas es acumulativo) y RF-33 dice
 * "actualiza tags" (el conjunto de tags es el estado completo). Por eso las
 * dos operaciones van al mismo `PATCH` con campos distintos, y el mock los
 * trata distinto.
 */

export interface FiltrosClientes {
  search: string
  /** Vacio = todos. Varias = AND: tiene que tener todas las tags. */
  tags: string[]
}

const FILTROS_VACIOS: FiltrosClientes = { search: '', tags: [] }

const construirUrl = (filtros: FiltrosClientes, page: number, limit: number): string => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  if (filtros.search.trim() !== '') params.set('search', filtros.search.trim())
  if (filtros.tags.length > 0) params.set('tags', filtros.tags.join(','))

  return `/api/customers?${params.toString()}`
}

export interface EstadoClientes {
  clientes: Customer[]
  total: number
  totalPaginas: number
  isLoading: boolean
  error: string | undefined
  page: number
  limit: number
  filtros: FiltrosClientes
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSearch: (valor: string) => void
  alternarTag: (tag: string) => void
  limpiarFiltros: () => void
  /** Cliente abierto en el drawer, o `null` si no hay ninguno. */
  clienteAbierto: Customer | null
  /** Pedidos del cliente abierto, para la pestana "Pedidos". */
  pedidosDelCliente: Order[]
  abrirCliente: (id: string) => Promise<void>
  cerrarCliente: () => void
  cargandoCliente: boolean
  agregarNota: (texto: string) => Promise<void>
  toggleTag: (tag: string) => Promise<void>
  exportarCsv: () => Promise<void>
  recargar: () => void
}

export const useClientes = (): EstadoClientes => {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtros, setFiltros] = useState<FiltrosClientes>(FILTROS_VACIOS)
  const [clienteAbierto, setClienteAbierto] = useState<Customer | null>(null)
  const [pedidosDelCliente, setPedidosDelCliente] = useState<Order[]>([])
  const [cargandoCliente, setCargandoCliente] = useState(false)

  const url = useMemo(() => construirUrl(filtros, page, limit), [filtros, page, limit])
  const { data, isLoading, error, refetch } = useApi<Paginated<Customer>>(url, { respaldo: 'clientes' })

  const refrescar = useCallback(() => {
    refetch()
  }, [refetch])

  const setSearch = useCallback((valor: string) => {
    setPage(1)
    setFiltros((previo) => ({ ...previo, search: valor }))
  }, [])

  const alternarTag = useCallback((tag: string) => {
    setPage(1)
    setFiltros((previo) => ({
      ...previo,
      tags: previo.tags.includes(tag)
        ? previo.tags.filter((otra) => otra !== tag)
        : [...previo.tags, tag]
    }))
  }, [])

  const limpiarFiltros = useCallback(() => {
    setPage(1)
    setFiltros(FILTROS_VACIOS)
  }, [])

  /**
   * El detalle se pide por su id, no se arma con el objeto de la lista.
   *
   * El objeto de la lista es una fila paginada: puede venir recortada y sus
   * notas pueden estar viejas si otro admin acaba de agregar una. Pedir el
   * detalle entero es lo que hace que el drawer muestre el historial completo.
   */
  const abrirCliente = useCallback(async (id: string): Promise<void> => {
    setCargandoCliente(true)
    setPedidosDelCliente([])
    try {
      setClienteAbierto(await api.get<Customer>(`/api/customers/${encodeURIComponent(id)}`))

      // Los pedidos van aparte: el `Customer` no los trae, y filtrarlos del
      // lado del cliente exigiria tener la lista entera de pedidos en memoria,
      // que es justamente lo que la paginacion evita.
      try {
        const cuerpo = await api.get<Paginated<Order>>(
          `/api/orders?limit=100&search=${encodeURIComponent(id)}`
        )
        // La busqueda por texto devuelve tambien los pedidos de otros clientes
        // que tengan el mismo nombre. Se filtra por `customerId`, que es el
        // unico identificador fiable.
        setPedidosDelCliente(cuerpo.data.filter((pedido) => pedido.customerId === id))
      } catch {
        // El cliente ya se abrio; que falten sus pedidos no lo vuelve a cerrar.
        setPedidosDelCliente([])
      }
    } catch (fallo) {
      throw fallo instanceof Error ? fallo : new Error('No se pudo cargar el cliente')
    } finally {
      setCargandoCliente(false)
    }
  }, [])

  const cerrarCliente = useCallback(() => {
    setClienteAbierto(null)
    setPedidosDelCliente([])
  }, [])

  /** El PATCH devuelve el cliente completo, que es el que se muestra. */
  const parcheando = useCallback(
    async (id: string, cuerpo: Record<string, unknown>): Promise<Customer> => {
      exigirConexion()

      return api.patch<Customer>(`/api/customers/${encodeURIComponent(id)}`, cuerpo)
    },
    []
  )

  const agregarNota = useCallback(
    async (texto: string): Promise<void> => {
      if (clienteAbierto === null) return

      const actualizado = await parcheando(clienteAbierto.id, {
        notes: [{ text: texto }]
      })
      setClienteAbierto(actualizado)
      refrescar()
    },
    [clienteAbierto, parcheando, refrescar]
  )

  const toggleTag = useCallback(
    async (tag: string): Promise<void> => {
      if (clienteAbierto === null) return

      // El PATCH reemplaza los tags completos, asi que hay que mandar la lista
      // entera con el tag dado vuelta. Mandar solo el tag que se quiere quitar
      // dejaria al cliente sin ningun tag.
      const nuevos = clienteAbierto.tags.includes(tag)
        ? clienteAbierto.tags.filter((otra) => otra !== tag)
        : [...clienteAbierto.tags, tag]

      const actualizado = await parcheando(clienteAbierto.id, { tags: nuevos })
      setClienteAbierto(actualizado)
      refrescar()
    },
    [clienteAbierto, parcheando, refrescar]
  )

  const exportarCsv = useCallback(async (): Promise<void> => {
    // El total filtrado, no la pagina visible: exportar 10 filas cuando el
    // filtro dice 240 seria peor que no exportar.
    const params = new URLSearchParams({ page: '1', limit: '100' })
    if (filtros.search.trim() !== '') params.set('search', filtros.search.trim())
    if (filtros.tags.length > 0) params.set('tags', filtros.tags.join(','))

    const cuerpo = await api.get<Paginated<Customer>>(`/api/customers?${params.toString()}`)

    descargarComo('clientes', csvClientes(cuerpo.data))
  }, [filtros])

  return {
    clientes: data?.data ?? [],
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
    alternarTag,
    limpiarFiltros,
    clienteAbierto,
    pedidosDelCliente,
    abrirCliente,
    cerrarCliente,
    cargandoCliente,
    agregarNota,
    toggleTag,
    exportarCsv,
    recargar: refrescar
  }
}