import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * La tabla de permisos del **frontend** contra los `requireRole` del **backend**.
 *
 * Los dos lados declaran la misma matriz y no se hablan. Es a proposito: el
 * backend la lee desde un JWT validado y el frontend desde un contexto de
 * React que puede no haberse cargado, y unificar los dos meteria al backend a
 * depender de algo que todavia no existe. `deploy.test.ts` ya lee archivos de
 * otros proyectos del repo por el mismo motivo.
 *
 * El costo de tenerlos separados es que se pueden desincronizar. Y el costo de
 * que se desincronicen no es un agujero: es un `403` visible, con la seccion
 * dibujada en el menu y un error al abrirla. Ese fallo se ve. El que no se ve
 * es el contrario — backend mas permisivo que la tabla — y **este test no lo
 * tapa**: para eso haria falta invocar la API con cada rol, que es integracion.
 *
 * Lo que si tapa: la tabla mostrando **mas** de lo que el backend permite. Que es
 * justo el bug que la spec 006 vino a arreglar.
 */

const RAIZ = join(__dirname, '..', '..', '..')

const leer = (ruta: string): string => readFileSync(join(RAIZ, ruta), 'utf8')

type Rol = 'admin' | 'gestor' | 'vendedor'

/** Los roles que el backend acepta en cada endpoint de lectura, por prefijo. */
const leerRequireRole = (): Map<string, Set<Rol>> => {
  const porRuta = new Map<string, Set<Rol>>()

  const modulos = readdirSync(join(RAIZ, 'backend', 'src', 'modules'), {
    withFileTypes: true
  })

  for (const mod of modulos) {
    const archivo = join(RAIZ, 'backend', 'src', 'modules', mod.name, 'routes.ts')
    const fuente = readFileSync(archivo, 'utf8')

    // `fastify.get('/api/orders', { ... preHandler: requireRole('admin', 'gestor', 'vendedor') ... })`
    // Se empareja cada ruta con el requireRole que la sigue, que es como
    // Fastify los declara siempre juntos.
    const bloques = [...fuente.matchAll(/'(\/api\/[^']*)'[\s\S]{0,400}?requireRole\(([^)]*)\)/g)]

    for (const [, ruta, roles] of bloques) {
      const lista = [...roles.matchAll(/'(admin|gestor|vendedor)'/g)].map((m) =>
        m[1]
      ) as Rol[]

      // El primer `requireRole` de una ruta es el que manda: los endpoints
      // con `requireRole('admin')` mas adentro son parte de uno mas abierto.
      if (!porRuta.has(ruta)) porRuta.set(ruta, new Set(lista))
    }
  }

  return porRuta
}

/** La tabla del frontend, leida del fuente para no duplicarla aca. */
const leerTablaFrontend = (): Map<string, Set<Rol>> => {
  const fuente = leer('src/utils/permisos.ts')
  const porRuta = new Map<string, Set<Rol>>()

  const bloques = [...fuente.matchAll(/'(\/admin[^']*)':\s*\[([^\]]*)\]/g)]

  for (const [, ruta, roles] of bloques) {
    const lista = [...roles.matchAll(/'(admin|gestor|vendedor)'/g)].map((m) => m[1]) as Rol[]
    porRuta.set(ruta, new Set(lista))
  }

  return porRuta
}

/** Que endpoint del backend sirve cada seccion del panel. */
const RUTA_POR_SECCION: Record<string, string> = {
  '/admin': '/api/metrics',
  '/admin/catalogo': '/api/wines',
  '/admin/pedidos': '/api/orders',
  '/admin/clientes': '/api/customers',
  '/admin/configuracion': '/api/wines'
}

describe('la tabla del frontend coincide con el requireRole del backend', () => {
  const backend = leerRequireRole()
  const frontend = leerTablaFrontend()

  it('se pudo leer la tabla del frontend', () => {
    // Si el formato del archivo cambia, esto falla aca y no con un
    // "todo bien" sobre una tabla vacia.
    expect(frontend.size).toBe(5)
  })

  for (const [seccion, endpoint] of Object.entries(RUTA_POR_SECCION)) {
    it(`"${seccion}" no promete mas que ${endpoint}`, () => {
      const permitidosBackend = backend.get(endpoint)
      const permitidosTabla = frontend.get(seccion)

      expect(permitidosBackend, `${endpoint} no se encontro en el backend`).toBeDefined()
      expect(permitidosTabla, `${seccion} no esta en la tabla`).toBeDefined()

      const deMas = [...(permitidosTabla as Set<Rol>)].filter(
        (rol) => !(permitidosBackend as Set<Rol>).has(rol)
      )

      expect(
        deMas,
        `la tabla deja ver ${seccion} a ${deMas.join(', ')}, pero ${endpoint} no lo permite`
      ).toEqual([])
    })
  }
})
