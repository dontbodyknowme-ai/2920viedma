# Spec 004-b — Backend API Real

**Estado:** `implementada` — el backend está en producción y con la suite en verde (352 tests). El encabezado decía `borrador`: quedó desactualizado; los checkboxes de `task.md` nunca se marcaron.
**Spec:** `004-b`
**Creada:** 2026-10-08
**Gobernada por:** `docs/CONSTITUCION.md`
**Spec previa:** `specs/004-a-backoffice-ui/` (`borrador`)
**Spec siguiente:** `specs/004-c-integracion/` (pendiente de crear)

---

## 1. Objetivo

Construir el **backend real** que reemplace a MSW Mock API de la spec 004-a. El backend cumple exactamente el mismo contrato de API que el frontend ya consume, añadiendo persistencia, autenticación, subida de archivos y observabilidad.

### 1.1 Definiciones

- **Contrato API:** Interfaz definida en 004-a (RF-35 a RF-43) que el backend cumple al 100 %
- **Unidad monetaria:** **Pesos argentinos (ARS) enteros.** El campo `price` es `number` en pesos enteros, igual que en el `Producto` del frontend. **No** se usa centavos.
- **Refresh token:** Token opaco (no JWT) de 7 días, guardado hasheado en DB, enviado en cookie `httpOnly`.
- **Roles:** `admin` (todo), `gestor` (catálogo + pedidos + clientes), `vendedor` (solo lectura y cambio de estado de pedidos).

---

## 2. Contexto y diagnóstico

### 2.1 Estado actual verificado (2026-10-08)

| Hecho verificado | Valor |
|---|---|
| Estructura del repo | **Plana.** `src/`, `test/`, `index.html` y configs en la raíz. **No hay** `backend/` ni `frontend/` |
| Layout de la app | Un solo paquete npm: `cava-and-co`, `"type": "module"` |
| Toolchain | Vite 5.1.4, TypeScript 5.2.2, Vitest 3.2.4 (declarado), Tailwind 3.4.1, Framer Motion 11, three 0.162 |
| `tsconfig.json` | `moduleResolution: "bundler"`, `noEmit: true`, `strict: true`, `include: ["src"]` |
| Tests | **4 archivos existen** en `test/`. **`vitest` NO está instalado** en `node_modules`, así que `npm test` falla con "vitest no se reconoce" |
| Contrato API | Definido en 004-a, consumido por MSW |
| Datos mock | 12 productos, 25 pedidos, 15 clientes, métricas 30 días |

### 2.2 Contradicciones detectadas en la versión anterior de esta spec

Estas se corrigen en esta versión y quedan registradas para que no se pierdan:

| # | Contradicción | Resolución |
|---|---|---|
| 1 | El plan asumía un monorepo `frontend/` + `backend/` que **no existe** | **Backend en subcarpeta `backend/`. El frontend no se mueve.** Ver D-13 |
| 2 | `moduleResolution: "bundler"` con `outDir` no emite imports ejecutables por Node | **`NodeNext` + `module: "NodeNext"` + extensiones `.js` en imports relativos.** Ver D-14 |
| 3 | `price Int // en centavos` rompía el contrato del frontend (pesos) | **`price` en pesos enteros.** Ver §1.1 y D-15 |
| 4 | T9 modificaba el frontend, pero §3.2 lo sacaba de alcance | **T9 es solo backend.** La integración frontend es la spec 004-c. Ver §3.2 |
| 5 | `Customer.email` `@unique` obligatorio contradecía CE-04 de 004-a | **`email` opcional y unique** (Postgres admite múltiples NULL en unique) |
| 6 | `abandonedCarts` y `conversion` sin fuente de datos | **Se mantienen en el shape de respuesta, siempre en `0`.** Documentado. Ver RF-13 |
| 7 | `AuditLog` en el schema sin ningún RF que lo pidiera | **Eliminado del schema.** `OrderTimeline` y `Note` ya cubren la auditoría que 004-a D-17 pide |
| 8 | Sin seed: un backend recién migrado no tiene usuario para probar login | **Seed en T1**, admin inicial |
| 9 | Rate limit general pero login sin límite estricto | **RF nuevo con límite específico en login** |

---

