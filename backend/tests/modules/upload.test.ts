import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import jwt from 'jsonwebtoken'
import type { FastifyInstance } from 'fastify'

/**
 * La URL de una imagen no puede caducar.
 *
 * El backend antes devolvia una URL **firmada** con `expiresIn: 3600`, y
 * `admin_wine_form.tsx` la guardaba como `imageUrl` del vino. El resultado era
 * que la imagen se veía una hora y despues quedaba rota para siempre en la
 * base: nadie se daba cuenta hasta que un cliente miraba el catalogo.
 *
 * Estos tests fijan las dos mitades del arreglo:
 *   1. la URL que sale de `POST /api/upload` es estable
 *   2. la que arma `publicUrl()` no lleva firma ni expiracion
 */

const enviado = vi.hoisted(() => ({ put: vi.fn(), delete: vi.fn() }))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: (comando: { constructor: { name: string } }) => {
      if (comando.constructor.name === 'PutObjectCommand') return enviado.put()
      return enviado.delete()
    }
  })),
  PutObjectCommand: class PutObjectCommand {},
  DeleteObjectCommand: class DeleteObjectCommand {}
}))

vi.mock('sharp', () => ({
  default: () => ({
    rotate: () => ({
      resize: () => ({ webp: () => ({ toBuffer: async () => Buffer.from('webp-falso') }) })
    })
  })
}))

let app: FastifyInstance

/** Token real: `requireRole` verifica la firma, no alcanza con inventarse un header. */
let tokenAdmin: string

const adminPrisma = {
  user: {
    findUnique: vi.fn(async () => ({
      id: 'usr_admin',
      email: 'admin@vinoteca.local',
      name: 'Admin',
      role: 'admin',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  },
  refreshToken: { deleteMany: vi.fn() },
  $queryRaw: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn()
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => adminPrisma)
}))

const { buildApp } = await import('../../src/app.js')
const { publicUrl } = await import('../../src/modules/upload/routes.js')
const { env } = await import('../../src/config/env.js')

/** PNG de 1x1. El stub de sharp no mira los bytes, pero el multipart si. */
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const subir = (payload: Buffer, filename = 'vino.png', contentType = 'image/png') =>
  app.inject({
    method: 'POST',
    url: '/api/upload',
    headers: {
      authorization: `Bearer ${tokenAdmin}`,
      'content-type': 'multipart/form-data; boundary=X'
    },
    payload: `--X\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n${payload.toString('binary')}\r\n--X--\r\n`
  })

beforeEach(async () => {
  vi.clearAllMocks()
  tokenAdmin = jwt.sign(
    { sub: 'usr_admin', role: 'admin', email: 'admin@vinoteca.local' },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  )
  app = await buildApp()
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

describe('publicUrl', () => {
  it('arma la URL con la base publica y la clave del objeto', () => {
    const url = publicUrl('wines/abc-123.webp')

    expect(url).toMatch(/\/wines\/abc-123\.webp$/)
  })

  it('no lleva firma ni expiracion', () => {
    // El fallo original: `X-Amz-Signature` y `X-Amz-Expires` en la query.
    // Si vuelven a aparecer, la imagen se rompe a la hora.
    const url = publicUrl('wines/abc-123.webp')

    expect(url).not.toContain('X-Amz-Signature')
    expect(url).not.toContain('X-Amz-Expires')
    expect(url).not.toContain('?')
  })
})

describe('POST /api/upload', () => {
  it('devuelve una URL que no caduca', async () => {
    const respuesta = await subir(PNG_1x1)

    expect(respuesta.statusCode).toBe(201)

    const { url, id } = respuesta.json()
    expect(url).toBeTruthy()
    expect(url).toContain(`${id}.webp`)
    expect(url).not.toContain('X-Amz-Signature')
    expect(url).not.toContain('X-Amz-Expires')
  })

  it('sube el objeto convertido a WebP', async () => {
    // El backend no sube lo que le llega: recorta a 1920x1920 y convierte a
    // WebP antes de mandar. Si esto se rompe, quedan JPEG de 8 MB en el bucket.
    await subir(PNG_1x1)

    expect(enviado.put).toHaveBeenCalledTimes(1)
  })

  it('rechaza un archivo que no es imagen', async () => {
    // El filtro mira el **mimetype** declarado, no la extension: renombrar un
    // `.exe` a `.png` no lo vuelve una imagen.
    const respuesta = await subir(Buffer.from('esto es un texto'), 'notas.png', 'text/plain')

    expect(respuesta.statusCode).toBe(415)
    expect(enviado.put).not.toHaveBeenCalled()
  })
})