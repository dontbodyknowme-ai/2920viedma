import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, Filter, X } from 'lucide-react'
import { DataTable, columnaHelper } from '../../components/admin/data_table'
import { ChipTag, CustomerDrawer } from '../../components/admin/customer_drawer'
import { useClientes } from '../../hooks/useClientes'
import type { Customer } from '../../types/admin'

/**
 * Clientes CRM: la tercera y ultima de las tablas del panel.
 *
 * A diferencia de catalogo y pedidos, aca no hay columnas con filtro de columna:
 * el unico filtro estructurado es el de tags, que va en la toolbar porque es
 * multi-select y con AND.
 *
 * **Las tags sugeridas salen de `mockCustomers`, no de la pagina visible.** Con
 * 10 filas por pagina, offering solo las tags de esas 10 dejaria fuera las del
 * resto de la base: el admin no podria filtrar por una tag que existe.
 */

const dinero = (valor: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(valor)

const fecha = (iso: string | null): string =>
  iso === null
    ? 'Nunca'
    : new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })

const columnas = [
  columnaHelper<Customer>().accessor('name', {
    header: 'Nombre',
    cell: (info) => (
      <div className='min-w-0'>
        <span className='block truncate font-semibold text-carbon'>{info.getValue()}</span>
        {/* CE-04: un cliente sin email se muestra con un aviso en la fila, no
            con la celda vacia, porque "sin email" y "todavia no cargado" se
            verian igual. */}
        {info.row.original.email === '' && (
          <span className='block truncate text-xs text-verde-salvia'>Sin email</span>
        )}
      </div>
    )
  }),
  columnaHelper<Customer>().accessor('email', {
    header: 'Email',
    cell: (info) => (
      <span className='block max-w-[14rem] truncate text-neutral-700'>
        {info.getValue() === '' ? '—' : info.getValue()}
      </span>
    )
  }),
  columnaHelper<Customer>().accessor('phone', {
    header: 'Telefono',
    cell: (info) => (
      <span className='whitespace-nowrap text-neutral-700'>
        {info.getValue() === '' ? '—' : info.getValue()}
      </span>
    )
  }),
  columnaHelper<Customer>().accessor('totalOrders', {
    header: 'Pedidos',
    cell: (info) => (
      <span className='font-mono font-semibold text-carbon'>{info.getValue()}</span>
    )
  }),
  columnaHelper<Customer>().accessor('totalSpent', {
    header: 'Total gastado',
    cell: (info) => (
      <span className='whitespace-nowrap font-semibold text-carbon'>
        {dinero(info.getValue())}
      </span>
    )
  }),
  columnaHelper<Customer>().accessor('lastOrderAt', {
    header: 'Ultimo pedido',
    cell: (info) => (
      <span className='whitespace-nowrap text-neutral-700'>{fecha(info.getValue())}</span>
    )
  }),
  columnaHelper<Customer>().accessor('tags', {
    header: 'Tags',
    cell: (info) =>
      info.getValue().length === 0 ? (
        <span className='text-xs text-neutral-600'>—</span>
      ) : (
        <div className='flex flex-wrap gap-1'>
          {info.getValue().map((tag) => (
            <ChipTag key={tag} tag={tag} />
          ))}
        </div>
      )
  })
]

