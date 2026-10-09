import { useState } from 'react'
import { LogOut, Menu, Shield, X } from 'lucide-react'

/**
 * Header del panel de administracion: boton de menu en movil, titulo de la
 * seccion actual y menu de usuario.
 *
 * El titulo sale de la ruta, no de un prop: el header no lo recibe de nadie, y
 * cada pagina Podria mostrar un titulo distinto al suyo y desincronizarse.
 */

interface AdminHeaderProps {
  titulo: string
  esMovil: boolean
  onAbrirMenu: () => void
  /** Se llama al confirmar "Cerrar modo admin". */
  onSalirDelModoAdmin: () => void
}

export const AdminHeader = ({
  titulo,
  esMovil,
  onAbrirMenu,
  onSalirDelModoAdmin
}: AdminHeaderProps) => {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <header className='sticky top-0 z-30 border-b border-wine-900/50 bg-charcoal-950/90 backdrop-blur'>
      <div className='flex items-center justify-between gap-4 px-4 py-4 md:px-6'>
        <div className='flex min-w-0 items-center gap-3'>
          {/* En movil el sidebar es un drawer, asi que hace falta el boton.
              En escritorio el sidebar esta siempre visible y el boton sobra. */}
          {esMovil && (
            <button
              type='button'
              onClick={onAbrirMenu}
              aria-label='Abrir menu de navegacion'
              className='rounded-lg p-2 text-cream-100 transition-colors hover:bg-charcoal-800'
            >
              <Menu className='h-5 w-5' aria-hidden='true' />
            </button>
          )}
          <h1 className='truncate font-serif text-xl font-bold text-cream-100 md:text-2xl'>
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
            className='flex items-center gap-2 rounded-xl border border-neutral-700 px-3 py-2 text-sm text-cream-100 transition-colors hover:border-gold-500'
          >
            <Shield className='h-4 w-4 text-gold-500' aria-hidden='true' />
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
                className='absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-700 bg-charcoal-900 shadow-2xl'
              >
                <div className='border-b border-neutral-800 px-4 py-3'>
                  <p className='text-sm font-semibold text-cream-100'>Administrador</p>
                  <p className='truncate text-xs text-neutral-500'>admin@vinoteca.local</p>
                </div>
                <button
                  type='button'
                  role='menuitem'
                  onClick={() => {
                    setMenuAbierto(false)
                    onSalirDelModoAdmin()
                  }}
                  className='flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-neutral-300 transition-colors hover:bg-charcoal-800 hover:text-cream-100'
                >
                  <LogOut className='h-4 w-4 shrink-0' aria-hidden='true' />
                  Cerrar modo admin
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
