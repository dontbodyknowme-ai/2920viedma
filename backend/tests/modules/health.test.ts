import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * El healthcheck es lo unico que Railway mira para decidir si el contenedor
 * esta sano, asi que cuando miente el diagnostico entero se va al carajo.
 *
 * Hace dos|Postgres no arranca en Railway y `/health` contestaba:
 *
 *   {"status":"error","db":"disconnected","uptime":49.7}
 *
 * Eso dice **que** esta mal y nada sobre **por que**. Dos capas lo tapaban:
 *
 * 1. `catch {}` en la ruta: la excepcion secia sin loguear. Un healthcheck que
 *    responde 503 sin escribir una linea es un healthcheck que obliga a abrir
 *    un SSH a adivinar.
 * 2. `new PrismaClient()` sin `log`: Prisma Client no emite nada por defecto,
 *    ni siquiera los errores de conexion. Aunque el catch anotara, no habria
 *    nada que anotar.
 *
 * `SELECT 1` es a proposito: no toca ninguna tabla, asi que un fallo aqui es de
 * **conexion** (host, puerto, credenciales, red privada), no de schema. Un test
 * que esperara las tablas no distinguiria los dos casos.
 */

const prismaFalso = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $on: vi.fn(),
  $disconnect: vi.fn()
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaFalso)
}))

const { buildApp } = await import('../../src/app.js')
const { logger } = await import('../../src/utils/logger.js')

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('GET /health', () => {
  it('devuelve 200 y "connected" cuando la base responde', async () => {
    prismaFalso.$queryRaw.mockResolvedValueOnce([{ ok: 1 }])

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', db: 'connected' })
  })

  it('devuelve 503 y "disconnected" cuando la base no responde', async () => {
    prismaFalso.$queryRaw.mockRejectedValueOnce(new Error('P1001 no reach database server'))

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ status: 'error', db: 'disconnected' })
  })

  it('loguea el error de conexion, no solo que la base no responde', async () => {
    const espia = vi.spyOn(logger, 'error').mockImplementation(() => logger)
    prismaFalso.$queryRaw.mockRejectedValueOnce(new Error('P1001 no reach database server'))

    await app.inject({ method: 'GET', url: '/health' })

    // Este es el test que importa. Sin el, un 503 en produccion no deja
    // rastro: el unico sintoma era un 503 y un uptime de 49 segundos.
    expect(espia).toHaveBeenCalledTimes(1)

    const [primerArgumento] = espia.mock.calls[0]
    expect((primerArgumento as { err?: Error }).err?.message).toContain('P1001')

    espia.mockRestore()
  })

  it('registra listeners de los eventos de Prisma al construir la app', () => {
    // Si `new PrismaClient()` vuelve a quedarse sin `log`, los errores de
    // Prisma dejan de llegar al logger y el healthcheck queda ciego otra vez.
    expect(prismaFalso.$on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(prismaFalso.$on).toHaveBeenCalledWith('warn', expect.any(Function))
  })
})
