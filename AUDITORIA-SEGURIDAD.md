# Auditoría de seguridad — 2920viedma

**Fecha:** 2026-10-27
**Alcance:** frontend (`src/`), backend (`backend/src/`), scripts, Docker, configs de deploy y dependencias.
**Método:** revisión estática completa + pruebas dinámicas contra el backend levantado en local (solo sondas no destructivas: casos que deben fallar con 400/401/429; no se crearon pedidos ni se tocó la base real).

---

# 📚 Metodología general (el orden en que se atacó)

Antes de los hallazgos individuales, este es el flujo que se siguió. Sirve para cualquier proyecto:

1. **Mapa del terreno.** Listar la estructura (`glob`), leer `package.json` de cada subproyecto y los docs (`AGENTS.md`, `DEPLOY.md`). De ahí salen las preguntas correctas: ¿hay backend? ¿hay pagos? ¿hay auth? ¿dónde se deploya?
2. **Inventario de superficie de ataque.** Enumerar los endpoints **públicos** (sin auth): son los únicos que un atacante real puede tocar. Acá: `POST /api/orders`, `POST /api/orders/webhook`, `GET /api/products/public`, `/health`, `/api/docs`. Todo lo demás se revisa después, pensando en "y si roban un token de vendedor".
3. **Seguir el dato, no el código.** Para cada dato sensible (precio, `pagoId`, refresh token, `stock`), buscar con `grep` **todos los lugares donde se escribe y todos donde se lee**, y comparar que los dos extremos hablen de lo mismo. La mayoría de los bugs graves de este proyecto salieron así.
4. **Leer la validación con ojo de atacante.** En cada schema preguntarse: ¿tiene máximo además de mínimo? ¿rechaza campos extra o los deja pasar? ¿qué pasa si mando un tipo distinto?
5. **Cazar banderas rojas con grep:** `as any`, `innerHTML`, `eval(`, `admin123`, `password`, `localhost` en configs de prod, archivos `.env*`.
6. **Correr las herramientas que ya existen:** `npm audit` en cada `package.json`.
7. **Levantar el servidor y atacarlo de verdad**, solo con casos que *deberían* fallar (inyectar precio → esperar 400; webhook sin firma → esperar 401; 7 logins seguidos → esperar 429). Si "falla bien", la defensa existe. Jamás se creó un pedido real: las sondas se diseñaron para morir en la validación.
8. **Preguntarse por el entorno de deploy.** Varias vulns (proxy, cookies, CORS) no existen en local y sí en Render/Vercel. Leer los docs de deploy es parte de la auditoría.

---

# Lo que se probó y ESTÁ BIEN

- `POST /api/orders` **rechaza** precios inyectados (`precioUnitario` extra → 400 por `.strict()`). El total sale de la base, no del cliente.
- Webhook **sin firma → 401**, y **sin secreto configurado → 503** (no acepta nada a ciegas). Firma HMAC con `timingSafeEqual`.
- `/api/metrics`, `/api/products`, `/api/upload` sin token → **401**. JWT con `alg:none` → **401**.
- Rate-limit de login funciona: 5 req/min/IP (7 intentos → `401 401 401 429 429 429 429`).
- CORS **no** refleja orígenes ajenos (`https://evil.com` no recibe `access-control-allow-origin`).
- Paginación acotada (`?limit=100000` → 400), bcrypt para passwords, refresh token rotativo y hasheado en base, `.env` **no** está en git, `USER node` en la imagen Docker, sin `dangerouslySetInnerHTML` en el frontend.

---

# VULNERABILIDADES

Ordenadas por severidad: 🔴 Crítica · 🟠 Alta · 🟡 Media · ⚪ Baja.

---

## 🔴 1. La webhook de Mercado Pago nunca encuentra el pedido: los pagos jamás se aplican

**Dónde:** `backend/src/modules/orders/service.ts:378` y `:200` · `backend/src/modules/orders/routes.ts:33`

**Qué pasa:** al crear el pedido se guarda `pagoId = preference.id` (el id de la *Preference* de Mercado Pago). La webhook recibe `data.id`, que para notificaciones `type: 'payment'` es el id del **pago** — un valor distinto. `aplicarPago` busca `prisma.order.findUnique({ where: { pagoId } })` con ese id de pago, que **nunca** coincide con el id de Preference guardado. Resultado: `findUnique` devuelve `null`, la rama "no es nuestro" responde `200 { applied: false }`, y **ningún pago real actualiza nunca un pedido**. La plata entra en Mercado Pago y el pedido queda `no_iniciado` hasta que el cron lo expira a los 10 minutos. El cliente pagó y el negocio no lo ve.

Los tests no lo ven porque mockean Prisma: usan el mismo string (`PAGO_ID = '99887766'`) como id de pago y como valor que "encuentra" el mock, tapando la diferencia entre los dos ids reales.

**🔍 Cómo lo encontré:** con la técnica #3 de la metodología — *seguir el dato*. Se hizo `grep pagoId` en todo el backend y se anotaron en una hoja los dos extremos:

```
ESCRITURA:  service.ts:378 → data: { pagoId: preference.id }   (id de PREFERENCE)
LECTURA:    routes.ts:33   → pagoId = cuerpo.data?.id          (id de PAGO, llega por webhook)
            service.ts:200 → findUnique({ where: { pagoId } }) (busca con el id de PAGO)
```

Dos valores distintos tratados como el mismo. Después se verificó contra la API real de Mercado Pago: en las notificaciones `type: 'payment'`, `data.id` es el **payment id**, nunca el preference id. La pista final fue mirar el test (`webhook_pagos.test.ts`): el mock de Prisma responde "encontrado" sin importar qué id llegue, así que el test **no puede** detectar esta diferencia — un caso de "test verde que no prueba la integración" (justo lo que la regla de `AGENTS.md` advierte).

> **Lección:** cuando un sistema integra un proveedor externo, anotá cada identificador y preguntá "¿quién lo genera y quién lo consume?". Y desconfiá de los tests donde el mock responde lo mismo sin mirar los argumentos.

