# Task 004-c — Integración Frontend ↔ Backend

**Spec:** `specs/004-c-integracion/spec.md`, estado `borrador`
**Plan:** `specs/004-c-integracion/plan.md`
**Fase:** 5 de 5 (tasks). Este documento define las **TAREAS EJECUTABLES** una por una.

---

## Convenciones

- Cada tarea se completa **en orden** (T1 → T8)
- **Verificación obligatoria** al final de cada tarea: `typecheck`, `lint`, `build`, `test`
- **Backend no se toca** salvo fixes críticos documentados
- Commits atómicos por tarea: `git commit -m "feat(T#): descripción"`

---

## T1 — Cliente HTTP + useAuth Hook

### Objetivo
Crear `src/api/client.ts` (fetch wrapper tipado con interceptores 401→refresh) y `src/hooks/useAuth.ts` (estado auth, login, logout, me, refresh, hasRole).

### Archivos a crear
- `src/api/client.ts` — Cliente HTTP tipado
- `src/api/schemas.ts` — Zod schemas (copia/adaptación de `backend/src/shared/schemas.ts`)
- `src/hooks/useAuth.ts` — Hook auth completo

### Implementación clave
```typescript
// client.ts
// - baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
// - accessToken en variable de módulo (no localStorage, no React state)
// - interceptor 401 → POST /api/auth/refresh (1 retry max) → retry original
// - métodos: get, post, patch, delete, upload (FormData)
// - tipado con schemas Zod → types inferidos

// useAuth.ts
// - estado: user, isLoading, isAuthenticated
// - login(email, password) → POST /api/auth/login → set accessToken + user
// - me() → GET /api/auth/me (al montar app)
// - refresh() → POST /api/auth/refresh (llamado por interceptor)
// - logout() → POST /api/auth/logout + limpiar estado
// - hasRole(role) → user?.role === role
```

### Verificación T1
```bash
cd /workspaces/Vinoteca-1  # o ruta local
npm run typecheck
npm run lint
npm run build
npm run test
# Verificar: no errores, client.ts y useAuth.ts compilan
```

---

## T2 — Navbar Real + Login Modal

### Objetivo
Crear `src/components/AuthModal.tsx` (modal login Framer Motion) y modificar `src/components/Navbar.tsx` para usar `useAuth` real: login/logout, user menu, botón "Panel Admin" condicional.

### Archivos a crear/modificar
- `src/components/AuthModal.tsx` (nuevo)
- `src/components/Navbar.tsx` (modificar)

### Implementación clave
```tsx
// AuthModal.tsx
// - AnimatePresence + motion.div (entrada/salida)
// - Form email/password + submit useAuth.login()
// - Error handling: "Credenciales incorrectas"
// - Cierre: overlay, Escape, X

// Navbar.tsx
// - useAuth() → { user, isLoading, isAuthenticated, login, logout, hasRole }
// - Sin auth: botón "Iniciar sesión" → abre AuthModal
// - Con auth: dropdown con nombre, rol, "Panel Admin" (si admin/gestor), "Cerrar sesión"
// - Logout: useAuth.logout() → navigate('/')
```

### Verificación T2
```bash
npm run typecheck && npm run lint && npm run build && npm run test
# Manual: abrir browser → click "Iniciar sesión" → login admin@vinoteca.local/admin123
# → navbar muestra usuario + rol + botón "Panel Admin" → logout → navbar vuelve a login
```

---

## T3 — Catálogo Público + Carrito

### Objetivo
Modificar `src/components/ProductCatalog.tsx` y `src/components/ProductCard.tsx` para consumir `GET /api/wines/public` en vez de `localStorage`/`MSW`. Carrito sigue en `localStorage`.

### Archivos a modificar
- `src/components/ProductCatalog.tsx`
- `src/components/ProductCard.tsx` (botón editar condicional)

