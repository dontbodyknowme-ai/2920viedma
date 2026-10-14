# Tasks 005 — Deploy a producción

> Ejecutar en orden. Cada tarea tiene su puerta de verificación.
> **Regla de la casa: no se commitea hasta terminar la spec.** Al final se commitea todo junto y se abre el PR.

---

## T1 — Imágenes con URL estable

**Cubre:** RF-09, RF-10, RF-11, RF-12 · **CE-03** — **✅ 2026-10-11**

- [x] La URL que devuelve `POST /api/upload` es estable, sin firma
- [x] `admin_wine_form.tsx` guarda esa URL (no hizo falta tocarlo: ya guardaba lo que devuelve la API)
- [x] El backend **rechaza arrancar** sin `STORAGE_PUBLIC_URL` (verificado con Zod: `"Required"`)
- [x] `DELETE /api/upload/:id` sigue borrando el objeto
- [x] 5 tests nuevos en `backend/tests/modules/upload.test.ts`

**Verificación:** 70 tests backend en verde + arranque real del backend con y sin la variable.
**Pendiente de T5:** que el bucket exista y sea legible en esa URL pública (hoy apunta a MinIO local).

---

## T2 — Rewrite de SPA para Vercel

**Cubre:** RF-15, CE-05 — **✅ 2026-10-11**

- [x] Existe `vercel.json` en la raíz
- [x] Las 5 rutas de `/admin` devuelven `index.html`
- [x] Los assets se sirven como archivo, no como HTML
- [x] `scripts/verificar-rewrite-spa.mjs` replica el orden de ruteo de Vercel (filesystem antes que rewrite)

**Verificación:** `npm run build && npm run verificar:spa` → TODO OK sobre el `dist/` real.
**Pendiente de T7:** Vercel real puede tener un orden de ruteo levemente distinto; T7 lo confirma en producción.

---

## T3 — Variables de entorno y guía de deploy

**Cubre:** RF-17, RF-18, RNF-02 — **✅ 2026-10-11**

- [x] `.env.example` documenta las 19 variables, con comentario de una línea
- [x] Las 4 secretas están marcadas en una tabla (`DATABASE_URL`, `JWT_SECRET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`)
- [x] Existe `docs/DEPLOY.md` con el paso a paso R2 → Railway → Vercel
- [x] Incluye tabla de troubleshooting y sección de desarrollo local
- [x] Sin secretos en el repo (`git ls-files` limpio, `.env` ignorado)

**Verificación:** las 19 variables de `env.ts` aparecen en la guía (chequeado por script), ambos JSON parsean, `.gitignore` sigue cubriendo `.env`.

---

## T4 — Script de deploy del backend

**Cubre:** RF-02, RF-03, RF-04, CE-01, CE-02, CE-08 — **✅ 2026-10-11**

- [x] `railway.json` con healthcheck en `/health` (no `/api/health`)
- [x] `predeployCommand: npm run db:deploy` — `prisma migrate deploy`, nunca `dev`
- [x] `startCommand: npm run start`
- [x] El puerto se lee del entorno (Railway inyecta `PORT`, no está fijo en el código)
- [x] Orden: predeploy (migraciones) → build → start
- [x] 11 tests en `backend/tests/unit/deploy.test.ts` que verifican la coherencia de todo esto

**Bug encontrado al hacer T4:** la CLI `prisma` estaba en `devDependencies`, pero la etapa runner instala con `--omit=dev`. O sea que `npm run db:deploy` dentro del contenedor era `prisma: not found` y **el predeploy habría fallado en cada deploy**. Movida a `dependencies`.

**Verificación:** 81 tests backend en verde. Los tests de deploy se probaron **en contra**: saboteando el healthcheck y revirtiendo `prisma` a devDependencies, los tests correspondientes fallan.

---

## T5 — Cloudflare R2

**Cubre:** RF-09, RF-11 · **CE-04, CE-10** — **✅ 2026-10-11**

- [x] Bucket `wine-images` creado (ubicación ENAM)
- [x] Lectura pública habilitada (`r2.dev`)
- [x] CORS del bucket configurado para el frontend
- [x] Credenciales `Object Read & Write` generadas y cargadas en `.env`
- [x] `npm run verificar:storage` → **TODO OK**

**Verificación:** el script sube una imagen real, la abre por la URL pública comprobando el CORS, y la borra.

**Dos cosas que trabaron el camino y quedaron documentadas:**

