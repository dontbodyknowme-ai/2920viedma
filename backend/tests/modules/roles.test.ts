import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { FastifyRequest } from 'fastify'

/**
 * Middleware de autenticacion y roles.
 *
 * Acá se decide una sola cosa: **que puede hacer cada rol**. El test que mas
 * importa es el de `requireRole` con un rol insuficiente, porque ese es el
 * unico lugar del backend donde se frena una peticion antes de que toque la
 * base. Si `requireRole`_CALLARA_ por ejemplo por una coma mal puesta, el
 * endpoint quedaria abierto para cualquier usuario autenticado - y como el
 * token es valido, no habria ni un error en los logs para sospechar.
 */

const env = await import('../../src/config/env.js').then(m => m.env)
const { authenticate, requireRole, optionalAuth } = await import('../../src/modules/auth/middleware.js')
const { UnauthorizedError, ForbiddenError } = await import('../../src/utils/errors.js')

const USUARIO = {
  id: 'usr_1',
  email: 'gestor@vinoteca.local',
  name: 'Gestor',
  role: 'vendedor',
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date()
}

const firmar = (over: Record<string, unknown>, expiresIn: string | number = '15m'): string =>
  jwt.sign({ sub: USUARIO.id, role: 'vendedor', ...over }, env.JWT_SECRET, { expiresIn })

const crearRequest = (authorization?: string): FastifyRequest =>
  ({
    headers: authorization === undefined ? {} : { authorization },
    server: { prisma: { user: { findUnique: vi.fn().mockResolvedValue(USUARIO) } } }
  }) as unknown as FastifyRequest

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authenticate', () => {
  it('rechaza una peticion sin header Authorization', async () => {
    await expect(authenticate(crearRequest())).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rechaza un esquema distinto a Bearer', async () => {
    // Un `Basic ...` o un token pegado sin prefijo no es un bearer token.
    await expect(authenticate(crearRequest('abc.def.ghi'))).rejects.toMatchObject({
      code: 'UNAUTHORIZED'
    })
  })

  it('distingue token expirado de token invalido', async () => {
    // El panel usa el codigo para decidir si refresca solo o manda a login.
    // Fusionarlos en un unico error saca la renovacion automatica.
    await expect(authenticate(crearRequest(`Bearer ${firmar({}, '-1s')}`))).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED'
    })
    await expect(authenticate(crearRequest('Bearer no.es.un.jwt'))).rejects.toMatchObject({
      code: 'INVALID_TOKEN'
    })
  })

  it('cuelga el usuario en la peticion cuando el token es valido', async () => {
    const request = crearRequest(`Bearer ${firmar({})}`)

    await authenticate(request)

    expect(request.user?.id).toBe(USUARIO.id)
    expect(request.user?.role).toBe('vendedor')
  })

  it('rechaza un token valido de un usuario que ya no existe', async () => {
    // El token dura 15 minutos: si el usuario se da de baja en el medio, la
    // firma sola no alcanza y hay que ir a la base.
    const request = crearRequest(`Bearer ${firmar({})}`)
    vi.mocked(request.server.prisma.user.findUnique).mockResolvedValueOnce(null)

    await expect(authenticate(request)).rejects.toBeInstanceOf(UnauthorizedError)
  })
})

describe('requireRole', () => {
  it('deja pasar cuando el rol esta en la lista', async () => {
    const request = crearRequest(`Bearer ${firmar({})}`)

    await expect(requireRole('admin', 'gestor', 'vendedor')(request)).resolves.toBeUndefined()
  })

  it('corta con Forbidden cuando el rol no alcanza', async () => {
    const request = crearRequest(`Bearer ${firmar({})}`)

    await expect(requireRole('admin')(request)).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('exige autenticacion antes que rol', async () => {
    // Sin token no hay rol: el orden importa, un `vendedor` anonymous no
    // puede colarse como si fuera admin.
    await expect(requireRole('admin')(crearRequest())).rejects.toBeInstanceOf(UnauthorizedError)
  })
})

describe('optionalAuth', () => {
  it('deja pasar la peticion sin token', async () => {
    await expect(optionalAuth(crearRequest())).resolves.toBeUndefined()
  })

  it('ignora un token invalido en vez de cortar la peticion', async () => {
    // El catalogo publico es visible con y sin sesion. Un token vencido no
    // puede convertirlo en un 401.
    await expect(optionalAuth(crearRequest('Bearer basura'))).resolves.toBeUndefined()
  })
})