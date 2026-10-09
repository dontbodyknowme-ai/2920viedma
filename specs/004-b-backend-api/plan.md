# Plan 004-b — Backend API Real

**Spec:** `specs/004-b-backend-api/spec.md`, estado `borrador`
**Fase:** 3 de 5 (plan). Este documento define el **CÓMO**. El QUÉ y el POR QUÉ están en la spec.
**Restricción dominante:** El frontend **no se toca en ninguna tarea** (§3.2). Verificación por HTTP.
**Tareas: 9.**

---

## 1. Estrategia de ejecución

### 1.1 Estructura resultante

El frontend **no se mueve** (D-13). Se agrega `backend/` como subcarpeta con su propio `package.json`, sus propias dependencias y su propio `tsconfig.json`. Los dos paquetes son independientes: `backend/` no entra en el `include` del `tsconfig.json` raíz, y `npm install` en la raíz no toca `backend/`.

```
vinoteca/                    ← raíz del repo (sin cambios de estructura)
├── src/                     ← frontend, INTACTO
├── test/                    ← tests del frontend, INTACTO
├── index.html               ← INTACTO
├── package.json             ← INTACTO
├── tsconfig.json            ← INTACTO
├── vite.config.ts           ← INTACTO
│
├── backend/                 ← NUEVO, autonomous
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── main.ts          ← entry: build + listen
│   │   ├── app.ts           ← construye la instancia de Fastify
│   │   ├── routes.ts
│   │   ├── config/env.ts
│   │   ├── shared/
│   │   │   ├── schemas.ts   ← Zod
│   │   │   └── types.ts     ← tipos inferidos
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── wines/
│   │   │   ├── orders/
│   │   │   ├── customers/
│   │   │   ├── metrics/
│   │   │   └── upload/
│   │   ├── plugins/index.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       ├── errors.ts
│   │       └── storage.ts
│   ├── scripts/
│   │   ├── seed.ts
│   │   └── migrate-from-localstorage.ts
│   ├── tests/
│   │   ├── modules/
│   │   └── integration/
│   ├── Dockerfile
│   ├── .env.example
│   └── vitest.config.ts
│
└── docker-compose.yml       ← NUEVO en la raíz: DB + backend
```

**Por qué `src/main.ts` y no `src/app.ts` como entry:** `main.ts` es lo que ejecuta Node; `app.ts` solo construye y devuelve la instancia para que los tests la mounten. El plan original usaba `app.ts` para las dos cosas, que hace imposible testear sin abrir un puerto.

### 1.2 Orden de tareas

```
T1 (Infra + seed) ──► T2 (Auth + core) ──┬──► T3 (Vinos admin)
                                        ├──► T4 (Vinos públicos)
                                        ├──► T5 (Pedidos)
                                        ├──► T6 (Clientes)
                                        ├──► T7 (Métricas)
                                        └──► T8 (Upload)
                                                │
                                                ▼
                                          T9 (Observabilidad + CI + Migración)
```

| Tarea | Título | Depende de |
|---|---|---|
| T1 | Infra: DB, config, shared, seed | — |
| T2 | Core: auth, middlewares, errors, plugins | T1 |
| T3 | API Vinos admin + import CSV | T2 |
| T4 | API Vinos públicos | T2 |
| T5 | API Pedidos + timeline | T2 |
| T6 | API Clientes | T2 |
| T7 | API Métricas | T2 |
| T8 | Upload de imágenes | T2 |
| T9 | Observabilidad, CI, deploy, migración | T3-T8 |

---

## 2. Mapa de archivos