**Solución:** usar `external_reference`, que ya se manda con el id del pedido en `cuerpoDePreference`. En `aplicarPago`, tras `estadoDe(pagoId)`, leer el pago completo (`GET /v1/payments/:id` ya lo hace el proveedor — extenderlo para devolver `external_reference`) y buscar el pedido por `where: { id: external_reference }`, no por `pagoId`. Agregar un test de integración que simule el flujo real (Preference → webhook con id de pago distinto) para que el mock no vuelva a taparlo.

---

## 🔴 2. Sin `trustProxy`: el rate-limit es compartido por TODOS los visitantes en producción

**Dónde:** `backend/src/app.ts:90-97` (falta `trustProxy`) · `backend/src/plugins/index.ts:22-26` y `backend/src/modules/auth/routes.ts:49` (`keyGenerator: request.ip`)

**Qué pasa:** Fastify por defecto **no** confía en proxies, así que `request.ip` es la IP del socket. En Render (proxy inverso delante), ese socket es **la IP interna del proxy para todos los visitantes**. Consecuencias medibles con la config actual:

- El login entero del panel tiene **5 intentos/minuto para todo el mundo junto**: cualquier persona que haga 5 intentos fallidos deja el panel de administración en 429 para todos los empleados durante un minuto. Repitiendo cada minuto, el panel queda inutilizable de forma permanente (DoS trivial, sin autenticación).
- El rate-limit global de **100 req/minuto también es compartido**: un solo bot consume el cupo de la API entera y los compradores reales reciben 429.

En local no se ve porque cada visitante es `127.0.0.1` para sí mismo.

**🔍 Cómo lo encontré:** cadena de tres preguntas: (1) al ver `keyGenerator: (request) => request.ip` en el rate-limit → "¿de dónde sale `request.ip`?"; (2) `docs/DEPLOY.md` y `AGENTS.md` dicen que la API corre en **Render** → "¿hay un proxy delante?" — sí, toda PaaS termina TLS en un proxy inverso; (3) leer el constructor de Fastify en `app.ts` buscando `trustProxy` → **no está**. El default de Fastify es `trustProxy: false` = "ignorá `X-Forwarded-For`, usá la IP del socket" = la IP del proxy para todos.

Es el patrón clásico: **toda defensa basada en IP (rate-limit, allowlist, logs de auditoría) se rompe silenciosamente detrás de un proxy si el framework no está configurado para confiar en él.** En local es imposible de ver; hay que razonar sobre el deploy.

> **Lección:** cada vez que veas `request.ip` usado para seguridad, preguntá "¿hay un proxy adelante y el framework lo sabe?". Es un chequeo de una línea en cualquier framework (Express: `app.set('trust proxy', 1)`, Fastify: `trustProxy: true`).

**Solución:** `Fastify({ logger: false, trustProxy: true, ajv: ... })` para que `request.ip` sea la IP real del visitante (Render setea `X-Forwarded-For`). Verificar después que el rate-limit de login vuelve a ser por visitante (6 intentos desde la misma IP → 429; desde otra → 401).

---

## 🟠 3. El checkout no valida stock ni tope de cantidad: sobreventa ilimitada y overflow de enteros

**Dónde:** `backend/src/shared/schemas.ts:269` (`cantidad: z.number().int().positive()` — sin `.max()`) · `backend/src/modules/orders/service.ts:253-261` (lee `stock` en el `select` pero **nunca lo compara**) · `specs/010-stock-mercadopago/task.md` (las 3 tareas sin marcar: webhook, stock, cartel de error)

**Qué pasa:** cualquier comprador puede pedir 999.999 botellas de un producto con stock 3: el pedido se crea igual, con `total = price × cantidad`. Además:

- `OrderItem.quantity` y `Order.total` son `Int` (32 bits en Postgres). Un `cantidad` de ~2.1 millones con un vino de $1.000 produce un total > 2³¹ y Prisma revienta con un error de base → 500. Es un vector de errores a pedido, público y sin autenticación.
- No hay descuento de stock al aprobar ni restauración al rechazar/expirar (la spec 010 existe pero está sin implementar).

Probado en vivo: cantidad gigante con vino inexistente → `WINE_NOT_AVAILABLE`; con un vino real el pedido se habría creado (no se ejecutó para no ensuciar la base real).

**🔍 Cómo lo encontré:** dos lecturas cruzadas. Primero, el schema del checkout: `cantidad: z.number().int().positive()` — la pregunta de la metodología #4: "¿tiene **máximo** además de mínimo?" → no. Después, `grep stock` en `backend/src`: los resultados mostraron que `stock` aparece en el `select` de `crearPedido` (`service.ts:255`) y **en ningún otro lado del flujo de pedidos** — se lee y no se usa. Un dato que se consulta y no se compara es una alarma: ¿para qué lo trajiste? Por último, `specs/010-stock-mercadopago/task.md` tiene las tres tareas con `[ ]` — confirmó que la funcionalidad está planeada y no implementada.

El overflow de `Int` salió de cruzar dos datos: `quantity Int` en `schema.prisma` + cantidad sin tope = "¿cuánto falta para pasar 2.147.483.647?" → con `$1.000 × 2,2 millones` alcanza.

> **Lección:** en todo input numérico que se multiplica (cantidad × precio), chequeá el tope del input **y** el tope del tipo de dato donde se guarda. Y cuando una spec/carpeta existe (`010-stock`), mirá sus `task.md`: lo que está sin marcar es lo que falta — y suele ser donde están los agujeros.

**Solución:** (1) `cantidad: z.number().int().positive().max(100)` en `checkoutItemSchema` y `items.max(20)`. (2) En `crearPedido`, rechazar con 400 si `cantidad > stock`. (3) Implementar la spec 010: descontar stock **al aprobar la webhook** (con `updateMany` condicional `WHERE stock >= cantidad`, atómico como ya hace `aplicarPago`) y restaurar al expirar/rechazar. (4) Mostrar "sin stock" en la tienda cuando `stock === 0`.

---

## 🟠 4. Credenciales reales de producción en `backend/.env`, sincronizado a la nube (OneDrive)

**Dónde:** `backend/.env:7-8` (Neon con password real), `:39-41` (`SEED_ADMIN_PASSWORD` y las otras dos), `:54` (`NAVE_CODIGO_COBRO`). *(Los valores se redactaron de este informe para no commitearlos.)*

