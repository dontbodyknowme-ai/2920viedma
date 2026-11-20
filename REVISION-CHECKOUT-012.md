# Revisión — Checkout con Nave (spec 012)

| | |
|---|---|
| **Fecha** | 2026-10-28 |
| **Qué se revisó** | `C:\Users\manun\OneDrive\Escritorio\Dev\Clon-checkout-mp` — rama `main`, base `c7ec33f`, 22 modificados + 6 untracked, 1776 inserciones |
| **Contra qué** | `specs/012-pagos/{spec,plan,task}.md` de `2920viedma` + convenciones de `AGENTS.md` |
| **Resultado** | **Mergeable con 2 correcciones obligatorias antes de desplegar.** El código está bien pensado y los tests muerden; los problemas son de *defaults de producción* y de un detalle del simulador, no de arquitectura. |
| **Estado al 2026-10-28** | **F1–F10, F12 y F13 corregidos en el clon** (sin commitear). F11 no era un bug. Queda el *backfill* de la migración y las variables de Render. Ver §7. |

---

## 1. Veredicto corto

| | |
|---|---|
| Arquitectura | ✅ Extiende el stack real. No hay framework nuevo, ni ORM nuevo, ni tabla paralela. |
| Reuso de lo existente | ✅ `ProveedorPagos`, `crearPedido`, `aplicarPago`, `EstadoPago`, pesos enteros, `fetch` de Node 24. |
| Tests | ✅ 378 frontend / 26 archivos y 375 backend / 25 archivos en la revisión original; **379 y 382** después de los arreglos. Verifiqué con sabotaje que no son falsos positivos. |
| Migración | ⚠️ Correcta para base vacía (CI la corre en Postgres 16 real). El *backfill* con filas existentes no está probado en ningún lado. |
| Seguridad del cobro | ✅ **F1 corregido**: `PAGO_MODO` default `transferencia` y el simulador no se registra con `NODE_ENV=production`. |
| Operación en mock | ✅ **F2 corregido**: ids del simulador con UUID, no repiten entre procesos. |

Los detalles de cada arreglo, con su test de regresión y su sabotaje, están en **§7**.

---

## 2. Lo que verifiqué (no lo que me dijeron)

Corrí exactamente los comandos del brief y estos son los resultados reales:

```text
root typecheck        EXIT=0
root lint             EXIT=0
root test             26 archivos · 378 tests passed
root build            OK (vite 8.3.4)
backend typecheck     EXIT=0
backend lint          EXIT=0
backend test          25 archivos · 375 tests passed
```

Además:

- `prisma validate` → **schema válido**.
- `.github/workflows/ci.yml:106` corre `prisma migrate deploy` contra un **Postgres 16 real** en cada push. O sea que la migración escrita a mano **sí se valida**, pero solo desde una base vacía. El camino peligroso (filas ya existentes en Neon) sigue sin probarse.
- `public/mockServiceWorker.js` no está trackeado ni existe: la afirmación es correcta, no hay deleción escondida.
- La migración usa el patrón correcto para `publicToken`: `ADD COLUMN` nullable → `UPDATE` con `gen_random_uuid()` → `SET NOT NULL` → índice único. No rompe con filas existentes en PG 13+.

### Los 8 tests que fallaban antes no eran jsdom

El baseline tenía 8 fallas en `test/checkout_pagina.test.ts`. No era el entorno: los tests hacían `pulsarPorTexto(m, 'Continuar al pago')` y el botón dice **"Finalizar pedido"** desde hace tiempo. `pulsarPorTexto` **tira** si no encuentra el texto, así que esos 8 tests no probaban nada. El agente los reescribió con el label real y ahora miden lo mismo que decían medir. Buena corrección, aunque conviene registrar la causa real (label viejo, no jsdom) para no volver a diagnosticar mal.

### Pruebas de sabotaje (los tests nuevos muerden)

Rompí el código a propósito en tres lugares y corrí los tests; los tres fallaron como correspondía:

| Sabotaje | Test que lo detectó |
|---|---|
| `estadoVisible` de `pedido.tsx` siempre devuelve `pagoEstado` | `un intento vencido no deja la pagina diciendo "esperando"` |
| `compararSecreto(...)` reemplazado por `if (false)` | `sin secreto no se acepta nada` |
| La reutilización del link vigente forzada a `false` | `reutiliza el link vigente en vez de crear otro cobro` |

