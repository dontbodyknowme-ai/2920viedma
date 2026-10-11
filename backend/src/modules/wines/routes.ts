import { FastifyInstance, FastifyRequest } from 'fastify'
import { wineImportSchema } from '../../shared/schemas.js'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { requireRole } from '../auth/middleware.js'
import Papa from 'papaparse'
import { Readable } from 'node:stream'

const REQUIRED_HEADERS = ['id', 'name', 'winery', 'varietal', 'category', 'vintage', 'price', 'imageUrl']

function normalizeRow(row: Record<string, string>): Record<string, any> {
  const normalized: Record<string, any> = {}
  for (const [key, value] of Object.entries(row)) {
    const k = key.trim().toLowerCase()
    let v = value.trim()
    if (k === 'id' || k === 'name' || k === 'winery' || k === 'varietal' || k === 'category' || k === 'description' || k === 'tastingnotes' || k === 'foodpairing' || k === 'imageurl') {
      normalized[k === 'tastingnotes' ? 'tastingNotes' : k === 'foodpairing' ? 'foodPairing' : k === 'imageurl' ? 'imageUrl' : k] = v
    } else if (k === 'vintage' || k === 'price' || k === 'stock') {
      normalized[k] = v ? parseInt(v, 10) : 0
    } else if (k === 'activo') {
      normalized.activo = v.toLowerCase() === 'true' || v === '1' || v.toLowerCase() === 'sí' || v.toLowerCase() === 'si'
    }
  }
  return normalized
}

async function parseCsvStream(stream: Readable): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = []
    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      step: (row) => results.push(row.data as Record<string, string>),
      complete: () => resolve(results),
      error: (err) => reject(err)
    })
  })
}

export const winesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  fastify.get(
    '/api/wines',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.wines.list
    },
    async (request) => {
      const { page, limit, search, category, varietal, status } = request.query as any
      const where: any = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { winery: { contains: search, mode: 'insensitive' } },
          { varietal: { contains: search, mode: 'insensitive' } }
        ]
      }
      if (category) where.category = category
      if (varietal) where.varietal = { contains: varietal, mode: 'insensitive' }
      if (status === 'activo') where.activo = true
      if (status === 'inactivo') where.activo = false

      const [data, total] = await Promise.all([
        prisma.wine.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.wine.count({ where })
      ])

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  )

  fastify.post(
    '/api/wines',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.wines.create
    },
    async (request, reply) => {
      const wine = await prisma.wine.create({ data: request.body as any })
      return reply.status(201).send(wine)
    }
  )

  fastify.patch(
    '/api/wines/:id',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.wines.update
    },
    async (request) => {
      const { id } = request.params as any
      const wine = await prisma.wine.update({
        where: { id },
        data: request.body as any
      })
      return wine
    }
  )

  fastify.delete(
    '/api/wines/:id',
    {
      preHandler: requireRole('admin'),
      schema: jsonSchemas.wines.delete
    },
    async (request, reply) => {
      const { id } = request.params as any

      const count = await prisma.orderItem.count({ where: { wineId: id } })
      if (count > 0) {
        return reply.status(409).send({ code: 'HAS_ORDERS', count })
      }

      const wine = await prisma.wine.findUnique({ where: { id } })
      if (!wine) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Vino no encontrado' })
      }

      await prisma.wine.delete({ where: { id } })
      return reply.status(204).send()
    }
  )

  fastify.post(
    '/api/wines/import',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.wines.import
    },
    async (request: FastifyRequest, reply) => {
      const file = await request.file()
      if (!file) {
        return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'No se recibió archivo CSV' })
      }

      if (!file.mimetype.includes('csv') && !file.filename.endsWith('.csv')) {
        return reply.status(415).send({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'El archivo debe ser CSV' })
      }

      const rows = await parseCsvStream(file.file)

      if (rows.length === 0) {
        return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'CSV vacío' })
      }

      const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase())
      const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h.toLowerCase()))
      if (missing.length > 0) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: `Faltan columnas requeridas: ${missing.join(', ')}`
        })
      }

      const result = { created: 0, updated: 0, errors: [] as Array<{ row: number; field: string; message: string }> }

      for (let i = 0; i < rows.length; i++) {
        const rowIndex = i + 2
        const normalized = normalizeRow(rows[i])

        const parsed = wineImportSchema.safeParse(normalized)

        if (!parsed.success) {
          result.errors.push({
            row: rowIndex,
            field: parsed.error.issues[0]?.path.join('.') ?? 'desconocido',
            message: parsed.error.issues[0]?.message ?? 'inválido'
          })
          continue
        }

        try {
          const existing = await prisma.wine.findUnique({ where: { id: parsed.data.id } })
          if (existing) {
            await prisma.wine.update({ where: { id: parsed.data.id }, data: parsed.data })
            result.updated++
          } else {
            await prisma.wine.create({ data: parsed.data })
            result.created++
          }
        } catch (err: any) {
          result.errors.push({
            row: rowIndex,
            field: 'database',
            message: err.message ?? 'Error de base de datos'
          })
        }
      }

      const statusCode = result.errors.length > 0 ? 207 : 201
      return reply.status(statusCode).send(result)
    }
  )
}