**Qué pasa:** el archivo **no** está en git (bien, `.gitignore` lo cubre), pero el proyecto vive en `C:\Users\manun\OneDrive\...`, así que el `.env` con la contraseña real de la base de datos de producción y las tres contraseñas del panel se está **sincronizando en texto plano a OneDrive** y a cualquier dispositivo donde esté abierta esa cuenta. Un acceso a la cuenta de Microsoft (o a un backup, o a una notebook compartida) es acceso total a la base y al panel.

**🔍 Cómo lo encontré:** paso de reconocimiento estándar, antes de leer una sola línea de código: `Get-ChildItem -Filter ".env*" -Force -Recurse` en la raíz del proyecto. Encontrado `backend/.env`, se hicieron dos verificaciones: (1) `git ls-files | Select-String "\.env"` → solo aparecen los `.env.example`, o sea que el real no está trackeado (bien); (2) lectura del contenido → connection strings con password real y claves del panel. La última pieza fue **mirar la ruta del propio proyecto**: `C:\Users\manun\OneDrive\Escritorio\Dev` — la carpeta de OneDrive. El secreto está "bien guardado" para git y "mal guardado" para la nube de archivos.

> **Lección:** la checklist de secretos tiene tres preguntas, no una: ¿está en el repo? ¿está en el historial de git? ¿y **dónde más vive el archivo** (nube de sincronización, backups, otra PC)? Un `.gitignore` correcto solo responde la primera.

**Solución:** (1) sacar el proyecto de OneDrive o excluir `backend/.env` de la sincronización. (2) **Rotar ya** la contraseña de Neon y las tres del panel (hay que tratarlas como comprometidas: estuvieron en una carpeta sincronizada). (3) En producción, que los valores vivan solo en las variables de entorno del proveedor (Render/Vercel), no en archivos. (4) Considerar un gestor de secretos local (1Password CLI, direnv con cifrado) en vez de `.env` plano.

---

## 🟠 5. Dependencias con vulnerabilidades conocidas (5 altas + 2 moderadas en backend, 1 alta en frontend)

**Dónde:** `backend/package.json` y `package.json` (salida de `npm audit --omit=dev`)

**Qué pasa:**

- **`fastify@4.25.x`** — múltiples CVEs altas: DoS por memoria sin cota en `sendWebStream`, bypass de validación de body vía tab en `Content-Type`, spoofing de `request.protocol/host` por `X-Forwarded-*` (se combina con la vuln. 2), bypass de validación de schemas, bypass de autenticación por URLs malformadas, entre otras.
- **`@fastify/static` (vía `@fastify/swagger-ui`)** — bypass de autorización por paths no canónicos y path traversal.
- **`sharp`** — CVEs en libvips y libheif: es justo la librería que procesa las imágenes que sube el usuario en `/api/upload`.
- **`fast-uri`** — moderadas (spoofing de scheme/host).
- **`zod@4.6.5` (frontend)** — alta: agotamiento de memoria validando colecciones con restricciones (`GHSA-mrhx-c7xc-m3w5`).

**🔍 Cómo lo encontré:** el paso más mecánico de todos: `npm audit --omit=dev` en `backend/` y en la raíz. El trabajo real no es correrlo — es **mapear cada advisory al uso concreto del proyecto**: no es lo mismo "sharp tiene CVEs" en abstracto que darse cuenta de que `sharp` es la librería que procesa los archivos que un usuario sube en `/api/upload`, o sea que esas CVEs son **alcanzables por un atacante** (admin/gestor con token, en este caso). Ese cruce ("¿quién puede llegar a este código vulnerable?") es lo que convierte una lista de advisories en prioridades.

> **Lección:** `npm audit` se corre siempre, en cada `package.json` del repo (acá había dos, y los resultados eran distintos). Y cada advisory se lee con la pregunta "¿qué input controlado por un atacante llega a esta librería?".

**Solución:** `npm audit fix` donde no rompa; actualizar `fastify` a la última 4.x parcheada (o planificar el salto a 5.x con `--force`, que es breaking), `@fastify/swagger-ui` a ≥ 6.1.2, `sharp` a la última, y `zod` del frontend a ≥ 4.6.6. Re-correr las suites de tests después (el proyecto tiene 326 tests de backend justamente para esto).

---

## 🟡 6. Inyección de fórmulas en la exportación CSV (CSV injection)

**Dónde:** `src/utils/csv.ts:33-46` (`escaparCsv`)

**Qué pasa:** el escape cubre comas, comillas y saltos de línea, pero **no** las celdas que empiezan con `=`, `+`, `-` o `@`. Un comprador puede llenar el checkout público con nombre `=HYPERLINK("https://evil.com/robar","click")` o `=cmd|'/c calc'!A1`; eso se guarda tal cual en `Customer.name`. Cuando el admin exporta pedidos o clientes a CSV y lo abre en Excel, la celda se ejecuta como fórmula: phishing dentro de la planilla o incluso ejecución de comando en la máquina del admin (el clásico DDE de Excel). El comprador no necesita cuenta: es el flujo público de checkout.

**🔍 Cómo lo encontré:** se leyó `escaparCsv` con la pregunta "¿qué caracteres son peligrosos **para el programa que abre el archivo**, no para el formato?". El escape resuelve los problemas del *formato CSV* (comas, comillas, saltos) pero no los del *intérprete* (Excel/LibreOffice tratan `=`, `+`, `-`, `@` como fórmula). Después se trazó la cadena de procedencia del dato: `checkout público (nombre)` → `Customer.name` → export CSV del admin. Los tres eslabones existen, así que la cadena es explotable de punta a punta — y el eslabón inicial **no requiere login**.

> **Lección:** todo export (CSV, Excel, hasta "copiar al portapapeles") se revisa con la pregunta "¿qué pasa si este dato lo escribió un atacante y lo abre otro programa?". La regla técnica es corta: celdas que empiecen con `= + - @` se neutralizan con un `'` delante.

