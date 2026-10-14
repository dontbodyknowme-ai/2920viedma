# Cierre 005 — Deploy a producción

**Estado:** T1–T8 ejecutadas. **CA-06 abierto** hasta `2026-10-15 00:02` Argentina.

**Resultado en producción:**

| | |
|---|---|
| Tienda | https://vinoteca-cava.vercel.app |
| API | https://vinoteca-cava.onrender.com · `db: connected` |
| Base | Neon · São Paulo · 9 tablas · 12 vinos · 3 usuarios |
| Imágenes | Cloudflare R2 · URL pública estable (D-G) |
| Costo | **$0/mes** |

---

## Los requisitos, uno por uno

| | | |
|---|---|---|
| **RF-01** | El backend se construye desde el `Dockerfile` de la **raíz del repo** (`node:24-slim`, Prisma y… | ✅ |
| **RF-02** | El servidor escucha en el puerto que inyecta la plataforma. `env.ts` ya lee `PORT` con default 3000… | ✅ |
| **RF-03** | El healthcheck apunta a `GET /health` (**no** a `/api/health`, que no existe: el prefijo `/api` solo… | ✅ |
| **RF-04** | Las migraciones se aplican con `prisma migrate deploy`, **nunca** con `migrate dev`: `migrate dev`… | ✅ |
| **RF-05** | El seed se ejecuta **a mano, una vez**, no en cada arranque. Un seed en cada deploy reinicia los… | ✅ |
| **RF-06** | El arranque falla rápido si falta una variable de entorno: el comportamiento de `config/env.ts`… | ✅ |
| **RF-07** | El esquema se crea con las migraciones ya versionadas de `backend/prisma/migrations`, no con `prisma… | ✅ |
| **RF-08** | `DATABASE_URL` es la conexión **pooled** de Neon y `DIRECT_URL` la **directa**, que es la que usan… | ✅ |
| **RF-09** | Las imágenes se guardan en el bucket `wine-images` de R2. | ✅ |
| **RF-10** | **Las imágenes se sirven con una URL pública y estable**, no con una URL firmada de una hora. El… | ✅ |
| **RF-11** | El backend convierte a WebP, redimensiona a 1920×1920 sin agrandar y sube. Ese comportamiento no cambia. | ✅ |
| **RF-12** | `DELETE /api/upload/:id` sigue borrando el objeto. | ✅ |
| **RF-13** | El frontend se despliega desde `main` con `npm run build` y publica `dist/`. | ✅ |
| **RF-14** | `VITE_API_URL` apunta a la URL pública de la API. | ✅ |
| **RF-15** | **Las rutas del panel funcionan con recarga directa.** `/admin`, `/admin/catalogo`,… | ✅ |
| **RF-16** | El frontend **no** lleva un botón de acceso al panel en la tienda pública. Se sigue entrando… | ✅ |
| **RF-17** | Todas las variables de producción están documentadas en un `.env.example` y en la guía de deploy. | ✅ |
| **RF-18** | Ningún secreto se commitea. `.env` está en `.gitignore` y debe seguir estándolo. | ✅ |
| **RF-19** | `JWT_SECRET` de producción es único, aleatorio y de 32 caracteres o más. **No** es el de desarrollo. | ✅ |
| **RF-20** | `CORS_ORIGIN` es el dominio de Vercel, no `localhost:5173`. | ✅ |
| **RF-21** | `PUBLIC_API_URL` es la URL pública del backend, porque se usa como `servers[0]` en el OpenAPI y en… | ✅ |

---

## Lo que esta spec costó de verdad

Diez días. **Cero de los bugs encontrados estaban en el código de negocio.** Todos eran configuración mal puesta o supuestos que solo se rompen en producción. El resumen honesto:

| # | Qué pasó | Dónde se vio |
|---|---|---|
| 1 | `package-lock.json` desincronizado → `npm ci` fallaba | CI, 36 s, antes de compilar |
| 2 | `Dockerfile` sin `COPY backend/scripts` → `TS18003` | Build, `Exited with status 1` sin motivo |
| 3 | Contexto de build en la raíz → `"/prisma": not found` | Build, después de copiar el frontend entero |
| 4 | `CORS_ORIGIN` vacía → 500 en cada request | Navegador, con `/health` en verde |
| 5 | `NODE_ENV` sin poner → cookie sin `Secure`, `Lax` en vez de `None` | Navegador, al recargar la página |
| 6 | Migraciones por la pooled → advisory lock huérfano | Runtime, sin error visible |
| 7 | Render no redeploya al guardar una variable | Tienda vacía, cero errores |
| 8 | `SameSite=Lax` con dominios distintos | Sesión muerta en cada F5 |
| 9 | `STORAGE_PUBLIC_URL` faltaba en `tests/setup.ts` | CI (encontrado revisando, no fallando) |
| 10 | `DIRECT_URL` faltaba en el CI | CI en rojo **durante tres commits** |

**Ocho de los diez solo se ven corriendo la cosa de verdad.** De los otros dos,
uno lo encontró un test al empezar y el otro lo encontré revisando el workflow
— ninguno de los dos estaba fallando cuando lo vi.

### Las tres reglas que quedaron

1. **Arreglar el código no deshace el estado que dejó el bug anterior.** Los locks de base de datos sobreviven al fix: hubo que cerrar la sesión retenida a mano.

2. **Una variable con el valor equivocado no rompe nada: apaga cosas.** `NODE_ENV` mal puesto no tiró un error — desactivó dos protecciones y dejó todo "funcionando".

3. **Un test que verifica mal es peor que no tener test.** Dos veces un test apuntaba al archivo equivocado: el de deploy veía bien `package.json` y no miraba el lockfile; el de storage probaba el CORS contra un origen inventado.

---

## Cambios de decisión durante la spec

| | Antes | Después | Por qué |
|---|---|---|---|
| **D-A** | Railway | Neon + Render + Vercel | $15-25/mes contra $0. Y `railway.json` no puede declarar el contexto de build: la parte que hacía funcionar el deploy vivía en el panel y se reseteó sola tres veces |
| **D-B** | Migraciones en predeploy | En el arranque | Render no tiene predeploy. Y hacerlas a mano es peligroso: `/health` hace `SELECT 1`, que no toca ninguna tabla, así que con el esquema sin crear el deploy pasa como sano |
| **D-I** | Seed manual | Seed manual (igual) | Sin cambios, pero ahora carga también los 12 vinos |

---

## Qué quedó para adelante

Anotado en la sección 8 de `spec.md`:

| Spec | Qué |
|---|---|
| **006** | Acceso al panel por **código de correo** (Resend). Sin contraseña |
| **007** | Cuentas de usuario con **Google OAuth** para compras seguras |
| **008** | **Dominio propio** |

### Tres cosas pendientes que no entran en esas specs

1. **`scripts/generar-mocks.mjs` está muerto.** Escribe a `src/mocks/data.ts`, que no existe desde 004-c. Su catálogo ya vive en `backend/scripts/seed-vinos.ts`. Conviene borrarlo.
2. **Los deploys de preview de Vercel van a fallar con CORS.** Su dominio es impredecible y no está en `CORS_ORIGIN`. O se los agrega, o se desactivan.
3. **`/admin` muestra las credenciales de prueba** (`admin@vinoteca.local` / `admin123`) y dice "Acceso de prueba". La spec 006 lo elimina; hasta entonces está a la vista de cualquiera que escriba `/admin`.

### Y una deuda que sí conviene mirar

`/health` hace `SELECT 1`, que no toca ninguna tabla. Con el esquema sin crear devuelve `200` con `db: connected` y el deploy queda "sano". **Un healthcheck que no verifica el esquema miente.** Lo correcto sería una tabla de control que las migraciones toquen, y que `/health` verifique. No se hizo porque cambiarlo a último momento, con el deploy funcionando, es justo cómo se rompe lo que anda.
