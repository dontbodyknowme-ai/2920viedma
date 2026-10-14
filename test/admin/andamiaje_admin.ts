/**
 * Andamiaje de los tests de componentes del panel (`test/admin/*_sidebar.test.ts`,
 * `test/admin/layout_rutas.test.ts`).
 *
 * No es un archivo de test: no termina en `.test.ts`, asi que `vitest.config.ts`
 * no lo recolecta como suite. Si tuviera un error de tipos, `tsc` lo detecta
 * igual, porque `tsconfig.json` incluye `test/`.
 *
 * ## Por que hace falta
 *
 * Los tests de `test/admin/` que existian hasta ahora son de **funciones puras**
 * (`tendenciaDe`, el parser de CSV, el de fechas). Ninguno monta nada, asi que
 * no habia un camino probado para renderizar un componente del panel con una
 * sesion.
 *
 * Montarlo "de verdad" —montar `App`, hacer login contra la API— no es una
 * opcion en jsdom: no hay servidor, y `AuthProvider` resuelve la sesion con un
 * `fetch` a `http://localhost:3000`.
 *
 * ## Que se stubbea, y que no
 *
 * Se intercepta **`fetch`, no el modulo `api`**. Es la diferencia entre probar
 * el componente y probar una fantasia del componente: el `AuthProvider` real
 * corre, el cliente HTTP real corre, y solo la red se responde con lo que el
 * test quiere. Un `vi.mock('../../src/api/client.js')` que devuelve el usuario
 * listo pasaria igual, pero dejaria en verde un `useAuth` roto.
 *
 * Importar `../andamiaje` (sin usar nada de el) es lo que instala los stubs de
 * jsdom: `ResizeObserver`, `IntersectionObserver` e `innerWidth`. Vive en un
 * modulo aparte justamente para poder traerse esos efectos sin arrastrar el
 * montaje de `App`.
 */

import { Fragment, act, createElement, type ReactNode } from 'react'
import { vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../../src/hooks/useAuth'
import { AdminLayout } from '../../src/components/admin/admin_layout'
import { AdminGate } from '../../src/components/admin/admin_gate'
import { Dashboard } from '../../src/pages/admin/dashboard'
import type { PublicUser } from '../../src/api/schemas'
import type { RutaAdmin } from '../../src/utils/permisos'
import '../andamiaje'

export type Rol = PublicUser['role']

/** Los tres usuarios del panel, con los mismos nombres que deja el seed. */
export const USUARIOS: Record<Rol, PublicUser> = {
  admin: {
    id: 'usr_admin',
    email: 'admin@vinoteca.local',
    name: 'Manuel',
    role: 'admin'
  },
  gestor: {
    id: 'usr_gestor',
    email: 'gestor@vinoteca.local',
    name: 'Gestor',
    role: 'gestor'
  },
  vendedor: {
    id: 'usr_vendedor',
    email: 'vendedor@vinoteca.local',
    name: 'Vendedor',
    role: 'vendedor'
  }
}

interface RespuestaStub {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

const respuesta = (status: number, cuerpo: unknown): RespuestaStub => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: String(status),
  json: async () => cuerpo
})

/**
 * Un `fetch` que responde `GET /api/auth/me` con `usuario` y **404 con todo lo
 * demas**.
 *
 * El 404 a proposito: si una pagina del panel pide datos, el test va a fallar
 * con el error de la API en vez de mostrar una pantalla vacia que el test tomaria
 * por una pantalla correcta. Para `usuario === null` se responde `401`, que es
 * lo que hace el backend sin sesion: el cliente intenta el refresh, falla y
 * termina en `user: null`, igual que en el navegador.
 */
export const fetchDeSesion = (usuario: PublicUser | null): typeof fetch =>
  vi.fn(async (entrada: RequestInfo | URL) => {
    const url = String(entrada)

    if (url.endsWith('/api/auth/me')) {
      return usuario === null
        ? respuesta(401, { message: 'Sesión expirada' })
        : respuesta(200, usuario)
    }

    if (url.endsWith('/api/auth/refresh')) {
      return respuesta(401, { message: 'Sin refresh' })
    }

    return respuesta(404, { message: `Sin stub para ${url}` })
  }) as unknown as typeof fetch

export interface MontajeAdmin {
  contenedor: HTMLDivElement
  root: Root
}

/**
 * Monta un arbol dentro de un `MemoryRouter` y un `AuthProvider`, en la ruta
 * inicial `ruta`.
 *
 * El `await` del `act` es lo que hace que funcione: `AuthProvider` resuelve la
 * sesion en un `useEffect` y el `user` llega **despues** del primer render. Sin
 * esperarlo, todo se prueba con `user === null` —que es justo el estado que la
 * especificacion de T2 quiere ver en un solo test, no en todos.
 */
export const montarAdmin = async (
  arbol: ReactNode,
  { ruta = '/admin' }: { ruta?: string } = {}
): Promise<MontajeAdmin> => {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const root = createRoot(contenedor)

  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [ruta] },
        createElement(AuthProvider, null, arbol)
      )
    )
  })

  return { contenedor, root }
}