Árbol restaurado: `git diff --stat` volvió a dar los mismos 22 archivos / 1776 inserciones (en ese momento). La segunda ronda de sabotajes, sobre los arreglos, está en §7.

---

## 3. Hallazgos

### F1 — CRÍTICO · El default de producción es "simulador público que aprueba pagos"

**Dónde:** `backend/src/config/env.ts:133` y `:156`, `backend/src/modules/orders/simulador.ts:75-146`, `backend/src/app.ts:241-248`.

```ts
PAGO_MODO: z.enum([...]).default('nave')     // antes: 'transferencia'
NAVE_MODE: z.enum([...]).default('mock')
```

Con esos dos defaults:

1. Cualquier deploy que **no** tenga `PAGO_MODO` explícito en Render pasa de transferencia a Nave automáticamente al mergear.
2. Como `NAVE_MODE` también default a `mock`, se registra `simuladorRoutes`.
3. `POST /pago-simulado/:id/aprobado` es **público, sin autenticación y sin rate limit**. Llama a `aplicarPago`, que mueve el pedido a `aprobado` e **incrementa `totalOrders` y `totalSpent` del cliente**.
4. Los checkouts reales devuelven links `.../pago-simulado/...`, no un cobro.

O sea: no es solo "no cobra dinero real" como dice `MEMORY.md`; es que **cualquiera que reciba un link de checkout puede marcar su pedido como pagado**. El aviso `logger.warn` no protege de nada.

**Por qué pasó:** se eligió un default cómodo para desarrollo (`mock`) sin una guarda por entorno. El plan §14 pedía justamente lo contrario: "Producción con `PAYMENTS_ENABLED=false`; activar el flag solo después de la compra real de prueba".

**Arreglo mínimo (dos capas):**

```ts
// env.ts — volver al default seguro
PAGO_MODO: z.enum(['transferencia', 'mercadopago', 'nave']).default('transferencia'),
```

```ts
// pagos/nave/index.ts — el mock no existe en producción
if (modo === 'mock') {
  if (process.env.NODE_ENV === 'production') {
    return {
      proveedor: proveedorRoto('NAVE_MODE=mock no esta permitido en produccion'),
      simulador: null,
      problema: 'NAVE_MODE=mock con NODE_ENV=production: no se registra el simulador'
    }
  }
  // ...
}
```

Y en el checklist de deploy: **verificar en Render que `PAGO_MODO` y `NAVE_MODE` estén explícitos antes de mergear**. Si hoy producción no los tiene, este merge le cambia el modo de cobro sola.

---

### F2 — ALTO · Los ids del simulador chocan con `referenciaExterna @unique` tras cada reinicio

**Dónde:** `backend/src/modules/pagos/nave/mock.ts:28,37` + `backend/src/modules/orders/service.ts:372-383`.

```ts
private secuencia = 0
const id = `nave_mock_${this.secuencia}`   // nave_mock_1, nave_mock_2, ...
```

`PaymentAttempt.referenciaExterna` es `@unique`, y el valor se persiste en Neon. El contador del simulador vive en memoria y **vuelve a 1 en cada reinicio**. En Render free el proceso se duerme y se despierta seguido; en cada redeploy también.

Consecuencia: después de reiniciar, el primer checkout crea `nave_mock_1`, intenta guardarlo, choca con la fila de la corrida anterior (P2002), cae en el `catch`, marca el intento `expirado` y devuelve **502**. Y sigue fallando hasta que la secuencia pasa el id más alto ya guardado. Si en QA se hicieron 40 pagos simulados, son 40 checkouts fallidos seguidos.

Esto no es cosmético: hace que el circuito de prueba en Render sea poco confiable justo cuando más se usa.

**Arreglo:**

```ts
import { randomUUID } from 'node:crypto'
const id = `nave_mock_${randomUUID()}`
```

(o `Date.now()` + secuencia; lo importante es que no se repita entre procesos). El `Map` sigue funcionando porque la clave es el id generado.

---

### F3 — MEDIO · `generarCobro` pisa `pagoEstado` sin condición y puede deshacer un pago aprobado

