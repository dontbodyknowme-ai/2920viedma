# Tareas 004-b — Backend API Real

**Spec:** `specs/004-b-backend-api/spec.md`, estado `borrador`
**Plan:** `specs/004-b-backend-api/plan.md`
**Fase:** 4 de 5 (tareas). El implementador hace estas tareas; el Reviewer las valida después.
**Tareas: 9.**

## Cómo se usan estas tareas

- **Una tarea a la vez**, en el orden de dependencias.
- **Ninguna tarea se marca hecha sin ejecutar su verificación.** El estado arranca en `pendiente` y solo pasa a `hecha` cuando la verificación pasa.
- **Regla dura: el frontend no se toca.** Ni `src/`, ni `test/`, ni `index.html`, ni `package.json`, ni `tsconfig.json`, ni `vite.config.ts`, ni `vitest.config.ts`. Todo lo nuevo vive en `backend/`, salvo `docker-compose.yml`. Si una tarea necesita tocar el frontend, **se detiene y se reporta**: eso significa que la spec está incompleta.
- **Regla dura: verificación por HTTP**, con Supertest o curl. Nada de navegador en esta spec (§3.2).
- **Si la implementación requiere cambiar la spec o el plan, pará y reportá** (skill SDD).

## Comandos de referencia

```bash
cd backend
npm run typecheck      # tsc --noEmit, exit 0
npm run build          # emite dist/, exit 0
npm run test           # vitest run, exit 0
npm run dev            # :3000
```

## Índice

| ID | Título | RF cubiertos | Depende de | Estado |
|---|---|---|---|---|
| T1 | Infra: DB, config, shared, seed | RNF-01, RNF-02 | — | `pendiente` |
| T2 | Core: auth, middlewares, plugins | RF-14 a RF-18 | T1 | `pendiente` |
| T3 | API Vinos admin + import CSV | RF-01 a RF-05 | T2 | `pendiente` |
| T4 | API Vinos públicos | RF-06 | T2 | `pendiente` |
| T5 | API Pedidos + timeline | RF-07 a RF-09 | T2 | `pendiente` |
| T6 | API Clientes | RF-10, RF-11 | T2 | `pendiente` |
| T7 | API Métricas | RF-12, RF-13 | T2 | `pendiente` |
| T8 | Upload de imágenes | RF-19 a RF-21 | T2 | `pendiente` |
| T9 | Observabilidad, CI, deploy, migración | RF-22, RF-23, RNF-03, RNF-05, RNF-07 a RNF-09 | T3-T8 | `pendiente` |

---

## T1 — Infra: DB, config, shared, seed

**RF cubiertos:** Base de infraestructura. RNF-01, RNF-02.
**Depende de:** nada. Es la primera.
**Estado:** `pendiente`

### Qué hacer

**1. Crear `backend/package.json`** con las dependencias de plan §7 y `"type": "module"`.

**2. Crear `backend/tsconfig.json`** con `module: "NodeNext"` y `moduleResolution: "NodeNext"` (plan D-A).

> **Lo que más se va a errar en esta tarea:** con `NodeNext`, **todo import relativo lleva extensión `.js`**, aunque el archivo sea `.ts`:
> ```ts
> import { env } from './config/env.js'   // Correcto
> import { env } from './config/env'      // Typecheck pasa, runtime falla
> ```
> `tsc --noEmit` **no** lo detecta. Solo `npm start` lo detecta. Por eso T1 termina arrancando el server de verdad.

**3. Crear `backend/vitest.config.ts`** con `environment: 'node'` (no jsdom), `include: ['tests/**/*.test.ts']`, y `globalSetup` que corra las migraciones si `DATABASE_URL_TEST` está definida.

**4. Crear `backend/prisma/schema.prisma`** con los 8 modelos de plan D-B. Sin `AuditLog`.

Puntos que hay que respetar:
- `price Int` en **pesos** (D-15). No centavos.
- `Customer.email String? @unique` — opcional, porque CE-04 de 004-a permite clientes sin email.
- `OrderItem` **no** tiene `imageUrl`: se resuelve por join.
- `OrderTimeline.author` y `Note.author` con `@default("Admin")`.

**5. Crear `backend/src/config/env.ts`** con el schema de plan D-C. Falla en el arranque si falta una variable requerida.

