import { useState } from 'react'
import { LogOut, Menu, Shield, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

/**
 * Header del panel de administracion: boton de menu en movil, titulo de la
 * seccion actual y menu de usuario.
 *
 * El titulo sale de la ruta, no de un prop: el header no lo recibe de nadie, y
 * cada pagina Podria mostrar un titulo distinto al suyo y desincronizarse.
 *
 * El menu de usuario muestra **quien esta conectado de verdad**: antes tenia
 * "Administrador" y "admin@vinoteca.local" escritos a mano, asi que entrar con
 * `gestor@vinoteca.local` seguia mostrando que estabas como administrador. No
 * era un problema de seguridad — el permiso lo decide el backend — sino que el
 * panel miente sobre la sesion, y eso hace imposible ver con que rol se opera.
 */

interface AdminHeaderProps {
  titulo: string
  esMovil: boolean
  onAbrirMenu: () => void
  /** Se llama al confirmar "Cerrar sesion". */
  onSalirDelModoAdmin: () => void
}

/** Como se escribe cada rol. Es presentacion: el permiso lo decide
 *  `hasRole` y el backend, no esta etiqueta. */
const ROLES: Record<'admin' | 'gestor' | 'vendedor', string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  vendedor: 'Vendedor'
}

export const AdminHeader = ({
  titulo,
  esMovil,
  onAbrirMenu,
  onSalirDelModoAdmin
}: AdminHeaderProps) => {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { user } = useAuth()

  // El header solo se dibuja dentro del panel, que ya exige sesion. Pero si
  // `user` fuera `null` por una carrera, mostrar el dato de otro usuario seria
  // peor que mostrar un guion.
  const nombre = user?.name ?? '—'
  const email = user?.email ?? ''
  const rol = user ? ROLES[user.role] ?? user.role : null

  // Cuando el nombre **es** el rol —"Gestor", "Vendedor"—, la etiqueta de rol
  // repetiria la misma palabra en la misma pantalla. No se dibuja: informa de
  // algo que ya esta a la vista. Para "Manuel" si aparece, porque ahi el rol
  // es informacion que el nombre no da.
  const rolRedundante = rol !== null && rol === nombre

  return (
    <header className='sticky top-0 z-30 border-b border-verde-800/50 bg-marfil/90 backdrop-blur'>
      <div className='flex items-center justify-between gap-4 px-4 py-4 md:px-6'>
        <div className='flex min-w-0 items-center gap-3'>
          {/* En movil el sidebar es un drawer, asi que hace falta el boton.
              En escritorio el sidebar esta siempre visible y el boton sobra. */}
          {esMovil && (
            <button
              type='button'
              onClick={onAbrirMenu}
              aria-label='Abrir menu de navegacion'
              className='rounded-lg p-2 text-carbon transition-colors hover:bg-blanco'
            >
              <Menu className='h-5 w-5' aria-hidden='true' />
            </button>
          )}
          <h1 className='truncate font-serif text-xl font-bold text-carbon md:text-2xl'>
            {titulo}
          </h1>
        </div>

        <div className='relative shrink-0'>
          <button
            type='button'
            onClick={() => setMenuAbierto((previo) => !previo)}
            aria-expanded={menuAbierto}
            aria-haspopup='menu'
            aria-label='Menu de usuario'
            className='flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm text-carbon transition-colors hover:border-verde-salvia'
          >
            <Shield className='h-4 w-4 text-verde-salvia' aria-hidden='true' />
            <span className='hidden text-xs font-semibold uppercase tracking-wider md:inline'>
              Admin
            </span>
          </button>

          {menuAbierto && (
            <>
              {/* Fondo que cierra el menu al pulsar fuera. Es un `button` y no un
                  `div` para que responda a Escape y a Enter por teclado. */}
              <button
                type='button'
                aria-label='Cerrar menu de usuario'
                onClick={() => setMenuAbierto(false)}
                className='fixed inset-0 z-40 cursor-default'
              />
              <div
                role='menu'
                className='absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-300 bg-blanco shadow-2xl'
              >
                <div className='border-b border-neutral-200 px-4 py-3'>
                  <p className='text-sm font-semibold text-carbon'>{nombre}</p>
                  {email && (
                    <p className='truncate text-xs text-neutral-500'>{email}</p>
                  )}
                  {rol && !rolRedundante && (
                    <p className='mt-1 inline-flex items-center gap-1 rounded-full bg-verde-800/60 px-2 py-0.5 text-[11px] font-medium text-blanco'>
                      <Shield className='h-3 w-3' aria-hidden='true' />
                      {rol}
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  role='menuitem'
                  onClick={() => {
                    setMenuAbierto(false)
                    onSalirDelModoAdmin()
                  }}
                  className='flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:bg-blanco hover:text-carbon'
                >
                  <LogOut className='h-4 w-4 shrink-0' aria-hidden='true' />
                  Cerrar sesion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/** Icono de cerrar, que el drawer de movil usa en su propio borde. */
export const IconoCerrar = X
