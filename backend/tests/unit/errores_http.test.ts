import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * Los errores del cliente NO son errores del servidor.
 *
 * Antes de este archivo, `setErrorHandler` manejava `ZodError` y `AppError` y
 * mandaba **todo lo demas** a un `500 INTERNAL_ERROR`. Eso convertia cuatro
 * cosas distintas en el mismo error de servidor:
 *
 *   JSON malformado          -> 500   (deberia 400)
 *   body vacio               -> 500   (deberia 400)
 *   schema que no valida     -> 500   (deberia 400)
 *   POST /api/auth/logout    -> 500   (deberia 204)
 *
 * No es un detalle cosmetico: con el accessToken viviendo solo en memoria del
 * cliente, un 500 en `/api/auth/refresh` es exactamente lo que hace que a los
 * 15 minutos el panel deje de funcionar, y el mensaje que veia el admin era
 * "Error interno del servidor", que no le dizia nada.
 *
 * Los tests arman la app real (`buildApp`) y no un Fastify de juguete, porque
 * el comportamiento depende de los plugins registrados. Prisma va mockeado
 * igual: lo que se prueba es el mapeo de errores HTTP, y una base de datos
 * real solo haria que un fallo de infra pareciera un fallo del codigo.
 */

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    refreshToken: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
    $connect: vi.fn(),
    // `app.ts` registra listeners de eventos de Prisma para volcar sus errores
    // al logger del proyecto. Sin esto el mock era mas pobre que la clase real
    // y revolearon 20 tests sin avisar: el mock se desincronizo del codigo y
    // nada lo detecto hasta que el codigo empezo a usar una API nueva.
    $on: vi.fn(),
    $disconnect: vi.fn()
  }))
}))

const { buildApp } = await import('../../src/app.js')

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

const post = (url: string, headers: Record<string, string> = {}, payload?: string) =>
  app.inject({ method: 'POST', url, headers, ...(payload !== undefined && { payload }) })

describe('errores de peticion', () => {
  it('un JSON malformado es 400, no 500', async () => {
    const respuesta = await post('/api/auth/login', { 'content-type': 'application/json' }, '{mal')

    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json().code).not.toBe('INTERNAL_ERROR')
  })

  it('un body vacio con Content-Type es 400 y dice que falta', async () => {
    // El parser acepta el cuerpo vacio como `{}` y deja que la validacion del
    // schema lo diga: "Datos inválidos" con el detalle de los campos que
    // faltan es mas util que el "Body cannot be empty..." de Fastify.
    const respuesta = await post('/api/auth/login', { 'content-type': 'application/json' })
    const cuerpo = respuesta.json()

    expect(respuesta.statusCode).toBe(400)
    expect(cuerpo.code).toBe('VALIDATION_ERROR')
    expect(cuerpo.details).toBeDefined()
  })

  it('un content-type desconocido es 415', async () => {
    const respuesta = await post('/api/auth/login', { 'content-type': 'application/xml' }, '<x/>')

    expect(respuesta.statusCode).toBe(415)
  })

  it('un cuerpo que no valida el schema es 400 con el detalle', async () => {
    const respuesta = await post(
      '/api/auth/login',
      { 'content-type': 'application/json' },
      JSON.stringify({ email: 'no-es-un-email' })
    )
    const cuerpo = respuesta.json()

    expect(respuesta.statusCode).toBe(400)
    expect(cuerpo.code).toBe('VALIDATION_ERROR')
    expect(cuerpo.details).toBeDefined()
  })

  it('un cuerpo con BOM se parsea igual', async () => {
    // El parser de JSON que trae Fastify quita el BOM antes de parsear; el
    // nuestro tiene que hacerlo tambien. Sin esto, un archivo guardado con
    // `Set-Content -Encoding utf8` en PowerShell (que mete BOM) se rechazaba
    // con `Unexpected token '\uFEFF'`.
    const respuesta = await post(
      '/api/auth/login',
      { 'content-type': 'application/json' },
      `\uFEFF${JSON.stringify({ email: 'nadie@vinoteca.local', password: 'admin123' })}`
    )

    // Llego al handler (401 de credenciales), no se rompio en el parseo (400).
    expect(respuesta.statusCode).toBe(401)
  })

  it('credenciales incorrectas son 401 y no 500', async () => {
    // El camino normal de un usuario que se equivoca de password: tiene que
    // ser distinguible del error de servidor, porque el panel lo muestra.
    const respuesta = await post(
      '/api/auth/login',
      { 'content-type': 'application/json' },
      JSON.stringify({ email: 'nadie@vinoteca.local', password: 'admin123' })
    )

    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json().code).toBe('INVALID_CREDENTIALS')
  })
})

describe('endpoints que leen cookie y no cuerpo', () => {
  it('refresh sin cookie es 401, no 500', async () => {
    // Este es el que rompia la renovacion automatica de sesion. El frontend
    // manda el POST sin body y sin Content-Type, que es justo lo que fallaba.
    const respuesta = await post('/api/auth/refresh')

    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json().code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('refresh con Content-Type json y sin body tambien es 401', async () => {
    // Con `Content-Type: application/json` Fastify se quejaba antes de llegar
    // al handler ("body cannot be empty"). Sin schema `body`, ya no se queja.
    const respuesta = await post('/api/auth/refresh', { 'content-type': 'application/json' })

    expect(respuesta.statusCode).toBe(401)
  })

  it('logout sin cookie es 204, no 500', async () => {
    const respuesta = await post('/api/auth/logout')

    expect(respuesta.statusCode).toBe(204)
  })

  it('logout con Content-Type json y sin body es 204', async () => {
    const respuesta = await post('/api/auth/logout', { 'content-type': 'application/json' })

    expect(respuesta.statusCode).toBe(204)
  })
})

describe('la documentacion de Swagger', () => {
  it('/api/docs redirige a /api/docs/ en vez de dar 404', async () => {
    // El HTML de Swagger UI usa rutas relativas (`./static/...`). Sin la barra
    // final el navegador pide `/api/static/...` y la pagina queda sin estilos.
    const respuesta = await app.inject({ method: 'GET', url: '/api/docs' })

    expect(respuesta.statusCode).toBe(302)
    expect(respuesta.headers.location).toBe('/api/docs/')
  })

  it('los assets de Swagger se sirven desde /api/docs/static/', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/api/docs/static/swagger-ui.css' })

    expect(respuesta.statusCode).toBe(200)
  })
})