**Solución:** en `escaparCsv`, si el texto empieza con `=`, `+`, `-`, `@` (o tab/CR), prefijarlo con una comilla simple (`'`) antes de decidir el entrecomillado. Una línea: `if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}``.

---

## 🟡 7. La webhook acepta firmas viejas: no hay ventana de frescura del timestamp (replay)

**Dónde:** `backend/src/modules/orders/firma.ts:72-94`

**Qué pasa:** `verificarFirmaWebhook` valida el HMAC de `id;request-id;ts;` pero **nunca mira qué tan viejo es `ts`**. Una notificación legítima capturada (de un log, de un proxy, de un replay propio de Mercado Pago) puede reenviarse indefinidamente y la firma sigue siendo válida. La idempotencia por `updateMany` limita el daño de duplicados, pero un replay de una notificación vieja puede revertir estados posteriores: el `WHERE pagoEstado <> destino` permite volver atrás — un `pendiente` viejo reenviado tras un `aprobado` **degrada el pedido a pendiente** y el cron lo expira después.

**🔍 Cómo lo encontré:** al auditar una verificación de firma, hay una checklist de tres preguntas: (1) ¿la firma cubre el contenido? ✔ (el manifest incluye `id`, `request-id`, `ts`); (2) ¿la comparación es en tiempo constante? ✔ (`timingSafeEqual`, con guarda de longitud — muy bien); (3) **¿qué impide reenviar un mensaje ya firmado?** ✘ — y ahí está el agujero: el `ts` se firma pero no se *usa*. Firmar el timestamp sin verificarlo es decoración. La segunda mitad del hallazgo salió de dibujar la **máquina de estados** de `pagoEstado` y preguntar "¿qué transiciones permite el `WHERE`?" → todas menos "quedarse igual", incluidas las que van hacia atrás.

> **Lección:** firmar ≠ autenticar en el tiempo. Toda firma con timestamp necesita una ventana (`|ahora - ts| < 5 min`). Y los `updateMany` condicionales se auditan preguntando qué transiciones *prohíben*, no solo cuáles permiten.

**Solución:** rechazar con 401 cualquier `ts` que difiera del reloj del servidor en más de 5 minutos (`Math.abs(Date.now()/1000 - Number(ts)) > 300`). Además, endurecer `aplicarPago` para no permitir transiciones "hacia atrás" (`aprobado`/`rechazado` son terminales: solo transicionar desde `no_iniciado`/`pendiente`).

---

## 🟡 8. La aprobación no compara el monto pagado contra el total del pedido

**Dónde:** `backend/src/modules/orders/service.ts:183-240` (`aplicarPago` lee `remoto.monto` pero nunca lo compara con `pedido.total`)

**Qué pasa:** si Mercado Pago reporta `approved`, el pedido pasa a `aprobado` y se le suma `Order.total` al `Customer` — aunque el `transaction_amount` real sea menor (pago parcial, que existe con medios como QR/efectivo). Es latente hoy por la vuln. 1 (nada se aplica), pero en cuanto se arregle el lookup, esta puerta queda abierta.

**🔍 Cómo lo encontré:** el patrón "dato que se pide y no se usa". `estadoDe()` devuelve `EstadoPagoRemoto` con `monto: number` — la interfaz se molestó en traerlo — y sin embargo `aplicarPago` solo lee `remoto.estado`. La pregunta fue: "¿por qué esta estructura trae el monto si nadie lo mira? ¿qué chequeo *debería* existir acá?". En pagos, la regla mental es: **estado aprobado + monto correcto** son dos hechos distintos y hay que verificar los dos.

> **Lección:** cuando una interfaz expone un dato financiero y el consumidor lo ignora, casi siempre falta una validación. Revisá los tipos de retorno buscando campos sin usar.

**Solución:** en `aplicarPago`, si `destino === 'aprobado'`, exigir `remoto.monto >= pedido.total`; si no, marcar el pedido con un estado/flag de revisión y no acreditar nada al `Customer`.

---

## 🟡 9. Las `back_urls` de Mercado Pago apuntan a la API, no a la tienda: el comprador vuelve a un 404

**Dónde:** `backend/src/modules/orders/service.ts:38` (`origenPublico = () => process.env.PUBLIC_API_URL`) · `docs/DEPLOY.md:142` (`PUBLIC_API_URL=https://<tu-api>.onrender.com`)

**Qué pasa:** `exito/fallo/pendiente` se arman como `${PUBLIC_API_URL}/?pago=...`, y `PUBLIC_API_URL` es la URL **del backend** (la usa Swagger como `server`). Tras pagar, Mercado Pago redirige al comprador a `https://api...onrender.com/?pago=aprobado`, que es un JSON 404 de Fastify, no la tienda. La confirmación del frontend (que lee `?pago=` y el `sessionStorage`) **nunca se muestra**. Además `backend/.env` ya tiene `FRONTEND_ORIGIN=http://localhost:5173`, pero `env.ts` **no la declara** en su schema, así que nadie puede usarla.

**🔍 Cómo lo encontré:** `grep PUBLIC_API_URL` en todo el proyecto, anotando cada uso. Uno de ellos (`origenPublico()`) alimenta las `back_urls` — las URLs a las que **vuelve un ser humano** después de pagar. La pregunta fue: "¿a dónde aterriza el comprador con esta URL?". Para responderla no hizo falta ejecutar nada: `docs/DEPLOY.md:142` dice que `PUBLIC_API_URL=https://<tu-api>.onrender.com` (la API), y la API no sirve HTML. El segundo hallazgo (la variable `FRONTEND_ORIGIN` huérfana) salió de comparar el `.env` contra el schema de `env.ts`: existe en el archivo, no existe en el schema — una variable que alguien creó para esto y nunca se conectó.

> **Lección:** toda URL que se le entrega a un tercero (pasarela, email, OAuth) se audita preguntando "¿qué ve la persona que aterriza ahí?". Y compará los `.env` contra los schemas de validación: las variables huérfanas delatan features a medio conectar.

**Solución:** declarar `FRONTEND_ORIGIN: z.string().url()` en `env.ts` y usarla para las `back_urls` (`${env.FRONTEND_ORIGIN}/?pago=aprobado`, etc.). La `notification_url` debe seguir siendo la de la API. Cargar la variable en producción con la URL de Vercel.

---

