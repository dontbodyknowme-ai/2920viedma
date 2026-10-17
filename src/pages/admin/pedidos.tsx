import { useState } from 'react'
import { Eye, Filter, X } from 'lucide-react'
import { DataTable, columnaConFiltro, columnaHelper } from '../../components/admin/data_table'
import { StatusBadge } from '../../components/admin/status_badge'
import { OrderDrawer } from '../../components/admin/order_drawer'
import { DateRangePicker } from '../../components/admin/date_range_picker'
import { ESTADOS_PEDIDO, usePedidos } from '../../hooks/usePedidos'
import type { Order, OrderStatus } from '../../types/admin'

/**
 * Gestion de pedidos: la segunda de las tres tablas del panel.
 *
 * El filtro de estados es multi-select y se comporta como un OR: marcar
 * "pendiente" y "enviado" muestra los dos. El filtro de fechas, en cambio, es un
 * rango cerrado y se aplica con el boton "Aplicar" del calendario, no en cada
 * click: cada dia que el usuario toca recargaria la tabla y la haria parpadear
 * debajo del calendario que esta usando.
 */

const dinero = (valor: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(valor)

const soloFecha = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })

const columnas = [
  columnaHelper<Order>().accessor('id', {
    header: 'Pedido',
    cell: (info) => <span className='font-mono text-xs text-carbon'>{info.getValue()}</span>
  }),
  columnaHelper<Order>().accessor('customerName', {
    header: 'Cliente',
    cell: (info) => (
      <div className='min-w-0'>
        <span className='block truncate font-semibold text-carbon'>
          {info.row.original.customerName}
        </span>
        <span className='block truncate text-xs text-neutral-500'>
          {info.row.original.customerEmail}
        </span>
      </div>
    )
  }),
  columnaHelper<Order>().accessor('createdAt', {
    header: 'Fecha',
    cell: (info) => <span className='whitespace-nowrap'>{soloFecha(info.getValue())}</span>
  }),
  columnaHelper<Order>().accessor('total', {
    header: 'Total',
    cell: (info) => (
      <span className='whitespace-nowrap font-semibold text-carbon'>
        {dinero(info.getValue())}
      </span>
    )
  }),
  columnaConFiltro(
    columnaHelper<Order>().accessor('status', {
      header: 'Estado',
      cell: (info) => <StatusBadge estado={info.getValue()} size='sm' />
    }),
    ESTADOS_PEDIDO.map((estado) => ({ valor: estado.valor, etiqueta: estado.etiqueta }))
  )
]