### 2.1 A crear (todos dentro de `backend/` salvo el compose)

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `backend/package.json` | Dependencias y scripts | T1 |
| `backend/tsconfig.json` | TypeScript strict con `NodeNext` | T1 |
| `backend/vitest.config.ts` | Runner de tests del backend (node, no jsdom) | T1 |
| `backend/prisma/schema.prisma` | Esquema de 8 modelos (sin `AuditLog`) | T1 |
| `backend/src/config/env.ts` | Validación de env vars con Zod | T1 |
| `backend/src/shared/schemas.ts` | Zod schemas de todos los endpoints | T1 |
| `backend/src/shared/types.ts` | `z.infer` de los schemas | T1 |
| `backend/src/utils/logger.ts` | Pino | T1 |
| `backend/src/utils/errors.ts` | Clases de error | T1 |
| `backend/scripts/seed.ts` | Admin inicial (D-18) | T1 |
| `backend/src/plugins/index.ts` | helmet, cors, rate-limit, multipart, cookie, swagger | T2 |
| `backend/src/utils/request-context.ts` | Hooks `requestId` + `duration` | T2 |
| `backend/src/modules/auth/service.ts` | register, login, refresh, logout, getUser | T2 |
| `backend/src/modules/auth/routes.ts` | 4 endpoints + rate limit de login | T2 |
| `backend/src/modules/auth/middleware.ts` | `authenticate`, `requireRole` | T2 |
| `backend/src/app.ts` | Factory de Fastify + error handler | T2 |
| `backend/src/main.ts` | Entry: build + listen | T2 |
| `backend/src/routes.ts` | Registro por módulo | T2, T3-T8 |
| `backend/src/modules/wines/service.ts` | CRUD + importCsv + delete con validación | T3 |
| `backend/src/modules/wines/routes.ts` | 5 endpoints admin | T3 |
| `backend/src/modules/wines/public-routes.ts` | 1 endpoint público | T4 |
| `backend/src/modules/orders/service.ts` | findMany, findById, updateStatus | T5 |
| `backend/src/modules/orders/routes.ts` | 3 endpoints | T5 |
| `backend/src/modules/customers/service.ts` | findMany, findById, updateNotes, updateTags | T6 |
| `backend/src/modules/customers/routes.ts` | 3 endpoints | T6 |
| `backend/src/modules/metrics/service.ts` | Agregaciones | T7 |
| `backend/src/modules/metrics/routes.ts` | 1 endpoint | T7 |
| `backend/src/modules/upload/service.ts` | upload con sharp, delete | T8 |
| `backend/src/modules/upload/routes.ts` | 2 endpoints | T8 |
| `backend/src/utils/storage.ts` | Cliente S3-compatible | T8 |
| `backend/src/modules/health/routes.ts` | `/health` | T9 |
| `backend/scripts/migrate-from-localstorage.ts` | Migración idempotente | T9 |
| `backend/tests/**` | Unit + integration | T1-T9 |
| `backend/.env.example` | Vars documentadas | T1 |
| `backend/Dockerfile` | Multi-stage | T1 |
| `docker-compose.yml` | DB + backend (en la **raíz**) | T1 |

### 2.2 A modificar

**Ninguno.** Esta spec no toca ningún archivo del frontend (§3.2). Si en algún momento una tarea lo requiere, se para y se reporta.

---

## 3. Decisiones de implementación

### D-A — `tsconfig.json` del backend (corrige contradicción #2)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": false,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Consecuencia obligatoria:** con `NodeNext` + `"type": "module"`, **todo import relativo lleva extensión `.js`** aunque el archivo sea `.ts`:

```ts
// Correcto
import { env } from './config/env.js'
import { loginSchema } from './shared/schemas.js'

// INCORRECTO — falla con ERR_MODULE_NOT_FOUND al ejecutar
import { env } from './config/env'
```

`scripts/` y `tests/` quedan fuera del `include` de producción; se compilan con `tsx` en runtime.

### D-B — `prisma/schema.prisma` (corrige contradicciones #3, #5, #7)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum WineCategory {
  Tinto
  Blanco
  Rosado
  Espumante
}

enum OrderStatus {
  pendiente
  preparando
  enviado
  entregado
  cancelado
  devuelto
}

enum UserRole {
  admin
  gestor
  vendedor
}

