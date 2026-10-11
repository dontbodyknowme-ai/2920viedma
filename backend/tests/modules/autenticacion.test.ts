import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

/**
 * Servicio de autenticacion.
 *
 * Se mockea `@prisma/client` entero a proposito: lo que se prueba aca es
 * **logica de auth** - el hash de la contrasena, la rotacion del refresh y el
 * hecho de que un token invalido nunca llega a la base. Con un Prisma real
 * estos tests exigirian la base levantada y, peor, un fallo de red se
 * confundiria con un fallo de auth.
 *
 * `vi.hoisted` sube el objeto de mocks por encima de los imports: la
 * factoria de `vi.mock` corre antes que cualquier `const` del archivo, y sin
 * esto reventaria por TDZ.
 */
const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn()
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn()
  }
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => db)
}))

const { authService } = await import('../../src/modules/auth/service.js')
const { env } = await import('../../src/config/env.js')
const { ConflictError, UnauthorizedError } = await import('../../src/utils/errors.js')

const PASSWORD = 'admin123'

const usuarioEnBase = {
  id: 'usr_1',
  email: 'admin@vinoteca.local',
  name: 'Admin',
  role: 'admin',
  passwordHash: bcrypt.hashSync(PASSWORD, 4),
  createdAt: new Date(),
  updatedAt: new Date()
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('register', () => {
  it('rechaza un email que ya existe', async () => {
    db.user.findUnique.mockResolvedValue(usuarioEnBase)

    await expect(
      authService.register({ email: usuarioEnBase.email, password: PASSWORD, name: 'Otro' })
    ).rejects.toBeInstanceOf(ConflictError)

    expect(db.user.create).not.toHaveBeenCalled()
  })

  it('no guarda la contrasena en claro', async () => {
    db.user.findUnique.mockResolvedValue(null)
    db.user.create.mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'usr_nuevo' }))
    db.refreshToken.create.mockResolvedValue({})

    const resultado = await authService.register({
      email: 'nuevo@vinoteca.local',
      password: PASSWORD,
      name: 'Nuevo'
    })

    const guardado = db.user.create.mock.calls[0][0].data
    expect(guardado.passwordHash).not.toBe(PASSWORD)
    expect(bcrypt.compareSync(PASSWORD, guardado.passwordHash)).toBe(true)
    expect(resultado.user.email).toBe('nuevo@vinoteca.local')
  })

  it('asigna el rol vendedor cuando el registro no lo pide', async () => {
    db.user.findUnique.mockResolvedValue(null)
    db.user.create.mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'usr_nuevo' }))
    db.refreshToken.create.mockResolvedValue({})

    await authService.register({ email: 'nuevo@vinoteca.local', password: PASSWORD, name: 'Nuevo' })

    expect(db.user.create.mock.calls[0][0].data.role).toBe('vendedor')
  })
})

describe('login', () => {
  it('falla con credenciales invalidas sin revelar cual fue', async () => {
    // Mismo error para email inexistente y para password erroneo: si uno de
    // los dos se distinguiera, el endpoint sirve de enumerador de cuentas.
    db.user.findUnique.mockResolvedValue(usuarioEnBase)
    await expect(authService.login(usuarioEnBase.email, 'no-es-la-clave')).rejects.toBeInstanceOf(
      UnauthorizedError
    )

    db.user.findUnique.mockResolvedValue(null)
    await expect(authService.login('nadie@vinoteca.local', PASSWORD)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS'
    })
  })

  it('devuelve un access token firmable y sin la passwordHash', async () => {
    db.user.findUnique.mockResolvedValue(usuarioEnBase)
    db.refreshToken.create.mockResolvedValue({})

    const resultado = await authService.login(usuarioEnBase.email, PASSWORD)

    const payload = jwt.verify(resultado.accessToken, env.JWT_SECRET) as {
      sub: string
      role: string
    }
    expect(payload.sub).toBe(usuarioEnBase.id)
    expect(payload.role).toBe('admin')
    expect(resultado.user).not.toHaveProperty('passwordHash')
    expect(resultado.refreshToken).toHaveLength(64)
  })
})

describe('refresh', () => {
  it('rechaza un token que no existe', async () => {
    db.refreshToken.findUnique.mockResolvedValue(null)

    await expect(authService.refresh('token-fantasma')).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN'
    })
  })

  it('rechaza un token vencido', async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
      user: usuarioEnBase
    })

    await expect(authService.refresh('token-vencido')).rejects.toBeInstanceOf(UnauthorizedError)
    expect(db.refreshToken.delete).not.toHaveBeenCalled()
  })

  it('rota: borra el refresh viejo y emite uno nuevo con otro hash', async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_1',
      tokenHash: 'hash-del-viejo',
      expiresAt: new Date(Date.now() + 60_000),
      user: usuarioEnBase
    })
    db.refreshToken.delete.mockResolvedValue({})
    db.refreshToken.create.mockResolvedValue({})

    const resultado = await authService.refresh('refresh-valido')

    expect(db.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt_1' } })
    const guardado = db.refreshToken.create.mock.calls[0][0].data
    // El token plano jamas se persiste: solo su SHA-256.
    expect(guardado.tokenHash).not.toBe(resultado.refreshToken)
    expect(guardado.tokenHash).toHaveLength(64)
  })

  it('no sirve el mismo refresh dos veces', async () => {
    db.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'rt_1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      user: usuarioEnBase
    })
    db.refreshToken.delete.mockResolvedValue({})
    db.refreshToken.create.mockResolvedValue({})

    await authService.refresh('refresh-valido')
    // Segundo intento: la fila ya no existe porque el primer uso la borro.
    db.refreshToken.findUnique.mockResolvedValue(null)

    await expect(authService.refresh('refresh-valido')).rejects.toBeInstanceOf(UnauthorizedError)
  })
})

describe('logout', () => {
  it('borra el refresh por hash, no por el token plano', async () => {
    db.refreshToken.deleteMany.mockResolvedValue({ count: 1 })

    await authService.logout('refresh-a-invalidar')

    const criterio = db.refreshToken.deleteMany.mock.calls[0][0].where
    expect(criterio.tokenHash).not.toBe('refresh-a-invalidar')
    expect(criterio.tokenHash).toHaveLength(64)
  })
})

describe('getUser', () => {
  it('devuelve null cuando el usuario ya no existe', async () => {
    db.user.findUnique.mockResolvedValue(null)

    expect(await authService.getUser('usr_borrado')).toBeNull()
  })

  it('proyecta solo los campos publicos', async () => {
    db.user.findUnique.mockResolvedValue(usuarioEnBase)

    const usuario = await authService.getUser(usuarioEnBase.id)

    expect(usuario).toEqual({
      id: usuarioEnBase.id,
      email: usuarioEnBase.email,
      name: usuarioEnBase.name,
      role: 'admin'
    })
  })
})