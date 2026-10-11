# Spec 004-c — Integración Frontend ↔ Backend

**Estado:** `aprobada`
**Spec:** `004-c`
**Creada:** 2026-10-10
**Gobernada por:** `docs/CONSTITUCION.md`
**Spec previa:** `specs/004-b-backend-api/` (`aprobada`)
**Spec siguiente:** `specs/004-d-deploy/` (pendiente de crear)

---

## 1. Objetivo

Conectar el **frontend existente** (React + Vite + MSW) al **backend real** (Fastify + PostgreSQL) que se construyó en la spec 004-b. El frontend debe dejar de usar MSW y pasar a consumir la API REST real, incluyendo autenticación JWT real, refresh automático de tokens, y todas las operaciones CRUD contra el backend.

### 1.1 Definiciones

- **Cliente HTTP:** Wrapper sobre `fetch` con interceptores para refresh automático de access token ante 401
- **Auth real:** Login/logout contra `POST /api/auth/login` + `POST /api/auth/refresh` + `GET /api/auth/me`
- **MSW → API real:** Migración progresiva: primero auth, luego catálogo, luego admin, finalmente eliminación total de MSW
- **Variable de entorno:** `VITE_API_URL` (ej: `http://localhost:3000` o `https://xxx.app.github.dev`)

---

## 2. Contexto y diagnóstico

### 2.1 Estado actual verificado (2026-10-10)

| Componente | Estado |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript strict, MSW v2 activo en `src/mocks/` |
| Backend | Fastify + Node 20 + PostgreSQL + Prisma, **completo y desplegado** (spec 004-b) |
| API Contract | Definido en 004-a, implementado en 004-b, consumido por MSW en frontend |
| Auth Frontend | Mock: `VITE_ADMIN_PASSWORD` validado en bundle, sesión en `sessionStorage` |
| Auth Backend | Real: JWT access (15min) + refresh rotativo (7d, cookie httpOnly), roles RBAC |
| Admin Panel | Frontend mock valida contra bundle; backend real expone `/api/auth/*` |
| Datos | Frontend usa `localStorage` (`vinoteca_wines`, `vinoteca_cart`); Backend usa PostgreSQL |

### 2.2 Brechas a cerrar

| # | Brecha | Resolución |
|---|---|---|
| 1 | Frontend usa MSW para todo | **Cliente HTTP nuevo** con base URL `VITE_API_URL`, interceptores 401→refresh |
| 2 | Auth mock en frontend | **Login real** → `POST /api/auth/login` → guarda access en memoria, refresh en cookie |
| 3 | `isAdmin` flag en frontend | **Eliminar** → `GET /api/auth/me` valida token real |
| 4 | Catálogo usa `localStorage` | **`GET /api/wines/public`** para tienda; `GET /api/wines` para admin |
| 5 | Upload usa Data URL | **`POST /api/upload`** → Sharp→WebP→S3 signed URL |
| 6 | MSW handlers duplican lógica | **Eliminar MSW** progresivamente; backend es source of truth |
| 7 | Carrito en `localStorage` | **Mantener localStorage** para carrito (frontend-only); orders van a backend |

---

## 3. Alcance

### 3.1 Dentro de alcance

1. **Cliente HTTP (`src/api/client.ts`)** — Fetch wrapper con interceptores 401→refresh, tipado con Zod schemas compartidos
2. **Auth real** — `useAuth` hook: login, logout, me, refresh automático, persistencia access token en memoria
3. **Navbar real** — Login/logout buttons, user menu con rol, botón "Panel Admin" condicional
4. **Catálogo público** — `GET /api/wines/public` reemplaza `localStorage` + MSW
5. **Admin: Vinos** — CRUD + import CSV contra `POST/GET/PATCH/DELETE /api/wines`
6. **Admin: Pedidos** — Listar, detalle, timeline, cambio estado contra `GET/PATCH /api/orders`
7. **Admin: Clientes** — Listar, detalle, notas, tags contra `GET/PATCH /api/customers`
8. **Admin: Métricas** — `GET /api/metrics` reemplaza mock
9. **Upload real** — `POST /api/upload` en `ProductForm` / `AdminWineForm` (Sharp→WebP→S3)
10. **Eliminación MSW** — Borrar `src/mocks/`, `mockServiceWorker.js`, desregistrar worker
11. **Variables de entorno** — `VITE_API_URL`, `VITE_ADMIN_PASSWORD` (legacy para compat)