## 3. Alcance

### 3.1 Dentro de alcance

1. **API REST completa** — Mismo contrato que MSW + auth + endpoint público
2. **Base de datos PostgreSQL** — Esquema Prisma + migraciones
3. **Autenticación JWT + RBAC** — Access token + refresh en cookie, 3 roles
4. **Subida de imágenes** — Validación, transformación WebP, signed URLs
5. **Validación compartida** — Zod schemas en `backend/src/shared/`
6. **Tests automatizados** — Unit + Integration (Vitest + Supertest)
7. **Deploy** — Dockerfile + docker-compose + CI
8. **Observabilidad** — Logs estructurados, `/health`, OpenAPI
9. **Seed** — Admin inicial para poder probar auth

### 3.2 Fuera de alcance, con justificación

| Fuera de alcance | Por qué |
|---|---|
| **Cualquier cambio en el frontend** | **El frontend no se toca en esta spec, en ninguna tarea.** Sigue hablando con MSW hasta que exista la 004-c. La verificación de esta spec es por HTTP (Supertest + curl), no por navegador |
| **Conectar el frontend al backend real** | Spec 004-c.requiere el flag `isAdmin` replaced, el cliente HTTP con refresh automático y el seed de datos |
| **GraphQL / tRPC** | El contrato de 004-a es REST |
| **Microservicios** | Monolito modular |
| **WebSockets / tiempo real** | Notificaciones en vivo, spec posterior |
| **Tracking de carritos abandonados** | Requiere tabla de carritos que hoy no existe. Ver RF-13 |
| **Analytics de sesiones** | Requerido para `conversion`. Ver RF-13 |
| **Kubernetes** | PaaS es suficiente |
| **Multi-tenancy** | Single tenant |

---

## 4. Requisitos funcionales

### 4.1 API Vinos — administración (`/api/wines`)

- **RF-01** — CUANDO se pide `GET /api/wines` con `page`, `limit`, `search`, `category`, `varietal`, `status`, EL SISTEMA devuelve `{ data, total, page, limit, totalPages }` con los filtros aplicados y `price` **en pesos enteros**
- **RF-02** — CUANDO se hace `POST /api/wines` con un body válido y rol `admin` o `gestor`, EL SISTEMA crea el producto, devuelve `201` y el producto con `id`, `createdAt`, `stock` y `activo`
- **RF-03** — CUANDO se hace `PATCH /api/wines/:id`, EL SISTEMA actualiza **solo** los campos enviados, cambia `updatedAt` y devuelve el producto completo
- **RF-04** — CUANDO se hace `DELETE /api/wines/:id` sobre un producto con pedidos asociados, EL SISTEMA devuelve `409` con `{ code: 'HAS_ORDERS', count }`. SI no tiene pedidos, devuelve `204`
- **RF-05** — CUANDO se hace `POST /api/wines/import` con un CSV, EL SISTEMA valida cada fila con el schema, hace upsert por `id`, y devuelve `{ created, updated, errors: [{ row, field, message }] }`. Con errores de validación devuelve `207`

### 4.2 API Vinos — pública (`/api/wines/public`)

- **RF-06** — CUANDO se pide `GET /api/wines/public`, EL SISTEMA devuelve **solo** los productos con `activo = true`, en el shape del `Producto` del frontend, **sin** los campos `stock` ni `activo`, y **sin** paginación (el catálogo público es completo)

### 4.3 API Pedidos (`/api/orders`)

- **RF-07** — CUANDO se pide `GET /api/orders` con filtros `status`, `dateFrom`, `dateTo`, `search`, EL SISTEMA devuelve la lista paginada
- **RF-08** — CUANDO se pide `GET /api/orders/:id`, EL SISTEMA devuelve el pedido con `items` (**cada item con `imageUrl` resuelto por join a `Producto`**), `customer` y `timeline` ordenado por fecha
- **RF-09** — CUANDO se hace `PATCH /api/orders/:id` y el estado cambia, EL SISTEMA actualiza el estado, **crea una entrada en `timeline`** con `author`, y devuelve el pedido actualizado. SI el estado no cambia, **no** crea entrada. SI el rol es `vendedor`, **solo** acepta un body con la clave `status`

