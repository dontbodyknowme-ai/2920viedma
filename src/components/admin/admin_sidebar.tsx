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
import { seccionesVisibles, type RutaAdmin } from '../../utils/permisos'
import { useAuth } from '../../hooks/useAuth'

/**
 * Navegacion lateral del panel de administracion.
 *
 * ## Que secciones se dibujan: lo decide `utils/permisos.ts`
 *
 * Antes la lista estaba entera aca, fija, y los tres roles veian las cinco
 * secciones. Escribiendo la URL a mano `/admin/catalogo` montaba la pagina
 * igual, la tabla pedia `/api/wines` y la respuesta era un `403`. El servidor
 * hacia bien su trabajo: **la interfaz prometeria una seccion que no se puede
 * usar**.
 *
 * Ahora el menu sale de `seccionesVisibles(user.role)`. Este archivo ya no
 * decide quien ve que: dibuja lo que la tabla ya aprobo.
 *
 * ## Por que los iconos siguen aca y no en la tabla
 *
 * `permisos.ts` no importa React ni lucide: es una tabla de datos, y por eso la
 * puede verificar el backend sin montar nada. El icono es presentacion, y va
 * aca.
 *
 * El mapa es un `Record<RutaAdmin, ...>` y no una lista, por una razon concreta:
 * agregar una seccion a `permisos.ts` **rompe la compilacion aca**, que es
 * cuando hay que elegir el icono. Una lista compilaria igual y dejaria la
 * seccion nueva sin icono, que se ve como un hueco en el menu.
 *
 * ## El estado activo
 *
 * Sale de `NavLink`, que compara el `to` de cada enlace con la ruta actual. Se
 * usa `end` en la raiz de `/admin` para que no quede marcado como activo en
 * todas sus hijas: `/admin` y `/admin/pedidos` comparten prefijo, y sin `end`
 * los dos filtros se verian encendidos a la vez.
 *
 * Cuando `colapsado` es `true` el sidebar muestra solo iconos. Cada enlace
 * lleva `title`, que es lo que el navegador usa como tooltip nativo al hacer
 * hover: no hace falta un componente de tooltip para eso, y asi el texto sigue
 * siendo accesible a un lector de pantalla.
 */

const ICONOS: Record<RutaAdmin, { Icono: LucideIcon; exacto?: boolean }> = {
  '/admin': { Icono: LayoutDashboard, exacto: true },
  '/admin/catalogo': { Icono: Package },
  '/admin/pedidos': { Icono: Truck },
  '/admin/clientes': { Icono: Users },
  '/admin/configuracion': { Icono: Settings }
}

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
}: AdminSidebarProps) => {
  const { user } = useAuth()

  // Sin sesion: **cero** enlaces, no la lista entera. Hoy es unreachable —el
  // sidebar solo se monta despues del gate— pero el default que importa es el
  // del error: si manana hay un camino que lo monte antes de resolver la
  // sesion, mostrar las cinco es mostrar cinco promesas que el backend va a
  // rechazar con un 403.
  const enlaces: readonly { ruta: RutaAdmin; etiqueta: string }[] =
    user === null ? [] : seccionesVisibles(user.role)

  return (
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

      <nav
        aria-label='Secciones de administracion'
        className='flex-1 overflow-y-auto p-3'
      >
        <ul className='flex flex-col gap-1'>
          {enlaces.map(({ ruta, etiqueta }) => {
            const { Icono, exacto } = ICONOS[ruta]

            return (
              <li key={ruta}>
                <NavLink
                  to={ruta}
                  end={exacto}
                  title={etiqueta}
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
                  {!colapsado && <span className='truncate'>{etiqueta}</span>}
                </NavLink>
              </li>
            )
          })}
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

        {!colapsado && (
          <p className='px-4 pt-2 text-[10px] text-neutral-500'>CAVA &amp; CO. v1.0</p>
        )}
      </div>
    </div>
  )
}
