# Deploy a producción

Frontend en **Vercel**, API en **Render**, base en **Neon**, imágenes en **Cloudflare R2**.

## Por qué estas y no otras

| Pieza | Plataforma | Costo | Nota |
|---|---|---|---|
| Frontend | Vercel | $0 | Hobby alcanza de sobra para una SPA |
| API | Render | $0 | El free tier **se duerme** tras inactividad |
| Base | Neon | $0 | 500 MB, se auto-suspende |
| Imágenes | Cloudflare R2 | $0 | Sin egress |

Se empezó con **Railway** y se migró: la API sola cuesta $5/mes y su Postgres
$10-20/mes, contra $0 de Render + Neon. El precio a cambio es el **cold start**:
si nadie entra a la API en un rato, Render la duerme y el primer request tarda
~30 segundos en despertar.

Si eso molesta, la única pieza que hay que cambiar es la API: Railway Hobby
($5) con Neon sigue dando una base gratis.

---

## 0. Lo que hay que tener

- Node 24 (`.nvmrc`)
- Una cuenta de [Neon](https://console.neon.tech), de Render y de Vercel
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

## 3. Render — la API

1. [render.com](https://render.com) → entrar con GitHub → **Create → Web Service**
2. Repo `Vinoteca-1`, rama `main`
3. Runtime **Docker**: detecta el `Dockerfile` de la raíz solo. **Root Directory vacío** ← importante. Ese campo es el que en Railway se reseteaba solo y rompía el build en silencio; con el `Dockerfile` en la raíz no hay nada que configurar
4. Configurar:

| Campo | Valor |
|---|---|
| **Instance type** | Free |
| **Health check path** | `/health` |
| **Ports** | Render inyecta `PORT`; no declarar nada |

> El healthcheck va en `/health`, **sin** el prefijo `/api`. Ese prefijo es
> solo de los endpoints de negocio.
>
> El plan Free **duerme el servicio a los 15 minutos** sin tráfico: el primer
> request después tarda hasta un minuto. No es un error, es el free tier.

4. **Variables de entorno** → copiar el bloque de abajo. **Empezá por
   `DATABASE_URL`**, que es la de Neon del paso 2.

```bash
NODE_ENV=production

JWT_SECRET=<generalo>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_DAYS=7

NODE_ENV=production

CORS_ORIGIN=https://<tu-app>.vercel.app

# Pooled: la usa la aplicación.
DATABASE_URL=<la pooled de Neon: el host lleva -pooler>

# Sin pooler: la usan SOLO las migraciones. El host NO lleva -pooler.
DIRECT_URL=<la directa de Neon>

STORAGE_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET=wine-images
STORAGE_ACCESS_KEY=<del token de R2>
STORAGE_SECRET_KEY=<del token de R2>
STORAGE_PUBLIC_URL=https://pub-<cuenta>.r2.dev

PUBLIC_API_URL=https://<tu-api>.onrender.com
```

Para el `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Ningún secreto va en un chat.** Se generan en tu máquina y se pegan
> directo en el panel.

### Las dos URLs de Neon

Se difference en el host:

| | Host | Para qué |
|---|---|---|
| **Pooled** | `ep-xxx-**pooler**.region.aws.neon.tech` | `DATABASE_URL`, la app |
| **Direct** | `ep-xxx.region.aws.neon.tech` | `DIRECT_URL`, las migraciones |

No es una preferencia: `prisma migrate deploy` toma un **advisory lock de
sesión** (`pg_advisory_lock`). El pooler de Neon es PgBouncer en modo
*transaction*, que devuelve la conexión real al pool al terminar cada
transacción — **con el lock puesto**. Queda una sesión `idle` retenida y el
siguiente `migrate deploy` no lo puede tomar:

```
Timed out trying to acquire a postgres advisory lock
(SELECT pg_advisory_lock(72707369)). Elapsed: 10000ms.
```

Es decir: **el primer deploy funciona y el segundo muere siempre**. Por eso el
`Dockerfile` declara `directUrl` y el schema separa las dos conexiones.

Si alguna vez queda un lock huérfano de una versión anterior, hay que cerrar esa
sesión a mano; los locks son de base de datos, no de conexión, así que arreglar
el código no los libera:

```sql
SELECT pg_advisory_lock(72707369);            -- ver quien lo tiene
SELECT pg_terminate_backend(<pid>);           -- cerrarla lo libera
```

### `NODE_ENV=production` no es opcional

Apaga dos cosas en silencio si falta:

| | Con `production` | Sin él |
|---|---|---|
| Cookie de refresh | `SameSite=None; Secure` | `SameSite=Lax` sin `Secure` → **la sesión muere en cada recarga** |
| `CORS_ORIGIN` | obligatoria | cae al default `http://localhost:5173` |

El síntoma del segundo caso es el peor: la tienda carga entera y vacía,
`/health` da `200` con `db: connected` y no hay un solo error en el log.

### Las migraciones

No hay paso previo: el `Dockerfile` arranca con
`prisma migrate deploy && node dist/main.js`. Las tablas se crean en cada
arranque, antes de levantar el server.

Es **mejor** que hacerlo a mano por un motivo concreto: `/health` hace
`SELECT 1`, que no toca ninguna tabla. Con las tablas sin crear la base
responde, el healthcheck pasa y el deploy queda "sano"; la primera consulta
real revienta con `relation does not exist`.

### Seed (una vez)

Crea los tres usuarios admin y **los 12 vinos** del catálogo de demostración.
**No corre en cada arranque**: es un paso manual.

```bash
# en la máquina, con las URLs de Neon en backend/.env
cd backend
npm run seed
```

Es **idempotente** (los usuarios usan `upsert` con `update: {}` y los vinos un
`id` con slug estable), así que correrlo de nuevo actualiza en vez de duplicar.

> **El seed imprime las contraseñas en la salida.** Es inocuo en tu terminal, y
> es exactamente por eso que no debe ser un paso de deploy: los logs de un
> deploy los puede ver cualquiera con acceso al proyecto. Con la spec 006 el
> acceso es por código de correo y las contraseñas desaparecen.

---

## 4. Vercel — el frontend

1. [vercel.com](https://vercel.com) → **Add New → Project** → repo
2. Framework: **Vite**. Se detecta solo
3. **Environment Variables** → `VITE_API_URL` = la URL de Render
4. Deploy

⚠️ Si el repo tiene varias apps, Vercel ofrece importarlas todas. **Importá
solo la Vite**: el backend ya vive en Render, y una segunda copia ahí sería una
API rota.

⚠️ **La variable va antes del deploy.** Vite *hornea* las `VITE_*` en el bundle
al compilar: si deployás sin ella, el bundle sale con `undefined` adentro,
redeployar no lo arregla, y hay que volver a construir.

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
npm run verificar:produccion
```

Corre los once chequeos de acceptance contra el despliegue y sale con código 1
si alguno falla, así que sirve en CI. Si no le pasás URLs usa las de la spec 005:

```bash
npm run verificar:produccion https://mi-api.onrender.com https://mi-app.vercel.app
```

Aguanta el **cold start**: el plan Free de Render duerme la API a los 15 minutos
sin tráfico y el primer request tarda hasta un minuto. Sin eso el primer chequeo
falla por timeout y parece un deploy roto cuando no lo está.

Cuatro se marcan `manual` a propósito, con el motivo, porque **un script que
dice `OK` sin haber comprobado nada es peor que uno que dice `manual`**:

| | Por qué no se automatiza |
|---|---|
| **CA-04** Login real entra al panel | El `accessToken` vive solo en memoria del cliente: no se puede desde `curl` |
| **CA-06** La imagen sigue viva 24 h después | Hay que esperar 24 h reales |
| **CA-10** CI en verde | Corre en GitHub Actions |
| **CA-11** Esta guía se puede seguir | Hay que seguirla |

### CA-06: el reloj de la imagen

Las imágenes ya no se firman (D-G), así que la URL no caduca. Para probarlo de
verdad hay que subir una hoy y volver mañana:

```bash
npm run armar:ca06
# imprime la URL, la hora y cuándo hay que volver
```

Y 24 h después, un `curl` a esa URL tiene que seguir devolviendo `200` con
`image/webp`.

### A mano

```bash
curl https://<tu-api>.onrender.com/health
# {"status":"ok","db":"connected","uptime":12.3}
```

`db: connected` es la parte que importa: significa que las migraciones
corrieron y la base está viva. Y para confirmar que la cookie salió bien:

```bash
curl -si -X POST https://<tu-api>.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vinoteca.local","password":"admin123"}' | grep -i set-cookie
# refreshToken=...; Path=/; HttpOnly; Secure; SameSite=None
```

Sin `SameSite=None` la sesión se pierde en cada recarga.

---

## Troubleshooting

| Síntoma | Causa | Arreglo |
|---|---|---|
| `"/prisma": not found` en el build | Contexto de build apuntando a la raíz | El `Dockerfile` está en la raíz: no hay nada que configurar. Si aparece, es que se editaron los `COPY` |
| El build falla pero `/health` da 200 | Se está sirviendo el deploy anterior | Un deploy fallido **no** levanta la imagen nueva. El único síntoma es que "los cambios no aplican" |
| `error TS18003: No inputs were found` | Un `COPY` del `Dockerfile` falta algo que los `tsconfig` piden | Hay dos tests que lo cubren: uno resuelve cada `COPY` contra el disco y otro comprueba que entre todo lo que los `tsconfig` declaran |
| `Exited with status 1` sin un solo error | El error real está en el log de **runtime**, no en el de build | Render muestra `View logs`; el motivo suele estar después de `Deploying...` |
| `Timed out trying to acquire a postgres advisory lock` | Las migracionesifinal por la pooled | Ver "Las dos URLs de Neon". El primer deploy funciona y el segundo muere |
| `error: Environment variable not found: DIRECT_URL` (P1012) | Falta `DIRECT_URL` donde corre Prisma | En el CI no hay `.env`: hay que declararla en el workflow. Hay un test que lo cubre |
| Cambiaste una variable y nada cambió | **Render no redeploya al guardar una variable** | Apretá **Save, rebuild, and deploy**, y confirmá con el `uptime` de `/health` que bajó |
| La sesión se pierde al recargar | `SameSite=Lax` o `NODE_ENV` sin `production` | Ver "Las dos URLs de Neon" y `NODE_ENV=production` |
| La tienda carga vacía sin errores | `CORS_ORIGIN` vacía, o distinta | Con `''` el arranque pasa y **cada request** da 500. Tiene que ser el dominio de Vercel, exacto, sin barra final |
| `/health` con `db: disconnected` | `DATABASE_URL` mal o base dormida | Neon se auto-suspende: la primera conexión la despierta y puede tardar |
| `relation does not exist` | Las migraciones no corrieron | Son automáticas en el arranque. Si pasan, el `start` está mal |
| El frontend no llama a la API | `VITE_API_URL` no horneada | Vite la compila dentro del bundle: cambiar la variable exige **redeployar** |
| `AccessDenied` al subir imagen | Token de R2 sin escritura | Recrear el token con *Object Read & Write* |
| La imagen se rompe al día siguiente | URLs firmadas guardadas en el vino | Ya no pasa: el backend devuelve la URL pública del bucket |
| El primer request tarda un minuto | El plan Free durmió el servicio | Es el cold start del free tier, no un error |
