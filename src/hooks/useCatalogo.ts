import { useCallback, useMemo, useState } from 'react'
import { useApi } from './useApi'
import { aTextoCsv, descargarCsv, nombreArchivoConFecha } from '../utils/csv'
import type { AdminWine, ImportResult, Paginated } from '../types/admin'

/**
 * Estado y operaciones de la tabla de catalogo.
 *
 * Todos los filtros viven en el servidor: el endpoint pagina y filtra, asi que
 * el hook solo arma la query y guarda lo que el usuario eligio. Los datos que
 * hay en memoria son **una pagina**, nunca el catalogo entero.
 *
 * Cada cambio de filtro vuelve a la pagina 1. Quedarse en la pagina 5 al
 * filtrar por "Malbec" llevaria al usuario a un estado vacio aunque haya
 * resultados: la pagina 5 de un conjunto filtrado no existe.
 */

export interface FiltrosCatalogo {
  search: string
  category: string
  varietal: string
  status: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
}

const FILTROS_VACIOS: FiltrosCatalogo = {
  search: '',
  category: '',
  varietal: '',
  status: '',
  sortColumn: '',
  sortDirection: 'asc'
}

/** Las categorias del tema. Es el mismo listado que usa el catalogo publico. */
export const CATEGORIAS = ['Tinto', 'Blanco', 'Rosado', 'Espumante'] as const

export const ESTADOS = [
  { valor: 'activo', etiqueta: 'Activo' },
  { valor: 'inactivo', etiqueta: 'Inactivo' }
] as const

const construirUrl = (filtros: FiltrosCatalogo, page: number, limit: number): string => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  if (filtros.search.trim() !== '') params.set('search', filtros.search.trim())
  if (filtros.category !== '') params.set('category', filtros.category)
  if (filtros.varietal !== '') params.set('varietal', filtros.varietal)
  if (filtros.status !== '') params.set('status', filtros.status)
  if (filtros.sortColumn !== '') {
    params.set('sortBy', filtros.sortColumn)
    params.set('sortDir', filtros.sortDirection)
  }

  return `/api/wines?${params.toString()}`
}

export interface EstadoCatalogo {
  vinos: AdminWine[]
  total: number
  totalPaginas: number
  isLoading: boolean
  error: string | undefined
  page: number
  limit: number
  filtros: FiltrosCatalogo
  /** Las cepas disponibles, para el desplegable de filtro. */
  cepas: string[]
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSearch: (valor: string) => void
  aplicarFiltros: (cambios: Partial<FiltrosCatalogo>) => void
  limpiarFiltros: () => void
  crear: (vino: Omit<AdminWine, 'id'>) => Promise<AdminWine>
  actualizar: (vino: AdminWine) => Promise<AdminWine>
  eliminar: (id: string) => Promise<void>
  duplicar: (vino: AdminWine) => Promise<AdminWine>
  alternarEstado: (vino: AdminWine) => Promise<AdminWine>
  importarCsv: (texto: string) => Promise<ImportResult>
  exportarCsv: () => Promise<void>
  recargar: () => void
}

