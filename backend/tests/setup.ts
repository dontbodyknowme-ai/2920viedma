// Setup para tests de integración
// Requiere DATABASE_URL_TEST apuntando a una DB de test aislada

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Solo corre setup si hay DATABASE_URL_TEST
const hasTestDb = !!process.env.DATABASE_URL_TEST

if (hasTestDb) {
  beforeAll(async () => {
    await prisma.$connect()
    // Aplicar migraciones
    // await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
  })

  beforeEach(async () => {
    // Limpieza en orden de dependencias (FK)
    await prisma.orderTimeline.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.note.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.wine.deleteMany()
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })
} else {
  console.log('⚠ DATABASE_URL_TEST no configurado - tests de integración se saltan')
}

export { prisma }