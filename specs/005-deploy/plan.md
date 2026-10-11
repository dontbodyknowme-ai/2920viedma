# Plan 005 — Deploy a producción

## Decisiones

### D-A — Railway construye desde `backend/Dockerfile`, no desde un buildpack

El Dockerfile ya está escrito **y verificado**: se construyó y se levantó un contenedor real que respondió `/health` con `db: connected`. Un buildpack reescribiría la imagen y volvería a abrir los tres fallos que arreglamos (Prisma sin engine, `sharp` sin libvips, logger pidiendo `pino-pretty`).

**Alternativa descartada:** buildpack de Node. Descarta el multi-stage y las correcciones de OpenSSL.

### D-B — Las migraciones corren con `migrate deploy`, en un paso previo explícito

`prisma migrate dev` abre un prompt interactivo y además crea una base sombra. En un despliegue eso es un deploy que se queda colgado.

**Alternativa descartada:** `prisma db push`. Reescribe el esquema sin versionar; el repo deja de tener migraciones y el CE-08 pasa a ser la norma.

### D-G — Bucket de R2 **público** con URL estable

Este es el cambio de diseño más importante de la spec.

Hoy `POST /api/upload` devuelve una URL firmada con `expiresIn: 3600`, y `admin_wine_form.tsx:286` la guarda como `imageUrl` del vino. El resultado es que **la imagen deja de verse una hora después de subirla**, y así queda en la base para siempre. No es un caso borde: es el flujo normal de cargar un vino.

Se elige bucket público con URL estable porque:
- unas fotos de producto de una vinoteca **no son secretas**;
- elimina de raíz la clase de bug, sin cambiar esquema ni contratos;
- una URL que caduca en una base de datos es una bomba de tiempo, no una función.

**Alternativa descartada:** re-firmar en cada lectura. Es la solución correcta si las imágenes tienen que ser privadas, pero obliga a guardar la *clave* del objeto en vez de la URL, cambiar el esquema de vinos y el contrato de `GET /api/wines/*`. Es otra spec. Queda anotado en "fuera de alcance".

### D-F — `vercel.json` con rewrite de SPA

`main.tsx` usa `createBrowserRouter`. Vercel sirve `dist/` como archivos estáticos, así que `/admin` —que no existe como archivo— devuelve 404. El rewrite manda todo lo que no sea un asset a `index.html`.

**Alternativa descartada:** configuración en el panel de Vercel. No queda en el repo y el próximo que clone el proyecto no lo ve.

### D-H — CORS con origen único y explícito, sin comodín

`CORS_ORIGIN` va con el dominio de Vercel. Comodín con `credentials: 'include'` no es válido (la spec de CORS lo prohíbe) y además abriría el panel a cualquier sitio. Los previews de Vercel usan otro dominio y **no** se agregan: un preview es un deploy de una rama cualquiera, no es un origen confiable (CE-07).

### D-I — Seed a mano, una sola vez

Un seed en cada arranque pisa los datos de prueba en cada deploy y borra lo que se haya cargado. El seed es idempotente (`upsert` por email), así que correrlo dos veces no rompe nada — pero igual se ejecuta a mano, para que nadie tenga que acordarse de apagarlo después.

## Tareas

| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| **T1** | Imágenes con URL estable (RF-10, CE-03) | — | El admin guarda una URL que no caduca |
| **T2** | `vercel.json` con rewrite SPA (RF-15, CE-05) | — | `/admin/*` recarga sin 404 |
| **T3** | `.env.example` y guía de deploy (RF-17, RNF-02) | T1, T2 | Variables documentadas + `docs/DEPLOY.md` |
| **T4** | Script de deploy para Railway | T1, T3 | Migraciones + healthcheck + guía |
| **T5** | Provisionar Cloudflare R2 | T3 | Bucket + CORS + URL pública |
| **T6** | Provisionar Railway (Postgres + API) | T3, T4 | Servicio con migraciones aplicadas |
| **T7** | Provisionar Vercel | T2, T3 | Frontend servido con `VITE_API_URL` |
| **T8** | Verificación integral contra producción (CA-01…CA-11) | T5, T6, T7 | Checklist completo en verde |

## Orden

```
T1 ─┬─ T3 ─┬─ T4 ── T6 ─┐
    │      │            ├─ T8
T2 ─┘      └─ T7 ──────┘
    └──── T5 ───────────┘
```

T1 y T2 son de código y no dependen de nada: se pueden hacer y mergear de entrada. **T3 depende de las dos** porque la guía tiene que describir el comportamiento final. T5, T6 y T7 pueden ir en paralelo una vez que el código está listo. T8 es el cierre.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| R2 rechaza el `<img>` por CORS | Las imágenes no cargan en el navegador aunque la URL exista | CE-04: configurar CORS del bucket en T5, verificar en T8 |
| `PUBLIC_API_URL` mal puesta | Las URLs del OpenAPI apuntan a `localhost` | RF-21: es variable obligatoria y validada |
| Se corre `migrate dev` en producción | El deploy se cuelga esperando un prompt | D-B: el script de deploy usa `migrate deploy` |
| Se forgets `NODE_ENV=production` | El backend no arranca | Ya corregido en el logger; T6 lo verifica contra el healthcheck |
| El seed pisa datos reales | Se pierden los vinos cargados | D-I: seed manual, y solo crea los tres usuarios |

## Impacto de los requisitos futuros (sección 8 de la spec)

Pedidos el 2026-10-11, después de escribir este plan. **No agregan tareas a 005**, pero sí pueden obligar a cambiar decisiones que acá se toman:

| Pedido | Qué obliga a hacer 005 | Dónde |
|---|---|---|
| Acceso al panel por código **de email** (Resend) | Nada. El auth actual es el andamiaje sobre el que se construye | — |
| Cuentas de usuario con Google | **`Order` necesita `userId` nullable** y `User` necesita `googleId` nullable. Si 005 los deja afuera, 007 son dos migraciones con datos reales | N-02, N-04, N-07 — **lo único que esta spec tiene que acertar ahora** |
| Dominio propio | Nada. HTTPS sale gratis en Railway y Vercel | N-06: se compra al final, y es lo que hace que los códigos de email no caigan en spam |

**Lo que NO se hace acá:** login por código, OAuth de Google, ni comprar dominio. Está escrito en la sección 8 de la spec con su secuencia (006, 007, 008) y las nueve reglas de seguridad que 006 tiene que cumplir sí o sí.

## Qué NO se toca

- `backend/src/` salvo `logger.ts` (ya corregido) y el upload de T1
- `backend/Dockerfile` — está verificado, no se toca
- El CI — ya está en verde
- Contratos de la API que no estén en el caminho de la imagen