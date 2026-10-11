# Spec 005 — Deploy a producción

> **Estado:** borrador para revisión
> **Fecha:** 2026-10-11
> **Rama:** `spec-005`
> **Predecesora:** 004-c (integración) + 004-d (verificación end-to-end)

---

## 1. Contexto

La app funciona de punta a punta en local y el CI está en verde. Nunca se **[ desplegó**. Todo lo que hay hoy asume desarrollo: la `DATABASE_URL` apunta a `localhost`, el storage es un placeholder de MinIO, y `CORS_ORIGIN` es `localhost:5173`.

El 2026-10-11 la verificación end-to-end encontró **9 bugs de producción** que ninguna verificación automática detectaba. Los dos que quedan abiertos **solo se ven en un entorno real**, y son parte de esta spec:

1. **Las imágenes firmadas caducan a la hora.** `POST /api/upload` devuelve una URL firmada con `expiresIn: 3600` y `admin_wine_form.tsx:286` la guarda como `imageUrl` del vino. Es decir: **la imagen que sube el admin deja de verse una hora después**, y queda para siempre en la base. Es el bug más caro de esta spec.
2. **La app cuelga de `NODE_ENV=development` sin querer.** `logger.ts` pedía `pino-pretty` (devDependency) siempre que `NODE_ENV !== 'production'`, y `.env.example` pone justamente `development`. En la imagen de producción eso es un contenedor que no arranca. Ya corregido, y la spec lo blinda.

## 2. Objetivo

Tener la app **en producción, con HTTPS, base de datos real y archivos reales**, accesible desde una URL pública, y **sin Intervention manual en cada arranque**.

**No** es objetivo de esta spec: pagos, emails transaccionales, analytics, i18n, PWA, ni performance tuning de la imagen.

## 3. Stack de hosting (decidido 2026-10-11)

| Pieza | Servicio | Motivo |
|---|---|---|
| Backend | **Railway** | Postgres integrado, deploy desde el `Dockerfile` ya verificado, deploy por push a `main` |
| Base de datos | **Railway Postgres** | Managed, backups incluidos, `DATABASE_URL` la inyecta Railway |
| Archivos | **Cloudflare R2** | Free tier de 10 GB, API S3 compatible: `@aws-sdk/client-s3` ya está en el código y no cambia |
| Frontend | **Vercel** | Detecta Vite solo, `VITE_API_URL` por entorno, preview por PR |

## 4. Requisitos funcionales

### Backend en Railway

- **RF-01** El backend se construye desde `backend/Dockerfile`, que ya quedó verificado (`node:24-slim`, Prisma y `sharp` operativos).
- **RF-02** El servidor escucha en el puerto que Railway inyecta. `env.ts` ya lee `PORT` con default 3000 y `HOST` con default `0.0.0.0`.
- **RF-03** El healthcheck de Railway apunta a `GET /health` (**no** a `/api/health`, que no existe: el prefijo `/api` solo aplica a los endpoints de negocio).
- **RF-04** Las migraciones se aplican con `prisma migrate deploy` (`npm run db:deploy`), **nunca** con `migrate dev`: `migrate dev` abre un prompt y no es apto para un despliegue.
- **RF-05** El seed se ejecuta **a mano, una vez**, no en cada arranque. Un seed en cada deploy reinicia los datos de prueba.
- **RF-06** El arranque falla rápido si falta una variable de entorno: el comportamiento de `config/env.ts` (validación eager con Zod) se mantiene.

### Base de datos

- **RF-07** El esquema se crea con las migraciones ya versionadas de `backend/prisma/migrations`, no con `prisma db push`.
- **RF-08** `DATABASE_URL` la inyecta Railway; nunca se escribe a mano ni se commitea.

### Storage en Cloudflare R2

- **RF-09** Las imágenes se guardan en el bucket `wine-images` de R2.
- **RF-10** **Las imágenes se sirven con una URL pública y estable**, no con una URL firmada de una hora. El vino guarda esa URL y sigue siendo válida para siempre.
- **RF-11** El backend convierte a WebP, redimensiona a 1920×1920 sin agrandar y sube. Ese comportamiento no cambia.
- **RF-12** `DELETE /api/upload/:id` sigue borrando el objeto.

### Frontend en Vercel

- **RF-13** El frontend se despliega desde `main` con `npm run build` y publica `dist/`.
- **RF-14** `VITE_API_URL` apunta a la URL pública de Railway.
- **RF-15** **Las rutas del panel funcionan con recarga directa.** `/admin`, `/admin/catalogo`, `/admin/pedidos`, `/admin/clientes` y `/admin/configuracion` devuelven `index.html`, no un 404. Sin esto, recargar el panel rompe — y con `createBrowserRouter` es exactamente lo que pasa.
- **RF-16** El frontend **no** lleva un botón de acceso al panel en la tienda pública. Se sigue entrando escribiendo `/admin`.

### Configuración y secretos

- **RF-17** Todas las variables de producción están documentadas en un `.env.example` y en la guía de deploy.
- **RF-18** Ningún secreto se commitea. `.env` está en `.gitignore` y debe seguir estándolo.
- **RF-19** `JWT_SECRET` de producción es único, aleatorio y de 32 caracteres o más. **No** es el de desarrollo.
- **RF-20** `CORS_ORIGIN` es el dominio de Vercel, no `localhost:5173`.
- **RF-21** `PUBLIC_API_URL` es la URL pública del backend, porque se usa como `servers[0]` en el OpenAPI y en las URLs firmadas.

## 5. Requisitos no funcionales

- **RNF-01** HTTPS en frontend y backend, gestionado por la plataforma.
- **RNF-02** Los secretos viven en el panel del proveedor; nunca en el repositorio ni en los logs.
- **RNF-03** Un despliegue anterior se puede volver a desplegar sin perder datos (Railway conserva los servicios).
- **RNF-04** El arranque en frío no supera los 30 s.
- **RNF-05** `GET /health` responde en menos de 2 s con la base conectada.
- **RNF-06** El build de la imagen sigue siendo reproducible: la imagen que se despliega es la misma que el CI construye y verifica.
- **RNF-07** No se agregan dependencias al proyecto para hacer el deploy. Todo lo necesario ya está.

## 6. Casos borde

| # | Caso | Qué se define |
|---|---|---|
| **CE-01** | Railway reinicia el servicio y cambia `PORT` | El servidor debe tomar el puerto del entorno en cada arranque, no un valor fijo |
| **CE-02** | El healthcheck usa `/api/health` por costumbre | Devuelve 404 y Railway marca el deploy como fallido aunque la app esté bien |
| **CE-03** | Una imagen subida por el admin | Debe seguir visible días después; con URL firmada de 1 h, **no** |
| **CE-04** | R2 no tiene CORS configurado | El `<img>` del navegador falla al cargar de Cloudflare |
| **CE-05** | El admin recarga `/admin/catalogo` | Sin rewrite SPA, Vercel devuelve 404 |
| **CE-06** | El deploy de Vercel usa `NODE_ENV=production` siempre | El backend tiene que arrancar igual sin `pino-pretty` (ya corregido, se blinda con RF-06) |
| **CE-07** | Preview de Vercel en un dominio distinto | La API tiene que rechazarlo por CORS en vez de aceptarlo: el preview no es un origen confiable |
| **CE-08** | `migrate deploy` corre sin `DATABASE_URL` | Falla antes de tocar la base; Railway la inyecta, pero el orden de pasos del deploy importa |
| **CE-09** | El seed corre dos veces | Debe ser idempotente: `upsert` por email, no `create` |
| **CE-10** | El bucket R2 se borra por error | Las imágenes quedan huérfanas; el vino conserva la URL y muestra el fallback. Se acepta el riesgo en esta spec |

## 7. Criterios de aceptación

- [ ] **CA-01** `GET https://<backend>/health` responde `200` con `{"db":"connected"}`.
- [ ] **CA-02** `GET /api/wines/public` responde `200` con el catálogo.
- [ ] **CA-03** El frontend carga en la URL de Vercel y muestra el catálogo desde la API real.
- [ ] **CA-04** `/admin` con credenciales reales entra al panel y muestra métricas.
- [ ] **CA-05** Recargar `/admin/catalogo` en el navegador **no** da 404.
- [ ] **CA-06** Una imagen subida por el admin sigue visible **24 h después** de subirla.
- [ ] **CA-07** El botón "Panel Admin" de la navbar no aparece para un visitante ni para un usuario sin rol.
- [ ] **CA-08** Una petición desde un origen no permitido recibe `403` de CORS.
- [ ] **CA-09** `git grep` no encuentra secretos en el repositorio.
- [ ] **CA-10** El CI sigue en verde después de mergear.
- [ ] **CA-11** La guía de deploy documenta cada variable y se puede seguir de principio a fin.

## 8. Fuera de alcance

Se anota explícitamente para que no se cuele:

- **Imágenes privadas.** Con RF-10 el bucket es público. Si alguna vez hacen falta imágenes privadas, hay que re-firmar en cada lectura (el backend devuelve URLs firmadas nuevas al listar vinos) y cambiar el esquema para guardar la *clave* en vez de la URL. Es trabajo aparte.
- **Dominio propio y DNS.** Se usa el dominio que den los proveedores.
- **Pagos, emails, analytics.**
- **Escalado** (réplicas, CDN de assets).