### 3.2 Fuera de alcance, con justificación

| Fuera de alcance | Por qué |
|---|---|
| **Cambios en backend** | Backend está **completo y aprobado** (spec 004-b). Solo fixes de bugs si aparecen |
| **WebSockets / tiempo real** | Notificaciones push, spec posterior (004-d+) |
| **PWA / Service Worker avanzado** | Offline-first real, spec posterior |
| **Tests E2E (Playwright/Cypress)** | Frontera de dependencias; unit/integration ya cubren |
| **Internacionalización (i18n)** | Monolingüe español por ahora |
| **Migración de datos localStorage → Backend** | Script existe en backend (`migrate-from-localstorage.ts`); ejecución manual opcional |

---

## 4. Requisitos funcionales

### 4.1 Cliente HTTP (`src/api/client.ts`)

- **RF-01** — CUANDO se crea el cliente, ESTE usa `VITE_API_URL` (default `http://localhost:3000`) como base URL
- **RF-02** — CUANDO una request falla con 401 Y hay refresh token disponible, EL CLIENTE intenta `POST /api/auth/refresh` UNA VEZ, y si tiene éxito, REINTENTA la request original
- **RF-03** — CUANDO el refresh falla (401, sin refresh token, o error de red), EL CLIENTE limpia estado de auth y redirige a login
- **RF-04** — CUANDO se hace request autenticada, EL CLIENTE añade header `Authorization: Bearer <accessToken>` automáticamente
- **RF-05** — EL CLIENTE expone métodos tipados: `get<T>(path, query?)`, `post<T>(path, body)`, `patch<T>(path, body)`, `delete<T>(path)`, `upload<T>(path, formData)`

### 4.2 Auth real (`useAuth` hook + componentes)

- **RF-06** — CUANDO usuario hace login con email/password, EL SISTEMA llama `POST /api/auth/login`, guarda access token en memoria (no localStorage), y el backend setea cookie `refreshToken` httpOnly
- **RF-07** — CUANDO se monta la app, EL SISTEMA llama `GET /api/auth/me` para restaurar sesión si hay cookie válida
- **RF-08** — CUANDO access token expira (401 en request), EL SISTEMA usa refresh token (cookie) para obtener nuevo access token sin intervención del usuario
- **RF-09** — CUANDO usuario hace logout, EL SISTEMA llama `POST /api/auth/logout`, limpia estado y redirige a home
- **RF-10** — EL HOOK `useAuth` expone: `user`, `isLoading`, `login(email, password)`, `logout()`, `isAuthenticated`, `hasRole(role)`

### 4.3 Navbar real

- **RF-11** — CUANDO usuario no autenticado, NAVBAR muestra botón "Iniciar sesión" (abre modal login)
- **RF-12** — CUANDO usuario autenticado, NAVBAR muestra avatar/menú con: nombre, rol, botón "Panel Admin" (si admin/gestor), botón "Cerrar sesión"
- **RF-13** — CUANDO usuario tiene rol `admin` o `gestor`, NAVBAR muestra botón "Panel Admin" que navega a `/admin`
- **RF-14** — CUANDO usuario hace logout, NAVBAR actualiza estado inmediatamente sin recargar página

### 4.4 Catálogo público (`ProductCatalog` + `ProductCard`)

