import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { AdminGate } from './admin_gate'
import { AvisoOffline } from './aviso_offline'
import { AdminHeader } from './admin_header'
import { AdminSidebar } from './admin_sidebar'
import { useEsMovil } from '../../hooks/useMediaQuery'
import { cerrarSesionAdmin, haySesionAdmin } from '../../utils/admin_acceso'

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
 *
 * ## Sin sesion no hay redirect: hay una pantalla de clave
 *
 * Antes, entrar a `/admin` sin el flag redirigia a la tienda con un `alert`.
 * Ahora se muestra `AdminGate`, que pide la contrasena.
 *
 * La razon es que **no hay ningun boton de acceso en la tienda**: al panel se
 * llega escribiendo la URL. Un redirect seria responderle a alguien que hizo
 * `/admin` a proposito con "no, anda a la tienda", que es una respuesta
 * distinta a la que merecia: le estan pidiendo la clave.
 *
 * La tienda publica no menciona el panel en ningun lado. Un boton "Modo Admin"
 * en la navbar le diria a cualquier visitante que hay una seccion restringida y
 * que esta a un clic.
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
  // `undefined` mientras no se resuelve, `true` con sesion abierta, `false` si
  // hay que pedir la clave. El tercer estado existe para que el gate no
  // aparezca un fotograma en cada recarga: sin el, el panel se veria un instante
  // antes de pedir la contrasena.
  const [autorizado, setAutorizado] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    setAutorizado(haySesionAdmin())
  }, [])

  // En movil el drawer se cierra solo al cambiar de seccion: si no, el usuario
  // navega y el menu le queda tapando el contenido.
  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  const cerrarSesion = () => {
    cerrarSesionAdmin()
    navigate('/', { replace: true })
  }

  if (autorizado === undefined) return null
  if (!autorizado) return <AdminGate />

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
            <AdminSidebar colapsado={false} onSalirAlTienda={cerrarSesion} />
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
            onSalirAlTienda={cerrarSesion}
            onAlternarColapso={() => setColapsado((previo) => !previo)}
          />
        </aside>
      )}

      <div
        className={`transition-[margin] duration-300 ${
          esMovil ? '' : colapsado ? 'ml-[72px]' : 'ml-72'
        }`}
      >
        {/* Va dentro de la columna de contenido, no en un `fixed`: asi hereda
            el margen que ya calcula el sidebar y no hay que replicar el calculo
            del colapso en dos lugares. */}
        <AvisoOffline />

        <AdminHeader
          titulo={tituloDe(location.pathname)}
          esMovil={esMovil}
          onAbrirMenu={() => setMenuAbierto(true)}
          onSalirDelModoAdmin={cerrarSesion}
        />

        <main className='p-4 md:p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