### Implementación clave
```tsx
// ProductCatalog.tsx
// useEffect: client.get<Producto[]>('/api/wines/public') → setWines()
// Filtros: en memoria sobre wines[] (tipo, cepa, precio, búsqueda)
// Carrito: sin cambios (localStorage)
// Botón "Editar": {useAuth().hasRole('admin') || useAuth().hasRole('gestor')} && <EditButton />

// ProductCard.tsx
// - props: onEditWine? (solo se pasa si hasRole)
```

### Verificación T3
```bash
npm run typecheck && npm run lint && npm run build && npm run test
# Manual: catálogo carga productos de API → filtros funcionan → carrito agrega/quita → botón editar solo visible si admin
```

---

## T4 — Admin Vinos: CRUD + Import CSV + Upload Real

### Objetivo
Conectar admin productos a API real: listado paginado, crear, editar, eliminar, import CSV, upload imagen real (`POST /api/upload`).

### Archivos a modificar
- `src/pages/admin/catalogo.tsx` — listado + acciones
- `src/components/AdminProductoForm.tsx` — create/update + upload + import

### Implementación clave
```tsx
// catalogo.tsx
// - client.get<Paginated<Producto>>('/api/wines', {page, limit, search, category, varietal, status})
// - Acciones: Editar (abre AdminProductoForm), Eliminar (ConfirmDialog + client.delete), Import CSV

// AdminProductoForm.tsx
// - Imagen: <input type="file" accept="image/*" onChange={handleImageUpload}>
//   handleImageUpload: formData.append('file', file) → client.upload('/api/upload', formData) → {id, url} → setImageUrl(url)
// - Submit create: client.post('/api/wines', data) → 201
// - Submit update: client.patch(`/api/wines/${id}`, data) → 200
// - Import CSV: <input type="file" accept=".csv" onChange={handleImport}>
//   handleImport: formData.append('file', file) → client.upload('/api/wines/import', formData) → {created, updated, errors}
```

### Verificación T4
```bash
npm run typecheck && npm run lint && npm run build && npm run test
# Manual: admin → catálogo → listado paginado → crear producto con imagen → editar → eliminar (sin pedidos) → import CSV válido → import CSV con errores (207)
```

---

## T5 — Admin Pedidos + Timeline

### Objetivo
Conectar admin pedidos a API real: listado con filtros, detalle con timeline, cambio de estado con creación automática de entrada en timeline.

### Archivos a modificar
- `src/pages/admin/pedidos.tsx` — listado + drawer
- `src/components/OrderDrawer.tsx` (si existe, si no crear)

### Implementación clave
```tsx
// pedidos.tsx
// - client.get<Paginated<Order>>('/api/orders', {page, limit, status, dateFrom, dateTo, search})
// - OrderDrawer: client.get<Order>(`/api/orders/${id}`) → items con imageUrl, cliente, timeline
// - Cambio estado: select onChange → client.patch(`/api/orders/${id}`, {status}) → refresh drawer
// - Rol vendedor: solo habilitar select status (backend valida)
```

### Verificación T5
```bash
npm run typecheck && npm run lint && npm run build && npm run test
# Manual: admin → pedidos → filtros → abrir detalle → cambiar estado → timeline se actualiza
```

---

## T6 — Admin Clientes + Métricas

### Objetivo
Conectar admin clientes y métricas a API real.

### Archivos a modificar
- `src/pages/admin/clientes.tsx` — listado + drawer
- `src/pages/admin/dashboard.tsx` — métricas reales
- `src/components/CustomerDrawer.tsx` (si existe)

### Implementación clave
```tsx
// clientes.tsx
// - client.get<Paginated<Customer>>('/api/customers', {page, limit, search, tags})
// - CustomerDrawer: client.get<Customer>(`/api/customers/${id}`) → notas, pedidos, tags
// - Notas: client.patch(`/api/customers/${id}`, {notes}) → append (backend)
// - Tags: client.patch(`/api/customers/${id}`, {tags}) → replace (backend)

// dashboard.tsx
// - client.get<Metrics>('/api/metrics') → MetricCards + Gráfico Recharts (ya existe)
```

### Verificación T6
```bash
npm run typecheck && npm run lint && npm run build && npm run test
# Manual: admin → clientes → search + tags → abrir detalle → agregar nota → cambiar tags
# admin → dashboard → métricas cargan de API (salesToday, topProducts, etc.)
```

