import { Suspense, lazy } from 'react'
import {
  CircleDollarSign,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingUp
} from 'lucide-react'
import { MetricCard, MetricCardSkeleton } from '../../components/admin/metric_card'
import { useApi } from '../../hooks/useApi'
import { tendenciaDe } from '../../utils/metricas'
import type { Metrics } from '../../types/admin'

/**
 * Grafico de ventas de los ultimos 30 dias.
 *
 * Va en un archivo aparte y se carga con `import()` diferido por dos motivos:
 * Recharts pesa mas que el resto de la libreria de graficos y el Dashboard es
 * la unica pagina que lo usa, asi que sin division de codigo todos los que
 * llegan a cualquier pagina de la tienda lo pagan; y el `lazy` hace que la
 * pagina muestre metricas mientras el grafico descarga, en vez de esperar a que
 * cargue todo junto.
 */

const GraficoVentas = lazy(() => import('./dashboard_grafico'))

const dinero = (valor: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(valor)

const numero = (valor: number): string =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor)

const ActividadReciente = ({ metricas }: { metricas: Metrics }) => {
  if (metricas.recentActivity.length === 0) {
    return <p className='py-6 text-center text-sm text-neutral-500'>Sin actividad reciente.</p>
  }

  return (
    <ul className='divide-y divide-neutral-200'>
      {metricas.recentActivity.map((item) => (
        <li key={`${item.type}-${item.id}`} className='flex items-center gap-3 py-3'>
          <span
            className={[
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              item.type === 'order'
                ? 'bg-verde-salvia/15 text-verde-salvia'
                : 'bg-sky-500/15 text-sky-300'
            ].join(' ')}
            aria-hidden='true'
          >
            {item.type === 'order' ? <Receipt className='h-4 w-4' /> : <ShoppingCart className='h-4 w-4' />}
          </span>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm text-carbon'>{item.description}</p>
            <p className='text-xs text-neutral-500'>
              {new Date(item.timestamp).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export const Dashboard = () => {
  const { data: metricas, isLoading, error } = useApi<Metrics>('/api/metrics', { respaldo: 'metricas' })

  if (error !== undefined) {
    return (
      <div className='rounded-2xl border border-verde-800/60 bg-blanco/60 p-8 text-center'>
        <p className='font-serif text-lg text-carbon'>No se pudieron cargar las metricas</p>
        <p className='mt-1 text-sm text-neutral-600'>{error}</p>
      </div>
    )
  }

  const tendencia = metricas === undefined ? undefined : tendenciaDe(metricas.salesLast30Days)

  return (
    <div className='space-y-6'>
      {/* --- Metricas --- */}
      <section aria-label='Metricas'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {isLoading || metricas === undefined
            ? Array.from({ length: 6 }, (_, indice) => <MetricCardSkeleton key={indice} />)
            : [
                {
                  label: 'Ventas de hoy',
                  value: dinero(metricas.salesToday),
                  icon: CircleDollarSign,
                  tone: 'salvia' as const
                },
                {
                  label: 'Ventas del mes',
                  value: dinero(metricas.salesMonth),
                  icon: TrendingUp,
                  tone: 'verde' as const,
                  trend:
                    tendencia === undefined ? undefined : { value: tendencia, label: 'vs. mitad del mes' }
                },
                {
                  label: 'Ticket promedio',
                  value: dinero(metricas.avgTicket),
                  icon: Receipt,
                  tone: 'carbon' as const
                },
                {
                  label: 'Carritos abandonados',
                  value: numero(metricas.abandonedCarts),
                  icon: ShoppingCart,
                  tone: 'neutral' as const
                },
                {
                  label: 'Conversion',
                  // Siempre 0 por ahora: ver RF-13 de la spec 004-b y el punto 6
                  // de la clarificacion. La clave se mantiene para que el panel
                  // no cambie de forma cuando haya tracking de sesiones.
                  value: `${metricas.conversion.toFixed(1)}%`,
                  icon: Percent,
                  tone: 'neutral' as const
                }
              ].map((tarjeta) => (
                <MetricCard
                  key={tarjeta.label}
                  label={tarjeta.label}
                  value={tarjeta.value}
                  icon={tarjeta.icon}
                  tone={tarjeta.tone}
                  {...('trend' in tarjeta && tarjeta.trend !== undefined && { trend: tarjeta.trend })}
                />
              ))}
        </div>
      </section>

      {/* --- Grafico y actividad --- */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <section className='rounded-2xl border border-neutral-200 bg-blanco/60 p-5 lg:col-span-2'>
          <h2 className='font-serif text-lg font-bold text-carbon'>Ventas de los ultimos 30 dias</h2>
          <div className='mt-4 h-72'>
            {isLoading || metricas === undefined ? (
              <div className='flex h-full items-end gap-1'>
                {Array.from({ length: 30 }, (_, indice) => (
                  <div
                    key={indice}
                    className='flex-1 animate-pulse rounded-t bg-neutral-200'
                    style={{ height: `${20 + ((indice * 37) % 70)}%` }}
                  />
                ))}
              </div>
            ) : metricas.salesLast30Days.every((dia) => dia.revenue === 0) ? (
              <p className='flex h-full items-center justify-center text-sm text-neutral-500'>
                Sin ventas en el periodo.
              </p>
            ) : (
              <Suspense
                fallback={
                  <div className='h-full w-full animate-pulse rounded-xl bg-blanco' />
                }
              >
                <GraficoVentas datos={metricas.salesLast30Days} />
              </Suspense>
            )}
          </div>
        </section>

        <section className='rounded-2xl border border-neutral-200 bg-blanco/60 p-5'>
          <h2 className='font-serif text-lg font-bold text-carbon'>Actividad reciente</h2>
          <div className='mt-2'>
            {isLoading || metricas === undefined ? (
              <div className='space-y-4 py-2'>
                {Array.from({ length: 5 }, (_, indice) => (
                  <div key={indice} className='flex items-center gap-3'>
                    <div className='h-8 w-8 animate-pulse rounded-full bg-neutral-200' />
                    <div className='flex-1 space-y-2'>
                      <div className='h-3 w-3/4 animate-pulse rounded bg-neutral-200' />
                      <div className='h-2.5 w-1/3 animate-pulse rounded bg-neutral-200' />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActividadReciente metricas={metricas} />
            )}
          </div>
        </section>
      </div>

      {/* --- Top productos --- */}
      <section className='rounded-2xl border border-neutral-200 bg-blanco/60 p-5'>
        <h2 className='font-serif text-lg font-bold text-carbon'>Productos mas vendidos</h2>

        {isLoading || metricas === undefined ? (
          <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5'>
            {Array.from({ length: 5 }, (_, indice) => (
              <div key={indice} className='h-28 animate-pulse rounded-xl bg-neutral-200' />
            ))}
          </div>
        ) : metricas.topProducts.length === 0 ? (
          <p className='py-6 text-center text-sm text-neutral-500'>Todavia no hay ventas.</p>
        ) : (
          <ul className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5'>
            {metricas.topProducts.map((producto, indice) => (
              <li
                key={producto.productoId}
                className='flex items-center gap-3 rounded-xl border border-neutral-200 bg-blanco/40 p-3'
              >
                <span
                  className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-verde-600 text-xs font-bold text-blanco'
                  aria-hidden='true'
                >
                  {indice + 1}
                </span>
                <img
                  src={producto.imageUrl}
                  alt=''
                  className='h-12 w-12 shrink-0 rounded-lg object-cover'
                />
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-semibold text-carbon'>
                    {producto.name}
                  </p>
                  <p className='text-xs text-neutral-500'>
                    {producto.units} {producto.units === 1 ? 'unidad' : 'unidades'}
                  </p>
                  <p className='text-sm font-bold text-verde-salvia'>{dinero(producto.revenue)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

