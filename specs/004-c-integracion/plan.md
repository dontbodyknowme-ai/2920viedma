# Plan 004-c — Integración Frontend ↔ Backend

**Spec:** `specs/004-c-integracion/spec.md`, estado `borrador`
**Fase:** 3 de 5 (plan). Este documento define el **CÓMO**. El QUÉ y el POR QUÉ están en la spec.
**Restricción dominante:** El backend **no se toca** (salvo fixes de bugs críticos). Verificación por HTTP contra backend real.
**Tareas: 9.**

---

## 1. Estrategia de ejecución

### 1.1 Orden de tareas

```
T1 (Cliente HTTP + Auth hook) ──► T2 (Navbar real + Login modal) ──► T3 (Catálogo público + Carrito)
                                                                                    │
                                                                                    ▼
                                              ┌─────────────────────────────────────┐
                                              │  T4 (Admin Vinos CRUD + Upload)     │
                                              ├─────────────────────────────────────┤
                                              │  T5 (Admin Pedidos + Timeline)      │
                                              ├─────────────────────────────────────┤
                                              │  T6 (Admin Clientes + Métricas)     │
                                              ├─────────────────────────────────────┤
                                              │  T7 (Eliminación MSW + Limpieza)    │
                                              ├─────────────────────────────────────┤
                                              │  T8 (Env vars + Build + Verificación)│
                                              └─────────────────────────────────────┘
```

| Tarea | Título | Depende de |
|---|---|---|
| T1 | Cliente HTTP (`src/api/client.ts`) + `useAuth` hook | — |
| T2 | Navbar real + Login modal + `useAuth` integración | T1 |
| T3 | Catálogo público (`GET /api/wines/public`) + Carrito localStorage | T1 |
| T4 | Admin Vinos: CRUD + Import CSV + Upload real | T1 |
| T5 | Admin Pedidos: Listado, Detalle, Timeline, Cambio estado | T1 |
| T6 | Admin Clientes + Métricas | T1 |
| T7 | Eliminación MSW + Limpieza completa | T3, T4, T5, T6 |
| T8 | Env vars, Build, Verificación integral, Documentación | T7 |

---

## 2. Mapa de archivos

### 2.1 A crear (frontend)

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/api/client.ts` | Cliente HTTP tipado con interceptores 401→refresh | T1 |
| `src/api/schemas.ts` | Zod schemas compartidos (copia/adaptación de backend) | T1 |
| `src/hooks/useAuth.ts` | Hook auth: login, logout, me, refresh, estado | T1 |
| `src/components/AuthModal.tsx` | Modal login (email/password) | T2 |
| `src/components/Navbar.tsx` (modificar) | Login/logout real, user menu, botón Panel Admin | T2 |
| `src/components/ProductCatalog.tsx` (modificar) | `GET /api/wines/public` en vez de localStorage | T3 |
| `src/components/AdminWineForm.tsx` (modificar) | `POST /api/upload` + CRUD real | T4 |
| `src/components/AdminWineForm.tsx` (modificar) | Import CSV real (`POST /api/wines/import`) | T4 |
| `src/pages/admin/catalogo.tsx` (modificar) | Listado paginado real + acciones | T4 |
| `src/pages/admin/pedidos.tsx` (modificar) | Listado + drawer real + timeline | T5 |
| `src/pages/admin/clientes.tsx` (modificar) | Listado + drawer real | T6 |
| `src/pages/admin/dashboard.tsx` (modificar) | Métricas reales `GET /api/metrics` | T6 |
| `src/main.tsx` (modificar) | Eliminar registro MSW | T7 |
| `.env.example` (modificar) | Agregar `VITE_API_URL` | T8 |

### 2.2 A eliminar (frontend)

| Archivo | Motivo |
|---|---|
| `src/mocks/` (completo) | MSW handlers + data + browser — backend es source of truth |
| `public/mockServiceWorker.js` | Generado por `npx msw init` — ya no se usa |
| `src/utils/admin_acceso.ts` | Auth mock legacy — reemplazar por `useAuth` real |

### 2.3 Backend (solo fixes si aparecen)

| Archivo | Cuándo tocar |
|---|---|
| `backend/src/modules/auth/routes.ts` | Solo si hay bug en login/refresh/me |
| `backend/src/modules/wines/routes.ts` | Solo si hay bug en CRUD/import |
| Cualquier otro | **Solo fixes críticos** — backend está aprobado |

---

## 3. Decisiones de implementación

### D-A — Cliente HTTP (`src/api/client.ts`)

```typescript
// Base: fetch wrapper tipado con interceptores
interface ApiClient {
  get<T>(path: string, query?: Record<string, string>): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
  upload<T>(path: string, formData: FormData): Promise<T>
}

