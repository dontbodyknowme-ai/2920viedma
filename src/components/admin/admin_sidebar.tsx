import { NavLink } from 'react-router-dom'
import {
  ChevronLeft,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Truck,
  Users,
  type LucideIcon
} from 'lucide-react'

/**
 * Navegacion lateral del panel de administracion.
 *
 * El estado activo sale de `NavLink`, que compara el `to` de cada enlace con la
 * ruta actual. Se usa `end` en la raiz de `/admin` para que no quede marcado
 * como activo en todas sus hijas: `/admin` y `/admin/pedidos` comparten
 * prefijo, y sin `end` los dos filtros se verian encendidos a la vez.
 *
 * Cuando `colapsado` es `true` el sidebar muestra solo iconos. Cada enlace
 * lleva `title`, que es lo que el navegador usa como tooltip nativo al hacer
 * hover: no hace falta un componente de tooltip para eso, y asi el texto sigue
 * siendo accesible a un lector de pantalla.
 */

interface EnlaceAdmin {
  to: string
  label: string
  Icono: LucideIcon
  /** Marca el enlace activo tambien en sus rutas hijas. */
  exacto?: boolean
}

const ENLACES: readonly EnlaceAdmin[] = [
  { to: '/admin', label: 'Dashboard', Icono: LayoutDashboard, exacto: true },
  { to: '/admin/catalogo', label: 'Catalogo', Icono: Package },
  { to: '/admin/pedidos', label: 'Pedidos', Icono: Truck },
  { to: '/admin/clientes', label: 'Clientes', Icono: Users },
  { to: '/admin/configuracion', label: 'Configuracion', Icono: Settings }
]

interface AdminSidebarProps {
  colapsado: boolean
  /** Se llama cuando se pulsa "Ver tienda", para cerrar el drawer en movil. */
  onSalirAlTienda: () => void
  /**
   * Alterna el ancho del sidebar. Es `undefined` en movil, donde el sidebar es
   * un drawer de ancho completo y colapsarlo no tendria sentido.
   */
  onAlternarColapso?: () => void
}

export const AdminSidebar = ({
  colapsado,
  onSalirAlTienda,
  onAlternarColapso
}: AdminSidebarProps) => (
  <div className='flex h-full flex-col border-r border-wine-900/50 bg-charcoal-950'>
    {/* La marca. Oculta el texto cuando el sidebar esta colapsado para que
        quede solo el inicial y el ancho no salte. */}
    <div
      className={`flex items-center border-b border-wine-900/50 ${
        colapsado ? 'justify-center px-3 py-5' : 'gap-2 px-5 py-5'
      }`}
    >
      <span className='font-serif text-lg font-bold tracking-wider text-gold-500'>
        CAVA &amp; CO.
      </span>
      {!colapsado && (
        <span className='rounded-full border border-gold-500/40 bg-wine-900/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold-400'>
          Admin
        </span>
      )}
    </div>

    <nav aria-label='Secciones de administracion' className='flex-1 overflow-y-auto p-3'>
      <ul className='flex flex-col gap-1'>
        {ENLACES.map(({ to, label, Icono, exacto }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={exacto}
              title={label}
              className={({ isActive }) =>
                [
                  'flex items-center rounded-xl text-sm font-semibold uppercase tracking-wider transition-colors',
                  colapsado ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3',
                  isActive
                    ? 'bg-wine-700 text-cream-100 border border-gold-500/40'
                    : 'border border-transparent text-neutral-400 hover:bg-charcoal-800 hover:text-cream-100'
                ].join(' ')
              }
            >
              <Icono className='h-5 w-5 shrink-0' aria-hidden='true' />
              {!colapsado && <span className='truncate'>{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>

    <div className='border-t border-wine-900/50 p-3'>
      <a
        href='/'
        title='Ver tienda'
        onClick={onSalirAlTienda}
        className={[
          'flex items-center rounded-xl text-xs uppercase tracking-wider text-neutral-500 transition-colors hover:bg-charcoal-800 hover:text-gold-400',
          colapsado ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'
        ].join(' ')}
      >
        <Store className='h-4 w-4 shrink-0' aria-hidden='true' />
        {!colapsado && <span>Ver tienda</span>}
      </a>

      {/* El colapso solo tiene sentido en escritorio, y por eso el boton no se
          renderiza en movil: `onAlternarColapso` llega `undefined` desde el
          drawer. */}
      {onAlternarColapso !== undefined && (
        <button
          type='button'
          onClick={onAlternarColapso}
          aria-label={colapsado ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
          aria-pressed={colapsado}
          className={[
            'mt-1 flex w-full items-center rounded-xl text-xs uppercase tracking-wider text-neutral-500 transition-colors hover:bg-charcoal-800 hover:text-gold-400',
            colapsado ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'
          ].join(' ')}
        >
          <ChevronLeft
            className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
              colapsado ? 'rotate-180' : ''
            }`}
            aria-hidden='true'
          />
          {!colapsado && <span>Colapsar</span>}
        </button>
      )}

      {!colapsado && <p className='px-4 pt-2 text-[10px] text-neutral-500'>CAVA &amp; CO. v1.0</p>}
    </div>
  </div>
)
