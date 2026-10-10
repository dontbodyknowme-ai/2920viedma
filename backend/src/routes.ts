import { FastifyInstance } from 'fastify'
import { authRoutes } from './modules/auth/routes.js'
import { winesRoutes } from './modules/wines/routes.js'
import { publicWinesRoutes } from './modules/wines/public-routes.js'
import { ordersRoutes } from './modules/orders/routes.js'
import { customersRoutes } from './modules/customers/routes.js'
import { metricsRoutes } from './modules/metrics/routes.js'
import { uploadRoutes } from './modules/upload/routes.js'
import { healthRoutes } from './modules/health/routes.js'

export const registerRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await fastify.register(authRoutes)
  await fastify.register(winesRoutes)
  await fastify.register(publicWinesRoutes)
  await fastify.register(ordersRoutes)
  await fastify.register(customersRoutes)
  await fastify.register(metricsRoutes)
  await fastify.register(uploadRoutes)
  await fastify.register(healthRoutes)
}