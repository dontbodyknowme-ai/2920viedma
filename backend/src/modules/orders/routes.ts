import { FastifyInstance } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { requireRole } from '../auth/middleware.js'
import { orderCreateSchema } from '../../shared/schemas.js'
import { crearPedido } from './service.js'

export const ordersRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  /**
   * `POST /api/orders` — el checkout. **Publico**, a diferencia del `GET` y el
   * `PATCH` de este mismo archivo: lo llama alguien que no tiene sesion, porque
   * no tiene cuenta (spec 009, RF-01).
   *
   * El unico chequeo es el **shape**: que mande vinoId y cantidad, no precios.
   * Todo lo demas lo decide `service.ts`.
   */
  fastify.post(
    '/api/orders',
    { schema: jsonSchemas.orders.create },
    async (request, reply) => {
      const cuerpo = orderCreateSchema.safeParse(request.body)

      if (!cuerpo.success) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Datos invalidos',
          details: cuerpo.error.flatten()
        })
      }

      // La webhook necesita una URL **absoluta** y publica. `PUBLIC_API_URL` es
      // del backend; si no esta (que no deberia pasar, `env.ts` la exige), el
      // checkout falla con un error claro en vez de mandar una Preference sin
      // `notification_url`, que es el fallo invisible: el pedido queda esperando
      // pago para siempre sin que nadie sepa por que.
      const webhookUrl = `${process.env.PUBLIC_API_URL ?? ''}/api/orders/webhook`

      const resultado = await crearPedido(prisma, request.body, webhookUrl)

      return reply.status(201).send(resultado)
    }
  )

  fastify.get(
    '/api/orders',
    {
      preHandler: requireRole('admin', 'gestor', 'vendedor'),
      schema: jsonSchemas.orders.list
    },
    async (request) => {
      const { page, limit, status, dateFrom, dateTo, search } = request.query as any
      const where: any = {}

      if (status) where.status = status
      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom + 'T00:00:00')
        if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59')
      }
      if (search) {
        where.OR = [
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { id: { contains: search } }
        ]
      }

      const [data, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, email: true } },
            items: { include: { wine: { select: { name: true, imageUrl: true } } } }
          }
        }),
        prisma.order.count({ where })
      ])

      return {
        data: data.map(order => ({
          ...order,
          items: order.items.map(item => ({
            wineId: item.wineId,
            wineName: item.wine.name,
            imageUrl: item.wine.imageUrl,
            quantity: item.quantity,
            price: item.price
          }))
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  )

  fastify.get(
    '/api/orders/:id',
    {
      preHandler: requireRole('admin', 'gestor', 'vendedor'),
      schema: jsonSchemas.orders.get
    },
    async (request, reply) => {
      const { id } = request.params as any

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: true,
          items: { include: { wine: { select: { name: true, imageUrl: true } } } },
          timeline: { orderBy: { createdAt: 'asc' } }
        }
      })

      if (!order) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Pedido no encontrado' })
      }

      return {
        ...order,
        items: order.items.map(item => ({
          wineId: item.wineId,
          wineName: item.wine.name,
          imageUrl: item.wine.imageUrl,
          quantity: item.quantity,
          price: item.price
        }))
      }
    }
  )

  fastify.patch(
    '/api/orders/:id',
    {
      preHandler: requireRole('admin', 'gestor', 'vendedor'),
      schema: jsonSchemas.orders.update
    },
    async (request, reply) => {
      const { id } = request.params as any
      const body = request.body as any
      const user = request.user!

      if (user.role === 'vendedor' && Object.keys(body).some(k => k !== 'status')) {
        return reply.status(403).send({ code: 'INSUFFICIENT_ROLE', message: 'Rol sin permiso para esta operación' })
      }

      const order = await prisma.order.findUnique({ where: { id } })
      if (!order) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Pedido no encontrado' })
      }

      if (body.status && order.status === body.status) {
        const full = await prisma.order.findUnique({
          where: { id },
          include: {
            customer: true,
            items: { include: { wine: { select: { name: true, imageUrl: true } } } },
            timeline: { orderBy: { createdAt: 'asc' } }
          }
        })
        return full!
      }

      await prisma.$transaction([
        prisma.order.update({
          where: { id },
          data: { status: body.status }
        }),
        ...(body.status ? [prisma.orderTimeline.create({
          data: { orderId: id, status: body.status, author: user.name }
        })] : [])
      ])

      const full = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: true,
          items: { include: { wine: { select: { name: true, imageUrl: true } } } },
          timeline: { orderBy: { createdAt: 'asc' } }
        }
      })

      return full!
    }
  )
}