**Dónde:** `backend/src/modules/orders/service.ts:382`.

```ts
await prisma.order.update({
  where: { id: pedido.id },
  data: { pagoEstado: 'pendiente', pagoId: cobro.id }   // incondicional
})
```

`reintentarPago` chequea `pagoEstado === 'aprobado'` **antes** de llamar al proveedor, pero entre ese chequeo y este `update` hay una llamada de red. Si el webhook aprueba el pedido en esa ventana, este `update` lo devuelve a `pendiente` y le pisa el `pagoId`.

El daño no termina ahí: cuando llegue la reentrega del webhook, `aplicarPago` verá `pendiente`, aplicará la transición otra vez y **sumará `totalOrders`/`totalSpent` por segunda vez**. Es exactamente la carrera que D6 y el `updateMany` condicional existen para evitar.

**Arreglo:**

```ts
const { count } = await prisma.order.updateMany({
  where: { id: pedido.id, pagoEstado: { not: 'aprobado' } },
  data: { pagoEstado: 'pendiente', pagoId: cobro.id }
})

if (count === 0) {
  // Se pago mientras creabamos el cobro: no degradar ni pisar pagoId.
  logger.warn({ orderId: pedido.id, cobro: cobro.id }, 'el pedido ya estaba aprobado al crear el cobro')
  throw new AppError('ALREADY_PAID', 409, 'Este pedido ya esta pagado')
}
```

Queda un cobro huérfano en el proveedor (no hay API de cancelación confirmada), pero el pedido no se degrada ni se cuenta dos veces.

---

### F4 — MEDIO · El chequeo de monto es tan confiable como `money.ts`, y hoy `money.ts` es la identidad

**Dónde:** `backend/src/modules/pagos/nave/money.ts:22-25`, `backend/src/modules/orders/service.ts:237`.

```ts
export const aUnidadDeNave = (pesos: number): number => pesos
export const deUnidadDeNave = (monto: number): number => monto
```

Está bien aislado y documentado. El problema es la interacción con la validación de monto:

```ts
if (destino === 'aprobado' && remoto.monto < pedido.total) { ... }
```

Si Nave usa **centavos**, un pago de $100 se informa como `10000` y se compara contra un total de `10000` pesos: **pasa la validación** y el pedido se marca aprobado con el 1 % del dinero. El chequeo protege de menos, no de más.

No es un bug de hoy (no hay cobros reales), pero es la razón concreta para **no habilitar sandbox** hasta confirmar la unidad con la documentación de Nave (T001). Cuando llegue, el cambio es `* 100` / `/ 100` en `money.ts` y agregar un test de ida y vuelta con un valor que no sea múltiplo de 100.

---

### F5 — MEDIO · Gobernanza: `AGENTS.md`, `task.md` y `PAYMENTS_ENABLED` quedaron atrás

**Dónde:** `AGENTS.md` (sin cambios), `specs/012-pagos/task.md` (sin marcar), `plan.md:268,316` (`PAYMENTS_ENABLED`).

- `AGENTS.md` sigue describiendo solo el checkout de Mercado Pago. No menciona `/pedido/:token`, `POST /api/track/:token/pay`, el webhook de Nave, el simulador, `NAVE_MODE` ni el riesgo de F1. La regla del repo es actualizarlo tras cada cambio.
- `task.md` sigue con todo en `[ ]`, aunque T010–T025, T030–T045 y T050–T056 están implementadas. El registro de decisiones queda mintiendo por omisión.
- El plan §10 y §14 y las tareas T073/T074 exigen `PAYMENTS_ENABLED`, que **no existe** en el código. O se implementa (flag que oculta el botón y devuelve 503 en el backend) o se corrige el plan para que el plan de reversa sea `PAGO_MODO=transferencia`. Hoy el rollback existe, pero no es el que el documento promete.

También vale la pena agregar a `AGENTS.md` el gotcha del mock: *"`NAVE_MODE=mock` registra rutas públicas que aprueban pagos; nunca en producción"*.

---

### F6 — BAJO · Falta rate limit en `GET /api/track/:token` y en el webhook de Nave

**Dónde:** `backend/src/modules/orders/routes.ts:284` y `:210`.

