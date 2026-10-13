import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * La cookie de refresh y la sesion entre paginas.
 *
 * Este archivo cubre un bug que **solo existe en produccion** y que en local es
 * imposible de ver.
 *
 * La sesion vive **solo en memoria** del modulo `src/api/client.ts` (por
 * decision de 004-c: nada en `localStorage` ni `sessionStorage`, que son
 * editables desde la consola). Al recargar la pagina ese modulo se reinicia y
 * hay que rehidratar con `POST /api/auth/refresh`, que lee la cookie.
 *
 * Con la cookie en `SameSite=Lax`:
 *
 *   login   -> 200, el panel abre
 *   F5      -> `/api/auth/refresh` llega SIN cookie -> 401 -> el gate vuelve
 *
 * La razon: en produccion el frontend esta en `*.vercel.app` y la API en
 * `*.onrender.com`, que son **sitios distintos**. `Lax` solo manda la cookie en
 * navegaciones de primer nivel, no en un `fetch` desde JavaScript. En local
 * `localhost:5173` y `localhost:3000` son el mismo sitio y `Lax` alcanza, asi
 * que el bug es invisible hasta que se despliega.
 *
 * `SameSite=None` es lo unico que viaja cross-site, y los navegadores lo
 * rechazan sin `Secure`: en produccion los dos atributos van juntos.
 */

// El comportamiento que se quiere probar **es el de produccion**: los
// atributos de la cookie se eligen segun `NODE_ENV`. Con el default de
// `setup.ts` (`test`) estos tests estarian verificando la rama de desarrollo,
// que es justamente la que no tiene el bug.
const NODE_ENV_PREVIO = process.env.NODE_ENV
process.env.NODE_ENV = 'production'

const authServiceFalso = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn()
}))

vi.mock('../../src/modules/auth/service.js', () => ({ authService: authServiceFalso }))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
    $on: vi.fn(),
    $disconnect: vi.fn()
  }))
}))

// El service real lanza `UnauthorizedError`, no un `Error` pelado: un error
// generico lo mapea el error handler a 500, y el test pasaria por un motivo
// equivocado al verificar el 401.
const { UnauthorizedError } = await import('../../src/utils/errors.js')

const USUARIO = { id: 'usr_1', email: 'admin@vinoteca.local', name: 'Admin', role: 'admin' }

const { buildApp } = await import('../../src/app.js')

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
  process.env.NODE_ENV = NODE_ENV_PREVIO
})

/** Los atributos de `Set-Cookie` que importan, en un objeto. */
const atributos = (res: { headers: Record<string, unknown> }): string => {
  const crudo = String(res.headers['set-cookie'] ?? '')
  return crudo.toLowerCase()
}

describe('cookie de refresh', () => {
  it('en produccion viaja cross-site: SameSite=None con Secure', async () => {
    authServiceFalso.login.mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: USUARIO
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@vinoteca.local', password: 'admin123' }
    })

    expect(res.statusCode).toBe(200)

    const cookie = atributos(res as never)

    // Con `lax` el navegador NO manda la cookie en un fetch desde la pagina de
    // Vercel a la API de Render, y la sesion muere en el primer F5.
    expect(cookie).toContain('samesite=none')

    // Los navegadores rechazan `SameSite=None` sin `Secure`: la cookie se
    // descarta entera y el sintoma es el mismo 401, pero del lado del cliente.
    expect(cookie).toContain('secure')

    // Y tiene que ser httpOnly: es la unica proteccion real del token.
    expect(cookie).toContain('httponly')
  })

  it('logout borra la cookie con los mismos atributos con los que la creo', async () => {
    // Si difieren en `path`, `domain` o `samesite`, el navegador no encuentra
    // la cookie que borrar y el logout no cierra la sesion. Es por eso que los
    // atributos viven en una sola funcion.
    authServiceFalso.logout.mockResolvedValueOnce(undefined)

    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' })

    expect(res.statusCode).toBe(204)

    const cookie = atributos(res as never)

    expect(cookie).toContain('samesite=none')
    expect(cookie).toContain('secure')
    expect(cookie).toContain('path=/')
  })

  it('sin cookie devuelve 401 en vez de 500', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh' })

    expect(res.statusCode).toBe(401)
    expect(authServiceFalso.refresh).not.toHaveBeenCalled()
  })

  it('con cookie rota devuelve 401', async () => {
    authServiceFalso.refresh.mockRejectedValueOnce(
      new UnauthorizedError('INVALID_REFRESH_TOKEN')
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: 'refreshToken=no-es-un-token' }
    })

    expect(res.statusCode).toBe(401)
  })
})