## 🟡 10. Spam de pedidos falsos: el endpoint público no tiene verificación anti-bot

**Dónde:** `backend/src/modules/orders/routes.ts:95-120`

**Qué pasa:** `POST /api/orders` es público (por diseño: el comprador no tiene cuenta) y la única defensa es el rate-limit global — que encima está roto en producción (vuln. 2). Un bot puede crear pedidos falsos con emails inventados: llena el panel de pedidos `no_iniciado`, contamina el CRM (`Customer` se crea siempre), infla las métricas de actividad reciente y gasta Preferences de Mercado Pago. El cron los expira a los 10 minutos, pero el ruido y las fichas de clientes falsas quedan.

**🔍 Cómo lo encontré:** directo de la metodología #2: con el inventario de endpoints públicos en la mano, la pregunta para cada uno fue "¿qué escribe en la base un request sin autenticación?". Para `POST /api/orders` la respuesta es: una `Order`, sus `OrderItem` y un `Customer` nuevo (o actualiza el teléfono de uno existente — otro detalle: cualquiera puede pisar el teléfono de cualquier cliente sabiendo su email). Escribir en la base sin auth ni verificación humana es la definición de spam vector.

> **Lección:** para cada endpoint público de escritura, listá qué filas crea/modifica y qué trabajo externo dispara (acá: crear una Preference en Mercado Pago — una llamada paga y rate-limited por MP). Si la respuesta no te gusta, falta defensa (rate-limit por ruta, honeypot, captcha, o crear datos solo tras el pago).

**Solución:** rate-limit específico más estricto para esta ruta (p.ej. 10/min/IP), honeypot en el formulario del checkout (campo oculto que si viene lleno se rechaza silenciosamente), y/o Turnstile/reCAPTCHA si el volumen de ataque lo justifica. Considerar no crear el `Customer` hasta que el pago se concrete.

---

## 🟡 11. Mass-assignment en alta/edición de productos: el body va crudo a Prisma

**Dónde:** `backend/src/modules/products/routes.ts:110` y `:125` (`prisma.product.create/update({ data: request.body as any })`)

**Qué pasa:** el schema AJV valida los campos conocidos, pero JSON Schema por defecto **permite propiedades adicionales** y Fastify no las recorta (`ajv: { strict: false }` sin `removeAdditional`). Un admin/gestor (o quien robe su token) puede mandar campos fuera del schema — por ejemplo `createdAt` arbitrario — directo a Prisma. Con campos desconocidos Prisma devuelve 500 (ruido), pero con campos válidos no declarados los escribe sin validación. Es una superficie innecesaria en un endpoint que ya tiene schema Zod (`productoCreateSchema`).

**🔍 Cómo lo encontré:** grep de la bandera roja por excelencia: `as any` en los handlers. Cada aparición se revisa con la pregunta "¿qué validación se está salteando este cast?". En `products/routes.ts` el cast esconde que **nadie** transforma `request.body` antes de Prisma: el schema solo se usa como filtro de entrada (AJV), no como whitelist. La pieza técnica final fue saber (y verificar en `app.ts:96`) que el AJV de este proyecto corre sin `removeAdditional`, así que las propiedades extra **pasan**. Bonus: el mismo archivo ya tiene el ejemplo correcto — el import de CSV sí usa `productoImportSchema.safeParse` antes de tocar la base.

> **Lección:** `as any` en la frontera HTTP→DB es casi siempre un hallazgo. Y hay que conocer el comportamiento por defecto de tu validador con claves extra: Zod *strip*, JSON Schema *allow*, Fastify *no recorta*. Combinaciones distintas dan resultados opuestos.

**Solución:** parsear con Zod en el handler en vez de `as any`: `const data = productoCreateSchema.parse(request.body)` (Zod por defecto *strip* las extra) y pasar `data` a Prisma. Ídem para `update` con `productoUpdateSchema`. El CSV import ya lo hace bien (`productoImportSchema.safeParse`).

---

## 🟡 12. `env.ts` tiene contenido corrupto inyectado (restos de un chat, con ruta local de otra PC)

**Dónde:** `backend/src/config/env.ts:198-199`

**Qué pasa:** dentro del comentario JSDoc final quedó pegado texto de una conversación — `siTL;DR: pasame lo que sigue del proyecto y seguimos<tool_call><invoke name="edit"><path>C:\Vinoteca\Vinoteca-1\backend\src\config\env.ts</path>...` — incluyendo una ruta absoluta de **otro proyecto** (`C:\Vinoteca\Vinoteca-1`). Casualmente el texto quedó dentro del comentario y el archivo compila (el cierre `*/` del bloque duplicado cierra el comentario original), pero es: (a) integridad del código rota — hay basura ininteligible en un archivo de configuración crítico; (b) fuga de información menor (estructura de directorios de tu máquina) commiteada al repo; (c) señal de que una edición automatizada salió mal y nadie lo revisó (ver gotcha 40 de `AGENTS.md`).

**🔍 Cómo lo encontré:** leyendo el archivo completo, de punta a punta — `env.ts` es de los archivos que hay que leer enteros en cualquier auditoría porque define qué secretos existen. El comentario final dejaba de ser español coherente: `siTL;DR: pasame lo que sigue...` seguido de XML de herramientas. Se confirmó con `Select-String -Pattern "TL;DR|tool_call|pasame"` que solo estaba ahí, y leyendo los bytes crudos del final del archivo se vio que la estructura seguía siendo sintácticamente válida por accidente (la basura quedó dentro de un bloque `/* */`).

> **Lección:** leé los archivos de configuración **completos**, no por encima. La corrupción por ediciones automatizadas no tira errores si cae dentro de un comentario — solo se ve con los ojos (o con un `git diff` revisado antes de commitear, que es la defensa real).

**Solución:** limpiar el bloque: dejar el comentario original terminando en `...preferible eso a no avisar nunca. */` seguido del `if (env.NODE_ENV !== 'production' ...)`, y borrar todo el texto inyectado. `git diff` para confirmar que solo se va eso.

---

## 🟡 13. Swagger UI expuesta en producción

**Dónde:** `backend/src/plugins/index.ts:79-82` · verificado en vivo: `GET /api/docs/` → 200