El plan §11 pide rate limit en `POST /api/orders`, `/api/track/*` y el webhook. Solo lo tienen `POST /api/orders` y `POST /api/track/:token/pay`. `GET /api/track/:token` consulta la base sin techo y el webhook escribe `WebhookEvent` sin techo (aunque exige el secreto). Copiar el `config.rateLimit` que ya usan las otras dos rutas, con un `max` más alto para el webhook.

---

### F7 — BAJO · `cancelled` de Nave termina contando como `rechazado`

**Dónde:** `backend/src/modules/pagos/nave/status-map.ts:63-66` + `backend/src/modules/orders/service.ts:165`.

`status-map` traduce `cancelled`/`canceled`/`cancelado`/`voided` a `'cancelled'`, y `ESTADO_REMOTO_A_NUESTRO` tiene `cancelled: 'rechazado'`. O sea que una cancelación voluntaria del comprador se guarda como rechazo y ensucia las métricas de intentos fallidos. El comentario de `status-map` dice justamente que "cancelado" no es "rechazado".

No rompe el flujo (`reintentarPago` permite reintentar desde `rechazado`), pero conviene decidir: dejarlo en `pendiente` (no terminal) o agregar un estado propio. Si se elige no terminal, ojo con el loop de reconciliación (F9).

---

### F8 — BAJO · La página dice "el link venció" a los 10 minutos, pero el link vive 30

**Dónde:** `backend/src/modules/orders/cron.ts:35` (`MINUTOS_PARA_EXPIRAR = 10`) + `backend/src/modules/pagos/nave/mock.ts:38` (30 min).

El cron marca el **pedido** `expirado` a los 10 minutos; el intento sigue `pendiente` y su link es válido hasta los 30. La página muestra "El link de pago venció" y **oculta el link** (`mostrarPago` es falso para `expirado`), aunque el link todavía funcione. Un comprador que vuelve al minuto 15 ve que venció y genera otro, o abandona.

Alinear las dos ventanas (o mostrar el link mientras `pago.expiraEn` no haya pasado, con un aviso de "estamos por vencer"). Es copy y una condición, no arquitectura.

---

### F9 — BAJO · La reconciliación vence intentos sin preguntarle al proveedor

**Dónde:** `backend/src/modules/orders/cron.ts:121`.

```ts
const vencidos = await prisma.paymentAttempt.updateMany({
  where: { estado: 'pendiente', expiresAt: { not: null, lt: ahora } },
  data: { estado: 'expirado' }
})
```

Si el cron no corrió durante la ventana del link (Render dormido, deploy), un pago que sí se aprobó pero cuya webhook se perdió queda con el intento `expirado` y **nunca se le pregunta al proveedor**, porque el paso 2 solo mira `estado: 'pendiente'`. El pedido queda colgado hasta que llegue una webhook que ya se perdió.

Sugerencia: antes de vencer, hacer un último `aplicarPago` para los que tienen `referenciaExterna`; o incluir los `expirado` recientes en una pasada de gracia.

---

### F10 — BAJO · `WebhookEvent.processed = false` no lo retoma nadie

**Dónde:** `backend/src/modules/orders/cron.ts` (no consulta `webhookEvent`), comentarios en `routes.ts:246-250` y en `schema.prisma`.

Los comentarios dicen que "la reconciliación lo retoma", pero `reconciliarPagosPendientes` solo lee `PaymentAttempt`. La recuperación funciona **indirectamente** porque el intento sigue `pendiente` y tiene `referenciaExterna`, así que el pago se aplica igual. Pero la afirmación es falsa y `WebhookEvent` crece sin poda. O se implementa la relectura de `processed=false`, o se corrige el comentario y se documenta que la fuente de verdad es el intento.

---

### F11 — BAJO · El proveedor del intento se etiqueta con el env actual, no con el que se usó

**Dónde:** `backend/src/modules/orders/service.ts:350` (`proveedor: env.PAGO_MODO`) y `:597-600`.

`obtenerPedidoPublico` hace lo correcto (usa `ultimo.proveedor`), pero `generarCobro` y `reintentarPago` etiquetan con `env.PAGO_MODO`. Si el comercio cambia de proveedor, un reintento de un pedido viejo queda etiquetado con el proveedor nuevo. No es urgente, pero es una inconsistencia en el dato que después se usa para mostrar el modo.

