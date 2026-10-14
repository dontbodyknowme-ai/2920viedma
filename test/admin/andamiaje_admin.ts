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

import { act, createElement, type ReactNode } from 'react'
import { vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../src/hooks/useAuth'
import type { PublicUser } from '../../src/api/schemas'
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
