import { FastifyInstance } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'

export const publicWinesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  fastify.get(
    '/api/wines/public',
    {
      schema: jsonSchemas.wines.public
    },
    async () => {
      const wines = await prisma.wine.findMany({
        where: { activo: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          winery: true,
          varietal: true,
          category: true,
          departamento: true,
          vintage: true,
          price: true,
          description: true,
          tastingNotes: true,
          foodPairing: true,
          imageUrl: true
        }
      })

      return wines
    }
  )
}