---

### F12 — BAJO · El copy del checkout promete QR aunque el modo sea transferencia

**Dónde:** `src/pages/checkout.tsx:89,158` y `src/components/checkout/formulario.tsx:194`.

"Al confirmar generamos el link de pago y el QR automáticamente" es cierto con Nave, no con `PAGO_MODO=transferencia` (el modo de rollback). Si el plan de reversa es cambiar a transferencia, el checkout miente en el momento más delicado. Hacer el texto genérico ("Al confirmar te mostramos cómo pagar") o leer el modo desde el backend.

Relacionado: en transferencia, el carrito **ya no se vacía** al confirmar la transferencia (antes se vaciaba con "Entendido"). Ahora solo se vacía con `aprobado`, que en transferencia ocurre cuando alguien del panel marca el pago. Decidir si es lo que se quiere.

---

### F13 — Nits

- `backend/src/modules/orders/routes.ts:13` usa `process.env.PUBLIC_API_URL` en vez de `env.PUBLIC_API_URL` (validado y sin barra final). Si la variable tiene barra final, la URL del webhook sale con `//`.
- `prisma/schema.prisma` termina sin newline (ya pasaba antes, pero el bloque nuevo lo repite).
- `backend/tests/setup.ts` tiene un comentario viejo: *"en 'transferencia'/'nave' no se crea"*. Con la spec 012, `nave` **sí** crea `PaymentAttempt`.
- `AGENTS.md` sigue diciendo "326 tests en 22 archivos" y ahora son 375/25.

---

## 4. Lo que está bien (y conviene no tocar al arreglar)

- **Una sola interfaz pública.** `ClienteNave` quedó adentro de `pagos/nave/`; el resto del sistema sigue hablando `ProveedorPagos`. El adaptador traduce en el borde.
- **`aplicarPago` reusada.** No hay una segunda función de confirmación. La transición condicional sigue siendo un solo `updateMany`, y la webhook de Nave, la reconciliación y el simulador pasan por ahí.
- **Webhook bien hecho:** secreto solo por header, `timingSafeEqual`, 503 si no hay secreto, se guarda el evento **antes** de procesar, y el estado **no** sale del cuerpo.
- **Token público:** UUID v4, `@unique`, separado del `id` interno, y `GET /api/track/:token` no devuelve email, teléfono, dirección ni `orderId`. La referencia corta es `slice(0,8)` del token.
- **`response.schema` completo.** El `items: { type: 'array' }` del track parecía el caso peligroso del gotcha 36, pero el test con `app.inject` real verifica que serializa bien.
- **Migración:** el `publicToken` en tres pasos es el patrón correcto; el resto son tablas nuevas con índices y FK `onDelete: Cascade`.
- **Diagnóstico honesto:** `MEMORY.md` documenta lo que no está probado (T001, mails, idempotencia de dos POST). Eso es exactamente lo que hay que hacer.
- **Tests reales.** Interceptan `fetch`, no el módulo `api`; el 404 por defecto hace que una llamada inesperada se vea. Los sabotajes confirman que muerden.

---

## 5. Checklist antes del merge

Al 2026-10-28, tras los arreglos (§7):

1. [x] **F1** — `PAGO_MODO` default `transferencia` + `crearProveedorNave` no registra el simulador con `NODE_ENV=production` (test + sabotaje).
2. [x] **F2** — ids del simulador con `randomUUID()` (test de reinicio + sabotaje).
3. [x] **F3** — `updateMany` condicional en `generarCobro`, `409 ALREADY_PAID` si el pedido se pagó en la ventana (test de carrera + sabotaje).
4. [x] **F5** — `AGENTS.md`, `MEMORY.md`, `plan.md`, `task.md` y `.env.example` actualizados; `PAYMENTS_ENABLED` **no se implementa** y el plan de reversa queda documentado como `PAGO_MODO=transferencia`.
5. [ ] Probar el *backfill* de la migración contra una rama de Neon con al menos un `Order` existente: aplicar hasta `20261018120000_renombrar_wine_product`, insertar un pedido, y después `prisma migrate deploy`. El CI solo cubre base vacía. **Bloqueado:** no hay Docker ni Postgres local, y el usuario declinó instalarlos.
6. [x] **F6/F7/F8/F9/F10/F12/F13** — rate limits, `cancelled` fuera del mapa, link vigente aunque el pedido esté expirado por reloj, reconciliación que pregunta antes de vencer, comentarios corregidos, copy genérico, `env.PUBLIC_API_URL`.
7. [ ] **Commit:** los cambios están **sin commitear** en el clon. Deben entrar juntos el código, los tests, `AGENTS.md`, `MEMORY.md` y `specs/012-pagos/{plan,task}.md`.
8. [ ] **Render:** poner `PAGO_MODO` y `NAVE_MODE` explícitos antes de desplegar. Con el default nuevo el merge **no** cambia el modo de cobro, pero un `NAVE_MODE=mock` explícito en producción ahora deja el checkout sin proveedor (falla cerrado, que es lo correcto) y hay que corregirlo en el panel.
9. [ ] **T001** (documentación y credenciales de Nave): sin esto no se puede pasar a sandbox ni confirmar la unidad de dinero (F4).

