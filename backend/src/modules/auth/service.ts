import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { UnauthorizedError, ConflictError } from '../../utils/errors.js'
import { env } from '../../config/env.js'
import type { PublicUser, AuthTokens } from '../../shared/types.js'

const prisma = new PrismaClient()

// Hash dummy (de una contrasena aleatoria). Se usa para igualar el tiempo de
// respuesta del login cuando el email no existe: sin esto, `bcrypt.compare` solo
// corre si el usuario existe y el tiempo de respuesta revela que emails estan
// registrados (oraculo de timing).
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const publicUser = (user: { id: string; email: string; name: string; role: string }): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as PublicUser['role']
})

async function issueTokens(user: { id: string; email: string; name: string; role: string }): Promise<AuthTokens> {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL } as jwt.SignOptions
  )

  const plain = randomBytes(32).toString('hex')
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(plain),
      userId: user.id,
      expiresAt: addDays(new Date(), env.REFRESH_TOKEN_DAYS)
    }
  })

  return { accessToken, refreshToken: plain, user: publicUser(user) }
}

export const authService = {
  async register(data: { email: string; password: string; name: string; role?: 'admin' | 'gestor' | 'vendedor' }): Promise<AuthTokens> {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      throw new ConflictError('EMAIL_EXISTS', { email: data.email })
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role || 'vendedor',
        passwordHash
      }
    })

    return issueTokens(user)
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Se compara igual aunque el usuario no exista, para que el tiempo de
      // respuesta no revele que emails estan registrados.
      await bcrypt.compare(password, DUMMY_HASH)
      throw new UnauthorizedError('INVALID_CREDENTIALS')
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('INVALID_CREDENTIALS')
    }
    return issueTokens(user)
  },

  async refresh(plainToken: string): Promise<AuthTokens> {
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(plainToken) },
      include: { user: true }
    })

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN')
    }

    // Rotación: el token viejo deja de valer de inmediato
    await prisma.refreshToken.delete({ where: { id: record.id } })
    return issueTokens(record.user)
  },

  async logout(plainToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { tokenHash: hashToken(plainToken) }
    })
  },

  async getUser(userId: string): Promise<PublicUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true }
    })
    return user ? publicUser(user) : null
  }
}