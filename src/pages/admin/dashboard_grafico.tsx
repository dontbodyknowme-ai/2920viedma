import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { DailySale } from '../../types/admin'

/**
 * Grafico de ventas. Se carga con `import()` diferido desde `dashboard.tsx`.
 *
 * El tipado de Recharts con `strict: true` es flojo en varios puntos: los
 * callbacks del tooltip llegan como `any` segun su propia declaracion. Se anotan
 * a mano en vez de dejar que se(any) se propague, porque RNF-01 prohibe
 * `any` explicito.
 */

const dineroCorto = (valor: number): string => {
  if (Math.abs(valor) >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`
  if (Math.abs(valor) >= 1_000) return `$${(valor / 1_000).toFixed(0)}k`
  return `$${valor}`
}

const etiquetaDia = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

interface PuntoTooltip {
  active?: boolean
  payload?: Array<{ value?: number; payload?: DailySale }>
}

const TooltipPersonalizado = ({ active, payload }: PuntoTooltip) => {
  if (active !== true || payload === undefined || payload.length === 0) return null

  const punto = payload[0].payload
  if (punto === undefined) return null

  return (
    <div className='rounded-xl border border-neutral-700 bg-charcoal-950/95 px-3 py-2 shadow-xl'>
      <p className='text-xs text-neutral-400'>{etiquetaDia(punto.date)}</p>
      <p className='mt-0.5 text-sm font-bold text-gold-400'>
        {new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          maximumFractionDigits: 0
        }).format(punto.revenue)}
      </p>
      <p className='text-xs text-neutral-500'>
        {punto.orders} {punto.orders === 1 ? 'pedido' : 'pedidos'}
      </p>
    </div>
  )
}

interface GraficoVentasProps {
  datos: DailySale[]
}

export const GraficoVentas = ({ datos }: GraficoVentasProps) => (
  <ResponsiveContainer width='100%' height='100%'>
    <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
      <CartesianGrid strokeDasharray='3 3' stroke='#262626' vertical={false} />
      <XAxis
        dataKey='date'
        tickFormatter={etiquetaDia}
        stroke='#737373'
        fontSize={11}
        tickLine={false}
        axisLine={false}
        // Con 30 dias no entran 30 etiquetas sin superponerse. Se muestra una
        // cada cinco, que es lo que entra sin amontonarse.
        interval={4}
      />
      <YAxis
        tickFormatter={dineroCorto}
        stroke='#737373'
        fontSize={11}
        tickLine={false}
        axisLine={false}
        width={52}
      />
      <Tooltip content={<TooltipPersonalizado />} cursor={{ stroke: '#d4af37', strokeOpacity: 0.3 }} />
      <Line
        type='monotone'
        dataKey='revenue'
        stroke='#d4af37'
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4, fill: '#d4af37', stroke: '#0a0a0a', strokeWidth: 2 }}
      />
    </LineChart>
  </ResponsiveContainer>
)

export default GraficoVentas