---

## 6. Cómo lo encontré

- Leí el diff completo de los 22 archivos y los 6 untracked, empezando por el módulo `pagos/nave/` (el borde con lo no verificado) y siguiendo por `service.ts` → `routes.ts` → `cron.ts` → `app.ts` → `env.ts` → frontend → tests.
- Corrí los siete comandos del brief y comparé con los números declarados.
- Comparé el test de checkout con la versión base (`git show HEAD:test/checkout_pagina.test.ts`) y encontré que las 8 fallas eran un label viejo, no jsdom.
- Hice tres sabotajes con anclas de una línea (por el gotcha 37) y verifiqué que los tests fallan; después restauré el árbol y confirmé que `git diff --stat` volvía a 1776 inserciones.
- Verifiqué la migración con `prisma validate` y leí el CI para ver si `migrate deploy` corre contra una base real (sí, Postgres 16, pero vacía).
- Busqué los modos de falla conocidos del proyecto: `response.schema` que corta datos, colisiones de rutas de find-my-way, secretos en query string, tests que leen comentarios, defaults de entorno que apagan cosas (gotcha 27).

**No pude probar:** que Nave acepte el cobro, la unidad de dinero real, ni el `backfill` de la migración con filas (no hay Docker ni Neon accesible desde acá).

---

## 7. Arreglos aplicados (2026-10-28)

Se aplicaron **en el clon** (`Clon-checkout-mp`, rama `main`, sin commitear). Cada arreglo de comportamiento trae su test de regresión.