**6. Crear `backend/src/shared/schemas.ts`** con todos los Zod schemas de plan D-B. Ajuste importante: `price` validado como `z.number().int().positive()` (pesos).

**7. Crear `backend/src/shared/types.ts`** con los `z.infer`.

**8. Crear `backend/src/utils/logger.ts`** (Pino: pretty en dev, JSON en prod) y `backend/src/utils/errors.ts` (clases de plan D-D).

**9. Crear `backend/scripts/seed.ts`** con plan D-L. Idempotente, crea admin + gestor + vendedor.

**10. Crear `backend/.env.example`** con todas las variables, comentadas.

**11. Crear `backend/Dockerfile`** multi-stage y **`docker-compose.yml`** en la raíz con plan D-N (incluye el default de `JWT_SECRET` para que `up` funcione sin `.env`).

**12. `backend/tests/shared/schemas.test.ts`** — tests de cada schema con inputs válidos e inválidos.

### Verificación

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run seed
npm run typecheck        # exit 0
npm run build            # exit 0
npm run test             # exit 0
npm start                # debe escuchar en :3000 y NO crashear
```

```bash
# Desde la raíz
docker compose up -d
docker compose logs backend   # sin errores
```

### Hecho cuando

- [ ] `backend/package.json` existe con `"type": "module"` y las deps de plan §7
- [ ] `backend/tsconfig.json` usa `NodeNext`, y **todos** los imports relativos llevan `.js`
- [ ] `prisma migrate` crea la DB con los 8 modelos, sin `AuditLog`
- [ ] `price` es Int en pesos; `Customer.email` es opcional y unique
- [ ] `env.ts` valida y falla si falta una variable requerida
- [ ] Todos los Zod schemas existen y sus tests pasan
- [ ] `npm run seed` crea 3 usuarios y es idempotente (correrlo 2 veces no falla)
- [ ] **`npm start` levanta el server y responde en `/`** (esto es lo que valida las extensiones `.js`)
- [ ] `docker compose up` levanta DB + backend sin errores, sin `.env` previo
- [ ] `npm run typecheck`, `build` y `test` salen 0

---

## T2 — Core: auth, middlewares, plugins

**RF cubiertos:** RF-14, RF-15, RF-16, RF-17, RF-18
**RNF:** RNF-04, RNF-06
**Depende de:** T1
**Estado:** `pendiente`

### Qué hacer

**1. `src/plugins/index.ts`** — helmet, cors, rate limit general, multipart (con `limits.fileSize`), cookie, swagger + swagger-ui en `/api/docs`.

**2. `src/utils/request-context.ts`** — Hook `onRequest` que asigna `requestId` (UUID) y loguea; hook `onResponse` que loguea `status` + `duration` en JSON.

**3. `src/modules/auth/service.ts`** — `register`, `login`, `refresh`, `logout`, `getUser`, con la estrategia de plan D-E.

Puntos que no son negociables:
- El refresh token es **opaco** (randomBytes), en DB solo su **SHA-256**.
- `refresh` **rota**: borra el viejo, crea el nuevo.
- Login con email inexistente y con password incorrecto devuelven el **mismo** error (`INVALID_CREDENTIALS`). No se revela qué emails existen.
- `getUser` nunca devuelve `passwordHash`: hay un mapper `publicUser()`, no un `delete`.

**4. `src/modules/auth/middleware.ts`** — `authenticate` y `requireRole` de plan D-F. Requiere el augmentation de tipos de `FastifyRequest`.

**5. `src/modules/auth/routes.ts`** — 4 endpoints, con el rate limit de login de plan D-G aplicado **por ruta** (5/min por IP).

**6. `src/app.ts`** — factory de Fastify: plugins, error handler de plan D-D, request context.

**7. `src/main.ts`** — entry: `buildApp()` + `listen()`. separated del factory para que los tests monten la app sin abrir el puerto.

**8. `src/routes.ts`** — registra los módulos implementados. T3-T8 lo completan.

**9. Tests:**
- `tests/modules/auth.test.ts` — unit: login, rotación, logout, bcrypt, mapper de usuario
- `tests/modules/errors.test.ts` — unit: `statusCode` y `code` de cada clase
- `tests/integration/auth.flow.test.ts` — login → me → refresh → logout por HTTP
- `tests/integration/auth.rate-limit.test.ts` — 6 intentos fallidos → 429

### Verificación

```bash
cd backend
npm run typecheck && npm run build && npm run test
npm start
```

```bash
# Login válido
curl -s -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vinoteca.local","password":"admin123"}'
# → 200, body con accessToken, header Set-Cookie con refreshToken httpOnly

