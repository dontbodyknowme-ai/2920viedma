import { describe, expect, it, vi } from 'vitest'

/**
 * `CORS_ORIGIN` es la variable que masコストó un deploy.
 *
 * El backend arrancaba, `/health` daba 200, el build pasaba... y **cada
 * request** devolvía 500 con un stack de `@fastify/cors`:
 *
 *   Error: Invalid CORS origin option
 *     at resolveOriginOption (@fastify/cors/index.js:159)
 *
 * Causa: la variable estaba definida pero vacía. `z.string()` acepta `''`, así
 * que la validación de entorno la daba por buena y el error aparecía recién en
 * el hook de cada request, lejos de su causa.
 *
 * Estos tests arman `buildApp` de verdad y pegan un request real, porque el
 * error no está en el parseo de zod sino en lo que `@fastify/cors` acepta
 * después.
 */

const dbFalso = vi.hoisted(() => ({
  $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
  $on: vi.fn(),
  $disconnect: vi.fn(),
  user: { findUnique: vi.fn().mockResolvedValue(null) },
  refreshToken: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => dbFalso)
}))

const { buildApp } = await import('../../src/app.js')

/**
 * Monta la app con un `CORS_ORIGIN` puntual.
 *
 * `env.ts` valida **al importarse**, asi que para cambiar el valor hay que
 * reimportar el modulo con la cache de Vitrine invalidada. `vi.resetModules()`
 * mas un import dinamico es lo unico que alcanza.
 */
const montarCon = async (corsOrigin: string | undefined) => {
  vi.resetModules()

  const previo = process.env.CORS_ORIGIN
  if (corsOrigin === undefined) delete process.env.CORS_ORIGIN
  else process.env.CORS_ORIGIN = corsOrigin

  try {
    const { buildApp: construir } = await import('../../src/app.js')
    const app = await construir()
    await app.ready()
    return app
  } finally {
    if (previo === undefined) delete process.env.CORS_ORIGIN
    else process.env.CORS_ORIGIN = previo
  }
}

describe('CORS_ORIGIN', () => {
  it('arranca y responde con un origen valido', async () => {
    const app = await montarCon('https://vinoteca.vercel.app')

    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://vinoteca.vercel.app' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://vinoteca.vercel.app')

    await app.close()
  })

  it('acepta varios origenes separados por coma', async () => {
    // `origin` de `@fastify/cors` acepta un array, asi que produccion y staging
    // entran en la misma variable sin agregar otra.
    const app = await montarCon('https://a.vercel.app, https://b.vercel.app')

    for (const origen of ['https://a.vercel.app', 'https://b.vercel.app']) {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: origen }
      })

      expect(res.headers['access-control-allow-origin'], origen).toBe(origen)
    }

    await app.close()
  })

  it('no explota con la variable vacia', async () => {
    // Este es el bug: `z.string()` aceptaba `''` y el 500 aparecia en cada
    // request. Ahora el arranque falla diciendo cual es el problema.
    const escrito = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await expect(montarCon('')).rejects.toThrow()

    const salida = escrito.mock.calls.map((c) => String(c[0])).join('')
    escrito.mockRestore()

    // El mensaje tiene que **nombrar la variable**. Un error de arranque sin
    // decir cual falla es lo que dejo dos horas de deploy esta vez.
    expect(salida).toContain('CORS_ORIGIN')
    expect(salida).toContain('Faltan variables de entorno')
    expect(salida).toContain('.env.example')
  })

  it('rechaza un origen que no es URL', async () => {
    const escrito = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await expect(montarCon('vinoteca.vercel.app')).rejects.toThrow()

    const salida = escrito.mock.calls.map((c) => String(c[0])).join('')
    escrito.mockRestore()

    expect(salida).toContain('CORS_ORIGIN')
  })

  it('rechaza un protocolo que no es http ni https', async () => {
    const escrito = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await expect(montarCon('ftp://vinoteca.com')).rejects.toThrow()

    escrito.mockRestore()
  })
})