model User {
  id           String         @id @default(cuid())
  email        String         @unique
  passwordHash String
  name         String
  role         UserRole       @default(vendedor)
  refreshTokens RefreshToken[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model RefreshToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model Wine {
  id           String       @id @default(cuid())
  name         String
  winery       String
  varietal     String
  category     WineCategory
  vintage      Int
  /// Pesos argentinos enteros. NO centavos (D-15).
  price        Int
  description  String?
  tastingNotes String?
  foodPairing  String?
  imageUrl     String
  stock        Int          @default(0)
  activo       Boolean      @default(true)
  orderItems   OrderItem[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([category])
  @@index([varietal])
  @@index([activo])
  @@index([name])
}

model Customer {
  id          String   @id @default(cuid())
  name        String
  /// Opcional: CE-04 de 004-a permite clientes sin email.
  /// Postgres permite multiples NULL en una columna UNIQUE.
  email       String?  @unique
  phone       String?
  totalOrders Int      @default(0)
  totalSpent  Int      @default(0)
  lastOrderAt DateTime?
  tags        String[] @default([])
  notes       Note[]
  orders      Order[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
}

model Note {
  id         String   @id @default(cuid())
  text       String
  /// "Admin" hardcoded: no hay auth real todavia (D-05 de 004-a).
  author     String   @default("Admin")
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@index([customerId])
}

model Order {
  id              String          @id @default(cuid())
  customerId      String
  customer        Customer        @relation(fields: [customerId], references: [id])
  items           OrderItem[]
  total           Int
  status          OrderStatus     @default(pendiente)
  shippingAddress Json
  timeline        OrderTimeline[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([status])
  @@index([createdAt])
  @@index([customerId])
}

model OrderItem {
  id       String @id @default(cuid())
  orderId  String
  order    Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  wineId   String
  wine     Wine   @relation(fields: [wineId], references: [id])
  quantity Int
  /// Precio unitario en el momento de la compra (pesos).
  price    Int

  @@index([orderId])
  @@index([wineId])
}

model OrderTimeline {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  author    String      @default("Admin")
  createdAt DateTime    @default(now())

  @@index([orderId])
}
```

**8 modelos, no 9.** `AuditLog` se eliminó (D-17): `OrderTimeline` y `Note` ya son el registro de auditoría.

**`OrderItem` no tiene `imageUrl`** (corrige el punto 9 de la revisión). La respuesta del API lo resuelve por join:

```ts
const order = await prisma.order.findUnique({
  where: { id },
  include: {
    items: { include: { wine: { select: { name: true, imageUrl: true } } } },
    customer: true,
    timeline: { orderBy: { createdAt: 'asc' } }
  }
})

// Mapeo al shape de 004-a
return {
  ...order,
  items: order.items.map((item) => ({
    wineId: item.wineId,
    wineName: item.wine.name,
    imageUrl: item.wine.imageUrl,
    quantity: item.quantity,
    price: item.price
  }))
}
```

### D-C — Variables de entorno (`config/env.ts`)

```ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  LOGIN_RATE_MAX: z.coerce.number().int().positive().default(5),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string().default('wine-images'),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  PUBLIC_API_URL: z.string().url()
})

export const env = envSchema.parse(process.env)
```

**Falla en el arranque** si falta o es inválida cualquier variable. No hay defaults para `DATABASE_URL`, `JWT_SECRET` ni las de storage.

### D-D — Errores (`utils/errors.ts`)

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 400, 'Datos inválidos', details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED') {
    super(code, 401, 'No autenticado')
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('INSUFFICIENT_ROLE', 403, 'Rol sin permiso para esta operación')
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super('NOT_FOUND', 404, `${resource} no encontrado`)
  }
}

export class ConflictError extends AppError {
  constructor(code: string, details?: unknown) {
    super(code, 409, 'Conflicto', details)
  }
}

export class PayloadTooLargeError extends AppError {
  constructor() {
    super('PAYLOAD_TOO_LARGE', 413, 'El archivo supera el tamaño máximo')
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super('UNSUPPORTED_MEDIA_TYPE', 415, 'El archivo no es una imagen')
  }
}
```

El error handler global nunca expone stack en producción (RNF-06):

```ts
fastify.setErrorHandler((error, req, reply) => {
  if (error instanceof AppError) {
    req.log.warn({ code: error.code, statusCode: error.statusCode }, error.message)
    return reply.status(error.statusCode).send({
      code: error.code,
      message: error.message,
      ...(error.details !== undefined && { details: error.details })
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Datos inválidos',
      details: error.flatten()
    })
  }

  req.log.error({ err: error }, 'Error no manejado')
  return reply.status(500).send({
    code: 'INTERNAL_ERROR',
    message: 'Error interno del servidor',
    ...(env.NODE_ENV === 'development' && { stack: error.stack })
  })
})
```

### D-E — Auth: por qué el refresh **no** es JWT

El access token es JWT (verificable sin consulta a DB). El refresh token es **opaco**: 64 bytes aleatorios en hex, de los cuales se guarda **solo el hash SHA-256**. Esto permite revocar por rotación (D-04):

```ts
// services/auth/service.ts
import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

async login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  // Mismo mensaje para usuario inexistente y password incorrecto:
  // no revela que emails existen.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError('INVALID_CREDENTIALS')
  }
  return this.issueTokens(user)
}

private async issueTokens(user: User) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  )

  const plain = randomBytes(32).toString('hex')
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(plain),
      userId: user.id,
      expiresAt: addDays(new Date(), env.REFRESH_TOKEN_DAYS)
    }
  })

  return { accessToken, refreshToken: plain, user: publicUser(user) }
}

async refresh(plainToken: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(plainToken) },
    include: { user: true }
  })

  if (!record || record.expiresAt < new Date()) {
    throw new UnauthorizedError('INVALID_REFRESH_TOKEN')
  }

  // Rotacion: el token viejo deja de valer de inmediato.
  await prisma.refreshToken.delete({ where: { id: record.id } })
  return this.issueTokens(record.user)
}

async logout(plainToken: string) {
  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashToken(plainToken) }
  })
}
```

### D-F — Middlewares (`modules/auth/middleware.ts`)

```ts
declare module 'fastify' {
  interface FastifyRequest {
    user?: User
  }
}

export const authenticate = async (request: FastifyRequest): Promise<void> => {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError()

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw new UnauthorizedError()
    request.user = user
  } catch (error) {
    throw error instanceof AppError ? error : new UnauthorizedError('TOKEN_EXPIRED')
  }
}

export const requireRole =
  (...roles: UserRole[]) =>
  async (request: FastifyRequest): Promise<void> => {
    await authenticate(request)
    if (!roles.includes(request.user!.role)) throw new ForbiddenError()
  }
```

`getUser` nunca devuelve `passwordHash`: hay un mapper explícito, no un `delete user.passwordHash`.

### D-G — Rate limit de login (RF-18)

El límite general (`RATE_LIMIT_MAX`, 100/min) se registra como plugin global. El de login se registra **por ruta**, más estricto:

```ts
fastify.post(
  '/api/auth/login',
  {
    config: {
      rateLimit: {
        max: env.LOGIN_RATE_MAX,       // 5
        timeWindow: env.RATE_LIMIT_WINDOW,
        keyGenerator: (request) => request.ip
      }
    }
  },
  loginHandler
)
```

### D-H — Vinos: delete con validación (CE-01) e import CSV

```ts
async delete(id: string): Promise<void> {
  const count = await prisma.orderItem.count({ where: { wineId: id } })
  if (count > 0) {
    throw new ConflictError('HAS_ORDERS', { count })
  }
  const wine = await prisma.wine.findUnique({ where: { id } })
  if (!wine) throw new NotFoundError('Vino')
  await prisma.wine.delete({ where: { id } })
}
```

Import CSV con upsert y reporte por fila:

```ts
async importCsv(stream: Readable): Promise<ImportResult> {
  const rows = await parseCsvStream(stream)   // papa-parse en modo stream
  const result: ImportResult = { created: 0, updated: 0, errors: [] }

  for (const [index, row] of rows.entries()) {
    const parsed = wineCreateSchema.safeParse(normalizeRow(row))

    if (!parsed.success) {
      result.errors.push({
        row: index + 2,   // +2: header es la fila 1
        field: parsed.error.issues[0]?.path.join('.') ?? 'desconocido',
        message: parsed.error.issues[0]?.message ?? 'inválido'
      })
      continue
    }

    const existing = await prisma.wine.findUnique({ where: { id: parsed.data.id } })
    if (existing) {
      await prisma.wine.update({ where: { id: parsed.data.id }, data: parsed.data })
      result.updated++
    } else {
      await prisma.wine.create({ data: parsed.data })
      result.created++
    }
  }

  return result
}
```

El handler devuelve `201` si `errors.length === 0`, y `207` si hay alguna (CE-05).

### D-I — Pedidos: timeline y roles (RF-09)

```ts
async updateStatus(id: string, newStatus: OrderStatus, author: string) {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw new NotFoundError('Pedido')

  // Mismo estado -> no-op. Sin entrada de timeline duplicada (CA-10).
  if (order.status === newStatus) return this.findById(id)

  const [updated] = await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status: newStatus } }),
    prisma.orderTimeline.create({
      data: { orderId: id, status: newStatus, author }
    })
  ])

  return this.findById(updated.id)
}
```

El rol `vendedor` se restringe **en el handler**, no en el service:

```ts
fastify.patch('/api/orders/:id', { preHandler: authenticate }, async (req) => {
  const user = req.user!
  const body = orderUpdateSchema.parse(req.body)

  // vendedor: unica clave permitida es `status` (CE-07).
  if (user.role === 'vendedor' && Object.keys(body).some((k) => k !== 'status')) {
    throw new ForbiddenError()
  }

  return ordersService.updateStatus(req.params.id, body.status!, user.name)
})
```

### D-J — Métricas: qué se calcula y qué se devuelve en 0

```ts
async getMetrics(): Promise<Metrics> {
  const now = new Date()
  const startToday = startOfDay(now)
  const startWeek = startOfWeek(now, { weekStartsOn: 1 })
  const startMonth = startOfMonth(now)
  const start30 = subDays(now, 30)

  const [
    today, week, month, avg,
    sales30d, topProducts, recentOrders, recentCustomers
  ] = await Promise.all([
    this.sumOrders({ gte: startToday }),
    this.sumOrders({ gte: startWeek }),
    this.sumOrders({ gte: startMonth }),
    prisma.order.aggregate({ _avg: { total: true } }),
    this.salesByDay(start30),
    this.topProducts(),
    this.recentOrders(3),
    this.recentCustomers(2)
  ])

  return {
    salesToday: today.total,
    salesWeek: week.total,
    salesMonth: month.total,
    // Siempre 0 hasta que exista tracking (D-16, §3.2 de la spec).
    abandonedCarts: 0,
    avgTicket: Math.round(avg._avg.total ?? 0),
    conversion: 0,
    salesLast30Days: sales30d,
    topProducts,
    recentActivity: [...recentOrders, ...recentCustomers]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 5)
  }
}
```

### D-K — Upload con sharp

```ts
const ALLOWED = /^image\/(png|jpeg|webp|gif|avif)$/

async upload(file: Buffer, originalname: string, mimetype: string) {
  if (!ALLOWED.test(mimetype)) throw new UnsupportedMediaTypeError()
  if (file.byteLength > env.UPLOAD_MAX_BYTES) throw new PayloadTooLargeError()

  // sharp falla si los bytes no son una imagen real, aunque el
  // content-type diga que si. Se traduce a 415.
  const webp = await sharp(file)
    .rotate()                                    // respeta EXIF
    .resize(1920, 1920, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  const id = randomUUID()
  const key = `wines/${id}.webp`
  await storagePut(key, webp, 'image/webp')

  return { id, url: await storageSignedUrl(key, 3600) }
}
```

### D-L — Seed (`scripts/seed.ts`)

Se ejecuta en T1, no en T9, para que T2 pueda probar auth (D-18):

```ts
const admin = {
  email: 'admin@vinoteca.local',
  password: 'admin123',
  name: 'Administrador',
  role: 'admin' as const
}

const gestor = { ...admin, email: 'gestor@vinoteca.local', role: 'gestor' as const }
const vendedor = { ...admin, email: 'vendedor@vinoteca.local', role: 'vendedor' as const }

for (const user of [admin, gestor, vendedor]) {
  await prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash: await bcrypt.hash(user.password, 10)
    }
  })
}
```

Es idempotente: `upsert` con `update: {}` no sobreescribe si ya existe. Las contraseñas son de desarrollo y están en el README de `backend/`.

### D-M — Migración desde localStorage (T9)

El frontend guarda en `localStorage` las claves `vinoteca_wines` y `vinoteca_cart` (004-a). La migración se alimenta de un **JSON exportado desde el navegador**, no de leer `localStorage` desde Node:

```bash
# 1. En el navegador: copiar(localStorage.vinoteca_wines) -> archivo Wines.json
# 2. Correr el script
npm run migrate -- --input ./data/wines.json --dry-run   # simula
npm run migrate -- --input ./data/wines.json             # escribe
```

Escribe `vinoteca_cart` como `Customer` + `Order` con estado `pendiente`, porque un carrito es un pedido no confirmado.

Idempotencia: `upsert` por `Wine.id`, `Customer.email`, y `Order.id`. Correrlo dos veces no duplica nada.

### D-N — `docker-compose.yml` (en la raíz)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: vinoteca
      POSTGRES_PASSWORD: vinoteca
      POSTGRES_DB: vinoteca
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U vinoteca']
      interval: 5s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      db: { condition: service_healthy }
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://vinoteca:vinoteca@db:5432/vinoteca
      # Default solo para desarrollo local. Produccion lo inyecta el deploy.
      JWT_SECRET: ${JWT_SECRET:-dev-secret-de-al-menos-32-caracteres-xxxx}
      STORAGE_ENDPOINT: ${STORAGE_ENDPOINT:-http://localhost:9000}
      STORAGE_BUCKET: wine-images
      STORAGE_ACCESS_KEY: ${STORAGE_ACCESS_KEY:-minioadmin}
      STORAGE_SECRET_KEY: ${STORAGE_SECRET_KEY:-minioadmin}
      PUBLIC_API_URL: ${PUBLIC_API_URL:-http://localhost:3000}
    ports: ['3000:3000']

volumes:
  pgdata:
```

El default de `JWT_SECRET` (corrige el punto 13 de la revisión) hace que `docker compose up` funcione sin crear `.env` primero. En producción la variable real siempre gana.

---

## 4. Estrategia de tests

### 4.1 Unit (mocks de Prisma)

| Archivo | Qué cubre |
|---|---|
| `tests/modules/auth.test.ts` | Login, rotación, logout, comparación de bcrypt |
| `tests/modules/wines.test.ts` | Filtros, delete con conteo, import con errores |
| `tests/modules/orders.test.ts` | Cambio de estado, no-op en mismo estado |
| `tests/modules/customers.test.ts` | Notas append, tags replace |
| `tests/modules/metrics.test.ts` | Agregaciones, `abandonedCarts: 0` |
| `tests/utils/errors.test.ts` | statusCode y code de cada clase |
| `tests/shared/schemas.test.ts` | Inputs válidos e inválidos de cada schema |

### 4.2 Integration (Supertest + DB real)

| Archivo | Qué cubre |
|---|---|
| `tests/integration/auth.flow.test.ts` | login → me → refresh → logout por HTTP |
| `tests/integration/auth.rate-limit.test.ts` | 6 intentos → 429 |
| `tests/integration/wines.crud.test.ts` | CRUD completo por HTTP, incluido 409 |
| `tests/integration/wines.public.test.ts` | Filtro de inactivos, ausencia de stock |
| `tests/integration/orders.flow.test.ts` | Transiciones y timeline |
| `tests/integration/orders.roles.test.ts` | 403 de vendedor |

### 4.3 DB de tests

`tests/setup.ts` corre `prisma migrate deploy` contra `DATABASE_URL_TEST` y hace `TRUNCATE ... RESTART IDENTITY CASCADE` en `beforeEach`. Sin `DATABASE_URL_TEST`, los tests de integration **se saltan** en vez de fallar, para que `npm test` sea usable sin Docker.

---

## 5. Trazabilidad RF → Tarea

| RF | Tarea | CA |
|---|---|---|
| RF-14 a RF-18 | T2 | CA-13 a CA-17 |
| RF-01 a RF-05 | T3 | CA-01 a CA-07 |
| RF-06 | T4 | CA-21, CA-22 |
| RF-07 a RF-09 | T5 | CA-08 a CA-10, CA-23, CA-24 |
| RF-10, RF-11 | T6 | CA-11, CA-12 |
| RF-12, RF-13 | T7 | CA-25 a CA-27 |
| RF-19 a RF-21 | T8 | CA-18 a CA-20 |
| RF-22, RF-23 | T9 | CA-31, CA-32 |
| RNF-01, RNF-02 | T1 | CA-28 |
| RNF-03, RNF-05 | T9 | CA-34 |
| RNF-04 | T2 | CA-33, CA-14 |
| RNF-06 | T2 | CA-28 |
| RNF-07 | T9 | — (verificado en el script) |
| RNF-08 | T9 | — (workflow) |
| RNF-09 | T9 | CA-32 |
| D-18 (seed) | T1 | CA-35 |
| RNF-03 (docker) | T1 | CA-36 |

---

## 6. Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **`NodeNext` obliga a extender todos los imports relativos** | Olvidar un `.js` rompe el runtime, no el typecheck | `tsc --noEmit` no lo detecta; `node dist/main.js` sí. T1 verifica el arranque real |
| R2 | Cambiar el schema cuando ya hay datos | Migración fallida | `prisma migrate dev` en local; `migrate deploy` en prod; backup antes de migrar |
| R3 | Refresh token expira y el usuario pierde sesión | UX molesto | TTL de 7 días, y la 004-c implementa refresh proactivo |
| R4 | Import CSV de archivo muy grande | Timeout o memoria | `papa-parse` en modo stream + inserts en lotes |
| R5 | Rate limit de login bloquea usuarios legítimos | Quejas | 5/min por IP es holgado para una persona real; documentado en README |
| R6 | Reloj desfasado invalida JWT | `401` espurio | Tolerancia de reloj en la verificación; Railway y Docker usan NTP |
| R7 | Migración duplica datos si se corre mal | Datos corruptos | Idempotencia por clave natural + `--dry-run` obligatorio antes de escribir |
| R8 | `sharp` falla en Alpine (binarios nativos) | Imagen Docker rota | `sharp` trae prebuilts para Alpine; si falla, `npm rebuild sharp` en el Dockerfile |

---

## 7. Dependencias (`backend/package.json`)

```json
{
  "name": "vinoteca-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "seed": "tsx scripts/seed.ts",
    "migrate:data": "tsx scripts/migrate-from-localstorage.ts"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.500.0",
    "@aws-sdk/s3-request-presigner": "^3.500.0",
    "@fastify/cookie": "^9.3.0",
    "@fastify/cors": "^8.5.0",
    "@fastify/helmet": "^11.1.0",
    "@fastify/multipart": "^8.2.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^4.1.0",
    "@prisma/client": "^5.8.0",
    "bcryptjs": "^2.4.3",
    "fastify": "^4.25.0",
    "fastify-plugin": "^4.5.1",
    "jsonwebtoken": "^9.0.2",
    "papa-parse": "^5.4.1",
    "pino": "^8.17.0",
    "sharp": "^0.33.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.11.0",
    "@types/papa-parse": "^5.3.14",
    "@types/supertest": "^6.0.2",
    "eslint": "^8.56.0",
    "prisma": "^5.8.0",
    "pino-pretty": "^10.3.0",
    "supertest": "^6.3.3",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.1.0"
  }
}
```

Storage con el SDK de S3 en vez de Supabase es lo que hace D-6 portable: el mismo código funciona contra AWS, Cloudflare R2 o MinIO local.

---

## 8. Verificación por tarea

```bash
cd backend

# Cada tarea
npm run typecheck        # tsc --noEmit
npm run build            # emite dist/
npm run test             # vitest run

# T1 específico — el arranque real, que es lo que detecta imports sin extensión
npm run db:generate
npm run db:migrate
npm run seed
npm run build && npm start   # debe escuchar en :3000

# T2
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vinoteca.local","password":"admin123"}'

# T9
docker compose up -d
curl http://localhost:3000/health
```

---

## 9. Lo que NO se hace en esta spec

- **No se toca `src/`, `test/`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` ni ningún otro archivo del frontend.** Si una tarea lo necesita, se detiene y se reporta.
- **No se agrega `vitest` a la raíz.** Falta ahí (los 4 archivos de test de `test/` no corren hoy), pero arreglarlo es una tarea aparte con su propio alcance. El backend trae su propio runner en `backend/`.
