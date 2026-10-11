# Tasks 005 — Deploy a producción

> Ejecutar en orden. Cada tarea tiene su puerta de verificación.
> **Regla de la casa: no se commitea hasta terminar la spec.** Al final se commitea todo junto y se abre el PR.

---

## T1 — Imágenes con URL estable

**Cubre:** RF-09, RF-10, RF-11, RF-12 · **CE-03**

- [ ] `admin_wine_form.tsx` guarda la URL pública del bucket, no la firmada
- [ ] La URL devuelta por `POST /api/upload` es estable (sin `X-Amz-Signature`)
- [ ] Un vino con `imageUrl` viejo (URL firmada) no rompe la vista
- [ ] `DELETE /api/upload/:id` sigue borrando el objeto

**Puerta:** subir una imagen, esperar, recargar y comprobar que sigue viéndose. Si se cadetó, la tarea no está terminada.

---

## T2 — Rewrite de SPA para Vercel

**Cubre:** RF-15, CE-05

- [ ] Existe `vercel.json` en la raíz
- [ ] `/admin`, `/admin/catalogo`, `/admin/pedidos`, `/admin/clientes`, `/admin/configuracion` devuelven `index.html`
- [ ] `/assets/*.js` y `/assets/*.css` se sirven tal cual (el rewrite no se los come)
- [ ] No hay rewrite para `/api/*` (ese prefijo no existe en el frontend)

**Puerta:** `npm run build`, servir `dist/` con cualquier servidor estático y pedir `/admin/catalogo`. Debe devolver el HTML, no un 404.

---

## T3 — Variables de entorno y guía de deploy

**Cubre:** RF-17, RF-18, RNF-02

- [ ] `.env.example` del backend documenta **todas** las variables, con comentario de una línea
- [ ] Las marcadas como secretas están claras
- [ ] Existe `docs/DEPLOY.md` con el paso a paso: R2 → Railway → Vercel
- [ ] `git grep` no encuentra secretos
- [ ] `.env` sigue en `.gitignore`

**Puerta:** seguir `docs/DEPLOY.md` de principio a fin en una máquina limpia. Si hay un paso que exige saber algo no escrito, falta documentación.

---

## T4 — Script de deploy del backend

**Cubre:** RF-02, RF-03, RF-04, CE-01, CE-02, CE-08

- [ ] El healthcheck de Railway apunta a `/health`
- [ ] Las migraciones se aplican con `npm run db:deploy`
- [ ] El script no corre `migrate dev`
- [ ] El puerto se lee del entorno, no está fijo
- [ ] El orden es: migraciones → arranque → healthcheck

**Puerta:** el comando aparece en `docs/DEPLOY.md` y funciona contra una base de pruebas.

---

## T5 — Cloudflare R2

**Cubre:** RF-09, RF-11 · **CE-04, CE-10**

- [ ] Bucket `wine-images` creado
- [ ] CORS del bucket permite `GET` desde el dominio de producción
- [ ] URL pública del bucket anotada (para `STORAGE_ENDPOINT`)
- [ ] Access key y secret key generados y guardados en el panel de Railway
- [ ] Probado: subir un archivo desde el panel y abrirlo en el navegador

**Puera:** una imagen subida se ve en una pestaña nueva del navegador, fuera de la app.

---

## T6 — Railway

**Cubes:** RF-01, RF-02, RF-04, RF-05, RF-07, RF-08, RF-16, RF-19, RF-20, RF-21 · **CE-01, CE-06**

- [ ] Servicio Postgres creado
- [ ] Servicio de API creado desde `backend/Dockerfile`
- [ ] Variables cargadas: `DATABASE_URL`, `JWT_SECRET`, `STORAGE_*`, `PUBLIC_API_URL`, `CORS_ORIGIN`, `NODE_ENV=production`
- [ ] `JWT_SECRET` es nuevo, aleatorio y de 32+ caracteres
- [ ] Migraciones aplicadas
- [ ] Seed ejecutado **a mano**, una vez
- [ ] `GET /health` responde `200` con `db: connected`

**Puerta:** `curl https://<backend>/health` desde una terminal.

---

## T7 — Vercel

**Cubre:** RF-13, RF-14, RF-16 · **CE-05, CE-07**

- [ ] Proyecto importado desde GitHub, rama `main`
- [ ] Framework detectado como Vite
- [ ] `VITE_API_URL` apunta a la URL de Railway
- [ ] `vercel.json` detectado
- [ ] La tienda carga y muestra el catálogo desde la API real
- [ ] El botón de acceso al panel **no** aparece en la tienda

**Puerta:** abrir la URL de producción y ver el catálogo con vinos.

---

## T8 — Verificación integral

**Cubre:** CA-01 … CA-11

- [ ] **CA-01** `/health` → `200` con `db: connected`
- [ ] **CA-02** `/api/wines/public` → `200` con datos
- [ ] **CA-03** El frontend muestra el catálogo
- [ ] **CA-04** Login real entra al panel con métricas
- [ ] **CA-05** Recargar `/admin/catalogo` no da 404
- [ ] **CA-06** Una imagen subida sigue visible **24 h después**
- [ ] **CA-07** Sin botón de acceso al panel en la tienda
- [ ] **CA-08** Origen no permitido recibe 403 de CORS
- [ ] **CA-09** Sin secretos en el repo
- [ ] **CA-10** CI en verde
- [ ] **CA-11** `docs/DEPLOY.md` se puede seguir de principio a fin

**Puerta:** los once marcados. **CA-06 espera 24 h reales**: no se puede marcar antes.

---

## Al terminar

- [ ] `npm run typecheck`, `npm run lint`, `npm test` en verde
- [ ] `cd backend && npm run typecheck && npm run test` en verde
- [ ] `AGENTS.md` y `MEMORY.md` actualizados
- [ ] **Un solo commit**, con el mensaje explicando el porqué de cada decisión
- [ ] PR a `main`, y merge **solo** si lo pide el usuario