---

## T7 — Eliminación MSW + Limpieza Completa

### Objetivo
Eliminar todo rastro de MSW del frontend. Backend es source of truth.

### Archivos a eliminar
```bash
rm -rf src/mocks/
rm public/mockServiceWorker.js
```

### Archivos a modificar
- `src/main.tsx` — eliminar registro MSW
- `package.json` — mover `msw` a `devDependencies` (o eliminar)

### Implementación clave
```tsx
// main.tsx — ELIMINAR:
// import { worker } from './mocks/browser'
// if (import.meta.env.DEV) { worker.start() }

// package.json:
// "msw": "^2.15.0"  → mover a devDependencies (o eliminar si tests no lo usan)
```

### Verificación T7
```bash
npm run typecheck && npm run lint && npm run build && npm run test
# Verificar: no imports de 'msw' en src/, no worker.start(), build limpio
# grep -r "msw" src/ → 0 resultados
```

---

## T8 — Env Vars + Build + Verificación Integral

### Objetivo
Configurar variables de entorno, build final, verificación integral y documentación.

### Archivos a modificar
- `.env.example` — agregar `VITE_API_URL`
- `.env` (local) — `VITE_API_URL=http://localhost:3000`
- `AGENTS.md` / `MEMORY.md` — actualizar con 004-c completada

### Implementación clave
```env
# .env.example
VITE_API_URL=http://localhost:3000
VITE_ADMIN_PASSWORD=admin123  # legacy fallback

# .env (local)
VITE_API_URL=http://localhost:3000
```

### Verificación final T8
```bash
# Frontend
npm run typecheck
npm run lint
npm run build
npm run test

# Backend (terminal separada)
cd backend
docker compose up -d db
npm run db:migrate
npm run seed
npm run dev

# Frontend (terminal principal)
npm run dev

# Pruebas manuales completas:
# 1. Login → navbar → logout
# 2. Catálogo público → filtros → carrito
# 2. Admin → productos CRUD + upload + import CSV
# 3. Admin → pedidos + timeline + cambio estado
# 4. Admin → clientes + notas/tags
# 5. Admin → dashboard métricas
# 6. Swagger UI: http://localhost:3000/api/docs

# Docs
git add AGENTS.md MEMORY.md
git commit -m "docs: actualizar AGENTS.md y MEMORY.md con spec 004-c completada"
git push origin spec-004-c
```

---

## Checklist final de aceptación (Definition of Done)

- [ ] **T1** Cliente HTTP + useAuth: `typecheck` ✅ `lint` ✅ `build` ✅ `test` ✅
- [ ] **T2** Navbar + Login Modal: manual ✅ `typecheck` ✅
- [ ] **T3** Catálogo público + Carrito: manual ✅ `typecheck` ✅
- [ ] **T4** Admin Vinos CRUD + Upload + Import: manual ✅ `typecheck` ✅
- [ ] **T5** Admin Pedidos + Timeline: manual ✅ `typecheck` ✅
- [ ] **T6** Admin Clientes + Métricas: manual ✅ `typecheck` ✅
- [ ] **T7** MSW eliminado: `grep -r msw src/` → 0 ✅ `build` ✅
- [ ] **T8** Build final + Tests + Pruebas manuales completas ✅
- [ ] **Docs** `AGENTS.md` + `MEMORY.md` actualizados ✅
- [ ] **Push** `git push origin spec-004-c` ✅

---

## Notas para el implementador

1. **Orden estricto:** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8. No saltar.
2. **Backend no se toca.** Si hay bug en backend, documentar y crear issue; fix mínimo en backend solo si bloquea.
3. **Commits atómicos:** Una tarea = un commit (o varios pequeños dentro de la tarea).
3. **Verificación obligatoria** al final de cada tarea. No avanzar si falla.
4. **MSW removal** solo al final (T7) — hasta entonces pueden coexistir.
5. **Variables de entorno:** `VITE_API_URL` obligatoria; `VITE_ADMIN_PASSWORD` legacy.