// Setup de los tests del backend.
//
// Hace dos cosas, en este orden y por un motivo concreto cada una:
//
// 1. **Variables de entorno por defecto.** `src/config/env.ts` valida el
//    entorno de forma *eager* al importarse (`envSchema.parse(process.env)`),
//    o sea que cualquier test que importe un modulo del servidor - aunque solo
//    sea para mirar una funcion pura - revienta al cargar si falta
//    `DATABASE_URL`, `JWT_SECRET` o las de storage. Por eso los defaults se
//    escriben **antes** de la primera importacion del grafo del servidor.
//
//    Se escriben con `??=` y no con `=`: `dotenv/config` (importado por
//    `env.ts`) no pisa variables ya definidas, asi que un `.env` local sigue
//    mandando sobre estos defaults y el test corre contra la config real de
//    quien lo ejecuta.
//
// 2. **Limpieza de la base de datos de test**, solo si hay `DATABASE_URL_TEST`.
//    Los tests unitarios mockean Prisma y no tocan la base; los de
//    integracion, si la expresslyan.

import { beforeAll, afterAll, beforeEach } from 'vitest'

process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??= 'postgresql://vinoteca:vinoteca@localhost:5432/vinoteca_test'
process.env.JWT_SECRET ??= 'test-secret-de-al-menos-32-caracteres-xxxxx'
process.env.ACCESS_TOKEN_TTL ??= '15m'
process.env.REFRESH_TOKEN_DAYS ??= '7'
process.env.CORS_ORIGIN ??= 'http://localhost:5173'
process.env.RATE_LIMIT_MAX ??= '100'
process.env.RATE_LIMIT_WINDOW ??= '1 minute'
// El limite de login va deliberadamente alto aca. Estos tests miden el mapeo
// de errores HTTP y con el valor real de 5/min el sexto POST a
// `/api/auth/login` (todos salen de la misma IP porque es `app.inject`) corta
// con 429 y el test falla por el motivo equivocado. El throttling se verifica
// a mano contra el server; lo que importa aca es el status de la respuesta.
process.env.LOGIN_RATE_MAX ??= '1000'
process.env.UPLOAD_MAX_BYTES ??= String(5 * 1024 * 1024)
process.env.STORAGE_ENDPOINT ??= 'http://localhost:9000'
process.env.STORAGE_REGION ??= 'us-east-1'
process.env.STORAGE_BUCKET ??= 'wine-images'
process.env.STORAGE_ACCESS_KEY ??= 'test-access-key'
process.env.STORAGE_SECRET_KEY ??= 'test-secret-key'
process.env.PUBLIC_API_URL ??= 'http://localhost:3000'

const hasTestDb = !!process.env.DATABASE_URL_TEST

if (hasTestDb) {
  // Import dinamico: si no hay base de test, ni se importa Prisma y los tests
  // unitarios quedan sin una conexion abierta que pueda colgarse al salir.
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  beforeAll(async () => {
    await prisma.$connect()
  })

  // Limpieza en orden de dependencias (FK).
  beforeEach(async () => {
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
}