export const useCatalogo = (): EstadoCatalogo => {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(FILTROS_VACIOS)

  const url = useMemo(() => construirUrl(filtros, page, limit), [filtros, page, limit])
  const { data, isLoading, error, refetch } = useApi<Paginated<AdminWine>>(url)

  // Las cepas salen de los datos mock cargados, no de una constante: si el
  // admin agrega un vino con una cepa nueva, el filtro tiene que ofrecerla sin
  // que nadie venga y la escriba a mano en el codigo.
  const cepas = useMemo(
    () => [...new Set((data?.data ?? []).map((vino) => vino.varietal))].sort(),
    [data]
  )

  const refrescar = useCallback(() => {
    refetch()
  }, [refetch])

  const setSearch = useCallback((valor: string) => {
    setPage(1)
    setFiltros((previo) => ({ ...previo, search: valor }))
  }, [])

  const aplicarFiltros = useCallback((cambios: Partial<FiltrosCatalogo>) => {
    setPage(1)
    setFiltros((previo) => ({ ...previo, ...cambios }))
  }, [])

  const limpiarFiltros = useCallback(() => {
    setPage(1)
    setFiltros(FILTROS_VACIOS)
  }, [])

  /**
   * Todas las mutaciones siguen el mismo patron: pegan al endpoint, y si la
   * peticion falla se propaga el error para que la pagina lo muestre. Ninguna
   * actualiza el estado local en el acto: recargar la pagina del servidor evita
   * que la fila optimista y la real diverjan si el backend normaliza algo.
   */
  const conError = useCallback(
    async <T,>(operacion: () => Promise<T>): Promise<T> => {
      const respuesta = await operacion()
      refrescar()
      return respuesta
    },
    [refrescar]
  )

  const crear = useCallback(
    (vino: Omit<AdminWine, 'id'>) =>
      conError(async () => {
        const res = await fetch('/api/wines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vino)
        })
        if (!res.ok) throw new Error(`No se pudo crear el vino (HTTP ${res.status})`)
        return (await res.json()) as AdminWine
      }),
    [conError]
  )

  const actualizar = useCallback(
    (vino: AdminWine) =>
      conError(async () => {
        const res = await fetch(`/api/wines/${encodeURIComponent(vino.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vino)
        })
        if (!res.ok) throw new Error(`No se pudo guardar el vino (HTTP ${res.status})`)
        return (await res.json()) as AdminWine
      }),
    [conError]
  )

  const eliminar = useCallback(
    (id: string) =>
      conError(async () => {
        const res = await fetch(`/api/wines/${encodeURIComponent(id)}`, { method: 'DELETE' })
        // 409 es el caso de CE-01: el vino tiene pedidos y no se puede borrar.
        // El codigo viaja al mensaje para que la pagina pueda explicar por que.
        if (res.status === 409) {
          const cuerpo = (await res.json()) as { details?: { count?: number } }
          const cantidad = cuerpo.details?.count ?? 0
          throw new Error(
            `No se puede eliminar: el vino aparece en ${cantidad} ${cantidad === 1 ? 'pedido' : 'pedidos'}.`
          )
        }
        if (!res.ok && res.status !== 204) {
          throw new Error(`No se pudo eliminar el vino (HTTP ${res.status})`)
        }
        return undefined
      }),
    [conError]
  )

  const duplicar = useCallback(
    (vino: AdminWine) => {
      // El `id` se descarta a proposito. Con `...vino` la copia naceria con el
      // mismo id que el original: el backend lo respeta, los dos vinos quedan
      // con id identico, y a partir de ahi todo falla en silencio. Editar uno
      // modificaba el otro, y borrar la copia borraba el original.
      const { id, ...datos } = vino
      void id
      return crear({
        ...datos,
        // El nombre lleva la marca de copia para que se distinga de una
        // entrada real y el admin pueda limpiar despues. El stock arranca en
        // cero porque una copia no trae unidades fisicas en bodega.
        name: `Copia de ${vino.name}`,
        stock: 0
      })
    },
    [crear]
  )

  const alternarEstado = useCallback(
    (vino: AdminWine) => actualizar({ ...vino, activo: !vino.activo }),
    [actualizar]
  )

  const importarCsv = useCallback(
    (texto: string) =>
      conError(async () => {
        const res = await fetch('/api/wines/import', {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: texto
        })
        if (!res.ok) throw new Error(`No se pudo importar el archivo (HTTP ${res.status})`)
        return (await res.json()) as ImportResult
      }),
    [conError]
  )

  const exportarCsv = useCallback(async (): Promise<void> => {
    // Se pide el **total filtrado**, no la pagina que se ve. Exportar solo las
    // 10 filas de la pantalla cuando el filtro dice "240" seria peor que no
    // exportar: el archivo tendria una fila y el usuario creeria que solo hay
    // una.
    const params = new URLSearchParams({ page: '1', limit: '100' })
    if (filtros.search.trim() !== '') params.set('search', filtros.search.trim())
    if (filtros.category !== '') params.set('category', filtros.category)
    if (filtros.varietal !== '') params.set('varietal', filtros.varietal)
    if (filtros.status !== '') params.set('status', filtros.status)

    const res = await fetch(`/api/wines?${params.toString()}`)
    if (!res.ok) throw new Error(`No se pudo exportar (HTTP ${res.status})`)

    const cuerpo = (await res.json()) as Paginated<AdminWine>

    // El `id` va primero y es obligatorio en la practica: sin el, reimportar un
    // archivo exportado crearia una copia nueva de cada vino en lugar de
    // actualizar el existente, y el catalogo se duplicaria en cada ida y vuelta.
    const encabezados = [
      'Id',
      'Nombre',
      'Bodega',
      'Cepa',
      'Categoria',
      'Cosecha',
      'Precio',
      'Stock',
      'Activo',
      'Descripcion'
    ]

    const filas = cuerpo.data.map((vino) => [
      vino.id,
      vino.name,
      vino.winery,
      vino.varietal,
      vino.category,
      String(vino.vintage),
      String(vino.price),
      String(vino.stock),
      vino.activo ? 'si' : 'no',
      vino.description
    ])

    descargarCsv(nombreArchivoConFecha('catalogo', new Date()), aTextoCsv(filas, encabezados))
  }, [filtros])

  return {
    vinos: data?.data ?? [],
    total: data?.total ?? 0,
    totalPaginas: data?.totalPages ?? 1,
    isLoading,
    error,
    page,
    limit,
    filtros,
    cepas,
    setPage,
    setLimit,
    setSearch,
    aplicarFiltros,
    limpiarFiltros,
    crear,
    actualizar,
    eliminar,
    duplicar,
    alternarEstado,
    importarCsv,
    exportarCsv,
    recargar: refrescar
  }
}
