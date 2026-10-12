import { FastifyInstance } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { logger } from '../../utils/logger.js'

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
      } catch (error) {
        dbStatus = 'disconnected'
        // Sin esta linea el healthcheck contestaba "desconectado" sin decir
        // por que. `SELECT 1` no toca ninguna tabla, asi que un fallo aqui es
        // de conexion (host, puerto, credenciales, red), no de schema: pero
        // la diferencia entre esas cuatro cosas solo aparece en el error.
        logger.error({ err: error }, 'No se pudo consultar la base de datos')
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