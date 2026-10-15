import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { AdminSidebar } from '../../src/components/admin/admin_sidebar'
import {
  USUARIOS,
  desmontarAdmin,
  etiquetasDelSidebar,
  enlacesDelSidebar,
  fetchDeSesion,
  montarAdmin
} from './andamiaje_admin'

/**
 * El menu lateral se filtra por rol (spec 006, T2).
 *
 * La tabla de permisos ya esta cubierta en `test/permisos.test.ts`. Lo que se
 * verifica aca es lo otro: que el sidebar **la consulte**, y no siga con su
 * lista fija de cinco enlaces.
 *
 * Cada test se para en la sesion real de un rol —`fetch` responde
 * `/api/auth/me` con ese usuario— y mira el DOM. Si el sidebar volviera a la
 * lista fija, los tres tests de rol fallan juntos.
 *
 * Ojo con una cosa: el rol **no** se pasa por prop. Viene del `AuthProvider`,
 * que lo pide a la API, y el componente lo lee de ahi. Un test que le pasara el
 * rol por proparia estaria probando un componente que no existe.
 */

/** Monta el sidebar con la sesion que este activo en el `fetch` global. */
const montarSidebar = (colapsado = false) =>
  montarAdmin(
    createElement(AdminSidebar, { colapsado, onSalirAlTienda: () => {} })
  )

const conSesion = (rol: keyof typeof USUARIOS) => {
  vi.stubGlobal('fetch', fetchDeSesion(USUARIOS[rol]))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('con sesion de admin', () => {
  it('ve las cinco secciones', async () => {
    conSesion('admin')
    const montaje = await montarSidebar()

    expect(etiquetasDelSidebar(montaje)).toEqual([
      'Dashboard',
      'Catalogo',
      'Pedidos',
      'Clientes',
      'Configuracion'
    ])

    await desmontarAdmin(montaje)
  })

  it('los enlaces apuntan a las cinco rutas del panel', async () => {
    conSesion('admin')
    const montaje = await montarSidebar()

    expect(enlacesDelSidebar(montaje).map((e) => e.href)).toEqual([
      '/admin',
      '/admin/catalogo',
      '/admin/pedidos',
      '/admin/clientes',
      '/admin/configuracion'
    ])

    await desmontarAdmin(montaje)
  })
})

describe('con sesion de gestor', () => {
  it('NO ve el Dashboard —este es el cambio pedido—', async () => {
    conSesion('gestor')
    const montaje = await montarSidebar()

    expect(etiquetasDelSidebar(montaje)).not.toContain('Dashboard')
    expect(enlacesDelSidebar(montaje).map((e) => e.href)).not.toContain('/admin')

    await desmontarAdmin(montaje)
  })

  it('ve las otras cuatro, en el orden del panel', async () => {
    conSesion('gestor')
    const montaje = await montarSidebar()

    expect(etiquetasDelSidebar(montaje)).toEqual([
      'Catalogo',
      'Pedidos',
      'Clientes',
      'Configuracion'
    ])

    await desmontarAdmin(montaje)
  })
})

describe('con sesion de vendedor', () => {
  it('ve una sola seccion: Pedidos', async () => {
    conSesion('vendedor')
    const montaje = await montarSidebar()

    expect(enlacesDelSidebar(montaje)).toEqual([
      { href: '/admin/pedidos', texto: 'Pedidos' }
    ])

    await desmontarAdmin(montaje)
  })
})

describe('sin sesion', () => {
  it('no dibuja ninguna seccion, en vez de las cinco', async () => {
    // El default que importa es el del error: sin sesion no hay nada que
    // prometer. Mostrar la lista entera seria cinco secciones que dan 403.
    vi.stubGlobal('fetch', fetchDeSesion(null))
    const montaje = await montarSidebar()

    expect(enlacesDelSidebar(montaje)).toEqual([])

    await desmontarAdmin(montaje)
  })

  it('el resto del sidebar sigue dibujandose', async () => {
    // Un menu del todo vacio romperia el panel sin decir por que. La marca, el
    // enlace a la tienda y el boton de colapso son de la maquina, no del rol.
    vi.stubGlobal('fetch', fetchDeSesion(null))
    const montaje = await montarSidebar()

    expect(montaje.contenedor.textContent).toContain('2920')
    expect(montaje.contenedor.querySelector('a[href="/"][title="Ver tienda"]')).not.toBeNull()

    await desmontarAdmin(montaje)
  })
})

describe('el sidebar colapsado', () => {
  it('sigue marcando la seccion activa con menos enlaces', async () => {
    // `NavLink` marca el activo comparando el `to` con la ruta actual. Con una
    // sola seccion no hay ambiguedad posible, pero el estado activo no puede
    // romperse por el camino, y `aria-current` es lo que lo dice.
    conSesion('gestor')
    const montaje = await montarAdmin(
      createElement(AdminSidebar, { colapsado: true, onSalirAlTienda: () => {} }),
      { ruta: '/admin/pedidos' }
    )

    const activo = montaje.contenedor.querySelector('[aria-current="page"]')

    expect(activo?.getAttribute('href')).toBe('/admin/pedidos')

    await desmontarAdmin(montaje)
  })

  it('colapsado esconde el texto y deja el icono como unico señal', async () => {
    // El `title` es lo que el navegador usa como tooltip y lo que lee un lector
    // de pantalla: sin texto visible, es el unico nombre del enlace.
    conSesion('vendedor')
    const montaje = await montarSidebar(true)

    const enlaces = montaje.contenedor.querySelectorAll(
      'nav[aria-label="Secciones de administracion"] a'
    )

    expect(enlaces).toHaveLength(1)
    expect(enlaces[0].textContent).toBe('')
    expect(enlaces[0].getAttribute('title')).toBe('Pedidos')

    await desmontarAdmin(montaje)
  })
})