**Qué pasa:** `/api/docs/` publica el mapa completo de la API (rutas, schemas, parámetros, esquemas de seguridad) a cualquiera, sin autenticación. No es una vulnerabilidad por sí sola, pero le regala a un atacante el reconocimiento completo: sabe exactamente qué endpoints probar, qué campos aceptan y cuáles son públicos.

**🔍 Cómo lo encontré:** dos pasos. Primero, leer `plugins/index.ts` y notar que `swaggerUI` se registra **incondicionalmente** — no hay un `if (env.NODE_ENV !== 'production')` alrededor. Segundo, verificarlo con el servidor corriendo: `curl -s -o NUL -w "%{http_code}" http://localhost:3000/api/docs/` → `200`. La pregunta general es: "¿qué rutas de desarrollo/debug quedaron encendidas en todos los entornos?" — Swagger, `/health` detallado, endpoints de seed, etc.

> **Lección:** buscá registros de plugins/rutas sin guarda de entorno, y después **pedilas con curl**. Lo que responde 200 sin credenciales es superficie de reconocimiento para un atacante.

**Solución:** registrar `swagger`/`swagger-ui` solo si `env.NODE_ENV !== 'production'` (o protegerlos con el mismo `requireRole('admin')`). La spec OpenAPI ya está en el repo; no hace falta servirla desde producción.

---

## ⚪ 14. Refresh token: sin detección de reuso ni revocación en familia, y cookie con `path: '/'`

**Dónde:** `backend/src/modules/auth/service.ts:75-88` · `backend/src/modules/auth/routes.ts:38`

**Qué pasa:** la rotación borra el token viejo al usarlo (bien), pero si un atacante roba un refresh token y lo usa **antes** que la víctima, la víctima simplemente queda deslogueada en su próximo refresh — sin que se revoque la cadena comprometida: el atacante conserva un token válido por 7 días. Además la cookie viaja con `path: '/'`, así que se envía a **todas** las rutas de la API (cada request de la tienda la arrastra), ampliando la superficie de robo (logs, proxies) sin necesidad.

**🔍 Cómo lo encontré:** "caminar" el ciclo de vida del token haciéndose preguntas de atacante en cada paso: emisión (`randomBytes(32)`, hasheado en base ✔) → uso (rotación: borra el viejo ✔) → **robo**: "si yo uso el token robado primero, ¿qué detecta el sistema?" → nada: el `delete` del viejo no distingue "rotación legítima" de "reuso de un token ya rotado", y no hay `familyId` que permita revocar la cadena entera. El hallazgo del `path` salió de leer `opcionesCookie()` completo y preguntar "¿a qué rutas viaja esta cookie?" → a todas, cuando solo la necesitan tres endpoints de `/api/auth`.

> **Lección:** para auditar sesiones, dibujá el ciclo de vida del token (emisión → renovación → logout → robo) y jugá el escenario del robo en cada transición. Y las cookies de refresh siempre con el `path` más corto posible.

**Solución:** (1) implementar *reuse detection*: guardar `familyId` por cadena de tokens; si llega un refresh con un `tokenHash` que ya fue rotado, borrar **todos** los refresh tokens del usuario (compromiso detectado). (2) `path: '/api/auth'` en `opcionesCookie` (y en el `clearCookie`, que debe coincidir exactamente — como ya documenta el comentario del archivo).

---

## ⚪ 15. Script con credencial hardcodeada (`admin123`) apuntando a producción

**Dónde:** `scripts/armar-ca06.mjs:18,23-24`

**Qué pasa:** el script hace login contra `https://vinoteca-cava.onrender.com` (default) con `admin@vinoteca.local` / `admin123` **escrito en el código y commiteado**. Otros scripts (`verificar-logins.mjs`) ya leen de `backend/.env`; este quedó viejo. Implica además que en algún momento producción pudo tener la clave de desarrollo. Si ese login funciona hoy, la cuenta admin de producción tiene la contraseña por defecto — eso sería crítico.

**🔍 Cómo lo encontré:** grep de literales con forma de credencial en todo el repo, no solo en `src`: `grep -i "password|token|secret|clave"` sobre `scripts/`. Saltó `const CLAVE = 'admin123'` junto a `const API = ... 'https://vinoteca-cava.onrender.com'`. La comparación con el script vecino (`verificar-logins.mjs`, que sí lee del `.env`) confirmó que este quedó desactualizado — la inconsistencia entre dos scripts que hacen lo mismo es la pista.

> **Lección:** los greps de secretos corren sobre **todo** el repo: scripts, tests, docs, configs de CI. Los scripts "de una vez" son el lugar favorito donde quedan credenciales, porque se escriben rápido y nadie los revisa.

**Solución:** (1) verificar **ya** que `admin123` no entra en producción (un POST al login alcanza). (2) Reescribir el script para leer `SEED_ADMIN_PASSWORD` de `backend/.env` como hace `verificar-logins.mjs`, y borrar el literal del historial si se quiere ser estricto (aunque `admin123` es la clave dev documentada, no un secreto real).

---

## ⚪ 16. CSRF en los endpoints de cookie (`/api/auth/refresh`, `/api/auth/logout`)

**Dónde:** `backend/src/modules/auth/routes.ts:33-39` (`sameSite: 'none'` en producción)

**Qué pasa:** con `SameSite=None` (necesario por el cross-site Vercel↔Render), un sitio malicioso puede disparar `fetch(..., { credentials: 'include' })` al refresh/logout con la cookie de la víctima. No puede leer la respuesta (CORS lo bloquea), pero sí puede **desloguear** a la víctima o rotarle el refresh token. Impacto bajo (molestia, no toma de cuenta), pero es evitable.

**🔍 Cómo lo encontré:** la regla automática: `SameSite=None` + `credentials: 'include'` en el cliente + endpoints que cambian estado = "¿dónde está la defensa CSRF?". Se leyeron los tres endpoints de cookie buscando verificación de `Origin`/`Sec-Fetch-Site` o token CSRF → no hay. El análisis de impacto (por qué es baja y no media) salió de razonar qué puede *leer* el atacante: nada, porque CORS no refleja su origen — solo puede *disparar* acciones.

