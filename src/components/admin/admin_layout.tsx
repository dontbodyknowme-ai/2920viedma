import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { AdminHeader } from './admin_header'
import { AdminSidebar } from './admin_sidebar'
import { useEsMovil } from '../../hooks/useMediaQuery'
import { loadIsAdmin, saveIsAdmin } from '../../App'

/**
 * Layout del panel de administracion.
 *
 * Hace tres cosas: la proteccion de acceso, el sidebar (fija en escritorio,
 * drawer en movil) y el `<Outlet>` que renderiza la seccion.
 *
 * La proteccion esta aca y no en `router.tsx` a proposito. `router.tsx` declara
 * las cinco rutas hijas, y proteger cada una por separado seria cinco chequeos
 * que pueden desincronizarse. `AdminLayout` es el unico ancestro comun de las
 * cinco, asi que un solo chequeo cubre todas.
 */

const TITULOS: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/catalogo': 'Catalogo',
  '/admin/pedidos': 'Pedidos',
  '/admin/clientes': 'Clientes',
  '/admin/configuracion': 'Configuracion'
}

const tituloDe = (ruta: string): string => TITULOS[ruta] ?? 'Administracion'

export const AdminLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const esMovil = useEsMovil()

  const [menuAbierto, setMenuAbierto] = useState(false)
  const [colapsado, setColapsado] = useState(false)
  // Es un flag, no autenticacion: cualquiera que abra la consola puede ponerlo en
  // `true`. La spec 004-b lo reemplaza por `GET /api/auth/me` con token real.
  const [autorizado, setAutorizado] = useState(true)

  useEffect(() => {
    if (!loadIsAdmin()) {
      setAutorizado(false)
      alert('Acceso denegado. Activa el modo admin para entrar al panel.')
      navigate('/', { replace: true })
    }
  }, [navigate])

  // En movil el drawer se cierra solo al cambiar de seccion: si no, el usuario
  // navega y el menu le queda tapando el contenido.
  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  const salirDelModoAdmin = () => {
    saveIsAdmin(false)
    navigate('/', { replace: true })
  }

  // Antes de que resuelva el chequeo de acceso no se pinta nada. El `Outlet`
  // tardaria un render en desmontar solo y podria llegar a renderizar la
  // seccion solicitada durante ese cuadro.
  if (!autorizado) return null

  return (
    <div className='min-h-screen bg-charcoal-900 text-cream-100'>
      {esMovil ? (
        <>
          {/* Fondo oscurecido del drawer. Solo en movil. */}
          {menuAbierto && (
            <button
              type='button'
              aria-label='Cerrar menu'
              onClick={() => setMenuAbierto(false)}
              className='fixed inset-0 z-40 bg-black/60'
            />
          )}
          <aside
            aria-label='Menu de administracion'
            className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-wine-900/50 transition-transform duration-300 ${
              menuAbierto ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <button
              type='button'
              onClick={() => setMenuAbierto(false)}
              aria-label='Cerrar menu de navegacion'
              className='absolute right-3 top-5 z-10 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-charcoal-800 hover:text-cream-100'
            >
              <X className='h-5 w-5' aria-hidden='true' />
            </button>
            <AdminSidebar colapsado={false} onSalirAlTienda={salirDelModoAdmin} />
          </aside>
        </>
      ) : (
        <aside
          aria-label='Menu de administracion'
          className={`fixed inset-y-0 left-0 z-40 border-r border-wine-900/50 transition-[width] duration-300 ${
            colapsado ? 'w-[72px]' : 'w-72'
          }`}
        >
          <AdminSidebar
            colapsado={colapsado}
            onSalirAlTienda={salirDelModoAdmin}
            onAlternarColapso={() => setColapsado((previo) => !previo)}
          />
        </aside>
      )}

      <div
        className={`transition-[margin] duration-300 ${
          esMovil ? '' : colapsado ? 'ml-[72px]' : 'ml-72'
        }`}
      >
        <AdminHeader
          titulo={tituloDe(location.pathname)}
          esMovil={esMovil}
          onAbrirMenu={() => setMenuAbierto(true)}
          onSalirDelModoAdmin={salirDelModoAdmin}
        />

        <main className='p-4 md:p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