# /me sin token → 401
curl -s http://localhost:3000/api/auth/me

# /me con token → 200 sin passwordHash
TOKEN=<accessToken del login>
curl -s http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"

# Refresh con cookie → 200 y cookie distinta
curl -s -i -X POST http://localhost:3000/api/auth/refresh \
  -H 'Cookie: refreshToken=<valor>' | grep -i set-cookie

# Refresh inválida → 401 + cookie limpiada
curl -s -i -X POST http://localhost:3000/api/auth/refresh \
  -H 'Cookie: refreshToken=invalido' | grep -i set-cookie

# 6 intentos fallidos → 429
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@vinoteca.local","password":"incorrecto"}'
done
# → 401 401 401 401 401 429
```

### Hecho cuando

- [ ] Plugins registrados: helmet, cors, rate limit, multipart, cookie, swagger
- [ ] Request context loguea JSON con `requestId`, `status`, `duration`
- [ ] 4 endpoints de auth funcionan
- [ ] Refresh token es opaco y se **rota** (la cookie nueva difiere de la vieja)
- [ ] Email inexistente y password incorrecto dan el mismo error
- [ ] `/me` nunca expone `passwordHash`
- [ ] Rate limit de login: 6º intento → 429
- [ ] El error handler nunca devuelve stack en producción
- [ ] Tests pasan, `typecheck` y `build` salen 0
- [ ] CA-13 a CA-17 pasan por curl

---

## T3 — API Vinos admin + import CSV

**RF cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/modules/products/service.ts`** — `findMany`, `findById`, `create`, `update`, `delete`, `importCsv`.

- `findMany`: `search` con OR sobre `name`, `winery`, `varietal`, case-insensitive. `status=activo|inactivo` mapea a `activo: true|false`. Skip/take para paginación. Responde `{ data, total, page, limit, totalPages }`.
- `delete`: cuenta `orderItem` antes de borrar. Si hay, `ConflictError('HAS_ORDERS', { count })` (plan D-H, CE-01).
- `importCsv`: `papa-parse` en modo stream, valida fila por fila, upsert por `id`. Devuelve `{ created, updated, errors: [{ row, field, message }] }`. La fila reportada es `index + 2` porque el header ocupa la fila 1.

**2. `src/modules/products/routes.ts`** — 5 endpoints con `requireRole`:
- `GET /api/wines` → `requireRole('admin', 'gestor')`
- `POST /api/wines` → `requireRole('admin', 'gestor')` → `201`
- `PATCH /api/wines/:id` → `requireRole('admin', 'gestor')`
- `DELETE /api/wines/:id` → `requireRole('admin')` → `204`
- `POST /api/wines/import` → `requireRole('admin')` → `201` o `207`

**3. `src/routes.ts`** — registrar el módulo.

**4. Tests:**
- `tests/modules/wines.test.ts` — unit con Prisma mock: filtros combinados, delete con conteo, import con errores
- `tests/integration/wines.crud.test.ts` — HTTP: CRUD completo, 401 sin token, 403 con `vendedor`, 409 con pedidos

### Verificación

```bash
cd backend
npm run typecheck && npm run build && npm run test
```

```bash
TOKEN=<accessToken admin>
AUTH="Authorization: Bearer $TOKEN"

# GET con filtros combinados
curl -s "http://localhost:3000/api/products?page=1&limit=10&search=malbec&category=Tinto" \
  -H "$AUTH"
# → 200 con { data, total, page, limit, totalPages }

# Sin token → 401
curl -s http://localhost:3000/api/products

# Con vendedor → 403
curl -s -X POST http://localhost:3000/api/products -H "$AUTH_VENDEDOR" \
  -H 'Content-Type: application/json' -d '{"name":"X"}'

# DELETE sin pedidos → 204
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/products/<id> -H "$AUTH"

# DELETE con pedidos → 409 con code
curl -s -X DELETE http://localhost:3000/api/products/<id-con-pedidos> -H "$AUTH"
# → {"code":"HAS_ORDERS","details":{"count":N}}

# Import CSV válido → 201, con errores → 207
curl -s -X POST http://localhost:3000/api/products/import -H "$AUTH" \
  -F "file=@./testdata/valido.csv"
# → 201 {"created":N,"updated":M,"errors":[]}
curl -s -X POST http://localhost:3000/api/products/import -H "$AUTH" \
  -F "file=@./testdata/con-errores.csv"
# → 207 {"created":N,"updated":M,"errors":[{"row":3,"field":"price","message":"..."}]}
```