1. **Token con `Object Read` en vez de `Object Read & Write`.** R2 devuelve el mismo `Access Denied` para "te falta permiso" y para "la firma está mal", y son arreglos distintos. El script ahora distingue los dos: si puede leer pero no escribir, dice que el permiso es de solo lectura.
2. **El script probaba el CORS contra un origen inventado** (`https://ejemplo.vercel.app`), que no está en la política del bucket. El CORS denegaba bien y el script lo leía como "no configurado": un falso negativo que hizo revisar algo que estaba bien. Ahora usa `FRONTEND_ORIGIN` de `.env`.

> ⚠️ **Pendiente fuera del repo:** la primera clave que se generó quedó expuesta en una captura de pantalla. Hay que borrarla desde *Manage R2 API Tokens* y dejar solo la que está en `.env`.

**Puerta:** una imagen subida se ve en una pestaña nueva del navegador, fuera de la app.

---

## T6 — Neon + Render

**Cubes:** RF-01, RF-02, RF-04, RF-05, RF-07, RF-08, RF-16, RF-19, RF-20, RF-21 · **CE-01, CE-06**

> **Reescrito el 2026-10-13.** El plan original era Railway (ver D-A): costaba
> $15-25/mes y su `railway.json` no podía declarar el contexto de build, así que
> la parte que hacía funcionar el deploy vivía en el panel y se reseteaba sola.
> La API terminó en **Render**, no en Koyeb: Koyeb estaba operativo pero su
> consola no renderizaba en este navegador.

- [x] `Dockerfile` movido a la raíz + `.dockerignore` (contexto raíz = 663 MB sin él)
- [x] `.dockerignore` anclando los patrones que existen en frontend y backend
- [x] `docker-compose.yml` apuntando al contexto raíz y con `STORAGE_PUBLIC_URL`
- [x] Migraciones en el arranque (`prisma migrate deploy && node dist/main.js`)
- [x] Seed compilado a `dist/scripts/seed.js` (sin `tsx`, que no existe en la imagen)
- [x] `railway.json` y `backend/Dockerfile` eliminados
- [x] `CORS_ORIGIN` validada y obligatoria en producción
- [x] Base creada en **Neon** (São Paulo, connection string **pooled**)
- [x] Migraciones aplicadas y seed ejecutado contra Neon
- [x] Servicio de API creado en **Render**, plan Free, healthcheck en `/health`
- [x] Variables cargadas (13)
- [x] `JWT_SECRET` nuevo, aleatorio y de 32+ caracteres
- [x] `GET /health` responde `200` con `db: connected`
- [x] `GET /api/docs/` responde `200`
- [x] `POST /api/auth/login` devuelve `accessToken` y `user` con rol y email

**Puerta cumplida:**

```
https://vinoteca-cava.onrender.com/health
{"status":"ok","db":"connected","uptime":65.4}
```

> La respuesta de `/api/auth/login` trae `user` **con `role` y `email`**. Eso
> es la prueba de que el arreglo de 004-d —los `response.schema` de Fastify que
> truncaban las respuestas— sigue en pie en producción. Cuando el rol venía
> vacío, el botón de acceso al panel no aparecía y había que recargar.

**Pendiente:** `PUBLIC_API_URL` quedó apuntando a un dominio de Koyeb que no existe; corregir con el de Render cuando se conecte Vercel.

---

## T7 — Vercel

**Cubre:** RF-13, RF-14, RF-16 · **CE-05, CE-07**

- [x] Proyecto importado desde GitHub, rama `main`
- [x] Framework detectado como Vite
- [x] `VITE_API_URL` = `https://vinoteca-cava.onrender.com`
- [x] `vercel.json` detectado
- [x] `CORS_ORIGIN` en Render = `https://vinoteca-cava.vercel.app`
- [x] `PUBLIC_API_URL` en Render = `https://vinoteca-cava.vercel.app`
- [x] La tienda carga y muestra el catálogo
- [x] El botón de acceso al panel **no** aparece en la tienda
- [x] Las 6 rutas de `/admin/*` devuelven `index.html` al recargar (rewrite de SPA)
- [x] Login real contra producción: `POST /api/auth/login` → 200 y el panel carga
- [x] `/api/metrics` → 200 **con datos** (ceros), no `{}`

**Verificación en navegador real** (no con `curl`): la tienda renderiza, `/admin`
muestra el gate, el login entra al panel, el sidebar carga las 5 secciones y el
dashboard muestra las métricas.

