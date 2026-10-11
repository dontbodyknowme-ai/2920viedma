import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply, onRequestHookHandler } from 'fastify'
import { ZodError } from 'zod'
import { registerPlugins } from './plugins/index.js'
import { AppError } from './utils/errors.js'
import { env } from './config/env.js'
import { registerRoutes } from './routes.js'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { logger } from './utils/logger.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
  interface FastifyRequest {
    requestId: string
    startTime: number
  }
}

const requestContextHook: onRequestHookHandler = async (request, reply) => {
  request.requestId = (request.headers['x-request-id'] as string) || randomUUID()
  request.startTime = Date.now()

  reply.header('x-request-id', request.requestId)

  const logRequest = () => {
    const duration = Date.now() - request.startTime
    logger.info({
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      userId: (request.user as { id?: string } | undefined)?.id
    }, 'request completed')
  }

  reply.raw.on('finish', logRequest)
  reply.raw.on('close', logRequest)
}

export const buildApp = async (): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: false,
    ajv: { customOptions: { strict: false } }
  })

  fastify.decorate('prisma', new PrismaClient())

  await fastify.register(registerPlugins)
  fastify.addHook('onRequest', requestContextHook)

  fastify.addHook('onRequest', async (request) => {
    request.headers['x-request-id'] = request.requestId
  })

  fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: error.flatten()
      })
    }

    if (error instanceof AppError) {
      request.log.warn(
        { code: error.code, statusCode: error.statusCode, requestId: request.requestId },
        error.message
      )
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && { details: error.details })
      })
    }

    request.log.error(
      { err: error, requestId: request.requestId },
      'Error no manejado'
    )

    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(env.NODE_ENV === 'development' && { stack: error.stack })
    })
  })

  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      code: 'NOT_FOUND',
      message: `Ruta ${request.method} ${request.url} no encontrada`
    })
  })

  await registerRoutes(fastify)

  fastify.addHook('onClose', async () => {
    await fastify.prisma.$disconnect()
  })

  return fastify
}