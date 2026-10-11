import jwt from 'jsonwebtoken'
import { FastifyRequest } from 'fastify'
import { env } from '../../config/env.js'
import { UnauthorizedError, ForbiddenError } from '../../utils/errors.js'
import type { JwtPayload, UserRole } from '../../shared/types.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      name: string
      role: UserRole
      passwordHash: string
      createdAt: Date
      updatedAt: Date
      refreshTokens?: Array<{ id: string; tokenHash: string; expiresAt: Date }>
    }
  }
}

export const authenticate = async (request: FastifyRequest): Promise<void> => {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError()
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload
    const user = await request.server.prisma.user.findUnique({
      where: { id: payload.sub }
    })
    if (!user) {
      throw new UnauthorizedError()
    }
    request.user = user
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('TOKEN_EXPIRED')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('INVALID_TOKEN')
    }
    throw error
  }
}

export const requireRole =
  (...roles: UserRole[]) =>
  async (request: FastifyRequest): Promise<void> => {
    await authenticate(request)
    if (!roles.includes(request.user!.role)) {
      throw new ForbiddenError()
    }
  }

export const optionalAuth = async (request: FastifyRequest): Promise<void> => {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return
  }

  try {
    await authenticate(request)
  } catch {
    // Silenciosamente ignora tokens inválidos en auth opcional
  }
}