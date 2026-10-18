import { describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { jsonSchemas } from '../../src/shared/json-schemas.js'

/**
 * Los response schemas NO pueden recortar datos.
 *
 * Este archivo existe por un bug que no atrapo ningun test de servicio: el
 * login respondia **200** con `user: {}` y el dashboard con `{}`, sin un solo
 * error en ninguna parte. Todo estaba "funcionando".
 *
 * La causa es que Fastify no serializa con `JSON.stringify`: compila el
 * `response.schema` con `fast-json-stringify`, que **descarta lo que no este
 * declarado**. Los schemas de `json-schemas.ts` eran placeholders
 * (`{ type: 'object' }`, que no declara ninguna propiedad), asi que el
 * serializador se comia el cuerpo entero de la respuesta.
 *
 * Por eso el test arma una app de Fastify de verdad, con el schema real, y le
 * pide que serialice una respuesta con contenido. Si alguien vuelve a poner un
 * `{ type: 'object' }` a secas, esto falla en el CI y no en produccion.
 *
 * App nueva por test a proposito: `inject()` pone el server en marcha y
 * Fastify no deja registrar rutas despues (`FST_ERR_INSTANCE_ALREADY_LISTENING`).
 */

/** Serializa `cuerpo` con `schema` y devuelve lo que el cliente recibio. */
const serializar = async (
  schema: unknown,
  cuerpo: unknown,
  status: number
): Promise<{ statusCode: number; cuerpo: Record<string, unknown> }> => {
  const app = Fastify({ logger: false })

  app.post(
    '/prueba',
    { schema: { response: { [status]: schema } } },
    async (_request, reply) => reply.status(status).send(cuerpo as never)
  )

  const respuesta = await app.inject({ method: 'POST', url: '/prueba' })
  await app.close()

  return { statusCode: respuesta.statusCode, cuerpo: respuesta.json() }
}

const USUARIO = {
  id: 'usr_1',
  email: 'admin@vinoteca.local',
  name: 'Administrador',
  role: 'admin'
}

const VINO = {
  id: 'vino_1',
  name: 'Gran Reserva Malbec',
  winery: 'Escorihuela',
  varietal: 'Malbec',
  category: 'Tinto',
  vintage: 2019,
  price: 45000,
  imageUrl: 'https://cdn.vinoteca.local/m.webp',
  stock: 10,
  activo: true
}

describe('los response schemas conservan los datos', () => {
  it('login devuelve el usuario con su rol', async () => {
    // Este es el que rompia el panel: sin `role`, `hasRole('admin')` daba
    // false y el boton de "Panel Admin" no aparecia hasta recargar la pagina.
    const { statusCode, cuerpo } = await serializar(
      jsonSchemas.login.response[200],
      { accessToken: 'token-falso', user: USUARIO },
      200
    )

    expect(statusCode).toBe(200)
    expect(cuerpo.user).toEqual(USUARIO)
    expect((cuerpo.user as { role: string }).role).toBe('admin')
  })

  it('refresh devuelve el usuario con su rol', async () => {
    const { cuerpo } = await serializar(
      jsonSchemas.refresh.response[200],
      { accessToken: 'token-falso', user: USUARIO },
      200
    )

    expect((cuerpo.user as { role: string }).role).toBe('admin')
  })

  it('auth/me devuelve el usuario con su rol', async () => {
    const { cuerpo } = await serializar(jsonSchemas.me.response[200], USUARIO, 200)

    expect(cuerpo).toEqual(USUARIO)
  })

  it('el alta de producto devuelve el producto creado', async () => {
    // Antes devolvia `201 {}`: el panel guardaba bien y despues refrescaba la
    // lista para poder ver el producto que recien habia creado.
    const { statusCode, cuerpo } = await serializar(
      jsonSchemas.products.create.response[201],
      VINO,
      201
    )

    expect(statusCode).toBe(201)
    expect(cuerpo.name).toBe('Gran Reserva Malbec')
    expect(cuerpo.price).toBe(45000)
    expect(cuerpo.stock).toBe(10)
  })

  it('la edicion de producto devuelve el producto actualizado', async () => {
    const { cuerpo } = await serializar(
      jsonSchemas.products.update.response[200],
      { ...VINO, name: 'Malbec 2021' },
      200
    )

    expect(cuerpo.name).toBe('Malbec 2021')
  })

  it('la lista de productos conserva la pagina y sus filas', async () => {
    const { cuerpo } = await serializar(
      jsonSchemas.products.list.response[200],
      { data: [VINO], total: 1, page: 1, limit: 10, totalPages: 1 },
      200
    )

    expect(cuerpo.total).toBe(1)
    expect((cuerpo.data as unknown[])[0]).toEqual(VINO)
  })

  it('el catalogo publico conserva los productos', async () => {
    const { cuerpo } = await serializar(jsonSchemas.products.public.response[200], [VINO], 200)

    expect(Array.isArray(cuerpo)).toBe(true)
    expect((cuerpo as unknown[])[0]).toEqual(VINO)
  })

  it('el detalle de pedido devuelve el pedido', async () => {
    const pedido = {
      id: 'ped_1',
      status: 'pendiente',
      customerName: 'Ana',
      total: 45000,
      items: [{ productoId: 'vino_1', quantity: 1, price: 45000 }],
      timeline: [{ status: 'pendiente', createdAt: '2026-01-15T10:00:00Z' }]
    }
    const { cuerpo } = await serializar(jsonSchemas.orders.get.response[200], pedido, 200)

    expect(cuerpo.total).toBe(45000)
    expect(cuerpo.items).toHaveLength(1)
  })

  it('el detalle de cliente devuelve el cliente', async () => {
    const cliente = { id: 'cli_1', name: 'Ana', email: 'ana@vinoteca.local', tags: ['vip'] }
    const { cuerpo } = await serializar(jsonSchemas.customers.get.response[200], cliente, 200)

    expect(cuerpo.email).toBe('ana@vinoteca.local')
    expect(cuerpo.tags).toEqual(['vip'])
  })

  it('las metricas del dashboard no vuelven vacias', async () => {
    // El dashboard leia `salesToday`, `salesLast30Days` y `topProducts` de
    // `{}`: todas las tarjetas en cero y el grafico sin datos.
    const metricas = {
      salesToday: 120000,
      salesWeek: 480000,
      salesMonth: 1900000,
      avgTicket: 45000,
      conversion: 3.2,
      salesLast30Days: [{ date: '2026-10-10', total: 120000 }],
      topProducts: [{ id: 'vino_1', name: 'Malbec', total: 3 }]
    }
    const { cuerpo } = await serializar(jsonSchemas.metrics.get.response[200], metricas, 200)

    expect(cuerpo.salesToday).toBe(120000)
    expect(cuerpo.salesLast30Days).toHaveLength(1)
    expect((cuerpo.topProducts as { name: string }[])[0].name).toBe('Malbec')
  })

  it('los errores conservan `code`, `message` y `details`', async () => {
    const { statusCode, cuerpo } = await serializar(
      jsonSchemas.products.create.response[400],
      { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: { price: 'requerido' } },
      400
    )

    expect(statusCode).toBe(400)
    expect(cuerpo.code).toBe('VALIDATION_ERROR')
    // `details` no esta declarado en el schema: si alguna vez se vuelve a
    // cortar, el admin pierde el motivo por el que el formulario reboto.
    expect(cuerpo.details).toEqual({ price: 'requerido' })
  })
})