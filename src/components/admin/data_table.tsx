import { useState, type ReactNode } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

/**
 * `meta.filtro` es donde la tabla lee las opciones del desplegable de una
 * columna. TanStack no tipa `ColumnMeta`, asi que sin esto `meta.filtro` seria
 * un error de TypeScript y habria que castear en cada lectura.
 */
declare module '@tanstack/react-table' {
  // Los dos parametros de tipo parecen no usarse, y ESLint lo reporta. Se usan:
// esta es una **augmentation de modulo**, y TypeScript exige que los type
// parameters coincidan con los de la interface original de TanStack
// (`types.d.ts`: `ColumnMeta<TData extends RowData, TValue>`). Si se sacaran,
// el error seria TS2428 y no compilaria.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ColumnMeta<TData extends RowData, TValue> {
    filtro?: { opciones: readonly { valor: string; etiqueta: string }[] }
  }
}

/**
 * Tabla de datos del panel (D-07).
 *
 * **La tabla no pagina: la pagina la API.** El endpoint ya devuelve
 * `{ data, total, page, limit, totalPages }`, asi que esta tabla no puede
 * filtrar ni paginar sobre el arreglo completo: solo tiene las filas de la
 * pagina actual y el total. Por eso TanStack corre en modo manual
 * (`manualPagination`, `manualSorting`, `manualFiltering`) y toda la
 * intencion se reporta hacia arriba con `onPageChange`, `onSortChange` y
 * `onFilterChange`.
 *
 * Filtrar en el cliente sobre una pagina de 10 filas de 240 seria mostrar los
 * resultados equivocados: el usuario busca "Malbec", la pagina actual no tiene
 * ninguno, y la tabla diria "sin resultados" teniendo 24 en la base.
 *
 * Es generica porque la comparten las tres tablas del panel (catalogo, pedidos,
 * clientes) y las tres necesitan exactamente lo mismo: buscador, filtros de
 * columna, orden, paginacion, exportar, estado vacio y esqueleto de carga.
 */

const TAMANOS_PAGINA = [10, 25, 50] as const

/** Filtro de columna: por defecto no hay ninguno. */
export type FiltrosColumna = Record<string, string>

export interface SortSpec {
  columna: string
  direccion: 'asc' | 'desc'
}

interface DataTableProps<TData extends RowData> {
  /** columns de TanStack. Se construyen con `columnHelper` del modulo. */
  columns: ColumnDef<TData, unknown>[]
  /** Filas de la pagina actual. */
  data: TData[]
  /** Total de filas que hay del otro lado de la API, no de esta pagina. */
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onSortChange: (sort: SortSpec | null) => void
  onFilterChange: (filtros: FiltrosColumna) => void
  searchValue: string
  onSearchChange: (value: string) => void
  /**
   * Exporta a CSV. Es un callback y no un nombre de archivo para que la pagina
   * decida que.exportar: puede ser lo que hay en pantalla o el total filtrado,
   * y son dos consultas distintas al servidor.
   */
  onExport?: () => void
  isLoading?: boolean
  /** Acciones de la fila. */
  rowActions?: (row: TData) => ReactNode
  /** Identificador estable. Sin esto TanStack usa el indice y el orden cambia el estado. */
  getRowId: (row: TData) => string
  /** Texto singular y plural del estado vacio. */
  emptySingular?: string
  emptyPlural?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onSortChange,
  onFilterChange,
  searchValue,
  onSearchChange,
  onExport,
  isLoading = false,
  rowActions,
  getRowId,
  emptySingular = 'registro',
  emptyPlural = 'registros'
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [filtros, setFiltros] = useState<FiltrosColumna>({})

  const totalPaginas = Math.max(1, Math.ceil(total / limit))
  const desde = total === 0 ? 0 : (page - 1) * limit + 1
  const hasta = Math.min(page * limit, total)