### 4.4 API Clientes (`/api/customers`)

- **RF-10** — CUANDO se pide `GET /api/customers` con `search` y `tags`, EL SISTEMA devuelve la lista paginada aplicando ambos filtros con AND lógico
- **RF-11** — CUANDO se hace `PATCH /api/customers/:id` con `notes`, EL SISTEMA **agrega** las notas (append-only, nunca borra las existentes). CUANDO recibe `tags`, **reemplaza** el conjunto completo

### 4.5 API Métricas (`/api/metrics`)

- **RF-12** — CUANDO se pide `GET /api/metrics`, EL SISTEMA devuelve el shape de `Metrics` de 004-a: `salesToday`, `salesWeek`, `salesMonth`, `avgTicket`, `salesLast30Days` (30 entradas, orden ascendente), `topProducts` (máx. 5, por revenue desc), `recentActivity` (máx. 5, por timestamp desc)
- **RF-13** — CUANDO se pide `GET /api/metrics`, EL SISTEMA devuelve `abandonedCarts: 0` y `conversion: 0`. **Ambos campos existen en el shape porque el frontend los consume, y valen `0` siempre** hasta que exista tracking de carritos y de sesiones, que está fuera de alcance (§3.2)

### 4.6 API Auth (`/api/auth`)

- **RF-14** — CUANDO se hace `POST /api/auth/login` con credenciales válidas, EL SISTEMA devuelve `200` con `{ accessToken, user }` en el body y setea la cookie `refreshToken` (`httpOnly`, `secure` en producción, `sameSite: 'lax'`, 7 días)
- **RF-15** — CUANDO se hace `POST /api/auth/refresh` con una cookie `refreshToken` válida, EL SISTEMA **rota** el token (borra el viejo, crea uno nuevo), setea la cookie nueva y devuelve `200` con un `accessToken` nuevo. CUANDO la cookie es inválida o expirada, devuelve `401` y **limpia la cookie**
- **RF-16** — CUANDO se hace `POST /api/auth/logout`, EL SISTEMA revoca el refresh token en la DB, limpia la cookie y devuelve `204`
- **RF-17** — CUANDO se hace `GET /api/auth/me` con un access token válido, EL SISTEMA devuelve `200` con `{ id, email, name, role }`, **sin** `passwordHash`
- **RF-18** — CUANDO se superan **5 intentos de login fallidos en 1 minuto desde la misma IP**, EL SISTEMA devuelve `429` con header `Retry-After`

### 4.7 Subida de imágenes (`/api/upload`)

- **RF-19** — CUANDO se hace `POST /api/upload` con un archivo de imagen de hasta 5 MB, EL SISTEMA lo transforma a WebP, lo sube al storage, y devuelve `201` con `{ id, url }` donde `url` es una signed URL con 1 hora de validez
- **RF-20** — CUANDO el archivo **no** es una imagen, EL SISTEMA devuelve `415`. CUANDO supera 5 MB, devuelve `413`
- **RF-21** — CUANDO se hace `DELETE /api/upload/:id` con rol `admin`, EL SISTEMA elimina el archivo del storage y devuelve `204`

### 4.8 Salud y documentación

- **RF-22** — CUANDO se hace `GET /health`, EL SISTEMA ejecuta un `SELECT 1` contra la DB y devuelve `200` con `{ status: 'ok', timestamp, uptime, db: 'connected' }`. SI la DB no responde, devuelve `503` con `db: 'disconnected'`
- **RF-23** — EL SISTEMA expone la documentación OpenAPI interactiva en `GET /api/docs`

---

## 5. Requisitos no funcionales