### Hecho cuando

- [ ] WineService con los 6 métodos
- [ ] 5 endpoints con los roles correctos
- [ ] Los filtros son combinables con AND
- [ ] `DELETE` con pedidos devuelve 409 + `HAS_ORDERS` + count real
- [ ] Import CSV hace upsert por `id` y reporta errores por fila con número de fila correcto
- [ ] Sin token → 401; con `vendedor` → 403
- [ ] Tests pasan, `typecheck` y `build` salen 0
- [ ] CA-01 a CA-07 pasan

---

## T4 — API Vinos públicos

**RF cubiertos:** RF-06
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/modules/products/public-routes.ts`** — un solo endpoint:

```
GET /api/wines/public
```

Sin autenticación. Query: `activo: true` solamente.

El shape de la respuesta es el `Producto` del frontend (`src/types/producto.ts`), **sin** `stock` ni `activo`. La proyección de Prisma lo hace explícito:

```ts
const publicWines = await prisma.product.findMany({
  where: { activo: true },
  select: {
    id: true,
    name: true,
    winery: true,
    varietal: true,
    category: true,
    vintage: true,
    price: true,
    description: true,
    tastingNotes: true,
    foodPairing: true,
    imageUrl: true
  },
  orderBy: { name: 'asc' }
})
```

> `select` y no `omit`: `omit` dejaría pasar cualquier campo nuevo que se agregue después. Con `select`, agregar `stock` al modelo no lo filtra automáticamente y hay que decidirlo a propósito.

**Sin paginación** (RF-06): el catálogo público se entrega completo, como en el frontend actual.

**2. Tests:** `tests/integration/wines.public.test.ts` — un producto `activo: false` en DB no aparece; el body no tiene las claves `stock` ni `activo`; funciona sin token.

### Verificación

```bash
# Sin token
curl -s http://localhost:3000/api/products/public | jq '.[0] | keys'
# → no debe aparecer "stock" ni "activo"

# Con un producto inactivo en DB, no debe aparecer
curl -s http://localhost:3000/api/products/public | jq 'length'
```

### Hecho cuando

- [ ] `GET /api/wines/public` responde sin autenticación
- [ ] Solo devuelve productos con `activo: true`
- [ ] El body **no** tiene `stock` ni `activo`
- [ ] Usa `select` explícito, no `omit`
- [ ] Sin paginación
- [ ] Tests pasan
- [ ] CA-21 y CA-22 pasan

---

## T5 — API Pedidos + timeline

**RF cubiertos:** RF-07, RF-08, RF-09
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/modules/orders/service.ts`** — `findMany`, `findById`, `updateStatus`, `create`.

- `findMany`: filtros `status`, `dateFrom`, `dateTo`, `search` (id del pedido o nombre/email del cliente). Paginación.
- `findById`: `include` de `items.wine`, `customer`, `timeline` ordenado ascendente. **Mapea `items` al shape de 004-a**, resolviendo `imageUrl` desde `wine` (plan D-B):

```ts
items: order.items.map((item) => ({
  wineId: item.wineId,
  wineName: item.wine.name,
  imageUrl: item.wine.imageUrl,
  quantity: item.quantity,
  price: item.price
}))
```

- `updateStatus`: transacción con `order.update` + `orderTimeline.create`. **Si el estado no cambia, no crea entrada** (CA-10, plan D-I).

**2. `src/modules/orders/routes.ts`** — 3 endpoints con `authenticate` (los 3 roles entran):
- `GET /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id` — **el rol `vendedor` solo puede enviar `{ status }`**. Cualquier otra clave → `ForbiddenError` (CE-07, plan D-I). La restricción va en el handler, no en el service.

**3. Tests:**
- `tests/modules/orders.test.ts` — unit: transición crea timeline; mismo estado no crea; items mapeados con imageUrl
- `tests/integration/orders.flow.test.ts` — HTTP: crear, cambiar estado, verificar timeline
- `tests/integration/orders.roles.test.ts` — `vendedor` + `{ status }` → 200; `vendedor` + `{ customerName }` → 403

