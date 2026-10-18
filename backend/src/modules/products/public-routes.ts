import { FastifyInstance } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'

export const publicProductsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  fastify.get(
    '/api/products/public',
    {
      schema: jsonSchemas.products.public
    },
    async () => {
      const productos = await prisma.product.findMany({
        where: { activo: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          winery: true,
          varietal: true,
          category: true,
          departamento: true,
          grupo: true,
          tipoVino: true,
          vintage: true,
          price: true,
          description: true,
          tastingNotes: true,
          foodPairing: true,
          imageUrl: true
        }
      })

      return productos
    }
  )
}