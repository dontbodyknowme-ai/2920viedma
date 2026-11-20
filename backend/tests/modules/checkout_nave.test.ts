import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * El circuito automatizado con Nave (spec 012), contra el simulador.
 *
 * ## Que se prueba de punta a punta
 *
 * `POST /api/orders` crea el cobro **solo** y devuelve link + QR;
 * `GET /api/track/:token` muestra el pedido sin exponer el id interno;
 * `POST /api/track/:token/pay` reintenta sin duplicar cobros;
 * `POST /api/orders/webhook/nave` autentica, guarda el evento y aplica el pago.
 *
 * Es el mismo camino de codigo que en produccion salvo `SimuladorNave`, que
 * implementa el mismo `ClienteNave` que el cliente HTTP real. Lo que **no**
 * prueba: que Nave acepte el cobro (eso necesita credenciales, T001).
 */

process.env.PAGO_MODO = 'nave'
process.env.NAVE_MODE = 'mock'
process.env.NAVE_WEBHOOK_SECRET = 'secreto-de-nave-para-tests'

const prismaFalso = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
  customer: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  order: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  orderTimeline: { create: vi.fn() },
  paymentAttempt: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  webhookEvent: { create: vi.fn(), update: vi.fn() },
  user: { findUnique: vi.fn() },
  $on: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn()
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaFalso)
}))

const { buildApp } = await import('../../src/app.js')
const { obtenerSimuladorNave } = await import('../../src/modules/pagos/nave/index.js')

const TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const CUID_VINO = 'clx111111111'
const PRECIO = 5000

const COMPRADOR = {
  nombre: 'María',
  apellido: 'González',
  telefono: '11 1234-5678',
  email: 'maria@example.com',
  direccion: 'Av. Corrientes 1234, Buenos Aires'
}

const cuerpo = () => ({
  ...COMPRADOR,
  items: [{ vinoId: CUID_VINO, cantidad: 2 }]
})

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

const pedidoPublico = (extra: Record<string, unknown> = {}) => ({
  id: 'ord_1',
  publicToken: TOKEN,
  status: 'pendiente',
  pagoEstado: 'pendiente',
  total: PRECIO * 2,
  createdAt: new Date('2026-10-28T12:00:00Z'),
  shippingAddress: { direccion: COMPRADOR.direccion },
  customer: { name: 'María González', email: COMPRADOR.email, phone: '1112345678' },
  items: [{ productoId: CUID_VINO, quantity: 2, price: PRECIO, producto: { name: 'Malbec' } }],
  attempts: [],
  ...extra
})

beforeEach(() => {
  vi.clearAllMocks()

  prismaFalso.product.findMany.mockResolvedValue([
    { id: CUID_VINO, name: 'Malbec', price: PRECIO, stock: 10 }
  ])
  prismaFalso.customer.findUnique.mockResolvedValue(null)
  prismaFalso.customer.create.mockResolvedValue({ id: 'cus_1' })
  prismaFalso.customer.update.mockResolvedValue({ id: 'cus_1' })
  prismaFalso.order.create.mockResolvedValue({ id: 'ord_1', publicToken: TOKEN })
  prismaFalso.order.update.mockResolvedValue({ id: 'ord_1' })
  prismaFalso.order.updateMany.mockResolvedValue({ count: 1 })
  prismaFalso.paymentAttempt.create.mockResolvedValue({ id: 'int_1' })
  prismaFalso.paymentAttempt.update.mockResolvedValue({ id: 'int_1' })
  prismaFalso.webhookEvent.create.mockResolvedValue({ id: 'evt_1' })
  prismaFalso.webhookEvent.update.mockResolvedValue({ id: 'evt_1' })
})