### Verificación

```bash
AUTH="Authorization: Bearer $TOKEN"

# Filtros combinados
curl -s "http://localhost:3000/api/orders?status=enviado&dateFrom=2026-01-01&page=1&limit=10" -H "$AUTH"

# Detalle con imageUrl en cada item
curl -s http://localhost:3000/api/orders/<id> -H "$AUTH" | jq '.items[0]'
# → { wineId, wineName, imageUrl, quantity, price }

# Cambio de estado → 1 entrada nueva en timeline
curl -s -X PATCH http://localhost:3000/api/orders/<id> -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"status":"preparando"}' | jq '.timeline | length'

# Mismo estado → el timeline NO crece
curl -s -X PATCH http://localhost:3000/api/orders/<id> -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"status":"preparando"}' | jq '.timeline | length'

# vendedor con key no permitida → 403
curl -s -X PATCH http://localhost:3000/api/orders/<id> -H "$AUTH_VENDEDOR" \
  -H 'Content-Type: application/json' -d '{"customerName":"X"}'
```

### Hecho cuando

- [ ] OrderService con los 4 métodos
- [ ] 3 endpoints funcionan con los 3 roles
- [ ] `items` incluye `imageUrl` resuelto por join
- [ ] Cambio de estado crea **una** entrada de timeline con `author`
- [ ] Mismo estado **no** crea entrada
- [ ] `vendedor` con body distinto de `{ status }` → 403
- [ ] Tests pasan
- [ ] CA-08 a CA-10, CA-23, CA-24 pasan

---

## T6 — API Clientes

**RF cubiertos:** RF-10, RF-11
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/modules/customers/service.ts`** — `findMany`, `findById`, `updateNotes`, `updateTags`.

- `findMany`: `search` sobre `name`, `email`, `phone`. `tags` con `has: tag` (AND entre tags). Paginación.
- `findById`: `include` de `notes` (desc) y `orders` con items.
- `updateNotes`: **append-only**. `prisma.note.createMany` sobre las notas entrantes, sin tocar las existentes.
- `updateTags`: **replace**. Lee el array completo y hace `set`, no `push`.

**2. `src/modules/customers/routes.ts`** — 3 endpoints con `requireRole('admin', 'gestor')`.

**3. Tests:**
- `tests/modules/customers.test.ts` — unit: notas append (las previas sobreviven), tags replace, AND de tags
- `tests/integration/customers.test.ts` — HTTP: search + tags, PATCH con ambos

### Verificación

```bash
# AND lógico de search + tags
curl -s "http://localhost:3000/api/customers?search=ana&tags=VIP" -H "$AUTH"

# Notas append: se mandan 2, ya había 1 → quedan 3
curl -s -X PATCH http://localhost:3000/api/customers/<id> -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"notes":[{"text":"nueva"}]}' | jq '.notes | length'

# Tags replace: se manda ["Nuevo"], antes había ["VIP","Frecuente"]
curl -s -X PATCH http://localhost:3000/api/customers/<id> -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"tags":["Nuevo"]}' | jq '.tags'
# → ["Nuevo"], no acumulado
```

### Hecho cuando

- [ ] CustomerService con los 4 métodos
- [ ] 3 endpoints con `requireRole('admin', 'gestor')`
- [ ] Notas son append-only (verificado que las previas sobreviven)
- [ ] Tags son replace (verificado que no acumulan)
- [ ] `search` + `tags` son AND
- [ ] Tests pasan
- [ ] CA-11 y CA-12 pasan

---

## T7 — API Métricas

**RF cubiertos:** RF-12, RF-13
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/modules/metrics/service.ts`** — `getMetrics()` según plan D-J.

Las 7 agregaciones reales van en `Promise.all`. Las 2 ficticias se devuelven hardcodeadas:

```ts
return {
  salesToday: today.total,
  salesWeek: week.total,
  salesMonth: month.total,
  abandonedCarts: 0,   // D-16: sin tracking de carritos (§3.2)
  avgTicket: Math.round(avg._avg.total ?? 0),
  conversion: 0,       // D-16: sin tracking de sesiones (§3.2)
  salesLast30Days: sales30d,
  topProducts,
  recentActivity: [...recentOrders, ...recentCustomers]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5)
}
```