> **Lección:** `SameSite=None` desactiva la defensa anti-CSRF que el navegador daba gratis con `Lax`. Cada endpoint autenticado por cookie necesita recuperarla a mano (Origin check o token CSRF). Y evaluá impacto separando "puede disparar" de "puede leer".

**Solución:** en los tres endpoints de cookie, exigir que el header `Origin` (o `Sec-Fetch-Site`) coincida con `CORS_ORIGIN`; rechazar con 403 si no. Fastify lo da gratis con un `preHandler` de 5 líneas.

---

## ⚪ 17. Enumeración de usuarios por timing en el login

**Dónde:** `backend/src/modules/auth/service.ts:67-72`

**Qué pasa:** `bcrypt.compare` solo corre si el email existe; para un email inexistente la respuesta sale varios milisegundos antes. El mensaje es el mismo (`INVALID_CREDENTIALS`, bien), pero el tiempo revela qué emails están registrados. Los tres emails del panel además son predecibles (`admin@`, `gestor@`, `vendedor@vinoteca.local`).

**🔍 Cómo lo encontré:** leer la condición del login con el ojo puesto en el `||`: `if (!user || !(await bcrypt.compare(...)))`. El cortocircuito de JavaScript hace que `bcrypt.compare` (que tarda ~100 ms a propósito) **solo** se ejecute cuando el usuario existe. Dos caminos con tiempos medibles distintos = oráculo de enumeración, aunque el mensaje de error sea idéntico. Es el patrón "el secreto se cuidó en el texto y se filtró en el reloj".

> **Lección:** en auth, no alcanza con igualar el *mensaje* de error: hay que igualar el *trabajo*. Cualquier `if (existe) { operación costosa }` en una ruta de login es un oráculo de timing.

**Solución:** comparar siempre contra un hash dummy (`bcrypt.compare(password, DUMMY_HASH)`) cuando el usuario no existe, para igualar el tiempo de respuesta. Cambiar los emails del seed a algo no enumerable (p.ej. con el dominio real del negocio) reduce la superficie aún más.

---

## ⚪ 18. PostgreSQL con credenciales débiles y puerto expuesto (docker-compose)

**Dónde:** `docker-compose.yml:6-8` (`vinoteca`/`vinoteca`, `ports: 5432:5432`)

**Qué pasa:** para desarrollo local es aceptable, pero la contraseña `vinoteca/vinoteca` y el puerto publicado a `0.0.0.0:5432` exponen la base a cualquier dispositivo de la red local (un WiFi compartido alcanza).

**🔍 Cómo lo encontré:** lectura directa del compose con dos preguntas mecánicas: (1) ¿hay passwords por defecto? → `POSTGRES_USER/PASSWORD: vinoteca/vinoteca`; (2) ¿el `ports:` bindea a dónde? → `'5432:5432'` sin IP delante significa **todas las interfaces** (`0.0.0.0`), no solo localhost. Son las dos primeras líneas que se miran en cualquier compose.

> **Lección:** en `ports:`, la forma `5432:5432` publica al mundo LAN; `127.0.0.1:5432:5432` publica solo a tu máquina. Un carácter de prefijo hace la diferencia.

**Solución:** publicar solo en loopback: `ports: ['127.0.0.1:5432:5432']`, y/o contraseña distinta vía `${POSTGRES_PASSWORD:-vinoteca}` documentada como "solo dev". Nunca reutilizar este compose para algo público.

---

## ⚪ 19. El frontend se sirve sin headers de seguridad

**Dónde:** `vercel.json` (no declara `headers`)

**Qué pasa:** la tienda en Vercel sale sin `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, etc. (el backend sí los tiene vía helmet — verificado en las sondas). Sin CSP, cualquier XSS futuro (hoy no hay `dangerouslySetInnerHTML`, pero el catálogo viene de datos editables por el admin) tiene vía libre; sin `X-Frame-Options`/`frame-ancestors`, la tienda se puede embeber en un iframe para clickjacking del checkout.

**🔍 Cómo lo encontré:** leer `vercel.json` entero (son 6 líneas) y notar lo que **falta**: solo hay `rewrites`, no hay `headers`. La comparación útil fue: el backend tiene helmet (y las sondas mostraron `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, etc. en sus respuestas), así que la mitad del sistema está endurecida y la otra no. Para verificarlo en producción bastaría `curl -sI https://<tu-app>.vercel.app` y mirar qué headers de seguridad **no** aparecen.

> **Lección:** los headers de seguridad se auditan por ausencia: `curl -sI` al frontend y al backend, y comparar contra la lista básica (CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, HSTS). Lo que falta es el hallazgo.

