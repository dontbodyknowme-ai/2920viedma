import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireRole } from '../auth/middleware.js'
import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { env } from '../../config/env.js'
import { PayloadTooLargeError, UnsupportedMediaTypeError } from '../../utils/errors.js'
import { jsonSchemas } from '../../shared/json-schemas.js'

const s3 = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY
  }
})

const ALLOWED = /^image\/(png|jpeg|webp|gif|avif)$/

export const uploadRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post(
    '/api/upload',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.upload.post
    },
    async (request: FastifyRequest, reply) => {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'No se recibió archivo' })
      }

      if (!ALLOWED.test(data.mimetype)) {
        throw new UnsupportedMediaTypeError()
      }

      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      if (buffer.byteLength > env.UPLOAD_MAX_BYTES) {
        throw new PayloadTooLargeError()
      }

      let webp: Buffer
      try {
        webp = await sharp(buffer)
          .rotate()
          .resize(1920, 1920, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer()
      } catch {
        throw new UnsupportedMediaTypeError()
      }

      const id = randomUUID()
      const key = `wines/${id}.webp`

      await s3.send(new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key,
        Body: webp,
        ContentType: 'image/webp'
      }))

      const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key
      }), { expiresIn: 3600 })

      return reply.status(201).send({ id, url: signedUrl })
    }
  )

  fastify.delete(
    '/api/upload/:id',
    {
      preHandler: requireRole('admin'),
      schema: jsonSchemas.upload.delete
    },
    async (request, reply) => {
      const { id } = request.params as any
      const key = `wines/${id}.webp`

      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: env.STORAGE_BUCKET,
          Key: key
        }))
      } catch {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Archivo no encontrado' })
      }

      return reply.status(204).send()
    }
  )
}