import { FastifyInstance } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { requireRole } from '../auth/middleware.js'

export const customersRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  fastify.get(
    '/api/customers',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.customers.list
    },
    async (request) => {
      const { page, limit, search, tags } = request.query as any
      const where: any = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
      if (tags) {
        const tagArray = tags.split(',').map((t: string) => t.trim())
        where.tags = { hasEvery: tagArray }
      }

      const [data, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { notes: { orderBy: { createdAt: 'desc' }, take: 3 } }
        }),
        prisma.customer.count({ where })
      ])

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  )

  fastify.get(
    '/api/customers/:id',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.customers.get
    },
    async (request, reply) => {
      const { id } = request.params as any

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          notes: { orderBy: { createdAt: 'desc' } },
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { items: { include: { wine: { select: { name: true } } } } }
          }
        }
      })

      if (!customer) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Cliente no encontrado' })
      }

      return customer
    }
  )

  fastify.patch(
    '/api/customers/:id',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.customers.update
    },
    async (request, reply) => {
      const { id } = request.params as any
      const body = request.body as any

      const customer = await prisma.customer.findUnique({ where: { id } })
      if (!customer) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Cliente no encontrado' })
      }

      const updateData: any = {}

      if (body.notes !== undefined) {
        await prisma.note.create({
          data: {
            text: body.notes,
            customerId: id,
            author: request.user!.name
          }
        })
      }
      if (body.tags !== undefined) {
        updateData.tags = body.tags
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: updateData,
        include: { notes: { orderBy: { createdAt: 'desc' } } }
      })

      return updated
    }
  )
}