describe('el checkout crea el cobro solo', () => {
  it('devuelve link y QR sin ningun paso manual', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders', payload: cuerpo() })

    expect(res.statusCode).toBe(201)
    const json = res.json()

    expect(json.modo).toBe('nave')
    expect(json.orderToken).toBe(TOKEN)
    expect(json.initPoint).toContain('/pago-simulado/nave_mock_')
    expect(json.qr.imagenUrl).toContain('/qr.svg')
    expect(json.qr.payload).toContain('NAVE-SIMULADO')
    expect(json.expiraEn).toBeTruthy()

    // El pedido queda `pendiente` y el intento guarda el id externo: sin eso,
    // la webhook no puede cruzarlo con la orden.
    expect(prismaFalso.paymentAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenciaExterna: expect.stringMatching(/^nave_mock_/),
          checkoutUrl: json.initPoint
        })
      })
    )
  })

  it('el link lleva a la pasarela simulada, no a una pagina de mentira', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders', payload: cuerpo() })
    const json = res.json()
    const id = String(json.initPoint).split('/').pop()

    const pagina = await app.inject({ method: 'GET', url: `/pago-simulado/${id}` })
    expect(pagina.statusCode).toBe(200)
    expect(pagina.body).toContain('Pasarela simulada')
    expect(pagina.body).toContain('Simular pago aprobado')

    const qr = await app.inject({ method: 'GET', url: `/pago-simulado/${id}/qr.svg` })
    expect(qr.statusCode).toBe(200)
    expect(qr.headers['content-type']).toContain('image/svg+xml')
    // No es un QR escaneable, y lo dice: un QR falso que parece real es peor.
    expect(qr.body).toContain('SIMULADO')
  })
})

