import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { env } from '../config/env.js'

export const registerPlugins = fp(async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: false
  })

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  })

  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    keyGenerator: (request) => request.ip
  })

  await fastify.register(multipart, {
    limits: {
      fileSize: env.UPLOAD_MAX_BYTES
    }
  })

  await fastify.register(cookie, {
    secret: env.JWT_SECRET,
    hook: 'onRequest',
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  })

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Vinoteca Backend API',
        version: '1.0.0',
        description: 'API para gestión de vinoteca - Catálogo, Pedidos, Clientes, Métricas'
      },
      servers: [{ url: env.PUBLIC_API_URL }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'refreshToken'
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  })

  await fastify.register(swaggerUI, {
    routePrefix: '/api/docs',
    uiConfig: { docExpansion: 'list' }
  })
})

export { env }