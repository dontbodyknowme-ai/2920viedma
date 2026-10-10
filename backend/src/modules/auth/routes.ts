import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { authService } from './service.js'
import { env } from '../../config/env.js'
import { UnauthorizedError } from '../../utils/errors.js'
import { authenticate } from './middleware.js'

export const authRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: env.LOGIN_RATE_MAX,
          timeWindow: env.RATE_LIMIT_WINDOW,
          keyGenerator: (request) => request.ip
        }
      },
      schema: jsonSchemas.login
    },
    async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
      const { accessToken, refreshToken, user } = await authService.login(request.body.email, request.body.password)

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/'
      })

      return { accessToken, user }
    }
  )

  fastify.post(
    '/api/auth/refresh',
    {
      schema: jsonSchemas.refresh
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookie = request.cookies.refreshToken
      if (!cookie) {
        reply.clearCookie('refreshToken', { path: '/' })
        throw new UnauthorizedError('INVALID_REFRESH_TOKEN')
      }

      const { accessToken, refreshToken, user } = await authService.refresh(cookie)

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/'
      })

      return { accessToken, user }
    }
  )

  fastify.post(
    '/api/auth/logout',
    {
      schema: jsonSchemas.logout
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookie = request.cookies.refreshToken
      if (cookie) {
        await authService.logout(cookie)
      }
      reply.clearCookie('refreshToken', { path: '/' })
      return reply.status(204).send()
    }
  )

  fastify.get(
    '/api/auth/me',
    {
      preHandler: authenticate,
      schema: jsonSchemas.me
    },
    async (request: FastifyRequest) => {
      return request.user ? {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        role: request.user.role
      } : null
    }
  )
}