describe('GET /api/track/:token', () => {
  it('devuelve el pedido sin el id interno', async () => {
    prismaFalso.order.findUnique.mockResolvedValue(
      pedidoPublico({
        attempts: [
          {
            id: 'int_1',
            proveedor: 'nave',
            estado: 'pendiente',
            referenciaExterna: 'nave_mock_1',
            checkoutUrl: 'http://localhost:3000/pago-simulado/nave_mock_1',
            qrImagenUrl: 'http://localhost:3000/pago-simulado/nave_mock_1/qr.svg',
            qrPayload: 'NAVE-SIMULADO:ord_1:10000',
            expiresAt: new Date('2026-10-28T13:00:00Z')
          }
        ]
      })
    )

    const res = await app.inject({ method: 'GET', url: `/api/track/${TOKEN}` })

    expect(res.statusCode).toBe(200)
    const json = res.json()

    expect(json.orderToken).toBe(TOKEN)
    expect(json.referencia).toBe(TOKEN.slice(0, 8).toUpperCase())
    expect(json.total).toBe(PRECIO * 2)
    expect(json.items).toEqual([{ nombre: 'Malbec', cantidad: 2, precio: PRECIO }])
    expect(json.pago.link).toContain('/pago-simulado/')
    expect(json.pago.estado).toBe('pendiente')
    // El id interno no es la llave publica y no viaja.
    expect(json.orderId).toBeUndefined()
  })

  it('un token que no existe es 404', async () => {
    prismaFalso.order.findUnique.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/api/track/token-inexistente' })

    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/track/:token/pay', () => {
  it('genera un cobro nuevo si el anterior vencio', async () => {
    prismaFalso.order.findUnique.mockResolvedValue(
      pedidoPublico({
        attempts: [
          {
            id: 'int_1',
            proveedor: 'nave',
            estado: 'expirado',
            referenciaExterna: 'nave_mock_viejo',
            checkoutUrl: 'http://localhost:3000/pago-simulado/nave_mock_viejo',
            qrImagenUrl: null,
            qrPayload: null,
            expiresAt: new Date('2020-01-01T00:00:00Z')
          }
        ]
      })
    )

    const res = await app.inject({ method: 'POST', url: `/api/track/${TOKEN}/pay`, payload: {} })

    expect(res.statusCode).toBe(201)
    const json = res.json()

    expect(json.initPoint).toContain('/pago-simulado/nave_mock_')
    expect(json.initPoint).not.toContain('nave_mock_viejo')
    expect(prismaFalso.paymentAttempt.create).toHaveBeenCalledTimes(1)
  })

  it('reutiliza el link vigente en vez de crear otro cobro', async () => {
    prismaFalso.order.findUnique.mockResolvedValue(
      pedidoPublico({
        attempts: [
          {
            id: 'int_1',
            proveedor: 'nave',
            estado: 'pendiente',
            referenciaExterna: 'nave_mock_vigente',
            checkoutUrl: 'http://localhost:3000/pago-simulado/nave_mock_vigente',
            qrImagenUrl: null,
            qrPayload: 'payload',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
          }
        ]
      })
    )

    const res = await app.inject({ method: 'POST', url: `/api/track/${TOKEN}/pay`, payload: {} })

    expect(res.statusCode).toBe(201)
    expect(res.json().initPoint).toBe('http://localhost:3000/pago-simulado/nave_mock_vigente')
    // Dos links vivos para el mismo pedido es un pago de mas esperando a pasar.
    expect(prismaFalso.paymentAttempt.create).not.toHaveBeenCalled()
  })

  it('un pedido ya pagado no se vuelve a cobrar', async () => {
    prismaFalso.order.findUnique.mockResolvedValue(pedidoPublico({ pagoEstado: 'aprobado' }))

    const res = await app.inject({ method: 'POST', url: `/api/track/${TOKEN}/pay`, payload: {} })

    expect(res.statusCode).toBe(409)
    expect(prismaFalso.paymentAttempt.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/orders/webhook/nave', () => {
  const webhook = (secreto: string, body: unknown) =>
    app.inject({
      method: 'POST',
      url: '/api/orders/webhook/nave',
      headers: { 'x-nave-secret': secreto },
      payload: body as never
    })

  it('sin secreto no se acepta nada', async () => {
    const res = await webhook('secreto-equivocado', { data: { id: 'nave_mock_1' } })

    expect(res.statusCode).toBe(401)
    expect(prismaFalso.webhookEvent.create).not.toHaveBeenCalled()
    expect(prismaFalso.order.updateMany).not.toHaveBeenCalled()
  })

  it('un evento sin id se acepta y no se procesa', async () => {
    const res = await webhook('secreto-de-nave-para-tests', { type: 'ping' })

    expect(res.statusCode).toBe(202)
    expect(prismaFalso.webhookEvent.create).not.toHaveBeenCalled()
  })

  it('guarda el evento ANTES de procesar y aplica el pago aprobado', async () => {
    // El cobro real lo creo el checkout: se aprueba en el simulador y despues
    // llega la notificacion. Asi se prueba el cruce por id externo.
    const creado = await app.inject({ method: 'POST', url: '/api/orders', payload: cuerpo() })
    const id = String(creado.json().initPoint).split('/').pop() as string

    const simulador = obtenerSimuladorNave()
    expect(simulador).not.toBeNull()
    expect(simulador!.cambiarEstado(id, 'aprobado')).toBe(true)

    prismaFalso.order.findUnique.mockResolvedValue({
      id: 'ord_1',
      customerId: 'cus_1',
      total: PRECIO * 2,
      pagoEstado: 'pendiente'
    })

    const res = await webhook('secreto-de-nave-para-tests', { data: { id } })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ received: true, applied: true, estado: 'aprobado' })

    // La auditoria existe y quedo marcada como procesada.
    expect(prismaFalso.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proveedor: 'nave', referencia: id })
      })
    )
    expect(prismaFalso.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt_1' },
      data: { processed: true }
    })

    // La transicion condicional movio el pedido y sumo las metricas una sola vez.
    expect(prismaFalso.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', pagoEstado: { in: ['no_iniciado', 'pendiente', 'expirado'] } },
      data: { pagoEstado: 'aprobado' }
    })
    expect(prismaFalso.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalOrders: { increment: 1 } }) })
    )
  })
})