- **RNF-01 — Tipado estricto:** `strict: true`, sin `any`. Aplica a `backend/` y a los schemas compartidos
- **RNF-02 — Validación Zod:** Todo endpoint valida `body`, `query` y `params` con un schema antes de tocar la DB
- **RNF-03 — Performance:** P95 < 200 ms en `GET`, < 500 ms en `POST`/`PATCH`, excluyendo upload. Requests que exceden 500 ms se loguean como warning
- **RNF-04 — Seguridad:** Helmet, CORS con origin explícito, rate limit general de 100/min **más** el límite específico de RF-18, password hasheado con bcrypt (cost ≥ 10), sin stack traces en respuestas de producción
- **RNF-05 — Logs estructurados:** JSON con `requestId`, `method`, `url`, `status`, `duration`, `userId` cuando aplica
- **RNF-06 — Manejo de errores:** `{ code, message, details? }` consistente. Los 5xx nunca exponen el stack
- **RNF-07 — Migración idempotente:** El script de migración se puede correr N veces sin duplicar. Tiene modo `--dry-run`
- **RNF-08 — CI:** Lint + typecheck + build + tests en cada PR; deploy automático al mergear a `main`
- **RNF-09 — OpenAPI:** Documentación generada desde los schemas Zod, sin escribirla a mano

---

## 6. Casos límite

| ID | Situación | Comportamiento esperado | RF |
|---|---|---|---|
| CE-01 | Eliminar producto con pedidos | `409` + `{ code: 'HAS_ORDERS', count }` | RF-04 |
| CE-02 | Access token expirado | `401` + `{ code: 'TOKEN_EXPIRED' }`; el frontend usa `/refresh` | RF-17 |
| CE-03 | Refresh token expirado o revocado | `401` + cookie limpiada | RF-15 |
| CE-04 | Cliente sin email | Se crea igual; `email` es `null`. El email sigue siendo único cuando está presente | RF-10 |
| CE-05 | Import CSV con columnas faltantes | `207` + errores por fila, las filas válidas se importan igual | RF-05 |
| CE-06 | Cambio de estado de pedido a un estado no adyacente | Se permite; el `timeline` registra el salto con su timestamp real | RF-09 |
| CE-07 | `PATCH /api/orders/:id` con `vendedor` y body que no es `{ status }` | `403` + `{ code: 'INSUFFICIENT_ROLE' }` | RF-09 |
| CE-08 | Archivo de upload sin content-type de imagen | `415` | RF-20 |
| CE-09 | La DB cae durante un request | El error handler devuelve `503`; `/health` reporta `db: 'disconnected'` | RF-22 |
| CE-10 | Dos requests simultáneos sobre el mismo producto | La última escritura gana; no hay bloqueo optimista (fuera de alcance) | RF-03 |

---

## 7. Trazabilidad

| Grupo | RF | Origen |
|---|---|---|
| Vinos admin | RF-01 a RF-05 | 004-a RF-35 a RF-38, RF-21 |
| Vinos públicos | RF-06 | 004-a RF-15 (catálogo público) |
| Pedidos | RF-07 a RF-09 | 004-a RF-39, RF-40 |
| Clientes | RF-10, RF-11 | 004-a RF-41 |
| Métricas | RF-12, RF-13 | 004-a RF-42 |
| Auth | RF-14 a RF-18 | 004-a flag `isAdmin` → auth real |
| Upload | RF-19 a RF-21 | 004-a RF-25 (drag & drop) |
| Salud/Docs | RF-22, RF-23 | RNF-05, RNF-09 |

---

## 8. Criterios de aceptación

### 8.1 Auth

| # | Criterio | Verificación |
|---|---|---|
| CA-13 | Login credenciales válidas | `POST /api/auth/login` → `200` + `accessToken` en body + cookie `refreshToken` `httpOnly` |
| CA-14 | Login protegido contra fuerza bruta | 6 intentos fallidos en 1 min desde la misma IP → `429` + `Retry-After` |
| CA-15 | Refresh rota el token | `POST /api/auth/refresh` con cookie válida → `200` + access nuevo + cookie **distinta** a la anterior |
| CA-16 | Refresh inválida | Cookie inexistente → `401` + `Set-Cookie` que limpia la cookie |
| CA-17 | `/me` con token válido | → `200` + `{ id, email, name, role }`, sin `passwordHash` en el body |

### 8.2 Vinos — administración

