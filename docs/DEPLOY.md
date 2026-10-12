# Guía de deploy

Paso a paso para llevar la app a producción: **Cloudflare R2 → Railway → Vercel**.

Se puede seguir de principio a fin sin saber nada que no esté acá. Si en algún
paso te trabás, el problema suele ser una variable de entorno mal puesta: el
backend **se niega a arrancar** y dice exactamente cuál falta.

---

## Antes de empezar

| Requisito | Para qué |
|---|---|
| Cuenta en [Cloudflare](https://dash.cloudflare.com) | Bucket de imágenes (R2) |
| Cuenta en [Railway](https://railway.app) | Backend + Postgres |
| Cuenta en [Vercel](https://vercel.com) | Frontend |
| Node 24 | Todo el proyecto exige `>=22.19` |
| Docker Desktop | Railway compila el `Dockerfile` en la nube, pero `docker compose` es útil para probar local |

Los tres tienen plan gratuito. **La app se puede desplegar sin pagar nada**
mientras no pase los límites de los free tiers.

---

## Paso 1 — Cloudflare R2 (las imágenes)

R2 es el storage compatible con S3 donde viven las fotos de los vinos.

### 1.1 Crear el bucket

1. **Storage & Databases → R2** en el panel de Cloudflare
2. **Create bucket** → nombre `wine-images`
3. Dejalo en `Location: Automatic`

### 1.2 Abrir el bucket a lectura

El backend guarda en el vino una **URL pública y sin vencimiento**. Por eso el
bucket tiene que permitir lectura anónima:

1. Bucket `wine-images` → **Settings → Public access**
2. **Enable r2.dev subdomain** ( development) o associate un dominio propio

> ⚠️ Esto hace que las fotos sean accesibles para quien tenga el link. Para un
> catálogo de productos es lo esperable. Si alguna vez necesitás imágenes
> privadas, hay que re-firmar la URL en cada lectura (ver "fuera de alcance" en
> `specs/005-deploy/spec.md`).

### 1.3 CORS (CE-04)

Sin esto, el `<img>` del navegador no carga la imagen aunque la URL exista.

Bucket → **Settings → CORS Policy**:

```json
[
  {
    "AllowedOrigins": ["https://tu-app.vercel.app", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Guardá estos cuatro datos, los pide Railway:

| Dato | Dónde está | Variable |
|---|---|---|
| Endpoint de la API | `https://<cuenta>.r2.cloudflarestorage.com` | `STORAGE_ENDPOINT` |
| URL pública | `https://pub-<cuente>.r2.dev` | `STORAGE_PUBLIC_URL` |
| Access Key ID | R2 → **Manage R2 API Tokens** | `STORAGE_ACCESS_KEY` |
| Secret Access Key | (aparece una sola vez) | `STORAGE_SECRET_KEY` |

Para las credenciales: **R2 → Manage R2 API Tokens → Create Account API Token**,
con permiso de lectura/escritura solo sobre `wine-images`.

> `STORAGE_ENDPOINT` y `STORAGE_PUBLIC_URL` **no son lo mismo** y no se pueden
> interchangeable. El endpoint es la API S3 (no se abre en un navegador); la
> URL pública es lo que se guarda en el vino.

---

## Paso 2 — Railway (el backend)

### 2.1 Crear el proyecto y la base

1. **New Project → Deploy from GitHub repo** → elegí `Vinoteca-1`
2. Railway detecta el `railway.json` y usa `backend/Dockerfile`
3. **Add New → Database → PostgreSQL**
4. Railway crea la variable `DATABASE_URL` solo. **No la toques a mano.**

### 2.2 Cargar las variables

En el servicio del backend, **Variables → Raw editor**:

```bash
NODE_ENV=production

# Railway ya la inyecta: no la pegues acá
# DATABASE_URL=postgresql://...

JWT_SECRET=<generalo con el comando de abajo>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_DAYS=7

CORS_ORIGIN=https://tu-app.vercel.app

STORAGE_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET=wine-images
STORAGE_ACCESS_KEY=<de R2>
STORAGE_SECRET_KEY=<de R2>
STORAGE_PUBLIC_URL=https://pub-<cuenta>.r2.dev

PUBLIC_API_URL=<la URL que Railway le dio al backend>
```

Para el `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **No uses el `JWT_SECRET` de desarrollo.** Si se repite, los tokens que se
> generaron en desarrollo valen en producción.

> `PORT` **no se carga**: Railway lo inyecta y el servidor lo toma del entorno.

### 2.3 Configuración del servicio

`railway.json` ya lo define, pero conviene confirmarlo en el panel:

| Campo | Valor | Por qué |
|---|---|---|
| Healthcheck Path | `/health` | **No** `/api/health`: ese no existe (CE-02) |
| Pre-deploy Command | `npm run db:deploy` | Corre las migraciones **antes** de arrancar |
| Start Command | `npm run start` | |
| Restart Policy | On Failure, 3 reintentos | |

> Las migraciones usan `prisma migrate deploy`, nunca `migrate dev`: `dev`
> abre un prompt y el deploy se queda esperando una respuesta.

### 2.4 Primer deploy

`Deployments → Deploy`. El log tiene que mostrar, en orden:

```
[predeploy] prisma migrate deploy   ✅
[build] tsc -p tsconfig.json        ✅
[start] Servidor escuchando en ...   ✅
```

Comprobalo:

```bash
curl https://tu-backend.up.railway.app/health
# {"status":"ok","db":"connected",...}
```

Si responde `db: disconnected`, la `DATABASE_URL` apunta a otro lado.

### 2.5 Seed (una sola vez, a mano)

Crea los tres usuarios. **No va en el arranque**: en cada deploy pisaría los
datos que hayas cargado.

En el panel de Railway, sobre el servicio → **Settings → Custom Command**:

```bash
npm run seed
```

| Email | Password | Rol |
|---|---|---|
| `admin@vinoteca.local` | `admin123` | admin |
| `gestor@vinoteca.local` | `admin123` | gestor |
| `vendedor@vinoteca.local` | `admin123` | vendedor |

> **Cambiá esas contraseñas antes de usar la app de verdad.**

---

## Paso 3 — Vercel (el frontend)

1. **Add New → Project** → importá `Vinoteca-1`
2. Framework preset: **Vite** (se detecta solo)
3. En **Settings → Environment Variables**:

```
VITE_API_URL=https://tu-backend.up.railway.app
```

4. **Deploy**

Vercel lee el `vercel.json` de la raíz, que ya trae el `buildCommand`, el
`outputDirectory` y el rewrite de SPA.

### 3.1 Verificar el panel

En la URL de Vercel:

- `/` carga el catálogo → ✅ si la API responde
- **`/admin/catalogo` y recargá (F5)** → tiene que seguir en el panel.
  Si da 404, el rewrite de `vercel.json` no se aplicó.
- Entrá a `/admin` con `admin@vinoteca.local` / `admin123`

> **En el panel no hay botón de acceso.** A propósito: un enlace en la tienda
> le diría a cualquier visitante que hay una sección restringida y que está a
> un click (decisión de la spec 004-a).

### 3.2 Subir una imagen y comprobar que no caduca

Panel → Catálogo → editar un vino → subir foto.

Mirá la URL que se guarda: tiene que **no** tener `X-Amz-Signature` ni
`X-Amz-Expires`. Si aparecen, la imagen se va a romper en una hora.

---

## Variables de entorno, de un vistazo

| Variable | Secreta | Railway | Vercel |
|---|---|---|---|
| `NODE_ENV=production` | no | ✅ | — |
| `DATABASE_URL` | **sí** | ✅ (automática) | — |
| `JWT_SECRET` | **sí** | ✅ | — |
| `ACCESS_TOKEN_TTL` | no | ✅ | — |
| `REFRESH_TOKEN_DAYS` | no | ✅ | — |
| `CORS_ORIGIN` | no | ✅ | — |
| `RATE_LIMIT_MAX` | no | opcional | — |
| `RATE_LIMIT_WINDOW` | no | opcional | — |
| `LOGIN_RATE_MAX` | no | opcional | — |
| `UPLOAD_MAX_BYTES` | no | opcional | — |
| `STORAGE_ENDPOINT` | no | ✅ | — |
| `STORAGE_REGION` | no | ✅ | — |
| `STORAGE_BUCKET` | no | ✅ | — |
| `STORAGE_ACCESS_KEY` | **sí** | ✅ | — |
| `STORAGE_SECRET_KEY` | **sí** | ✅ | — |
| `STORAGE_PUBLIC_URL` | no | ✅ | — |
| `PUBLIC_API_URL` | no | ✅ | — |
| `VITE_API_URL` | no | — | ✅ |

Sin defaults para lo sensible: si falta una, **el backend no arranca** y dice
cuál. Es preferible a que quede andando con la configuración de desarrollo.

---

## Desarrollo local

```bash
# 1. Base de datos
cd backend && docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env        # primera vez
npm run db:migrate          # crea el esquema
npm run seed                # crea los usuarios
npm run dev                 # http://localhost:3000

# 3. Frontend (otra terminal)
npm install
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev                 # http://localhost:5173
```

> En Windows, `DATABASE_URL` tiene que usar **`127.0.0.1`**, no `localhost`:
> `localhost` resuelve a `::1` y Prisma no conecta por ahí.

---

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El deploy falla en el predeploy | `prisma: not found` | `prisma` tiene que estar en `dependencies`, no en `devDependencies` |
| El deploy se queda colgado | Corriste `prisma migrate dev` | Usar `npm run db:deploy` |
| El deploy falla aunque la app ande | Healthcheck en `/api/health` | Va en `/health` |
| El backend no arranca, dice qué falta | Falta una variable | Completar las de la tabla de arriba |
| El contenedor no levanta en Railway | `NODE_ENV` sin poner | `NODE_ENV=production` |
| Las imágenes no cargan en el navegador | CORS del bucket o bucket privado | Revisar paso 1.2 y 1.3 |
| La imagen se rompe al día siguiente | Se guardó una URL firmada | `STORAGE_PUBLIC_URL` sin firma |
| El navegador bloquea todo, consola llena de CORS | `CORS_ORIGIN` mal | Debe ser el dominio de Vercel, sin barra final |
| `/admin/catalogo` da 404 al recargar | El rewrite no se aplicó | Verificar `vercel.json` en Settings del proyecto |

---

## Rollback

Railway conserva los despliegues anteriores: **Deployments → ⋯ → Rollback**.
Los datos no se pierden (Postgres es un servicio aparte).

> Un rollback **no** revierte el esquema. Si un deploy aplicó una migración, hay
> que revertir el código **y** la migración a mano.