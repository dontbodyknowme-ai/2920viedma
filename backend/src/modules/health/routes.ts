import { FastifyInstance } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'

export const healthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  fastify.get(
    '/health',
    {
      schema: jsonSchemas.health.get
    },
    async (_request, reply) => {
      let dbStatus: 'connected' | 'disconnected' = 'connected'

      try {
        await prisma.$queryRaw`SELECT 1`
      } catch {
        dbStatus = 'disconnected'
      }

      const response = {
        status: dbStatus === 'connected' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        db: dbStatus
      }

      if (dbStatus === 'disconnected') {
        return reply.status(503).send(response)
      }

      return response
    }
  )
}