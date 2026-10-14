import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { FastifyInstance } from 'fastify'

/**
 * El backend saca al `gestor` de las metricas (spec 006, T4).
 *
 * Es la **unica** linea de produccion que toca la spec, y por eso el test va
 * por la app real con `inject` y no por el middleware suelto: `requireRole` ya
 * lo testeaba `roles.test.ts`, lo que faltaba era comprobar que **esta ruta**
 * lo usa.
 *
 * Un test que llamara a `requireRole('admin')` en un archivo separado del
 * router pasaria aunque la ruta no tuviera ningun `preHandler`: estariamos
 * probando una funcion, no el permiso.
 */

const prismaFalso = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  order: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn()
  },
  orderItem: { groupBy: vi.fn() },
  customer: { findMany: vi.fn(), count: vi.fn() },
  wine: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn() },
  $queryRaw: vi.fn(),
  $on: vi.fn(),
  $disconnect: vi.fn()
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaFalso)
}))

const env = await import('../../src/config/env.js').then(m => m.env)
const { buildApp } = await import('../../src/app.js')

const USUARIOS = {
  admin: { id: 'usr_admin', email: 'admin@vinoteca.local', name: 'Manuel', role: 'admin' },
  gestor: { id: 'usr_gestor', email: 'gestor@vinoteca.local', name: 'Gestor', role: 'gestor' },
  vendedor: { id: 'usr_vend', email: 'vendedor@vinoteca.local', name: 'Vendedor', role: 'vendedor' }
} as const

type Rol = keyof typeof USUARIOS

const firmar = (rol: Rol): string =>
  jwt.sign({ sub: USUARIOS[rol].id, role: USUARIOS[rol].role }, env.JWT_SECRET, {
    expiresIn: '15m'
  })

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()

  // `authenticate` busca el usuario por id. Que resuelva al que corresponda al
  // token es lo que hace que el `role` que ve `requireRole` sea el real y no el
  // del JWT.
  prismaFalso.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(Object.values(USUARIOS).find((u) => u.id === where.id) ?? null)
  )

  // Respuestas vacias pero **con forma**: el dashboard lee `_sum.total` y
  // `_avg.total`, y si el mock devuelve `undefined` el `fast-json-stringify`
  // revienta con `The value "NaN" cannot be converted to a number` —un 500 que
  // no es del permiso y mezcla los dos fallos en el mismo test.
  prismaFalso.order.aggregate.mockResolvedValue({ _sum: { total: 0 }, _avg: { total: 0 } })
  prismaFalso.order.findMany.mockResolvedValue([])
  prismaFalso.order.count.mockResolvedValue(0)
  prismaFalso.order.groupBy.mockResolvedValue([])
  prismaFalso.orderItem.groupBy.mockResolvedValue([])
  prismaFalso.customer.findMany.mockResolvedValue([])
  prismaFalso.customer.count.mockResolvedValue(0)
  prismaFalso.wine.findMany.mockResolvedValue([])
  prismaFalso.wine.count.mockResolvedValue(0)
  prismaFalso.wine.groupBy.mockResolvedValue([])
  prismaFalso.wine.aggregate.mockResolvedValue({ _sum: { total: 0 }, _count: 0 })
})

const pedir = (url: string, rol: Rol) =>
  app.inject({
    method: 'GET',
    url,
    headers: { authorization: `Bearer ${firmar(rol)}` }
  })

describe('GET /api/metrics', () => {
  it('al gestor le da 403', async () => {
    // El cambio de la spec. Antes daba 200 con la facturacion de la tienda
    // entera: ventas de 30 dias, ticket promedio, clientes recurrentes.
    const res = await pedir('/api/metrics', 'gestor')

    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('INSUFFICIENT_ROLE')
  })

  it('al vendedor le da 403', async () => {
    // No cambio con esta spec —el vendedor ya no tenia el dashboard— pero
    // estaba a un `requireRole` de la fila de arriba y nadie lo mira en
    // produccion hasta que alguien rompe algo.
    expect((await pedir('/api/metrics', 'vendedor')).statusCode).toBe(403)
  })

  it('al admin le da 200', async () => {
    const res = await pedir('/api/metrics', 'admin')

    expect(res.statusCode).toBe(200)
    // Y que la consulta exista de verdad: un `403` que se midiera por "no dio
    // 403" pasaria tambien con un 500.
    expect(res.json()).toHaveProperty('salesMonth')
  })

  it('un token que dice admin para un gestor da 403 igual', async () => {
    // El rol se lee de la base, no del JWT. Si algun dia `authenticate` se
    // apoyara en el `role` del token, un token firmado con `role: 'admin'` —que
    // es justo lo que intentaria un atacante— abriria el dashboard entero.
    const tokenFalso = jwt.sign({ sub: USUARIOS.gestor.id, role: 'admin' }, env.JWT_SECRET, {
      expiresIn: '15m'
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/metrics',
      headers: { authorization: `Bearer ${tokenFalso}` }
    })

    expect(res.statusCode).toBe(403)
  })

  it('sin token da 401, no 403', async () => {
    // `authenticate` corre antes que `requireRole`. Un 403 aca significaria que
    // la ruta se puede "usar" sin sesion.
    const res = await app.inject({ method: 'GET', url: '/api/metrics' })

    expect(res.statusCode).toBe(401)
  })

  it('con el gestor, no se toca la base', async () => {
    // El 403 tiene que ocurrir **antes** de la consulta. Si el `preHandler`
    // corriera despues, el gestor veria la pantalla de error de un `403` que
    // llego tarde, con la base ya pegada.
    await pedir('/api/metrics', 'gestor')

    expect(prismaFalso.order.aggregate).not.toHaveBeenCalled()
  })
})

describe('lo que la spec NO toca', () => {
  /**
   * El `gestor` pierde el dashboard y **nada mas**: sigue operando el catalogo,
   * los pedidos y los clientes. Si estas expectativas cambian, el cambio fue
   * otro y se hizo sin avisar.
   */
  const SIN_403: Record<Rol, string[]> = {
    admin: ['/api/metrics', '/api/wines', '/api/orders', '/api/customers'],
    gestor: ['/api/wines', '/api/orders', '/api/customers'],
    vendedor: ['/api/orders']
  }

  for (const [rol, urls] of Object.entries(SIN_403)) {
    for (const url of urls) {
      it(`el ${rol} sigue entrando a ${url}`, async () => {
        expect((await pedir(url, rol as Rol)).statusCode, `${rol} -> ${url}`).toBe(200)
      })
    }
  }

  it('el vendedor sigue sin poder entrar al catalogo ni a los clientes', async () => {
    // La parte que le da sentido a "ver menos modulos": el vendedor ve los
    // pedidos —que traen `customer` adentro— pero no puede listar la base de
    // clientes entera.
    expect((await pedir('/api/wines', 'vendedor')).statusCode).toBe(403)
    expect((await pedir('/api/customers', 'vendedor')).statusCode).toBe(403)
  })
})
