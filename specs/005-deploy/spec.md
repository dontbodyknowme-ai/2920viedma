# Spec 005 — Deploy a producción

> **Estado:** `implementada` (64/67 tareas marcadas; el deploy corre en Render/Vercel/Neon)
> **Fecha:** 2026-10-11
> **Rama:** `spec-005`
> **Predecesora:** 004-c (integración) + 004-d (verificación end-to-end)

---

## 1. Contexto

La app funciona de punta a punta en local y el CI está en verde. Nunca se **[ desplegó**. Todo lo que hay hoy asume desarrollo: la `DATABASE_URL` apunta a `localhost`, el storage es un placeholder de MinIO, y `CORS_ORIGIN` es `localhost:5173`.

El 2026-10-11 la verificación end-to-end encontró **9 bugs de producción** que ninguna verificación automática detectaba. Los dos que quedan abiertos **solo se ven en un entorno real**, y son parte de esta spec:

1. **Las imágenes firmadas caducan a la hora.** `POST /api/upload` devuelve una URL firmada con `expiresIn: 3600` y `admin_producto_form.tsx:286` la guarda como `imageUrl` del producto. Es decir: **la imagen que sube el admin deja de verse una hora después**, y queda para siempre en la base. Es el bug más caro de esta spec.
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

### Backend

- **RF-01** El backend se construye desde el `Dockerfile` de la **raíz del repo** (`node:24-slim`, Prisma y `sharp` operativos). Está en la raíz y no en `backend/` para que el contexto de build sea la raíz por definición: las plataformas no dejan declararlo en un archivo y configurarlo en el panel se reseteaba en silencio.
- **RF-02** El servidor escucha en el puerto que inyecta la plataforma. `env.ts` ya lee `PORT` con default 3000 y `HOST` con default `0.0.0.0`.
- **RF-03** El healthcheck apunta a `GET /health` (**no** a `/api/health`, que no existe: el prefijo `/api` solo aplica a los endpoints de negocio).
- **RF-04** Las migraciones se aplican con `prisma migrate deploy`, **nunca** con `migrate dev`: `migrate dev` abre un prompt y no es apto para un despliegue. Corren en el arranque, antes de levantar el server, porque la plataforma no ofrece un paso previo y hacerlas a mano es peligroso: `/health` hace `SELECT 1`, que no toca ninguna tabla, así que con el esquema sin crear el deploy pasa como sano y la primera consulta real revienta.
- **RF-05** El seed se ejecuta **a mano, una vez**, no en cada arranque. Un seed en cada deploy reinicia los datos de prueba.
- **RF-06** El arranque falla rápido si falta una variable de entorno: el comportamiento de `config/env.ts` (validación eager con Zod) se mantiene.

### Base de datos

- **RF-07** El esquema se crea con las migraciones ya versionadas de `backend/prisma/migrations`, no con `prisma db push`.
- **RF-08** `DATABASE_URL` es la conexión **pooled** de Neon y `DIRECT_URL` la **directa**, que es la que usan las migraciones. Ninguna de las dos se commitea. (Revisado el 2026-10-13: con la pooled, PgBouncer deja el advisory lock tomado y el segundo deploy muere — ver D-B y la nota 25 de AGENTS.md)

### Storage en Cloudflare R2

- **RF-09** Las imágenes se guardan en el bucket `wine-images` de R2.
- **RF-10** **Las imágenes se sirven con una URL pública y estable**, no con una URL firmada de una hora. El producto guarda esa URL y sigue siendo válida para siempre.
- **RF-11** El backend convierte a WebP, redimensiona a 1920×1920 sin agrandar y sube. Ese comportamiento no cambia.
- **RF-12** `DELETE /api/upload/:id` sigue borrando el objeto.

### Frontend en Vercel

- **RF-13** El frontend se despliega desde `main` con `npm run build` y publica `dist/`.
- **RF-14** `VITE_API_URL` apunta a la URL pública de la API.
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
| **CE-10** | El bucket R2 se borra por error | Las imágenes quedan huérfanas; el producto conserva la URL y muestra el fallback. Se acepta el riesgo en esta spec |

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

## 8. Requisitos futuros (pedidos 2026-10-11, NO son parte de esta spec)

El usuario pidió tres cosas **más adelante**, que se registran acá porque(implementarlas mal ahora las hace más caras después):

1. **Acceso al panel sin contraseña**: se escribe el correo y llega un **código de 6 dígitos** por email. *(Primero se evaluó un código alfanumérico único y se descartó; ver 8.4.)*
2. **Cuentas de usuario final con login de Google**, para comprar más seguro.
3. **Dominio propio con HTTPS.**

Decidido el 2026-10-11: **Resend** como proveedor de email, y el código aplica **solo al panel**. Los usuarios finales usarán Google (007).

### 8.1 Restricciones que 005 **no puede** cerrar mal

Estas son la razón de que esta sección exista: cambios de acá hacen más caro lo de después.

| # | Restricción | Por qué |
|---|---|---|
| **N-01** | Ninguna credencial se compara en el bundle del frontend | Es el error que ya se cometió en 004-a: una "contraseña" en el bundle no es autenticación, es decoración. En 006 el código viaja por email y lo verifica el servidor |
| **N-02** | `Order` tiene que admitir `userId` **nullable desde ahora** | Cuando existan cuentas de usuario, los pedidos tienen que pertenecer a alguien. Agregar la columna después es una migración con backfill sobre datos reales |
| **N-03** | `Customer` y `User` **no se fusionan** | Son cosas distintas: un cliente que compró y un usuario con cuenta. Fusionarlas obliga a inventar campos paralos que no tienen cuenta |
| **N-04** | Los endpoints de pedidos aceptan `customerId` **y** van a admitir `userId` | Si el listado filtra solo por `customerId`, las compras de usuarios quedan fuera del panel |
| **N-05** | CORS se configura por variable, no hardcodeado | Google OAuth redirige al origen; cambiar de dominio no puede requerir tocar código |
| **N-06** | El dominio se compra **después** de que el deploy funcione | Si el deploy falla, se pagó el dominio al año para nada. Y el dominio no es gratis: se renueva cada 12 meses |
| **N-07** | `User` admite `googleId` **nullable** desde ahora | Vincular la cuenta de Google es una columna. Agregarla después es otra migración con datos reales |
| **N-08** | El login por código se decide por **rol del usuario**, no por una lista aparte | Si el acceso depende de una tabla de "correos con acceso", ese lugar se desincroniza de los roles que ya existen |

### 8.2 Lo que 005 sí resuelve de paso

- **HTTPS**: Railway y Vercel dan HTTPS con `*.up.railway.app` y `*.vercel.app` sin hacer nada. El dominio propio es opcional después.
- **El acceso actual (email + contraseña)** sirve hasta que 006 lo reemplace. No es trabajo tirado: es el andamiaje sobre el que se construye el código por email.

### 8.3 Secuencia propuesta

| Spec | Qué | Tamaño | Nota |
|---|---|---|---|
| **005** | Deploy | Este | Primero: sin URL pública no se prueban ni los emails ni Google |
| **006** | Acceso al panel por código de email (Resend) | Medio | Reemplaza email+contraseña **solo** del lado admin. Trae proveedor de email, tabla `LoginCode` y dos endpoints |
| **007** | Cuentas de usuario + Google OAuth | Grande | Trae carrito del lado servidor y pedidos que pertenecen a alguien |
| **008** | Dominio propio | Chico | Al final, y con esto los emails dejan de caer en spam |

**Por qué 006 va después de 005:** un email desde `localhost` no llega a ningún lado, y desde una IP nueva de Railway **cae en spam**. Sin URL pública el login por código no se puede probar.

### 8.4 Nota de seguridad: código compartido vs código por email

Se evaluó primero un **código alfanumérico compartido** y se descartó a favor del código por email. La diferencia es grande:

| | Código compartido | **Código por email** |
|---|---|---|
| Secreto que se puede filtrar | El código mismo | Ninguno: expira en 10 min |
| ¿Se sabe quién entró? | No | **Sí**: el correo es la identidad |
| ¿Se revoca por persona? | No, todo o nada | **Sí**: se le saca el rol |
| ¿Si falla Resend? | Funciona igual | No se entra al panel |
| ¿Correo comprometido? | Irrelevante | **Alguien entra al panel** |

Es claramente mejor, **salvo por una cosa**: el correo pasa a ser el eslabón más débil. Quien controle el correo del admin entra al panel. No es un defecto de este diseño — es lo mismo que en cualquier "recuperar contraseña" — pero conviene saberlo.

**Lo que 006 tiene que cumplir sí o sí** (si falta una, no es seguro):

| Regla | Por qué |
|---|---|
| Máx **5 intentos** por código; al sexto se invalida | Un código de 6 dígitos son 1M de combinaciones. Sin este tope se entra |
| Máx **3 envíos** por correo cada 15 min | Si no, cualquiera puede bombardear el correo de un tercero |
| Código **con hash** (bcrypt) en la base | Una filtración de la base no sirve |
| **Expira en 10 minutos** | Ventana acotada |
| **Un solo uso**: se borra al canjearlo | Un código espiado no sirve después |
| **Respuesta idéntica** exista o no el correo | Si responde distinto, se pueden enumerar correos del panel |
| El código **nunca** se loguea en producción | En desarrollo sí, o no hay forma de probarlo |
| Comparación en **tiempo constante** | Evita que el tiempo de respuesta revele el código |
| Registro de conexión: correo, hora, IP | Único sustituto del rastro que da una cuenta con nombre |

## 9. Fuera de alcance

Se anota explícitamente para que no se cuele en esta spec:

- **Imágenes privadas.** Con RF-10 el bucket es público. Si alguna vez hacen falta imágenes privadas, hay que re-firmar en cada lectura (el backend devuelve URLs firmadas nuevas al listar productos) y guardar la *clave* del objeto en vez de la URL. Es trabajo aparte.
- **Dominio propio y DNS.** Se usa el dominio que den los proveedores; HTTPS ya sale gratis ahí. El dominio propio va en la spec 008.
- **Pagos, emails, analytics.**
- **Escalado** (réplicas, CDN de assets).
- **Acceso por código, cuentas de usuario y Google OAuth.** Van en 006, 007 y 008 (ver sección 8).