> **Importante sobre `CORS_ORIGIN`.** Render **no redeploya solo** al guardar
> una variable de entorno: el valor queda guardado pero el contenedor sigue
> corriendo con el anterior. El síntoma es el peor posible — la tienda carga
> entera y vacía, sin un error en el servidor. Hubo que apretar **Save Changes**
> y verificar con el `uptime` de `/health` que el contenedor realmente había
> reiniciado.
>
> La verificación que lo confirma en un comando:
> ```
> curl -s -D - -o /dev/null -H "Origin: https://vinoteca-cava.vercel.app" \
>   https://vinoteca-cava.onrender.com/health | grep -i access-control-allow-origin
> ```
> Y el contrapruebo: un origen no permitido tiene que **no** devolver la cabecera.

**Pendiente para T8:** el catálogo en producción está vacío (el seed solo crea
usuarios, no vinos). No es un bug: la tienda muestra las botellas destacadas
desde los datos locales del frontend, y el catálogo del panel mostraría 0.

**Puerta:** abrir la URL de producción y ver el catálogo con vinos.

---

## T8 — Verificación integral

**Cubre:** CA-01 → CA-11

> **Ejecutada el 2026-10-14.** Automatizada en `scripts/verificar-produccion.mjs`
> (`npm run verificar:produccion`): corre los once chequeos y sale con código 1
> si alguno falla, así que sirve en CI. Cuatro quedan `manual` a propósito, con
> el motivo: **un script que dice `OK` sin haber comprobado nada es peor que uno
> que dice `manual`.**

- [x] **CA-01** `/health` → `200` con `db: connected` — `status=200 db=connected`
- [x] **CA-02** `/api/wines/public` → `200` con datos — `vinos=10` (de 12; 2 inactivos a propósito, que es lo esperado)
- [x] **CA-03** El frontend muestra el catálogo — renderiza hero, filtros y las botellas
- [x] **CA-04** Login real entra al panel con métricas — `login` 200 → panel abierto → `/api/metrics` 200 con datos. Verificado además que la sesión **sobrevive un F5**
- [x] **CA-05** Recargar `/admin/catalogo` no da 404 — las 5 rutas devuelven `index.html`
- [ ] **CA-06** Una imagen subida sigue visible **24 h después** — **reloj armado, no se puede cerrar antes.** `npm run armar:ca06` subió una imagen real a las `2026-10-14T03:02:47Z`; la URL respondió `200 image/webp`, sin firma ni caducidad. Vence `2026-10-15T03:02:47Z`
- [x] **CA-07** Sin botón de acceso al panel en la tienda — sin link a `/admin` en el HTML
- [x] **CA-08** Origen no permitido **no** recibe CORS — el permitido recibe `access-control-allow-origin`, el otro no. **La spec pedía 403 y eso está mal**: `@fastify/cors` con origen fijo no devuelve 403, directamente omite la cabecera y el navegador bloquea. Un 403 sería peor: mezclaría "CORS te rechazó" con "tu sesión venció"
- [x] **CA-09** Sin secretos en el repo — bundle de 1,5 MB sin connection strings, sin claves de R2, sin claves privadas
- [x] **CA-10** CI en verde — los tres jobs en `success` sobre `a0375e7`. **Estaba en rojo desde hacía tres commits**
- [x] **CA-11** `docs/DEPLOY.md` se puede seguir de principio a fin — reescrito con los seis huecos que aparecieron al seguirlo de verdad hoy

**Resultado:** `7 OK · 0 fallas · 4 manuales` (CA-06 esperando las 24 h; los otros tres verificados a mano y marcados arriba).

### Lo que encontró la verificación

**El CI estaba en rojo desde tres commits.** `DIRECT_URL` se había agregado al
datasource de Prisma y el workflow no la declaraba:

```
Error: Environment variable not found: DIRECT_URL.   (P1012)
```

`prisma generate` y `prisma migrate` **validan** el schema aunque no se conecten
a nada. Localmente no se ve porque el `.env` local lo tapaba, y **el CI no tiene
`.env`**. El frontend en verde y el backend en rojo durante tres pushes.

Dos cosas más en el mismo workflow, de las que tampoco sabíamos:

- `npm run db:migrate` (= `prisma migrate dev`) en vez de `db:deploy`. `migrate dev` abre un prompt y crea una base sombra: en un runner sin TTY falla por un motivo que no tiene que ver con el código. D-B pedía `migrate deploy` desde el principio
- `docker build ./backend` después de mover el `Dockerfile` a la raíz

Los tres con tests que los cubren, probados en contra.

---

## Al terminar

- [x] `npm run typecheck`, `npm run lint`, `npm test` en verde
- [x] `cd backend && npm run typecheck && npm run test` en verde — **119 backend + 105 frontend**
- [x] `AGENTS.md` y `MEMORY.md` actualizados
- [ ] **PR a `main`**, y merge **solo** si lo pide el usuario
- [ ] **CA-06** cerrado mañana `2026-10-15` a las 03:02 UTC