  // El parametro explicito `<TData>` hace que TS no infiera el genérico desde el
  // `getRowId` y termine Blanchendo `TData = Row<TData>`, que no compila.
  const tabla = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Ademas se aceptan las dos formas del argumento: segun el camino interno,
// TanStack pasa la fila envuelta en un `Row` o el dato crudo. Usar solo
// `fila.original` deja `undefined` en el camino que pasa el dato crudo.
    getRowId: (fila) => {
      const envuelta = fila as { original?: TData }
      return getRowId(envuelta.original ?? (fila as unknown as TData))
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: totalPaginas,
    state: { pagination: { pageIndex: page - 1, pageSize: limit }, sorting },
    onSortingChange: (actual) => {
      const siguiente = typeof actual === 'function' ? actual(sorting) : actual
      setSorting(siguiente)
      const primero = siguiente[0]
      onSortChange(
        primero === undefined
          ? null
          : {
              columna: primero.id,
              direccion: primero.desc === true ? 'desc' : 'asc'
            }
      )
    }
  })

  const alternarOrden = (columnaId: string): void => {
    const actual = tabla.getColumn(columnaId)
    actual?.toggleSorting()
  }

  const iconoOrden = (columnaId: string): ReactNode => {
    const columna = tabla.getColumn(columnaId)
    const orden = columna?.getIsSorted()
    if (orden === 'asc') return <ArrowUp className='h-3.5 w-3.5 text-gold-400' aria-hidden='true' />
    if (orden === 'desc') return <ArrowDown className='h-3.5 w-3.5 text-gold-400' aria-hidden='true' />
    return <ArrowUpDown className='h-3.5 w-3.5 text-neutral-600' aria-hidden='true' />
  }

  const cambiarFiltro = (columnaId: string, valor: string): void => {
    const siguiente = { ...filtros }
    if (valor === '') delete siguiente[columnaId]
    else siguiente[columnaId] = valor
    setFiltros(siguiente)
    onFilterChange(siguiente)
  }

  const limpiarTodo = (): void => {
    setFiltros({})
    setSorting([])
    onFilterChange({})
    onSortChange(null)
    onSearchChange('')
    onPageChange(1)
  }

  const hayFiltros = searchValue !== '' || Object.keys(filtros).length > 0 || sorting.length > 0

  // Los filtros se leen de las columnas YA RESUELTAS por TanStack, no del
  // `ColumnDef` crudo. `ColumnDef.id` es opcional y solo existe si se declaro a
  // mano: con `accessor('categoria')` es `undefined`, y el filtro terminaba
  // guardandose bajo la clave del indice ("2") en vez del nombre de la columna.
  const columnasFiltrables = tabla
    .getAllLeafColumns()
    .map((columna) => ({
      clave: columna.id,
      titulo:
        typeof columna.columnDef.header === 'string' ? columna.columnDef.header : columna.id,
      opciones: columna.columnDef.meta?.filtro?.opciones
    }))
    .filter(
      (columna): columna is { clave: string; titulo: string; opciones: readonly { valor: string; etiqueta: string }[] } =>
        columna.opciones !== undefined
    )

  return (
    <div className='rounded-2xl border border-neutral-800 bg-charcoal-900/60'>
      {/* --- Barra de herramientas --- */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 p-4'>
        <div className='relative min-w-56 flex-1'>
          <Search
            className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500'
            aria-hidden='true'
          />
          <input
            type='search'
            value={searchValue}
            onChange={(evento) => onSearchChange(evento.target.value)}
            placeholder='Buscar...'
            aria-label='Buscar'
            className='w-full rounded-xl border border-neutral-700 bg-charcoal-800 py-2 pl-9 pr-3 text-sm text-cream-100 placeholder-neutral-500 focus:border-gold-500 focus:outline-none'
          />
        </div>

        <div className='flex items-center gap-2'>
          {onExport !== undefined && (
            <button
              type='button'
              onClick={onExport}
              disabled={isLoading || total === 0}
              className='rounded-xl border border-neutral-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-gold-500 hover:text-cream-100 disabled:opacity-50'
            >
              Exportar CSV
            </button>
          )}

          <label className='flex items-center gap-2 text-xs text-neutral-400'>
            <span className='sr-only sm:not-sr-only'>Por pagina</span>
            <select
              value={limit}
              onChange={(evento) => {
                onLimitChange(Number(evento.target.value))
                onPageChange(1)
              }}
              aria-label='Filas por pagina'
              className='rounded-xl border border-neutral-700 bg-charcoal-800 px-2 py-2 text-sm text-cream-100 focus:border-gold-500 focus:outline-none'
            >
              {TAMANOS_PAGINA.map((tamano) => (
                <option key={tamano} value={tamano}>
                  {tamano}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* --- Filtros de columna, solo si alguna columna los declara --- */}
      {columnasFiltrables.length > 0 && (
        <div className='flex flex-wrap items-end gap-3 border-b border-neutral-800 p-4'>
          {columnasFiltrables.map(({ clave, titulo, opciones }) => (
            <label key={clave} className='flex flex-col gap-1'>
              <span className='text-[10px] uppercase tracking-widest text-neutral-500'>
                {titulo}
              </span>
              <select
                value={filtros[clave] ?? ''}
                onChange={(evento) => cambiarFiltro(clave, evento.target.value)}
                className='rounded-lg border border-neutral-700 bg-charcoal-800 px-2 py-1.5 text-sm text-cream-100 focus:border-gold-500 focus:outline-none'
              >
                <option value=''>Todos</option>
                {opciones.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {hayFiltros && (
            <button
              type='button'
              onClick={limpiarTodo}
              className='flex items-center gap-1 rounded-lg border border-neutral-700 px-2 py-1.5 text-xs text-neutral-400 transition-colors hover:border-gold-500 hover:text-cream-100'
            >
              <X className='h-3.5 w-3.5' aria-hidden='true' />
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* --- Tabla --- */}
      <div className='overflow-x-auto'>
        <table role='grid' className='w-full border-collapse text-left text-sm'>
          <thead>
            {tabla.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id} className='border-b border-neutral-800'>
                {grupo.headers.map((encabezado) => {
                  const ordenable = encabezado.column.getCanSort()
                  return (
                    <th
                      key={encabezado.id}
                      scope='col'
                      aria-sort={
                        encabezado.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : encabezado.column.getIsSorted() === 'desc'
                            ? 'descending'
                            : 'none'
                      }
                      className='px-4 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400'
                    >
                      {encabezado.isPlaceholder ? null : ordenable ? (
                        <button
                          type='button'
                          onClick={() => alternarOrden(encabezado.column.id)}
                          className='flex items-center gap-1.5 transition-colors hover:text-cream-100'
                        >
                          {flexRender(encabezado.column.columnDef.header, encabezado.getContext())}
                          {iconoOrden(encabezado.column.id)}
                        </button>
                      ) : (
                        flexRender(encabezado.column.columnDef.header, encabezado.getContext())
                      )}
                    </th>
                  )
                })}
                {rowActions !== undefined && (
                  <th scope='col' className='px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-neutral-400'>
                    Acciones
                  </th>
                )}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading
              ? Array.from({ length: Math.min(limit, 8) }, (_, indice) => (
                  <tr key={`esqueleto-${indice}`} className='border-b border-neutral-800/60'>
                    {columns.map((columna) => (
                      <td key={columna.id} className='px-4 py-3'>
                        <div className='h-4 w-full animate-pulse rounded bg-charcoal-700' />
                      </td>
                    ))}
                    {rowActions !== undefined && (
                      <td className='px-4 py-3'>
                        <div className='ml-auto h-4 w-16 animate-pulse rounded bg-charcoal-700' />
                      </td>
                    )}
                  </tr>
                ))
              : tabla.getRowModel().rows.map((fila) => (
                  <tr
                    key={fila.id}
                    className='border-b border-neutral-800/60 transition-colors hover:bg-charcoal-800/40'
                  >
                    {fila.getVisibleCells().map((celda) => (
                      <td key={celda.id} className='px-4 py-3 text-neutral-200'>
                        {flexRender(celda.column.columnDef.cell, celda.getContext())}
                      </td>
                    ))}
                    {rowActions !== undefined && (
                      <td className='px-4 py-3 text-right'>{rowActions(fila.original)}</td>
                    )}
                  </tr>
                ))}

            {/* Estado vacio. Es un `tr` y no un `div` para no romper la
                estructura de la tabla. */}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length + (rowActions !== undefined ? 1 : 0)} className='px-4 py-16 text-center'>
                  <p className='font-serif text-lg text-neutral-300'>
                    {total === 0 && !hayFiltros ? `No hay ${emptyPlural}` : 'Sin resultados'}
                  </p>
                  <p className='mt-1 text-sm text-neutral-500'>
                    {hayFiltros ? 'Proba con otros filtros.' : `Todavia no se cargo ningun ${emptySingular}.`}
                  </p>
                  {hayFiltros && (
                    <button
                      type='button'
                      onClick={limpiarTodo}
                      className='mt-4 rounded-xl border border-neutral-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-gold-500 hover:text-cream-100'
                    >
                      Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Paginacion --- */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 p-4'>
        <p className='text-xs text-neutral-400'>
          {total === 0 ? 'Sin filas' : `Mostrando ${desde}-${hasta} de ${total} ${total === 1 ? emptySingular : emptyPlural}`}
        </p>

        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => onPageChange(1)}
            disabled={page <= 1 || isLoading}
            aria-label='Primera pagina'
            className='rounded-lg border border-neutral-700 px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:border-gold-500 disabled:opacity-30'
          >
            Primera
          </button>
          <button
            type='button'
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            aria-label='Pagina anterior'
            className='rounded-lg border border-neutral-700 px-2 py-1.5 text-neutral-300 transition-colors hover:border-gold-500 disabled:opacity-30'
          >
            <ChevronLeft className='h-4 w-4' aria-hidden='true' />
          </button>
          <span className='px-2 text-xs text-neutral-400'>
            {page} / {totalPaginas}
          </span>
          <button
            type='button'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPaginas || isLoading}
            aria-label='Pagina siguiente'
            className='rounded-lg border border-neutral-700 px-2 py-1.5 text-neutral-300 transition-colors hover:border-gold-500 disabled:opacity-30'
          >
            <ChevronRight className='h-4 w-4' aria-hidden='true' />
          </button>
          <button
            type='button'
            onClick={() => onPageChange(totalPaginas)}
            disabled={page >= totalPaginas || isLoading}
            aria-label='Ultima pagina'
            className='rounded-lg border border-neutral-700 px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:border-gold-500 disabled:opacity-30'
          >
            Ultima
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Helper de columns con el filtro declarado en `meta`, que es donde la tabla lo
 * lee para dibujar el desplegable.
 *
 * Se exporta para que las tres paginas construyan sus columns sin importar
 * `ColumnDef` a mano y sin acordarse de la forma de `meta.filtro`.
 */
export const columnaConFiltro = <T,>(
  columna: ColumnDef<T, unknown>,
  opciones: readonly { valor: string; etiqueta: string }[]
): ColumnDef<T, unknown> => ({ ...columna, meta: { ...columna.meta, filtro: { opciones } } })

/** Reexport para que las paginas no importen de `@tanstack/react-table`. */
export { createColumnHelper as columnaHelper }