- **RF-15** — CUANDO se monta el catálogo público, EL SISTEMA carga vinos con `GET /api/wines/public` (sin auth)
- **RF-16** — LOS FILTROS (tipo, cepa, precio, búsqueda) se aplican en frontend sobre datos recibidos (dataset completo, ~12 vinos)
- **RF-17** — CUANDO usuario hace click "Agregar al carrito", EL SISTEMA usa `localStorage` (frontend-only, sin backend)
- **RF-18** — EL BOTÓN "Editar" en `ProductCard` **solo se muestra** si usuario tiene rol `admin` o `gestor` (verifica `useAuth`)

### 4.5 Admin: Vinos (`ProductCatalog` admin + `AdminWineForm`)

- **RF-19** — LISTADO: `GET /api/wines?page&limit&search&category&varietal&status` con paginación servidor
- **RF-20** — CREAR: `POST /api/wines` con body validado (Zod), respuesta 201 con vino creado
- **RF-21** — EDITAR: `PATCH /api/wines/:id` con body parcial, respuesta 200 con vino actualizado
- **RF-22** — ELIMINAR: `DELETE /api/wines/:id` → 204 si ok, 409 si tiene pedidos (`HAS_ORDERS`)
- **RF-23** — IMPORT CSV: `POST /api/wines/import` multipart/form-data → respuesta 201/207 con `{created, updated, errors}`
- **RF-24** — FORMULARIO: `AdminWineForm` usa `POST /api/upload` para imagen → obtiene signed URL → envía `imageUrl` en create/update

### 4.6 Admin: Pedidos (`OrderDrawer` + listado)

- **RF-25** — LISTADO: `GET /api/orders?page&limit&status&dateFrom&dateTo&search`
- **RF-26** — DETALLE: `GET /api/orders/:id` → items con `imageUrl` resuelto, cliente, timeline
- **RF-27** — CAMBIO ESTADO: `PATCH /api/orders/:id` con `{status}` → crea entrada en timeline automáticamente
- **RF-28** — RESTRICCIÓN: rol `vendedor` solo puede enviar `{status}` en body (validación en backend)

### 4.7 Admin: Clientes (`CustomerDrawer` + listado)

- **RF-29** — LISTADO: `GET /api/customers?page&limit&search&tags`
- **RF-30** — DETALLE: `GET /api/customers/:id` → notas, pedidos, tags
- **RF-31** — NOTAS: `PATCH /api/customers/:id` con `{notes}` → append-only (backend)
- **RF-32** — TAGS: `PATCH /api/customers/:id` con `{tags}` → replace (backend)

### 4.8 Admin: Métricas (`MetricCard` + dashboard)

- **RF-33** — `GET /api/metrics` → shape `Metrics` exacto (salesToday, salesWeek, salesMonth, abandonedCarts: 0, avgTicket, conversion: 0, salesLast30Days, topProducts, recentActivity)

### 4.9 Upload real

- **RF-34** — `ProductForm` / `AdminWineForm`: input file → `POST /api/upload` → recibe `{id, url}` signed URL (1h) → usa `url` como `imageUrl` en create/update
- **RF-35** — VALIDACIÓN: solo imágenes (mimetype), máx 5MB, transformación Sharp→WebP 1920px quality 80

### 4.10 Eliminación MSW

- **RF-36** — ELIMINAR `src/mocks/` completo (`handlers.ts`, `data.ts`, `filtros.ts`, `importar_vinos.ts`, `vino_schema.ts`, `browser.ts`)
- **RF-37** — ELIMINAR `public/mockServiceWorker.js`
- **RF-38** — ELIMINAR registro MSW en `main.tsx` (`worker.start()`)
- **RF-39** — ACTUALIZAR `package.json`: remover `msw` de dependencies (o mover a devDependencies si se usa en tests)

### 4.11 Variables de entorno

