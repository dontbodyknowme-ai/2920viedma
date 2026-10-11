import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { UnauthorizedError, ConflictError } from '../../utils/errors.js'
import { env } from '../../config/env.js'
import type { PublicUser, AuthTokens } from '../../shared/types.js'

const prisma = new PrismaClient()

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
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
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