**Solución:** agregar a `vercel.json` un bloque `headers` con al menos: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (o CSP `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, y una CSP restrictiva que permita los dominios necesarios (Mercado Pago, R2 para imágenes, la API con `connect-src`).

---

## ⚪ 20. `chrome-devtools-mcp` como dependencia de producción del frontend

**Dónde:** `package.json:25` (está en `dependencies`, no en `devDependencies`)

**Qué pasa:** una herramienta de debugging/MCP instalada como dependencia runtime: agranda el árbol de instalación, amplía la superficie de supply-chain (todo lo que ella depende entra al `node_modules` de CI/deploy) y no cumple ninguna función en la app.

**🔍 Cómo lo encontré:** leer la lista de `dependencies` del `package.json` raíz preguntando para cada una: "¿el código de `src/` la importa?". `chrome-devtools-mcp` es visiblemente una herramienta de agente/debug, no algo que una tienda importe en runtime — y un `grep chrome-devtools` en `src/` confirma que nada la usa. Todo lo que está en `dependencies` y no se importa es peso muerto **con riesgo**: sus dependencias transitivas se instalan igual en CI y producción.

> **Lección:** `dependencies` vs `devDependencies` no es burocracia: define qué llega al build de producción y qué superficie de supply-chain tenés. Cada dependencia se justifica con un `import` en el código.

**Solución:** moverla a `devDependencies` (o desinstalarla si no se usa): `npm uninstall chrome-devtools-mcp && npm install -D chrome-devtools-mcp`.

---

## ⚪ 21. Catálogo público sin paginación

**Dónde:** `backend/src/modules/products/public-routes.ts:7-36`

**Qué pasa:** `GET /api/products/public` devuelve **todos** los productos activos en una sola respuesta, sin límite ni cache headers. Con el catálogo actual (12 productos) no es problema, pero con miles de productos es una query y un JSON gigante por visitante, amplificado por el rate-limit roto (vuln. 2): un vector de DoS barato.

**🔍 Cómo lo encontré:** comparación de hermanos. El listado admin (`products/routes.ts:54-101`) tiene `page`/`limit` con `max(100)`; el público, que atiende a todo internet, no tiene `take` ni `limit`. El patrón de búsqueda es: `findMany` **sin `take`** en cualquier ruta pública. La pregunta de escalado es siempre: "¿qué pasa con esta respuesta cuando la tabla tenga 10.000 filas y 1.000 bots la pidan?".

> **Lección:** las rutas públicas se comparan contra sus equivalentes autenticadas: si la privada tiene paginación y la pública no, la defensa está al revés. Todo `findMany` sin `take` en superficie pública es un hallazgo en espera.

**Solución:** paginar como el resto de los listados (`page`/`limit` con `limit ≤ 100`) o, si la tienda necesita todo de una, agregar `Cache-Control: public, max-age=60` y un límite duro en el `take`.

---

## ⚪ 22. Bugs menores de consistencia (no son vulnerabilidades, pero rompen la confianza en la API)

**Dónde:** varios

- `PATCH /api/orders/:id`: el schema acepta `customerName` y `shippingAddress`, pero el handler (`orders/routes.ts:272-280`) **solo aplica `status`** — los otros campos se ignoran en silencio (un gestor cree que editó la dirección y no pasó nada).
- `DELETE /api/upload/:id`: `S3 DeleteObject` no falla si la clave no existe, así que el `catch → 404` (`upload/routes.ts:107`) es código muerto: borrar un id inventado devuelve 204 igual.
- `salesByDay` (`metrics/routes.ts:6-25`) trae **todas** las órdenes de 30 días a memoria para sumarlas en JS; con volumen crece sin cota (usar `groupBy` en la base).

**🔍 Cómo lo encontré:** tres técnicas distintas, una por caso. (1) **Diff schema vs handler:** se listaron los campos que `orderUpdateSchema` declara y se compararon contra los que el handler aplica — el contrato promete lo que el código no cumple. (2) **Conocer la semántica del SDK:** `DeleteObject` de S3 es idempotente por diseño (devuelve éxito aunque la clave no exista), así que un `try/catch` para detectar "no encontrado" es código muerto — se detecta sabiendo cómo se comporta el servicio, no leyendo más código. (3) **Buscar "traer todo y computar en JS":** `findMany` seguido de un `reduce`/`map` de agregación es una query que debería ser `groupBy`/`aggregate` en la base.

> **Lección:** los contratos se auditan de los dos lados: lo que el schema *acepta* tiene que ser lo que el handler *usa*. Y para servicios externos (S3, SDKs), la semántica del servicio es parte del código — hay que conocerla.

**Solución:** (1) sacar `customerName`/`shippingAddress` del schema o aplicarlos en el `update`. (2) Antes del delete, `HeadObject` para 404 real (o aceptar la idempotencia y devolver siempre 204 a propósito). (3) Reemplazar el fetch+reduce por `prisma.order.groupBy({ by: ['createdAt'], _sum: { total: true } })` con `Trunc` en SQL.

---

# Resumen de prioridades

| # | Severidad | Arreglar |
|---|-----------|----------|
| 1 | 🔴 | **Hoy**: la webhook no aplica ningún pago (preference id ≠ payment id) |
| 2 | 🔴 | **Hoy**: `trustProxy: true` — sin esto el rate-limit es global y el panel se tira con 5 requests |
| 3 | 🟠 | **Esta semana**: stock/cantidad en checkout (spec 010 pendiente) |
| 4 | 🟠 | **Esta semana**: rotar credenciales de Neon/panel y sacar `.env` de OneDrive |
| 5 | 🟠 | **Esta semana**: `npm audit fix` + actualizar fastify/swagger-ui/sharp/zod |
| 6-13 | 🟡 | Próximo sprint: CSV injection, replay de webhook, monto, back_urls, anti-spam, mass-assignment, limpiar `env.ts`, apagar Swagger en prod |
| 14-22 | ⚪ | Backlog de endurecimiento |

---

# Anexo: comandos usados (para repetir la auditoría)

```powershell
# Inventario de superficie
Get-ChildItem -Recurse backend/src -Filter *.ts          # mapa de rutas/módulos
grep -rn "fastify.(get|post|patch|delete)" backend/src   # endpoints (o leer routes.ts)

# Seguir un dato
grep -rn "pagoId" backend/src     # escritura vs lectura -> vuln. 1
grep -rn "stock" backend/src      # leído y nunca usado -> vuln. 3

# Banderas rojas
grep -rn "as any" backend/src/modules            # mass-assignment -> vuln. 11
grep -rn "dangerouslySetInnerHTML|innerHTML|eval(" src/   # XSS (limpio)
grep -rni "password|secret|token|admin123" scripts/       # credenciales -> vuln. 15
Get-ChildItem -Recurse -Force -Filter ".env*"             # secretos -> vuln. 4
git ls-files | Select-String "\.env"                      # ¿trackeado?

# Dependencias
cd backend; npm audit --omit=dev
cd ..; npm audit --omit=dev

# Sondas en vivo (servidor local levantado con tsx src/main.ts)
curl.exe http://localhost:3000/health
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/api/metrics        # 401 sin token
curl.exe -X POST .../api/orders -d @payload-con-precio.json                   # 400 (strict)
curl.exe -X POST .../api/orders/webhook -d @webhook-sin-firma.json            # 503/401
1..7 | % { curl.exe -X POST .../api/auth/login -d @login-malo.json }          # -> 429 al 5to
curl.exe -X OPTIONS .../api/auth/login -H "Origin: https://evil.com" ...      # CORS no refleja
curl.exe .../api/auth/me -H "Authorization: Bearer <jwt alg:none>"            # 401
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/api/docs/          # 200 -> vuln. 13
```
