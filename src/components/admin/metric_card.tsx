import type { LucideIcon } from 'lucide-react'

/**
 * Card de metrica del dashboard (D-11).
 *
 * La tendencia es opcional porque no todas las metricas la tienen con sentido:
 * "carritos abandonados" y "conversion" no suben ni bajan bien.
 */

type Tono = 'gold' | 'wine' | 'cream' | 'neutral'

const TONOS: Record<Tono, { icono: string; marco: string }> = {
  gold: { icono: 'text-gold-500', marco: 'border-gold-500/30' },
  wine: { icono: 'text-wine-500', marco: 'border-wine-500/40' },
  cream: { icono: 'text-cream-100', marco: 'border-neutral-700' },
  neutral: { icono: 'text-neutral-400', marco: 'border-neutral-800' }
}

interface MetricCardProps {
  label: string
  value: string | number
  /** Variacion contra el periodo anterior. Positivo se muestra en verde. */
  trend?: { value: number; label: string }
  icon: LucideIcon
  tone?: Tono
}

export const MetricCard = ({ label, value, trend, icon: Icono, tone = 'gold' }: MetricCardProps) => {
  const estilos = TONOS[tone]
  const esPositiva = trend !== undefined && trend.value >= 0

  return (
    <article
      className={`rounded-2xl border bg-charcoal-800/60 p-5 shadow-lg transition-colors hover:border-gold-500/40 ${estilos.marco}`}
    >
      <div className='flex items-start justify-between gap-3'>
        <p className='text-xs font-semibold uppercase tracking-widest text-neutral-400'>
          {label}
        </p>
        <Icono className={`h-5 w-5 shrink-0 ${estilos.icono}`} aria-hidden='true' />
      </div>

      <p className='mt-3 font-serif text-3xl font-bold text-cream-100'>{value}</p>

      {trend !== undefined && (
        <p className='mt-2 flex items-center gap-1.5 text-xs'>
          <span
            className={`font-semibold ${esPositiva ? 'text-emerald-400' : 'text-wine-400'}`}
          >
            {esPositiva ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className='text-neutral-500'>{trend.label}</span>
        </p>
      )}
    </article>
  )
}

/** Esqueleto de carga con la misma forma que la card, para no saltar el layout. */
export const MetricCardSkeleton = () => (
  <div className='rounded-2xl border border-neutral-800 bg-charcoal-800/60 p-5'>
    <div className='flex items-start justify-between'>
      <div className='h-3 w-24 animate-pulse rounded bg-charcoal-700' />
      <div className='h-5 w-5 animate-pulse rounded bg-charcoal-700' />
    </div>
    <div className='mt-3 h-8 w-20 animate-pulse rounded bg-charcoal-700' />
    <div className='mt-2 h-3 w-28 animate-pulse rounded bg-charcoal-700' />
  </div>
)