| # | Criterio | Verificación |
|---|---|---|
| CA-01 | GET paginado con filtros | `?page=1&limit=10&search=Malbec&category=Tinto` → `200` + `{ data, total, page, limit, totalPages }` |
| CA-02 | POST crea producto válido | `201` + producto con `id`, `createdAt`, `stock`, `activo`, `price` **en pesos** |
| CA-03 | PATCH actualiza parcial | Se mandan 2 campos → solo esos 2 cambian, `updatedAt` cambió |
| CA-04 | DELETE sin pedidos | → `204`; el producto ya no aparece en `GET /api/wines` |
| CA-05 | DELETE con pedidos | → `409` + `{ code: 'HAS_ORDERS', count: N }` con N > 0 |
| CA-06 | Import CSV válido | → `201` + `{ created, updated, errors: [] }` |
| CA-07 | Import CSV con errores | → `207` + `errors` con `row`, `field`, `message` |

### 8.3 Vinos — público

| # | Criterio | Verificación |
|---|---|---|
| CA-21 | Endpoint público filtra inactivos | Con un producto `activo: false` en DB, `GET /api/wines/public` no lo devuelve |
| CA-22 | Endpoint público no expone stock | El body no tiene las claves `stock` ni `activo` |

### 8.4 Pedidos

| # | Criterio | Verificación |
|---|---|---|
| CA-08 | GET con filtros | `?status=enviado&dateFrom=2026-01-01` → solo pedidos que cumplen ambos |
| CA-09 | Cambio de estado crea timeline | `PATCH { status }` → el pedido vuelve con **una** entrada nueva en `timeline` con `author` |
| CA-10 | Cambio al mismo estado no duplica timeline | `PATCH` con el estado actual → `timeline` sin entradas nuevas |
| CA-23 | `vendedor` restringido a status | `vendedor` + `{ status }` → `200`. `vendedor` + `{ customerName }` → `403` |
| CA-24 | Items incluyen imageUrl | `GET /api/orders/:id` → cada item trae `imageUrl` resuelto |

### 8.5 Clientes

| # | Criterio | Verificación |
|---|---|---|
| CA-11 | GET con search + tags | `?search=ana&tags=VIP` → AND lógico |
| CA-12 | Notas append, tags replace | `PATCH { notes }` → las notas previas siguen ahí. `PATCH { tags }` → conjunto reemplazado |

### 8.6 Métricas

| # | Criterio | Verificación |
|---|---|---|
| CA-25 | Shape de métricas | `GET /api/metrics` → las 9 claves de `Metrics` presentes |
| CA-26 | Agregaciones coherentes | `salesLast30Days` tiene 30 entradas orden ascendente; `topProducts` ≤ 5 por revenue desc; `recentActivity` ≤ 5 por timestamp desc |
| CA-27 | Métricas sin fuente devuelven 0 | `abandonedCarts === 0` y `conversion === 0` |

### 8.7 Upload

| # | Criterio | Verificación |
|---|---|---|
| CA-18 | Upload válido | `201` + `{ id, url }`; los bytes de la respuesta son WebP (magic `RIFF....WEBP`) |
| CA-19 | Rechaza no-imagen | PDF → `415` |
| CA-20 | Rechaza tamaño | 6 MB → `413` |

### 8.8 Calidad, salud y deploy

| # | Criterio | Verificación |
|---|---|---|
| CA-28 | Typecheck estricto | `tsc --noEmit` en `backend/` sale `0` |
| CA-29 | Tests pasan | `vitest run` en `backend/` sale `0` |
| CA-30 | Build de producción | `npm run build` produce `dist/` ejecutable; `node dist/main.js` levanta |
| CA-31 | Health check | `GET /health` → `200` + `{ status: 'ok', db: 'connected' }` |
| CA-32 | OpenAPI | `GET /api/docs` responde HTML de Swagger UI |
| CA-33 | Rate limit general | 101 requests en 1 min → `429` |
| CA-34 | Logs estructurados | Una línea de log de request es JSON válido y contiene `requestId`, `status`, `duration` |
| CA-35 | Seed crea admin | `npm run seed` → existe un usuario `admin@vinoteca.local` con rol `admin` |
| CA-36 | Docker build | `docker build` sale `0`; `docker compose up` levanta DB + backend |

---

## 9. Decisiones

