import { Check, Circle, X } from 'lucide-react'
import type { OrderStatus, OrderTimelineEntry } from '../../types/admin'
import { StatusBadge } from './status_badge'

/**
 * Timeline de estados de un pedido (RF-26).
 *
 * Se dibuja sobre `OrderTimelineEntry[]`, que es lo que devuelve
 * `GET /api/orders/:id`. No recalcula los estados: si el registro de un pedido
 * dice tres eventos, el timeline muestra tres. Recalcularlo desde el estado
 * actual seria mentir cuando hubo un salto: CE-06 de la spec 004-b permite
 * pasar de `pendiente` a `entregado` sin pasar por `enviado`, y ese salto tiene
 * que quedar visible.
 */

const formatoFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

/** El ultimo evento es el estado actual. */
const esUltimo = (indice: number, total: number): boolean => indice === total - 1

interface OrderTimelineProps {
  entradas: readonly OrderTimelineEntry[]
}

export const OrderTimeline = ({ entradas }: OrderTimelineProps) => {
  if (entradas.length === 0) {
    return <p className='text-sm text-neutral-500'>Este pedido no tiene historial.</p>
  }

  return (
    <ol className='relative space-y-5 pl-7'>
      {/* La linea vertical que une los puntos. Va en el `ol` y no en cada
          item, asi que no hay que repetirla ni calcular donde termina. */}
      <span
        aria-hidden='true'
        className='absolute bottom-2 left-[9px] top-2 w-px bg-blanco'
      />

      {entradas.map((entrada, indice) => {
        const actual = esUltimo(indice, entradas.length)
        const fallido = entrada.status === 'cancelado' || entrada.status === 'devuelto'

        return (
          <li key={`${entrada.status}-${entrada.timestamp}`} className='relative'>
            <span
              aria-hidden='true'
              className={[
                'absolute -left-7 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border',
                actual
                  ? fallido
                    ? 'border-verde-500 bg-verde-800'
                    : 'border-verde-salvia bg-blanco'
                  : 'border-neutral-300 bg-marfil'
              ].join(' ')}
            >
              {fallido ? (
                <X className='h-3 w-3 text-verde-500' />
              ) : actual ? (
                <Check className='h-3 w-3 text-verde-salvia' />
              ) : (
                <Circle className='h-2 w-2 text-neutral-600' />
              )}
            </span>

            <div className='flex flex-wrap items-center gap-2'>
              <StatusBadge estado={entrada.status} size='sm' />
              {actual && (
                <span className='text-[10px] uppercase tracking-widest text-neutral-500'>
                  Estado actual
                </span>
              )}
            </div>

            <p className='mt-1 text-xs text-neutral-600'>{formatoFecha(entrada.timestamp)}</p>
            {entrada.note !== undefined && (
              <p className='mt-1 text-sm text-neutral-700'>{entrada.note}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Los estados que se ofrecen en el desplegable de cambio, en orden de avance. */
export const ORDEN_ESTADOS: readonly OrderStatus[] = [
  'pendiente',
  'preparando',
  'enviado',
  'entregado',
  'devuelto',
  'cancelado'
]