/** Desmonta la raiz y despues saca el contenedor, en ese orden. */
export const desmontarAdmin = async (montaje: MontajeAdmin): Promise<void> => {
  await act(async () => {
    montaje.root.unmount()
  })
  montaje.contenedor.remove()
}

export interface Enlace {
  href: string
  texto: string
}

/**
 * Los enlaces del menu lateral, en orden.
 *
 * Se leen por el `href` y no por la clase de "activo": las clases son
 * presentacion, y lo que importa en T2 es **que enlaces existen**, no como se
 * ven.
 */
export const enlacesDelSidebar = (montaje: MontajeAdmin): Enlace[] =>
  [
    ...montaje.contenedor.querySelectorAll<HTMLAnchorElement>(
      'nav[aria-label="Secciones de administracion"] a'
    )
  ].map((a) => ({ href: a.getAttribute('href') ?? '', texto: a.textContent ?? '' }))

/** Las etiquetas de los enlaces del menu lateral, en orden. */
export const etiquetasDelSidebar = (montaje: MontajeAdmin): string[] =>
  enlacesDelSidebar(montaje).map((e) => e.texto)

/**
 * ## Montar el layout completo
 *
 * Las pruebas de T3 necesitan el arbol de rutas **real**, no un `AdminLayout`
 * suelto: lo que se verifica es que `/admin/catalogo` escrito a mano con sesion
 * de `vendedor` no monta la pagina de catalogo, y eso depende de que la ruta
 * exista en el router.
 *
 * Por eso el arbol de abajo **replica `src/router.tsx`**, con dos cambios:
 * cada pagina es un `<p id="pagina">` con una marca, y se agrega el
 * `MarcaDeRuta`. Si alguien cambia `router.tsx` y no actualiza esta copia, los
 * tests de T3 se prueban contra un arbol que ya no existe — es el costo de no
 * poder importar el router real (trae `createBrowserRouter`, que necesita un
 * `window.history` real).
 */

const MARCA: Record<RutaAdmin, string> = {
  '/admin': 'pagina dashboard',
  '/admin/catalogo': 'pagina catalogo',
  '/admin/pedidos': 'pagina pedidos',
  '/admin/clientes': 'pagina clientes',
  '/admin/configuracion': 'pagina configuracion'
}

/** La pagina real del panel, reemplazada por una marca legible. */
const Pagina = ({ ruta }: { ruta: RutaAdmin }) =>
  createElement('p', { id: 'pagina' }, MARCA[ruta])

/** Escribe la ruta actual en el DOM, para poder afirmar a donde quedo el usuario. */
export const MarcaDeRuta = () =>
  createElement('span', { id: 'ruta-actual' }, useLocation().pathname)

const HijasDelPanel = () =>
  createElement(
    Routes,
    null,
    createElement(Route, { element: createElement(AdminLayout) },
      createElement(Route, { index: true, element: createElement(Pagina, { ruta: '/admin' }) }),
      createElement(Route, { path: 'catalogo', element: createElement(Pagina, { ruta: '/admin/catalogo' }) }),
      createElement(Route, { path: 'pedidos', element: createElement(Pagina, { ruta: '/admin/pedidos' }) }),
      createElement(Route, { path: 'clientes', element: createElement(Pagina, { ruta: '/admin/clientes' }) }),
      createElement(Route, { path: 'configuracion', element: createElement(Pagina, { ruta: '/admin/configuracion' }) }),
      // El `catchAll` de `router.tsx` sigue montando el Dashboard. Es justo el
      // caso que T3 corrige: `/admin/secreto` le daba el dashboard a cualquier
      // rol, vendedor incluido.
      createElement(Route, { path: '*', element: createElement(Pagina, { ruta: '/admin' }) })
    )
  )

/**
 * Las URLs que el `fetch` stub recibio, en orden.
 *
 * Es la forma de preguntar **que se pidio**, no **que se mostro**. Con pagina
 * real importa: "el dashboard no se monto ni un instante" es una afirmacion
 * sobre el frame intermedio, y ese frame ya paso cuando el test mira el DOM. Lo
 * que si queda es la pregunta a la API, y ahi se ve: si el dashboard llego a
 * montarse, `/api/metrics` esta en la lista.
 */
/**
 * Arranca **sin sesion** y acepta el `POST /api/auth/login`.
 *
 * Es el camino del **gate**: arrancar sin sesion, ver el formulario, escribir y
 * enviar. Con `fetchDeSesion(null)` solo, el login daria 404 y el gate
 * mostraria un error en vez de entrar.
 *
 * `/api/auth/me` responde `401` a proposito, y con razon: el `AuthProvider` lo
 * consulta **una sola vez**, al montar. Si el stub respondiera con el usuario,
 * el panel arrancaria ya autenticado, el gate no se dibujaria y estos tests
 * estarian probando el redirect de T3 con otro nombre.
 */