| ID | Decisión | Quién | Justificación |
|---|---|---|---|
| D-01 | Runtime: Node.js 20 + Fastify | Planner | Performance, tipado, ecosistema maduro, compatible con el toolchain del frontend |
| D-02 | ORM: Prisma | Planner | Type-safe, migraciones versionadas, `prisma studio` para inspeccionar |
| D-03 | DB: PostgreSQL en Railway | Planner | Postgres administrado, mismo proveedor que el deploy del backend |
| D-04 | Auth: JWT propio + refresh opaco en cookie | Planner | Control total del flujo de refresh; el refresh **no** es JWT justamente para poder revocarlo |
| D-05 | Roles: admin / gestor / vendedor | Usuario | Tres niveles que cubren lo descrito en el alcance |
| D-06 | Storage: S3-compatible con signed URLs | Planner | No ata el proyecto a un proveedor; compatible con Supabase/R2/S3 |
| D-07 | Validación: Zod | Planner | Inferencia de tipos y validación en un solo lugar |
| D-08 | API: REST + OpenAPI generado de los schemas Zod | Planner | El contrato de 004-a es REST; la doc no se escribe a mano (RNF-09) |
| D-09 | Tests: Vitest + Supertest | Planner | Mismo runner que el frontend |
| D-10 | Deploy: Docker + Railway | Planner | Un solo `docker-compose` para dev local, mismo artefacto en prod |
| D-11 | Logs: Pino (JSON) | Planner | Serialización JSON rápida, integración nativa con Fastify |
| D-12 | Migración: script idempotente con `--dry-run` | Planner | RNF-07. Re-ejecutable sin duplicar, y revisable antes de tocar datos |
| **D-13** | **El frontend no se mueve.** El backend va en `backend/` como subcarpeta, con su propio `package.json` | Planner | **Corrige la contradicción #1.** Mover el frontend a `frontend/` reescribiría `index.html`, `vite.config.ts`, `tsconfig.json`, los paths de `test/` y `package.json`, sin ganar nada |
| **D-14** | **`module: "NodeNext"`, `moduleResolution: "NodeNext"`, imports relativos con extensión `.js`** | Planner | **Corrige la contradicción #2.** `bundler` no emite las extensiones, así que `node dist/main.js` falla con `ERR_MODULE_NOT_FOUND` |
| **D-15** | **`price` se guarda y se devuelve en pesos enteros** | Planner | **Corrige la contradicción #3.** El `Producto` del frontend ya usa pesos (`45000`). Centavos obligaría a un cambio de contrato en 004-a y una conversión en ambos lados |
| **D-16** | **`abandonedCarts` y `conversion` se devuelven siempre en `0`** | Usuario | **Corrige la contradicción #6.** Se mantienen las claves porque el frontend las lee y quitarlas rompería el shape. El valor real llega cuando exista tracking |
| **D-17** | **Sin modelo `AuditLog`** | Planner | **Corrige la contradicción #7.** `OrderTimeline` y `Note` ya son el registro de auditoría que pide 004-a D-17. Un tercer modelo sería código muerto |
| **D-18** | **El seed del admin inicial va en T1** | Planner | **Corrige la contradicción #8.** Sin usuario, T2 no puede probar login |

---

## 10. Dudas abiertas

| # | Pregunta | Por qué está abierta |
|---|---|---|
| 1 | **¿Supabase Auth en vez de JWT propio?** | Ahorra ~200 líneas pero ata la sesión al proveedor y complica el refresh rotation |
| 2 | **¿Drizzle en vez de Prisma?** | Más liviano y sin binario, pero peor DX y sin Studio |
| 3 | **¿El deploy va en el mismo repo o en otro?** | Afecta el CI. Se asume mismo repo, subcarpeta `backend/` |
| 4 | **¿Se necesita endpoint de métricas públicas para el storefront?** | Ningún RF lo pide hoy |

---

## 11. Relación con la 004-c

La spec siguiente (**004-c — Integración Frontend ↔ Backend**) hará lo que esta spec prohíbe tocar:

- Cliente HTTP con refresh automático ante `401`
- Reemplazar el flag `isAdmin` por `GET /api/auth/me`
- Login/logout reales en el navbar
- Apuntar MSW a los handlers del backend (o eliminarlo)
- Consumir `GET /api/wines/public` en el catálogo público
- Upload real contra `POST /api/upload` en vez de Data URL

Mientras tanto, el frontend sigue intacto y el backend se verifica por HTTP.