- **RF-40** — `VITE_API_URL` (default `http://localhost:3000`) en `.env` y `.env.example`
- **RF-41** — `VITE_ADMIN_PASSWORD` mantener para compatibilidad legacy (login mock fallback si backend no disponible)

---

## 5. Requisitos no funcionales

- **RNF-01 — Tipado estricto:** TypeScript strict en todo frontend, schemas Zod compartidos con backend para tipado end-to-end
- **RNF-02 — Sin recargas:** Auth state management sin `window.location.reload()`; React state + React Router
- **RNF-03 — UX fluida:** Loading states en botones/forms, toasts para errores, optimistic updates en carrito
- **RNF-04 — Seguridad:** Access token solo en memoria (no localStorage), refresh token solo en cookie httpOnly (backend)
- **RNF-05 — Compatibilidad:** Build `npm run build` sin errores, `npm run lint` 0 warnings, `npx tsc --noEmit` 0 errores
- **RNF-06 — Migración suave:** MSW y API real pueden coexistir temporalmente (feature flag `USE_REAL_API`)

---

## 6. Casos límite

| ID | Situación | Comportamiento esperado |
|---|---|---|
| CE-01 | Access token expira durante request | Auto-refresh → retry transparente |
| CE-02 | Refresh token expira / inválido | Logout automático + redirect a login |
| CE-03 | Backend caído (5xx / network error) | Toast error + fallback a datos cached si aplica |
| CE-04 | Login con credenciales inválidas | Error toast "Credenciales incorrectas" (no revelar si email existe) |
| CE-05 | Upload archivo > 5MB o no imagen | Error toast "Archivo inválido" (validación frontend + backend) |
| CE-06 | Usuario sin rol admin accede a `/admin` | Redirect a `/` o 403 (backend) |
| CE-07 | Carrito con vinos que ya no existen en backend | Mantener en localStorage; al checkout validar existencia |
| CE-08 | Refresh token rotado concurrentemente | Backend maneja rotación; cliente reintenta una vez |

---

## 7. Trazabilidad

| Grupo | RF | Origen |
|---|---|---|
| Cliente HTTP | RF-01 a RF-05 | Nuevo — base para todo |
| Auth | RF-06 a RF-10 | 004-b RF-14 a RF-18 |
| Navbar | RF-11 a RF-14 | 004-a RF-01 + 004-b Auth |
| Catálogo | RF-15 a RF-18 | 004-a RF-15 + 004-b RF-06 |
| Admin Vinos | RF-19 a RF-24 | 004-a RF-35 a RF-38, RF-21 + 004-b RF-01 a RF-05 |
| Admin Pedidos | RF-25 a RF-28 | 004-a RF-39, RF-40 + 004-b RF-07 a RF-09 |
| Admin Clientes | RF-29 a RF-32 | 004-a RF-41 + 004-b RF-10, RF-11 |
| Métricas | RF-33 | 004-a RF-42 + 004-b RF-12, RF-13 |
| Upload | RF-34, RF-35 | 004-a RF-25 + 004-b RF-19 a RF-21 |
| MSW Removal | RF-36 a RF-39 | Limpieza técnica |
| Env | RF-40, RF-41 | Configuración |

---

## 8. Criterios de aceptación

### 8.1 Auth & Navbar

| # | Criterio | Verificación |
|---|---|---|
| CA-01 | Login real funciona | `POST /api/auth/login` → 200 + accessToken + cookie refreshToken |
| CA-02 | Refresh automático | Access expirado → 401 → refresh → retry → 200 |
| CA-03 | Logout limpia todo | `POST /api/auth/logout` → 204 + cookie limpiada + estado limpio |
| CA-04 | Navbar muestra usuario | `GET /api/auth/me` → renderiza nombre + rol + botón Panel Admin si corresponde |
| CA-04b | Logout sin recarga | Estado React actualizado, navbar actualizado sin `location.reload()` |

### 8.2 Catálogo & Carrito

