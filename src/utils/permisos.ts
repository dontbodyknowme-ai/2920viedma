import type { PublicUser } from '../api/schemas.js'

/**
 * Que secciones del panel puede ver cada rol.
 *
 * ## Por que una tabla y no cinco `if`
 *
 * Hay dos lugares del frontend que ya chequeaban roles a mano
 * (`barra_de_navegacion.tsx` y `carta_de_catalogo.tsx`). Con cinco secciones eso
 * son cinco condiciones que hay que leer todas para entender una, y **agregar
 * una seccion es acordarse de tocarla**.
 *
 * Es el mismo motivo por el que `tsconfig.json` y `docker-compose.yml`
 * declaran las variables en un bloque y no repetidas por paso: una lista
 * repetida se desincroniza de la lista real.
 *
 * ## Esta tabla no es la defensa
 *
 * La defensa es el `requireRole` del backend, y ya existe:
 *
 *   /api/wines       admin, gestor
 *   /api/customers   admin, gestor
 *   /api/metrics     admin
 *   /api/orders      admin, gestor, vendedor
 *
 * Se mantienen los dos lugares a proposito. Si esta tabla se desincroniza del
 * backend, el sintoma es un `403` visible en la pantalla — el fallo que **se
 * ve**. Unificar los dos en una sola fuente meteria al backend a depender de
 * un contexto de React que puede no haberse cargado, que es el error mas caro
 * de la historia de este proyecto (ver AGENTS.md, 004-c).
 */

/** Las tres secciones que el usuario pidió. */
export type RolAdmin = PublicUser['role']

/** Cada sección del panel, con la ruta que la sirve. */
export const SECCIONES = [
  { ruta: '/admin', etiqueta: 'Dashboard' },
  { ruta: '/admin/catalogo', etiqueta: 'Catalogo' },
  { ruta: '/admin/pedidos', etiqueta: 'Pedidos' },
  { ruta: '/admin/clientes', etiqueta: 'Clientes' },
  { ruta: '/admin/configuracion', etiqueta: 'Configuracion' }
] as const

export type RutaAdmin = (typeof SECCIONES)[number]['ruta']

/**
 * Quién ve qué. El tipo `Record<RolAdmin, ...>` obliga a que los tres roles
 * estén declarados: agregar un rol al enum rompe la compilación acá, que es
 * justo cuando querés que se entere.
 */
const PERMISOS: Record<RutaAdmin, readonly RolAdmin[]> = {
  '/admin': ['admin'],
  '/admin/catalogo': ['admin', 'gestor'],
  '/admin/pedidos': ['admin', 'gestor', 'vendedor'],
  '/admin/clientes': ['admin', 'gestor'],
  '/admin/configuracion': ['admin', 'gestor']
}

/** ¿Este rol puede abrir esta ruta? */
export const puedeVer = (rol: RolAdmin, ruta: string): boolean =>
  (PERMISOS[ruta as RutaAdmin] ?? []).includes(rol)

/** Las secciones que el rol puede ver, en el orden del panel. */
export const seccionesVisibles = (rol: RolAdmin) =>
  SECCIONES.filter((s) => puedeVer(rol, s.ruta))

/**
 * A dónde mandar a un rol que poked una ruta que no puede ver.
 *
 * Con el panel ordenado como está, la primera visible **es** la de menor
 * privilegio, así que no hay ambigüedad. Si algún día el orden cambia y un
 * rol no tuviera ninguna sección, devuelve `null`: el que llama decide qué
 * hacer, y esconder un `null` como si fuera una ruta rompe la navegación.
 */
export const primeraVisible = (rol: RolAdmin): RutaAdmin | null =>
  seccionesVisibles(rol)[0]?.ruta ?? null
