import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { Navbar } from '../../src/components/barra_de_navegacion'
import {
  USUARIOS,
  fetchDeSesion,
  montarAdmin,
  desmontarAdmin,
  type MontajeAdmin
} from './andamiaje_admin'

/**
 * El navbar no tiene ningun acceso al panel (spec 011, gotcha 6 de AGENTS.md).
 *
 * ## Que cambio
 *
 * El navbar tenia **tres** botones al panel: "Panel Admin" y "+ Cargar Vino" en
 * la fila de escritorio, y "+ Cargar Vino" en el drawer de movil. Los tres se
 * fueron. Al panel se entra escribiendo `/admin`.
 *
 * ## Por que el boton era un problema y no una comodidad
 *
 * Los tres tenian su guard de rol, asi que un visitante sin sesion novia nada.
 * El problema es otro: un boton en la tienda publica **promete que la sesion del
 * panel existe**. El que entro con una sesion de `vendedor` veia "+ Cargar Vino"
 * y "/admin/catalogo" le devolvia `403`: la interfaz ofrecio una seccion que el
 * servidor no iba a dejar usar, y lo descubrio rompiéndose. Es el mismo patron
 * que la spec 006 elimino del sidebar del panel.
 *
 * ## El bug que se encontro en el camino
 *
 * El boton del drawer estaba escrito **sin ninguna condicion**, mientras que el
 * de escritorio si la tenia. Dos copias del mismo boton, una con el guard y otra
 * sin: la que se olvida es la que queda. Este archivo ya no distingue escritorio
 * de movil porque los dos se fueron, pero el comentario queda porque la
 * lesson —no escribir dos veces el mismo control— es la que evita que vuelva.
 *
 * ## Que NO se prueba aca
 *
 * Que `/admin` de verdad pida sesion y rol: eso lo cubren
 * `coherencia_permisos.test.ts` en el backend y `layout_rutas.test.ts` en el
 * panel. Aca se verifica que el navbar **no ofrece** el atajo.
 */

const montarNavbar = () =>
  montarAdmin(
    createElement(Navbar, {
      cartCount: 0,
      onOpenCart: () => {},
      searchQuery: '',
      onSearchChange: () => {}
    })
  )

/**
 * Abre el drawer de movil pulsando la hamburguesa.
 *
 * El drawer vive dentro de un `AnimatePresence`: aparece en el DOM en el mismo
 * `act` en que cambia el estado, y lo que se anima despues es la transformacion.
 * Por eso alcanza con un solo `act` y no hace falta esperar la animacion de
 * entrada.
 */
const abrirDrawer = async (montaje: MontajeAdmin): Promise<void> => {
  const hamburguesa = montaje.contenedor.querySelector<HTMLButtonElement>(
    '[aria-label="Abrir menú de navegación"]'
  )

  if (hamburguesa === null) {
    throw new Error('No se encontro el boton hamburguesa. El Navbar cambio.')
  }

  await act(async () => {
    hamburguesa.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** El texto del drawer, que es donde vivian los botones del panel. */
const textoDelDrawer = (montaje: MontajeAdmin): string =>
  montaje.contenedor.querySelector('[role="dialog"]')?.textContent ?? ''

/** El texto de la fila de escritorio, donde vivian los otros dos botones. */
const textoDeEscritorio = (montaje: MontajeAdmin): string =>
  montaje.contenedor.querySelector('header')?.textContent ?? ''

/** Los cuatro estados en los que se prueba: sin sesion y los tres roles. */
const ESCENARIOS = [
  { nombre: 'sin sesion', usuario: null },
  { nombre: 'admin', usuario: USUARIOS.admin },
  { nombre: 'gestor', usuario: USUARIOS.gestor },
  { nombre: 'vendedor', usuario: USUARIOS.vendedor }
] as const

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('el navbar no ofrece atajo al panel', () => {
  it.each(ESCENARIOS)(
    'con $nombre el escritorio no tiene ni "Panel Admin" ni "Cargar Vino"',
    async ({ usuario }) => {
      vi.stubGlobal('fetch', fetchDeSesion(usuario))
      const montaje = await montarNavbar()

      const texto = textoDeEscritorio(montaje)
      expect(texto).not.toContain('Panel Admin')
      expect(texto).not.toContain('Cargar Vino')

      await desmontarAdmin(montaje)
    }
  )

  it.each(ESCENARIOS)(
    'con $nombre el drawer de movil tampoco',
    async ({ usuario }) => {
      vi.stubGlobal('fetch', fetchDeSesion(usuario))
      const montaje = await montarNavbar()

      await abrirDrawer(montaje)

      const texto = textoDelDrawer(montaje)
      expect(texto).not.toContain('Panel Admin')
      expect(texto).not.toContain('Cargar Vino')

      await desmontarAdmin(montaje)
    }
  )
})

describe('el navbar sigue sirviendo para lo suyo', () => {
  it('el drawer se abre — guarda contra un falso verde', async () => {
    // Si el drawer no se abriera, `textoDelDrawer` devolveria '' y los tests de
    // arriba darian verde sin haber mirado nada.
    vi.stubGlobal('fetch', fetchDeSesion(USUARIOS.admin))
    const montaje = await montarNavbar()

    expect(textoDelDrawer(montaje)).toBe('')

    await abrirDrawer(montaje)

    expect(textoDelDrawer(montaje)).not.toBe('')

    await desmontarAdmin(montaje)
  })

  it('con sesion el drawer ofrece "Cerrar sesión"', async () => {
    // Si al borrar los botones hubiera quedado el drawer vacio para todos, los
    // tests de "no aparece" seguirian dando verde y el menu movil habria perdido
    // su unica accion.
    vi.stubGlobal('fetch', fetchDeSesion(USUARIOS.admin))
    const montaje = await montarNavbar()

    await abrirDrawer(montaje)

    expect(textoDelDrawer(montaje)).toContain('Cerrar sesión')

    await desmontarAdmin(montaje)
  })

  it('sin sesion el drawer no ofrece "Cerrar sesión"', async () => {
    vi.stubGlobal('fetch', fetchDeSesion(null))
    const montaje = await montarNavbar()

    await abrirDrawer(montaje)

    expect(textoDelDrawer(montaje)).not.toContain('Cerrar sesión')

    await desmontarAdmin(montaje)
  })

  it('el carrito sigue disponible en escritorio', async () => {
    vi.stubGlobal('fetch', fetchDeSesion(null))
    const montaje = await montarNavbar()

    expect(
      montaje.contenedor.querySelector('[aria-label="Carrito de compras"]')
    ).not.toBeNull()

    await desmontarAdmin(montaje)
  })
})