`salesByDay` usa `$queryRaw` con `date_trunc('day', ...)`. Si el número de filas no da exactamente 30 días, se completa con `revenue: 0` para que el gráfico de 004-a no tenga huecos.

**2. `src/modules/metrics/routes.ts`** — `GET /api/metrics` con `requireRole('admin', 'gestor')`.

**3. Tests:**
- `tests/modules/metrics.test.ts` — unit con Prisma mock: agregaciones, `abandonedCarts === 0`, `conversion === 0`, orden de `recentActivity`, tope de 5

### Verificación

```bash
curl -s http://localhost:3000/api/metrics -H "$AUTH" | jq 'keys'
# → las 9 claves de Metrics

curl -s http://localhost:3000/api/metrics -H "$AUTH" | jq '.salesLast30Days | length'
# → 30

curl -s http://localhost:3000/api/metrics -H "$AUTH" | jq '.abandonedCarts, .conversion'
# → 0, 0
```

### Hecho cuando

- [ ] `getMetrics` corre las 7 agregaciones reales en paralelo
- [ ] `abandonedCarts` y `conversion` devuelven `0`, documentado con D-16
- [ ] `salesLast30Days` tiene exactamente 30 entradas, orden ascendente
- [ ] `topProducts` ≤ 5, ordenado por revenue desc
- [ ] `recentActivity` ≤ 5, ordenado por timestamp desc
- [ ] Tests pasan
- [ ] CA-25 a CA-27 pasan

---

## T8 — Upload de imágenes

**RF cubiertos:** RF-19, RF-20, RF-21
**Depende de:** T2
**Estado:** `pendiente`

### Qué hacer

**1. `src/utils/storage.ts`** — cliente S3-compatible con 3 funciones: `put`, `signedUrl`, `deleteObject`. El SDK de AWS funciona contra AWS, R2, MinIO o Supabase Storage sin cambiar código (D-06).

**2. `src/modules/upload/service.ts`** — `upload`, `delete` con plan D-K.

- Valida `mimetype` contra regex allowlist.
- Valida tamaño contra `UPLOAD_MAX_BYTES`.
- Transforma con sharp: `rotate()` (respeta EXIF), `resize(1920, 1920, { withoutEnlargement: true })`, `webp({ quality: 80 })`.
- Si sharp lanza (bytes que no son una imagen real aunque el content-type diga que sí), se traduce a `UnsupportedMediaTypeError`.
- Key: `wines/{uuid}.webp`. Signed URL: 3600 s.

**3. `src/modules/upload/routes.ts`** — 2 endpoints:
- `POST /api/upload` → `requireRole('admin', 'gestor')` → `201 { id, url }`
- `DELETE /api/upload/:id` → `requireRole('admin')` → `204`

**4. Tests:**
- `tests/modules/upload.test.ts` — unit: allowlist de mimetypes, validación de tamaño, sharp produce WebP (magic bytes `RIFF....WEBP`), error de sharp se traduce a 415
- `tests/integration/upload.test.ts` — HTTP: upload válido, PDF → 415, 6 MB → 413

### Verificación

```bash
# Upload válido
curl -s -X POST http://localhost:3000/api/upload -H "$AUTH" \
  -F "file=@./testdata/producto.jpg" | jq '{id, url}'
# → 201 con url firmada

# La URL firmada sirve la imagen ya convertida
URL=$(curl -s -X POST http://localhost:3000/api/upload -H "$AUTH" \
  -F "file=@./testdata/producto.jpg" | jq -r '.url')
curl -s "$URL" -o /tmp/salida.webp && xxd -l 12 /tmp/salida.webp
# → 52 49 46 46 ... 57 45 42 50  = "RIFF....WEBP"

# PDF → 415
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/upload \
  -H "$AUTH" -F "file=@./testdata/doc.pdf"
# → 415

# 6 MB → 413
head -c 6000000 /dev/urandom > /tmp/big.png
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/upload \
  -H "$AUTH" -F "file=@/tmp/big.png"
# → 413

# vendedor → 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/upload \
  -H "$AUTH_VENDEDOR" -F "file=@./testdata/producto.jpg"
```

### Hecho cuando

- [ ] `storage.ts` funciona contra un S3-compatible (probado con MinIO local)
- [ ] Upload valida mimetype y tamaño antes de subir nada
- [ ] La imagen devuelta es WebP (verificado por magic bytes)
- [ ] `sharp` rotando por EXIF y acotando a 1920 px
- [ ] PDF → 415; >5 MB → 413; `vendedor` → 403
- [ ] Tests pasan
- [ ] CA-18 a CA-20 pasan