| # | Criterio | Verificación |
|---|---|---|
| CA-05 | Catálogo carga de API | `GET /api/wines/public` → renderiza vinos sin MSW |
| CA-06 | Filtros funcionan | Tipo/cepa/precio/búsqueda filtran en frontend sobre datos API |
| CA-07 | Carrito usa localStorage | Agregar/quitar/cambiar cantidad persiste en `localStorage` |
| CA-08 | Botón editar condicional | Solo visible si `hasRole('admin'/'gestor')` |

### 8.3 Admin CRUD

| # | Criterio | Verificación |
|---|---|---|
| CA-09 | Listado vinos paginado | `GET /api/wines?page=1&limit=10` → `{data, total, page, limit, totalPages}` |
| CA-10 | Crear vino | `POST /api/wines` → 201 + vino con `id`, `createdAt`, `stock`, `activo` |
| CA-11 | Editar vino | `PATCH /api/wines/:id` → 200 + vino actualizado |
| CA-12 | Eliminar vino sin pedidos | `DELETE /api/wines/:id` → 204 |
| CA-13 | Eliminar vino con pedidos | `DELETE /api/wines/:id` → 409 `{code: 'HAS_ORDERS', count}` |
| CA-14 | Import CSV | `POST /api/wines/import` → 201/207 + `{created, updated, errors}` |
| CA-15 | Upload imagen | `POST /api/upload` → 201 `{id, url}` signed URL 1h |

### 8.4 Pedidos & Clientes & Métricas

| # | Criterio | Verificación |
|---|---|---|
| CA-16 | Pedidos listado + filtros | `GET /api/orders?status&dateFrom&dateTo` → paginado |
| CA-17 | Pedido detalle + timeline | `GET /api/orders/:id` → items con `imageUrl`, cliente, timeline |
| CA-18 | Cambio estado crea timeline | `PATCH /api/orders/:id {status}` → timeline con nueva entrada |
| CA-19 | Clientes search + tags | `GET /api/customers?search&tags` → AND lógico |
| CA-20 | Notas append / tags replace | `PATCH /api/customers/:id {notes}` → append; `{tags}` → replace |
| CA-21 | Métricas shape correcto | `GET /api/metrics` → 9 claves `Metrics` presentes |

### 8.5 MSW Removal & Build

| # | Criterio | Verificación |
|---|---|---|
| CA-22 | MSW eliminado | No imports de `msw` en `src/`, no `worker.start()` en `main.tsx` |
| CA-23 | Build limpio | `npm run build` → 0 errores, `npm run lint` → 0 warnings, `npx tsc --noEmit` → 0 errores |
| CA-24 | Tests pasan | `npm test` → 224/224 (frontend) + backend tests si corren |

---

## 9. Dudas abiertas

| # | Pregunta | Por qué está abierta |
|---|---|---|
| 1 | **¿Migrar carritos localStorage existentes al backend?** | Script existe en backend (`migrate-from-localstorage.ts`); requiere decisión de negocio |
| 2 | **¿Mantener MSW para tests de frontend?** | Mover `msw` a `devDependencies` y usar solo en `test/` con handlers mínimos |
| 3 | **¿Feature flag `USE_REAL_API` para migración gradual?** | Permite probar backend real en producción sin romper MSW; añade complejidad |
| 4 | **¿Toast library o custom?** | Frontend actual usa `alert`/inline; spec no define. Sugerencia: `sonner` o custom simple |

---

## 10. Relación con specs

- **004-a:** UI Back-Office (completada)
- **004-b:** Backend API Real (completada) — **esta spec la consume**
- **004-c:** Integración Frontend ↔ Backend — **esta spec**
- **004-d:** Deploy / PWA / Tiempo real — **siguiente**

---

## 11. Aprobación

**Estado:** `aprobada` — requiere revisión y aprobación explícita antes de iniciar implementación.