// Interceptor 401 → refresh → retry (máx 1 vez)
// Access token en memoria (variable de módulo, no localStorage)
// Refresh token: cookie httpOnly (backend la maneja)
// Base URL: import.meta.env.VITE_API_URL || 'http://localhost:3000'
```

**Tipado end-to-end:** Copiar/adaptar schemas Zod de `backend/src/shared/schemas.ts` a `src/api/schemas.ts` para tipar requests/responses.

### D-B — `useAuth` hook (`src/hooks/useAuth.ts`)

```typescript
interface AuthState {
  user: PublicUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (role: UserRole) => boolean
}

// Access token en variable de módulo (no React state) para acceso síncrono en cliente HTTP
// Refresh: cookie httpOnly (backend) → cliente solo llama /api/auth/refresh
// Persistencia: solo en memoria (access) + cookie httpOnly (refresh)
```

### D-C — Auth Modal (`AuthModal.tsx`)

```tsx
// Modal con Framer Motion (AnimatePresence + motion.div)
// Campos: email, password
// Submit: useAuth.login(email, password)
// Error handling: toast/inline error "Credenciales incorrectas"
// Cierre: click en overlay, Escape, botón X
```

### D-D — Navbar real (`Navbar.tsx`)

```tsx
// useAuth() para estado
// Sin auth: botón "Iniciar sesión" → abre AuthModal
// Con auth: dropdown user (nombre, rol) + botón "Panel Admin" (si admin/gestor) + "Cerrar sesión"
// Logout: useAuth.logout() → limpia estado + navega a /
```

### D-E — Catálogo público (`ProductCatalog.tsx`)

```tsx
// useEffect: client.get<Wine[]>('/api/wines/public') → setWines()
// Filtros: en memoria sobre wines[] (tipo, cepa, precio, búsqueda)
// Carrito: localStorage sin cambios (agregar/quitar/cantidad)
// Botón "Editar": condicional useAuth().hasRole('admin'/'gestor')
```

### D-F — Admin Vinos (`catalogo.tsx` + `AdminWineForm.tsx`)

```tsx
// catalogo.tsx:
// - client.get<Paginated<Wine>>('/api/wines', {page, limit, search, category, varietal, status})
// - Acciones: Editar (abre AdminWineForm), Eliminar (confirm + client.delete), Import CSV

// AdminWineForm.tsx:
// - Imagen: input file → client.upload('/api/upload', formData) → {id, url} → setImageUrl(url)
// - Submit: client.post('/api/wines', data) o client.patch(`/api/wines/${id}`, data)
// - Import: input file CSV → client.upload('/api/wines/import', formData)
```

### D-G — Admin Pedidos + Clientes + Métricas

```tsx
// pedidos.tsx:
// - client.get<Paginated<Order>>('/api/orders', query)
// - OrderDrawer: client.get<Order>(`/api/orders/${id}`)
// - Cambio estado: client.patch(`/api/orders/${id}`, {status}) → refresh drawer

// clientes.tsx:
// - client.get<Paginated<Customer>>('/api/customers', query)
// - CustomerDrawer: client.get<Customer>(`/api/customers/${id}`)
// - Notas: client.patch(`/api/customers/${id}`, {notes}) → append
// - Tags: client.patch(`/api/customers/${id}`, {tags}) → replace

// dashboard.tsx:
// - client.get<Metrics>('/api/metrics') → MetricCards + Gráfico
```

### D-H — Eliminación MSW

```bash
# Archivos a borrar:
rm -rf src/mocks/
rm public/mockServiceWorker.js

# main.tsx: eliminar
# import { worker } from './mocks/browser'
# if (import.meta.env.DEV) { worker.start() }

# package.json:
# "msw": mover a devDependencies (o eliminar si no se usa en tests)
```

### D-I — Variables de entorno

```env
# .env.example (añadir)
VITE_API_URL=http://localhost:3000
VITE_ADMIN_PASSWORD=admin123  # legacy fallback