---

## T9 — Observabilidad, CI, deploy, migración

**RF cubiertos:** RF-22, RF-23
**RNF:** RNF-03, RNF-05, RNF-07, RNF-08, RNF-09
**Depende de:** T3, T4, T5, T6, T7, T8
**Estado:** `pendiente`

### Qué hacer

**1. `src/modules/health/routes.ts`** — `GET /health` con RF-22: ejecuta `SELECT 1`; `200` con `db: 'connected'` o `503` con `db: 'disconnected'`.

**2. Performance logging** — en el hook `onResponse`, si `duration > 500`, loguea como `warn` con `slowRequest: true` (RNF-03).

**3. `scripts/migrate-from-localstorage.ts`** — migración idempotente de plan D-M:
- `--input <path>` a un JSON exportado del navegador (`vinoteca_wines` y `vinoteca_cart`)
- `--dry-run` loguea qué haría sin escribir (**obligatorio correrlo antes de la corrida real**)
- Upsert por `Producto.id`, `Customer.email`, `Order.id`
- El carrito se importa como `Customer` + `Order` en estado `pendiente`
- Log de progreso cada 10 registros

**4. `.github/workflows/ci.yml`** — lint, typecheck, build, tests (con service de Postgres), y deploy al mergear a `main` (RNF-08).

**5. `backend/README.md`** — cómo correr local, variables de entorno, credenciales del seed, contrato de la API, y la nota de que las contraseñas del seed son de desarrollo.

**6. Verificar RNF-09** — que `/api/docs` documente todos los endpoints desde los schemas Zod, sin doc escrita a mano.

### Verificación

```bash
cd backend
npm run typecheck && npm run build && npm run test

# Health
curl -s http://localhost:3000/health | jq
# → {"status":"ok","timestamp":"...","uptime":N,"db":"connected"}

# DB caída → 503
docker compose stop db && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health
# → 503
docker compose start db

# OpenAPI
curl -s http://localhost:3000/api/docs | head -5
# → HTML de Swagger UI

# Migración: dry-run primero
npm run migrate:data -- --input ./data/wines.json --dry-run
# → loguea qué haría, no escribe

# Migración real
npm run migrate:data -- --input ./data/wines.json

# Idempotencia: correr 2 veces no duplica
npm run migrate:data -- --input ./data/wines.json
psql $DATABASE_URL -c 'SELECT COUNT(*) FROM "Producto";'      # mismo número que antes
psql $DATABASE_URL -c 'SELECT COUNT(*) FROM "Customer";'  # mismo número
psql $DATABASE_URL -c 'SELECT COUNT(*) FROM "Order";'     # mismo número

# Docker
docker compose up -d
docker compose ps        # db healthy, backend running
docker compose logs backend | tail -20   # sin errores

# Frontend intacto — esta spec no lo toca, pero se verifica que sigue igual
cd .. && git status --short src/ test/ index.html
# → vacío
```

### Hecho cuando

- [ ] `/health` devuelve 200 con db connected, y 503 con la DB caída
- [ ] Requests > 500 ms se loguean como warning
- [ ] Migración funciona con `--dry-run` y real
- [ ] Migración es idempotente (verificado con el mismo COUNT antes y después de la 2ª corrida)
- [ ] CI corre lint + typecheck + build + tests
- [ ] `/api/docs` muestra todos los endpoints
- [ ] `docker compose up` levanta DB + backend
- [ ] **`git status src/ test/ index.html` está vacío** (el frontend no se tocó)
- [ ] Tests, `typecheck` y `build` salen 0
- [ ] CA-28 a CA-36 pasan

---

## Cierre de la spec

- [ ] T1 a T9 marcadas `hecha`
- [ ] RF-01 a RF-23 implementados y verificados
- [ ] CA-01 a CA-36 pasan por HTTP
- [ ] El frontend quedó sin tocar (`git status src/ test/` vacío)
- [ ] Seed documentado en el README
- [ ] `backend/README.md` existe

**Lo que sigue después de esta spec:** la **004-c — Integración Frontend ↔ Backend**, que es lo único que puede hacer que la app deje de hablar con MSW. Nada de eso está en estas 9 tareas.