| Hallazgo | Estado | Qué quedó |
|---|---|---|
| **F1** | ✅ corregido | `PAGO_MODO` default **`transferencia`**; `crearProveedorNave` recibe `{ produccion }` y con `NODE_ENV=production` **no registra** `SimuladorNave`: devuelve un proveedor que falla con el motivo exacto y `problema` explícito. `app.ts` le pasa `env.NODE_ENV === 'production'`. Dos tests nuevos en `nave.test.ts`. |
| **F2** | ✅ corregido | `nave_mock_${randomUUID()}` en lugar del contador. Test nuevo: dos cobros en la misma corrida y uno después de "reiniciar" el proceso (`new SimuladorNave`) dan ids distintos. |
| **F3** | ✅ corregido | `prisma.order.updateMany({ where: { id, pagoEstado: { not: 'aprobado' } } })`. Si `count === 0`: el intento recién creado se marca `expirado`, se registra un `warn` y se devuelve **409 `ALREADY_PAID`** (el `catch` re-lanza `AppError` para no convertirlo en 502). Test de carrera con `count: 0`. |
| **F4** | ⚠️ acotado | Test de ida y vuelta con **15347** en `nave.test.ts`, que fija la invariante para cuando `money.ts` deje de ser la identidad. **No se puede cerrar**: la unidad de Nave sigue sin confirmar (T001), y por eso sandbox sigue bloqueado. |
| **F5** | ✅ corregido | `AGENTS.md`: sección **Nave**, gotcha 43, conteos reales (379/26 y 382/25). `MEMORY.md`: bloque de la revisión. `plan.md` §4/§6/§10/§14 sin `PAYMENTS_ENABLED` (el rollback es `PAGO_MODO=transferencia`) y sin `method` inventado. `task.md`: estado por fase y 21 tareas marcadas `[x]` (`T022/T023/T031/T042/T043/T051/T052/T054/T062/T070–T074` quedan abiertas a propósito). `.env.example` y el comentario de `tests/setup.ts`. |
| **F6** | ✅ corregido | Rate limit en `GET /api/track/:token` (**120/min**, la página consulta cada 5 s) y en `POST /api/orders/webhook/nave` (**300/min**). |
| **F7** | ✅ corregido | `cancelled` fuera de `ESTADO_REMOTO_A_NUESTRO`: el pedido queda donde está. Test nuevo en `webhook_pagos.test.ts`. |
| **F8** | ✅ corregido | `estadoVisible` + `linkVigente` en `pedido.tsx`: si el intento sigue `pendiente` y su `expiraEn` no pasó, se muestra el link aunque el pedido figure `expirado` por el reloj de 10 min. Test nuevo en `checkout_pagina.test.ts`. |
| **F9** | ✅ corregido | `reconciliarPagosPendientes` hace un `aplicarPago` **antes** de vencer los intentos con `referenciaExterna` (paso 1a) y solo después corre el `updateMany` que expira. Test nuevo en `cron_pedidos.test.ts` con `ProveedorPagosFalso`. |
| **F10** | ✅ corregido | Comentarios de `routes.ts` y `schema.prisma` dicen lo que el código hace: el evento queda como rastro, la fuente de verdad es `PaymentAttempt`. |
| **F11** | ❌ **no es un bug** | Un intento nuevo se crea contra el proveedor **vigente**: etiquetarlo con `env.PAGO_MODO` es lo correcto. El caso está cubierto por el rollback de F1 (cambiar de proveedor es un cambio de despliegue explícito). Se documenta, no se parchea. |
| **F12** | ✅ corregido | El copy de `checkout.tsx` y `formulario.tsx` ya no promete QR: "Al confirmar te mostramos cómo pagar". El bloque de pago sigue diciendo "con el link y el QR **si el banco los genera**". |
| **F13** | ✅ corregido | `urlDeWebhook` usa `env.PUBLIC_API_URL` y recorta barras finales. Newline final de `schema.prisma` y comentario de `tests/setup.ts` corregidos. |

### Verificación después de los arreglos

```text
root typecheck        EXIT=0
root lint             EXIT=0
root test             26 archivos · 379 tests passed
backend typecheck     EXIT=0
backend lint          EXIT=0
backend test          25 archivos · 382 tests passed
```

(La revisión original dejó 378/375; los arreglos suman 1 test de frontend y 7 de backend.)

### Segunda ronda de sabotaje

| Sabotaje (una línea) | Test que lo detectó |
|---|---|
| `if (opciones.produccion)` → `if (false)` en `nave/index.ts` | `con produccion=true no registra el simulador publico` |
| `nave_mock_${randomUUID()}` → `nave_mock_1` en `nave/mock.ts` | `los ids no se repiten aunque el proceso se reinicie` |
| La rama de `linkVigente` en `pedido.tsx` → `if (false)` | `el link sigue visible si el pedido expiro pero el link no vencio` |
| El paso 1a de `cron.ts` → iterar una lista vacía | `pregunta al proveedor antes de dar un link por vencido` |

Los cuatro fallaron como correspondía. Árbol restaurado y suite completa en verde después.

### Lo que sigue pendiente (no se puede resolver desde acá)

1. **Commit.** Los cambios están en el working copy del clon. Entran juntos: código, tests, `AGENTS.md`, `MEMORY.md`, `specs/012-pagos/{plan,task}.md`, `.env.example`.
2. ***Backfill* de la migración con filas.** No hay Docker ni Postgres local; el CI solo prueba base vacía. Es el único riesgo de despliegue que queda abierto.
3. **Render.** `PAGO_MODO` y `NAVE_MODE` explícitos. Con el default nuevo el merge no cambia el modo de cobro; si producción tiene `NAVE_MODE=mock` escrito a mano, el checkout va a fallar cerrado (que es el comportamiento buscado) hasta que se corrija.
4. **T001.** Documentación y credenciales de Nave: sin eso no se valida `nave/http.ts` ni la unidad de dinero (F4), y no se puede pasar a sandbox.