# .env (local):
VITE_API_URL=http://localhost:3000
```

---

## 4. Estrategia de tests

### 4.1 Unit (Vitest + React Testing Library)

| Archivo | Qué cubre |
|---|---|
| `test/api/client.test.ts` | Interceptor 401→refresh, retry, error handling |
| `test/hooks/useAuth.test.ts` | Login, logout, me, refresh, hasRole |
| `test/components/AuthModal.test.tsx` | Submit, validación, cierre |
| `test/components/Navbar.test.tsx` | Render condicional, logout, navegación |
| `test/components/ProductCatalog.test.tsx` | Carga API, filtros, carrito |
| `test/components/AdminWineForm.test.tsx` | Upload, submit, import CSV |

### 4.2 Integration (Playwright — opcional, futura)

| Flujo | Qué cubre |
|---|---|
| Login → Navbar → Panel Admin | Auth flow completo |
| Catálogo → Carrito → Checkout | Flujo compra |
| Admin Vinos CRUD | Create, Read, Update, Delete, Import |

---

## 5. Trazabilidad RF → Tarea

| RF | Tarea | CA |
|---|---|---|
| RF-01 a RF-05 | T1 | CA-01 a CA-03 |
| RF-06 a RF-10 | T1 | CA-01 a CA-03 |
| RF-11 a RF-14 | T2 | CA-04, CA-04b |
| RF-15 a RF-18 | T3 | CA-05 a CA-08 |
| RF-19 a RF-24 | T4 | CA-09 a CA-15 |
| RF-25 a RF-28 | T5 | CA-16 a CA-18 |
| RF-29 a RF-33 | T6 | CA-19 a CA-21 |
| RF-34, RF-35 | T4 | CA-15 |
| RF-36 a RF-39 | T7 | CA-22 a CA-24 |
| RF-40, RF-41 | T8 | CA-23, CA-24 |

---

## 6. Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **Backend cambia contrato API** | Alto — rompe frontend | Backend aprobado y congelado; solo fixes críticos |
| R2 | **Refresh token race condition** | Medio — 401 loops | Cliente HTTP: max 1 retry; backend rota token atómicamente |
| R3 | **CORS / Cookies en Codespaces** | Medio — cookies httpOnly cross-origin | `VITE_API_URL` con mismo origen; `credentials: 'include'` en fetch |
| R4 | **MSW removal rompe tests existentes** | Medio | Mover `msw` a `devDependencies`; tests usan handlers mínimos propios |
| R5 | **Upload signed URL expira (1h)** | Bajo — UX | Frontend usa URL inmediatamente; backend genera nueva si expira |
| R6 | **Migración carritos localStorage** | Bajo — opcional | Script backend listo; decisión de negocio posterior |
| R7 | **Feature flag `USE_REAL_API` añade complejidad** | Medio | Opcional: migración big-bang (MSW off → API on) si backend estable |

---

## 7. Dependencias (`package.json` frontend)

```json
{
  "dependencies": {
    "...": "...",
    "zod": "^3.22.4"  // ya está para validación schemas
  },
  "devDependencies": {
    "...": "...",
    "msw": "^2.15.0",  // mover de dependencies → devDependencies
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^1.1.0"  // ya está
  }
}
```

---

## 8. Verificación por tarea

```bash
# Cada tarea
npm run typecheck        # tsc --noEmit
npm run lint             # eslint . --max-warnings 0
npm run build            # vite build
npm run test             # vitest run

# T1 específico — Cliente HTTP + Auth
# Verificar: login → me → refresh → logout flow

# T8 final — Verificación integral
npm run typecheck
npm run lint
npm run build
npm run test

# Backend (en otra terminal)
cd backend
npm run db:migrate
npm run seed
npm run dev

# Frontend
npm run dev
# Probar en browser: login → navbar → catálogo → carrito → admin CRUD
```

---

## 9. Lo que NO se hace en esta spec

- **No se toca backend** (salvo fixes críticos de bugs que bloqueen frontend)
- **No se añaden WebSockets / tiempo real** (spec 004-d+)
- **No se implementa PWA / Service Worker avanzado** (spec 004-d+)
- **No se hace migración masiva de datos localStorage → Backend** (script existe, ejecución opcional)
- **No se cambian tests de backend** (ya pasan en 004-b)