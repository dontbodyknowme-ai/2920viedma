# Deploy a producción

Frontend en **Vercel**, API en **Koyeb**, base en **Neon**, imágenes en **Cloudflare R2**.

## Por qué estas y no otras

| Pieza | Plataforma | Costo | Nota |
|---|---|---|---|
| Frontend | Vercel | $0 | Hobby alcanza de sobra para una SPA |
| API | Koyeb | $0 | El free tier **se duerme** tras inactividad |
| Base | Neon | $0 | 500 MB, se auto-suspende |
| Imágenes | Cloudflare R2 | $0 | Sin egress |

Se empezó con **Railway** y se migró: la API sola cuesta $5/mes y su Postgres
$10-20/mes, contra $0 de Koyeb + Neon. El precio a cambio es el **cold start**:
si nadie entra a la API en un rato, Koyeb la duerme y el primer request tarda
~30 segundos en despertar.

Si eso molesta, la única pieza que hay que cambiar es la API: Railway Hobby
($5) con Neon sigue dando una base gratis.

---

## 0. Lo que hay que tener

- Node 24 (`.nvmrc`)
- Una cuenta de [Neon](https://console.neon.tech), de Koyeb y de Vercel
- Un bucket de R2 (paso 1)

---

## 1. Cloudflare R2 — bucket

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Create bucket**
2. Nombre: `wine-images`
3. **Settings → Public access** → **Connect to Worker** no: se usa
   **r2.dev** → *Enable Public Bucket*
4. Anotar tres valores:
   - **Endpoint**: `https://<cuenta>.r2.cloudflarestorage.com`
   - **Public URL**: `https://pub-<cuenta>.r2.dev`
   - **Region**: `auto`

### Token de API

**R2 → Manage API tokens → Create API Token** → plantilla *Object Read & Write*,
limitado al bucket `wine-images`.

> **El primer token que se creó quedó expuesto en una captura de pantalla y hay
> que revocarlo.** Lo mismo con cualquier valor que se haya pegado en un
> chat o screenshot: rotables y se vuelven a generar.

### CORS

El bucket tiene que permitir que el navegador lea las imágenes desde el
frontend. En **R2 → bucket → Settings → CORS Policy**:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://<tu-app>.vercel.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Verificarlo

```bash
cd backend && npm run verificar:storage
```

Escribe un objeto de prueba, abre la URL pública, comprueba el CORS y lo borra.
`TODO OK` es el resultado esperado. Distingue dos fallos a propósito:
`AccessDenied` es token sin permisos de escritura; `SignatureDoesNotMatch` son
credenciales mal pegadas.

---

## 2. Neon — la base

1. [console.neon.tech](https://console.neon.tech) → **Create project**: `vinoteca`
2. **Connection string** → copiar la de **Pooled**
3. La base se llama algo como `ep-xxx-pooler.region.aws.neon.tech`

⚠️ **Pooled, no directa.** La directa es un proxy y corta conexiones a los
minutos; Prisma con pool de conexiones se cuelga en producción a las horas.

⚠️ **En Windows la conexión es por `127.0.0.1`, no `localhost`**: `localhost`
resuelve a `::1` y el motor no llega por IPv6 aunque el puerto esté abierto.

---

## 3. Koyeb — la API

1. [koyeb.com](https://koyeb.com) → **Create Service** → **GitHub** → repo
   `Vinoteca-1`, rama `main`
2. El builder lo detecta solo: hay un `Dockerfile` **en la raíz**. No toques el
   "Root Directory" — justamente no hay nada que configurar, y ese campo es el
   que se reseteaba solo en Railway y rompía el build en silencio
3. Configurar:

| Campo | Valor |
|---|---|
| **Instance type** | Free (`nano` / `free instance`) |
| **Health check path** | `/health` |
| **Ports** | Koyeb inyecta `PORT`; no declarar nada |

> El healthcheck va en `/health`, **sin** el prefijo `/api`. Ese prefijo es
> solo de los endpoints de negocio.

4. **Variables de entorno** → copiar el bloque de abajo. **Empezá por
   `DATABASE_URL`**, que es la de Neon del paso 2.

```bash
NODE_ENV=production

JWT_SECRET=<generalo>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_DAYS=7

CORS_ORIGIN=https://<tu-app>.vercel.app

DATABASE_URL=<la de Neon>

STORAGE_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET=wine-images
STORAGE_ACCESS_KEY=<del token de R2>
STORAGE_SECRET_KEY=<del token de R2>
STORAGE_PUBLIC_URL=https://pub-<cuenta>.r2.dev

PUBLIC_API_URL=https://<tu-api>.koyeb.app
```

Para el `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Ningún secreto va en un chat.** Se generan en tu máquina y se pegan
> directo en el panel.

### Las migraciones

No hay paso previo: el `Dockerfile` arranca con
`prisma migrate deploy && node dist/main.js`. Las tablas se crean en cada
arranque, antes de levantar el server.

Es seguro correrlas siempre porque `migrate deploy` toma un advisory lock.
Y es **mejor** que hacerlo a mano por un motivo concreto: `/health` hace
`SELECT 1`, que no toca ninguna tabla. Con las tablas sin crear la base
responde, el healthcheck pasa y el deploy queda "sano"; la primera consulta
real revienta con `relation does not exist`.

### Seed (una vez)

Crea `admin@vinoteca.local`, `gestor@vinoteca.local` y
`vendedor@vinoteca.local`, todos con `admin123`. **No corre solo en cada
arranque**: es un paso manual.

```bash
# en la máquina, con DATABASE_URL de Neon en el entorno
cd backend
npm run db:deploy     # por si las tablas no estan
npm run seed
```

`seed.ts` usa `upsert` con `update: {}`: correrlo de nuevo no toca los usuarios
que ya existen ni resetea contraseñas.

---

## 4. Vercel — el frontend

1. [vercel.com](https://vercel.com) → **Add New → Project** → repo `Vinoteca-1`
2. Framework: **Vite**. Se detecta solo
3. **Environment Variables** → `VITE_API_URL` = la URL de Koyeb
4. Deploy

`vercel.json` ya tiene el rewrite de SPA. Sin él, recargar `/admin/catalogo`
da 404: Vercel busca el archivo en disco antes de aplicar los rewrites, y ese
path no existe como archivo.

Verificar el rewrite sin desplegar:

```bash
npm run verificar:spa
```

---

## 5. Verificar

```bash
curl https://<tu-api>.koyeb.app/health
# {"status":"ok","db":"connected","uptime":12.3}
```

`db: connected` es la parte que importa: significa que las migraciones
corrieron y la base está viva.

| | |
|---|---|
| **CA-01** | `/health` → 200 con `db: connected` |
| **CA-02** | El catálogo del frontend muestra vinos |
| **CA-03** | `/admin` acepta login y entra al panel |

---

## Troubleshooting

| Síntoma | Causa | Arreglo |
|---|---|---|
| `"/prisma": not found` en el build | Contexto de build apuntando a la raíz | El `Dockerfile` está en la raíz: no hay nada que configurar. Si aparece, es que se editaron los `COPY` |
| El build falla pero `/health` da 200 | Se está sirviendo el deploy anterior | Un deploy fallido **no** levanta la imagen nueva. El único síntoma es que "los cambios no aplican" |
| `tsc: not found` / `prisma: not found` | Herramienta en `devDependencies` | La imagen final instala con `--omit=dev`. Hay un test que lo cubre |
| `/health` con `db: disconnected` | `DATABASE_URL` mal o base dormida | Neon se auto-suspende: la primera conexión la despierta y puede tardar |
| `relation does not exist` | Las migraciones no corrieron | Ver el paso 3: son automáticas. Si pasan, el `start` está mal |
| El frontend no llama a la API | `CORS_ORIGIN` no coincide | Tiene que ser el dominio de Vercel, exacto, sin barra final |
| `AccessDenied` al subir imagen | Token de R2 sin escritura | Recrear el token con *Object Read & Write* |
| La imagen se rompe al día siguiente | URLs firmadas guardadas en el vino | Ya no pasa: el backend devuelve la URL pública del bucket |