export const PedidosAdmin = () => {
  const pedidos = usePedidos()

  const [pedidoAbierto, setPedidoAbierto] = useState<Order | null>(null)
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [panelEstados, setPanelEstados] = useState(false)

  const alternarEstadoEnFiltro = (estado: OrderStatus): void => {
    const yaEsta = pedidos.filtros.estados.includes(estado)
    pedidos.aplicarFiltros({
      estados: yaEsta
        ? pedidos.filtros.estados.filter((otro) => otro !== estado)
        : [...pedidos.filtros.estados, estado]
    })
  }

  const hayFiltros =
    pedidos.filtros.search !== '' ||
    pedidos.filtros.estados.length > 0 ||
    pedidos.filtros.dateFrom !== '' ||
    pedidos.filtros.dateTo !== ''

  const limpiarTodo = (): void => {
    pedidos.aplicarFiltros({
      search: '',
      estados: [],
      dateFrom: '',
      dateTo: ''
    })
    setPanelEstados(false)
  }

  const cambiarEstado = async (pedido: Order, estado: OrderStatus): Promise<Order> => {
    try {
      const actualizado = await pedidos.alternarEstado(pedido, estado)
      // El drawer se actualiza con la respuesta del PATCH, que ya trae el estado
      // nuevo y el timeline con el evento agregado. Sin esto seguia mostrando
      // el `Order` viejo: el `select` volvia a "pendiente" y el historial no
      // mostraba el evento nuevo, al lado de un aviso que decia "enviado".
      setPedidoAbierto(actualizado)
      setAviso(`${pedido.id} ahora esta "${estado}".`)
      setError('')
      return actualizado
    } catch (fallo) {
      const mensaje = fallo instanceof Error ? fallo.message : 'No se pudo actualizar'
      setError(mensaje)
      throw fallo instanceof Error ? fallo : new Error(mensaje)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='font-serif text-lg font-bold text-carbon'>Pedidos</h2>
          <p className='text-sm text-neutral-500'>
            {pedidos.total} {pedidos.total === 1 ? 'pedido' : 'pedidos'}
            {hayFiltros ? ' con los filtros aplicados' : ' en total'}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {/* --- Filtro de estados, multi-select --- */}
          <div className='relative'>
            <button
              type='button'
              onClick={() => setPanelEstados((previo) => !previo)}
              aria-expanded={panelEstados}
              aria-label='Filtrar por estado'
              className={[
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors',
                pedidos.filtros.estados.length > 0
                  ? 'border-verde-salvia bg-verde-salvia/10 text-blanco'
                  : 'border-neutral-300 bg-blanco text-neutral-700 hover:border-verde-salvia'
              ].join(' ')}
            >
              <Filter className='h-4 w-4 shrink-0' aria-hidden='true' />
              Estado
              {pedidos.filtros.estados.length > 0 && (
                <span className='rounded-full bg-verde-salvia px-1.5 text-[10px] font-bold text-blanco'>
                  {pedidos.filtros.estados.length}
                </span>
              )}
            </button>

            {panelEstados && (
              <>
                <div
                  aria-hidden='true'
                  onClick={() => setPanelEstados(false)}
                  className='fixed inset-0 z-30'
                />
                <div className='absolute right-0 z-40 mt-2 w-52 rounded-2xl border border-neutral-300 bg-blanco p-2 shadow-2xl'>
                  {ESTADOS_PEDIDO.map((estado) => {
                    const marcado = pedidos.filtros.estados.includes(estado.valor)
                    return (
                      <label
                        key={estado.valor}
                        className='flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-carbon transition-colors hover:bg-blanco'
                      >
                        <input
                          type='checkbox'
                          checked={marcado}
                          onChange={() => alternarEstadoEnFiltro(estado.valor)}
                          className='h-4 w-4 accent-verde-salvia'
                        />
                        <span className='flex-1'>{estado.etiqueta}</span>
                        <StatusBadge estado={estado.valor} size='sm' />
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <DateRangePicker
            desde={pedidos.filtros.dateFrom}
            hasta={pedidos.filtros.dateTo}
            onChange={(rango) => {
              pedidos.aplicarFiltros(rango)
              setAviso(
                rango.dateFrom === ''
                  ? 'Filtro de fechas limpiado.'
                  : `Mostrando del ${rango.dateFrom} al ${rango.dateTo}.`
              )
            }}
          />

          {hayFiltros && (
            <button
              type='button'
              onClick={limpiarTodo}
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

      {error !== '' && (
        <p
          role='alert'
          className='rounded-xl border border-verde-500/50 bg-verde-800/40 px-4 py-2.5 text-sm'
        >
          {error}
        </p>
      )}

      {pedidos.error !== undefined && (
        <p
          role='alert'
          className='rounded-xl border border-verde-500/50 bg-verde-800/40 px-4 py-2.5 text-sm'
        >
          {pedidos.error}
        </p>
      )}

      <DataTable<Order>
        columns={columnas}
        data={pedidos.pedidos}
        total={pedidos.total}
        page={pedidos.page}
        limit={pedidos.limit}
        onPageChange={pedidos.setPage}
        onLimitChange={pedidos.setLimit}
        onSortChange={(orden) => {
          pedidos.aplicarFiltros({
            sortColumn: orden?.columna ?? '',
            sortDirection: orden?.direccion ?? 'desc'
          })
        }}
        onFilterChange={(filtros) => {
          pedidos.aplicarFiltros({
            estados:
              filtros.status === undefined || filtros.status === ''
                ? []
                : (filtros.status.split(',') as OrderStatus[])
          })
        }}
        searchValue={pedidos.filtros.search}
        onSearchChange={pedidos.setSearch}
        onExport={() => {
          void pedidos.exportarCsv()
        }}
        isLoading={pedidos.isLoading}
        getRowId={(pedido) => pedido.id}
        emptySingular='pedido'
        emptyPlural='pedidos'
        rowActions={(pedido) => (
          <div className='flex justify-end'>
            <button
              type='button'
              onClick={() => setPedidoAbierto(pedido)}
              aria-label={`Ver pedido ${pedido.id}`}
              title='Ver detalle'
              className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-verde-600'
            >
              <Eye className='h-4 w-4' aria-hidden='true' />
            </button>
          </div>
        )}
      />

      <OrderDrawer
        isOpen={pedidoAbierto !== null}
        pedido={pedidoAbierto}
        onClose={() => setPedidoAbierto(null)}
        onCambiarEstado={cambiarEstado}
        // RF-28: la etiqueta es mock a proposito. No se genera ningun PDF ni se
        // llama a un servicio de envios; el panel solo confirma la accion. El
        // toast dice "(mock)" justamente para que no parezca que se genero algo.
        onGenerarEtiqueta={(pedido) => setAviso(`Etiqueta generada (mock) para ${pedido.id}.`)}
      />
    </div>
  )
}