export const fetchConLogin = (usuario: PublicUser): typeof fetch =>
  vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada)

    if (url.endsWith('/api/auth/login') && init?.method === 'POST') {
      return respuesta(200, {
        accessToken: 'token-de-prueba',
        refreshToken: 'refresh-de-prueba',
        user: usuario
      })
    }

    if (url.endsWith('/api/auth/me')) {
      return respuesta(401, { message: 'Sesión expirada' })
    }

    if (url.endsWith('/api/auth/refresh')) {
      return respuesta(401, { message: 'Sin refresh' })
    }

    return respuesta(404, { message: `Sin stub para ${url}` })
  }) as unknown as typeof fetch

/**
 * Envia el formulario del gate: escribe email y contrasena y pulsa "Entrar".
 *
 * El evento va en `act` y por el setter del prototipo, igual que `escribir` de
 * `andamiaje.ts`: React descarta el evento si el valor cambio sin su setter
 * nativo.
 */
export const entrarPorElGate = async (
  montaje: MontajeAdmin,
  { email, clave }: { email: string; clave: string }
): Promise<void> => {
  const campo = (selector: string) => {
    const encontrado = montaje.contenedor.querySelector(selector)
    if (!(encontrado instanceof HTMLInputElement)) {
      throw new Error(`No se encontro el campo "${selector}"`)
    }
    return encontrado
  }

  const escribirEn = (nodo: HTMLInputElement, valor: string) => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(nodo), 'value')?.set
    if (setter === undefined) throw new Error('El campo no expone un setter de value')

    act(() => {
      setter.call(nodo, valor)
      nodo.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  escribirEn(campo('#email-admin'), email)
  escribirEn(campo('#clave-admin'), clave)

  const boton = montaje.contenedor.querySelector('button[type="submit"]')
  if (!(boton instanceof HTMLButtonElement)) {
    throw new Error('No se encontro el boton del formulario')
  }

  // El `onSubmit` es async: hay que esperar a que termine el login y el
  // `navigate`.
  await act(async () => {
    boton.click()
  })
}

export const urlsPeticionadas = (mock: unknown): string[] =>
  vi.isMockFunction(mock)
    ? (mock.mock.calls as unknown[][]).map(([entrada]) => String(entrada))
    : []

/** Monta `AdminLayout` con el arbol de rutas del panel, entrando por `ruta`. */
export const montarLayout = (ruta: string): Promise<MontajeAdmin> =>
  montarAdmin(
    createElement(
      Routes,
      null,
      createElement(Route, {
        path: '/admin/*',
        // El `Fragment` es porque `<Routes>` solo acepta `<Route>` o `<Fragment>`
        // como hijos: la marca tiene que convivir con el arbol del panel sin ser
        // una ruta.
        element: createElement(
          Fragment,
          null,
          createElement(MarcaDeRuta),
          createElement(HijasDelPanel)
        )
      })
    ),
    { ruta }
  )

/**
 * Monta **solo** el `AdminGate`, sin `AdminLayout` alrededor.
 *
 * Parece redundante con `montarLayout`, y no lo es. Montado dentro del layout,
 * al gate no se lo puede preguntar a donde mando: `/admin` y
 * `primeraVisible(rol)` dan **el mismo lugar en pantalla**, porque el layout
 * redirige el `/admin` igual. Los dos mecanismos son redundantes a proposito —el
 * layout es la defensa, el gate es la cortesia— y un test del estado final los
 * deja indistinguibles.
 *
 * Aislado, el gate es lo unico que decide, y la pregunta tiene respuesta.
 */
export const montarGate = (): Promise<MontajeAdmin> =>
  montarAdmin(
    createElement(Fragment, null, createElement(MarcaDeRuta), createElement(AdminGate)),
    { ruta: '/admin' }
  )

/**
 * Igual que `montarLayout`, pero con la pagina **real** del Dashboard.
 *
 * Existe para una sola pregunta: si al redirigir se monta o no la seccion
 * vedada. Con una pagina de mentira no hay `fetch` que observar, asi que el
 * unico sintoma posible seria "un frame en blanco", que no se puede afirmar
 * desde el test. Con la real, la pregunta es "¿se pidio `/api/metrics`?", y esa
 * tiene respuesta.
 */
export const montarLayoutReal = (ruta: string): Promise<MontajeAdmin> =>
  montarAdmin(
    createElement(
      Routes,
      null,
      createElement(Route, {
        path: '/admin/*',
        element: createElement(
          Fragment,
          null,
          createElement(MarcaDeRuta),
          createElement(
            Routes,
            null,
            createElement(
              Route,
              { element: createElement(AdminLayout) },
              createElement(Route, { index: true, element: createElement(Dashboard) })
            )
          )
        )
      })
    ),
    { ruta }
  )

/** La ruta en la que quedo el usuario, leida del `MarcaDeRuta`. */
export const rutaActual = (montaje: MontajeAdmin): string | null =>
  montaje.contenedor.querySelector('#ruta-actual')?.textContent ?? null

/** La marca de la pagina montada, o `null` si no hay ninguna. */
export const paginaMontada = (montaje: MontajeAdmin): string | null =>
  montaje.contenedor.querySelector('#pagina')?.textContent ?? null
