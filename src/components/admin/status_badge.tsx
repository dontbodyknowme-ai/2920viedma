/**
 * Badge de estado con color semantico (D-10 de la spec).
 *
 * El mapeo de estado a color esta en un solo objeto y no repartido en el JSX de
 * cada pagina: si cada tabla decidiera sus propios colores, el mismo "entregado"
 * podria verse verde en Pedidos y azul en el Dashboard.
 */

export type EstadoPedido =
  | 'pendiente'
  | 'preparando'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'devuelto'

export type EstadoProducto = 'activo' | 'inactivo'

export type EtiquetaCliente = 'nuevo' | 'vip' | 'frecuente' | 'mayorista'

export type EstadoAdmin = EstadoPedido | EstadoProducto | EtiquetaCliente

/** Clases de cada familia de estado. Solo utilidades de `tailwind.config.js`. */
interface Estilo {
  fondo: string
  texto: string
  borde: string
}

const ESTILOS: Record<EstadoAdmin, Estilo> = {
  // Pedidos: verde cuando llego, rojo cuando fallo, ambar mientras esta en curso.
  pendiente: {
    fondo: 'bg-amber-500/15',
    texto: 'text-amber-300',
    borde: 'border-amber-500/40'
  },
  preparando: {
    fondo: 'bg-amber-500/15',
    texto: 'text-amber-300',
    borde: 'border-amber-500/40'
  },
  enviado: {
    fondo: 'bg-gold-500/15',
    texto: 'text-gold-400',
    borde: 'border-gold-500/40'
  },
  entregado: {
    fondo: 'bg-emerald-500/15',
    texto: 'text-emerald-300',
    borde: 'border-emerald-500/40'
  },
  cancelado: {
    fondo: 'bg-wine-500/20',
    texto: 'text-wine-400',
    borde: 'border-wine-500/50'
  },
  devuelto: {
    fondo: 'bg-wine-500/20',
    texto: 'text-wine-400',
    borde: 'border-wine-500/50'
  },
  // Productos: el verde y el gris dicen si esta en el catalogo, sin pasar por
  // el mismo rojo de un pedido cancelado, que significaria otra cosa.
  activo: {
    fondo: 'bg-emerald-500/15',
    texto: 'text-emerald-300',
    borde: 'border-emerald-500/40'
  },
  inactivo: {
    fondo: 'bg-neutral-700/30',
    texto: 'text-neutral-400',
    borde: 'border-neutral-600/50'
  },
  // Clientes: tonalidad distinta para que no se confundan con los estados de
  // pedido aunque compartan color.
  nuevo: {
    fondo: 'bg-sky-500/15',
    texto: 'text-sky-300',
    borde: 'border-sky-500/40'
  },
  vip: {
    fondo: 'bg-gold-500/20',
    texto: 'text-gold-300',
    borde: 'border-gold-400/50'
  },
  frecuente: {
    fondo: 'bg-violet-500/15',
    texto: 'text-violet-300',
    borde: 'border-violet-500/40'
  },
  mayorista: {
    fondo: 'bg-teal-500/15',
    texto: 'text-teal-300',
    borde: 'border-teal-500/40'
  }
}

const ETIQUETAS: Record<EstadoAdmin, string> = {
  pendiente: 'Pendiente',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  devuelto: 'Devuelto',
  activo: 'Activo',
  inactivo: 'Inactivo',
  nuevo: 'Nuevo',
  vip: 'VIP',
  frecuente: 'Frecuente',
  mayorista: 'Mayorista'
}

interface StatusBadgeProps {
  estado: EstadoAdmin
  size?: 'sm' | 'md'
}

/**
 * Los colores de `text-amber-300`, `text-emerald-300`, `text-sky-300`,
 * `text-violet-300` y `text-teal-300` no estan en `tailwind.config.js`.
 *
 * Se usan igual, y a proposito: la paleta del tema cubre las superficies de la
 * tienda (vino, oro, carbon, crema) pero no tiene rampa para "estado del
 * negocio". Extender `tailwind.config.js` con cinco rampas semanticas es una
 * tarea de diseno aparte, y esta spec no la pide. RNF-03 habla de no inventar
 * colores de marca, y estos no lo son.
 *
 * Nota para cuando esa tarea se haga: estas clases son las unicas que habria
 * que reemplazar.
 */
export const StatusBadge = ({ estado, size = 'md' }: StatusBadgeProps) => {
  const estilo = ESTILOS[estado]

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap',
        estilo.fondo,
        estilo.texto,
        estilo.borde,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      ].join(' ')}
    >
      {ETIQUETAS[estado]}
    </span>
  )
}