export const ClientesAdmin = () => {
  const clientes = useClientes()
  const [params] = useSearchParams()
  const [panelTags, setPanelTags] = useState(false)
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  /**
   * El orden se aplica **en memoria**, y a proposito.
   *
   * Catalogo y pedidos ordenan en el servidor porque son cientos de filas y en
   * memoria solo habria una pagina. Clientes son 15 en total: ordenar el
   * servidor seria una peticion extra para colocar 15 elementos que ya estan en
   * memoria. Si el numero de clientes creciera, esto pasa al servidor igual que
   * las otras dos tablas.
   */
  const [orden, setOrden] = useState<{ columna: string; direccion: 'asc' | 'desc' } | null>(null)

  const clientesOrdenados = useMemo(() => {
    if (orden === null) return clientes.clientes

    const factor = orden.direccion === 'asc' ? 1 : -1
    return [...clientes.clientes].sort((a, b) => {
      const va = a[orden.columna as keyof Customer]
      const vb = b[orden.columna as keyof Customer]

      // `null` ("nunca compro") va al final en cualquier direccion: no es
      // "el mas viejo" ni "el mas nuevo", es ausencia.
      if (va === null) return 1
      if (vb === null) return -1

      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb), 'es') * factor
    })
  }, [clientes.clientes, orden])

  // Las unicas tags de la base, ordenadas. Se calculan desde los datos de la API.
  const tagsSugeridas = useMemo(
    () => [...new Set(clientes.clientes.flatMap((cliente) => cliente.tags))].sort(),
    [clientes.clientes]
  )

  const hayFiltros = clientes.filtros.search !== '' || clientes.filtros.tags.length > 0

  // La URL puede traer `?id=`, para que el drawer se pueda abrir desde otra
  // pagina (el link de un pedido en la 004-b). Sin ese parametro, el drawer
  // arranca cerrado.
  const idDeUrl = params.get('id')

  const abrirPorId = (id: string): void => {
    if (id === '') return
    void clientes
      .abrirCliente(id)
      .then(() => setError(''))
      .catch((fallo: Error) => setError(fallo.message))
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='font-serif text-lg font-bold text-carbon'>Clientes</h2>
          <p className='text-sm text-neutral-500'>
            {clientes.total} {clientes.total === 1 ? 'cliente' : 'clientes'}
            {hayFiltros ? ' con los filtros aplicados' : ' en total'}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {/* --- Filtro de tags, multi-select con AND --- */}
          <div className='relative'>
            <button
              type='button'
              onClick={() => setPanelTags((previo) => !previo)}
              aria-expanded={panelTags}
              aria-label='Filtrar por tag'
              className={[
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors',
                clientes.filtros.tags.length > 0
                  ? 'border-verde-salvia bg-verde-salvia/10 text-carbon'
                  : 'border-neutral-300 bg-blanco text-neutral-700 hover:border-verde-salvia'
              ].join(' ')}
            >
              <Filter className='h-4 w-4 shrink-0' aria-hidden='true' />
              Tags
              {clientes.filtros.tags.length > 0 && (
                <span className='rounded-full bg-verde-salvia px-1.5 text-[10px] font-bold text-carbon'>
                  {clientes.filtros.tags.length}
                </span>
              )}
            </button>

            {panelTags && (
              <>
                <div
                  aria-hidden='true'
                  onClick={() => setPanelTags(false)}
                  className='fixed inset-0 z-30'
                />
                <div className='absolute right-0 z-40 mt-2 max-h-72 w-52 overflow-y-auto rounded-2xl border border-neutral-300 bg-blanco p-2 shadow-2xl'>
                  {tagsSugeridas.length === 0 ? (
                    <p className='px-2 py-3 text-xs text-neutral-500'>No hay tags.</p>
                  ) : (
                    tagsSugeridas.map((tag) => {
                      const marcado = clientes.filtros.tags.includes(tag)
                      return (
                        <label
                          key={tag}
                          className='flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-carbon transition-colors hover:bg-blanco'
                        >
                          <input
                            type='checkbox'
                            checked={marcado}
                            onChange={() => clientes.alternarTag(tag)}
                            className='h-4 w-4 accent-verde-salvia'
                          />
                          <span className='flex-1'>{tag}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {hayFiltros && (
            <button
              type='button'
              onClick={() => {
                clientes.limpiarFiltros()
                setPanelTags(false)
              }}
              aria-label='Limpiar filtros'
              className='flex items-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-700 transition-colors hover:border-verde-500 hover:text-carbon'
            >
              <X className='h-4 w-4' aria-hidden='true' />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {aviso !== '' && (
        <p
          role='status'
          className='rounded-xl border border-verde-salvia/40 bg-verde-salvia/10 px-4 py-2.5 text-sm'
        >
          {aviso}
        </p>
      )}

      {(error !== '' || clientes.error !== undefined) && (
        <p
          role='alert'
          className='rounded-xl border border-verde-500/50 bg-verde-800/40 px-4 py-2.5 text-sm'
        >
          {error !== '' ? error : clientes.error}
        </p>
      )}

      <DataTable<Customer>
        columns={columnas}
        data={clientesOrdenados}
        total={clientes.total}
        page={clientes.page}
        limit={clientes.limit}
        onPageChange={clientes.setPage}
        onLimitChange={clientes.setLimit}
        onSortChange={(spec) => {
          setOrden(
            spec === null
              ? null
              : { columna: spec.columna, direccion: spec.direccion }
          )
        }}
        onFilterChange={() => undefined}
        searchValue={clientes.filtros.search}
        onSearchChange={clientes.setSearch}
        onExport={() => {
          void clientes
            .exportarCsv()
            .then(() => setAviso('Clientes exportados.'))
            .catch((fallo: Error) => setError(fallo.message))
        }}
        isLoading={clientes.isLoading}
        getRowId={(cliente) => cliente.id}
        emptySingular='cliente'
        emptyPlural='clientes'
        rowActions={(cliente) => (
          <div className='flex justify-end'>
            <button
              type='button'
              onClick={() => abrirPorId(cliente.id)}
              aria-label={`Ver cliente ${cliente.name}`}
              title='Ver detalle'
              className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-verde-600'
            >
              <Eye className='h-4 w-4' aria-hidden='true' />
            </button>
          </div>
        )}
      />

      <CustomerDrawer
        isOpen={clientes.clienteAbierto !== null}
        cliente={clientes.clienteAbierto}
        pedidos={clientes.pedidosDelCliente}
        tagsSugeridas={tagsSugeridas}
        isLoading={clientes.cargandoCliente}
        onClose={clientes.cerrarCliente}
        onAgregarNota={clientes.agregarNota}
        onToggleTag={clientes.toggleTag}
      />

      {/* Se dispara una sola vez por montaje si la URL trae `?id=`. */}
      {idDeUrl !== null && clientes.clienteAbierto === null && !clientes.cargandoCliente && (
        <AbrirDesdeUrl id={idDeUrl} alAbrir={abrirPorId} />
      )}
    </div>
  )
}

/**
 * Abre el drawer una vez cuando la URL trae `?id=`.
 *
 * Vive en un componente aparte porque necesita un `useEffect`: hacerlo en el
 * cuerpo de la pagina llamaria a `abrirCliente` en cada render, y cada llamada
 * hace un fetch. El guard de `clienteAbierto === null` en la pagina evita el
 * bucle, pero el componente queda mas claro y no depende de ese guard.
 */
const AbrirDesdeUrl = ({ id, alAbrir }: { id: string; alAbrir: (id: string) => void }) => {
  useEffect(() => {
    alAbrir(id)
    // Solo al montar: despues el drawer ya esta abierto y el guard de la pagina
    // impide que vuelva a disparar.
  }, [])

  return null
}