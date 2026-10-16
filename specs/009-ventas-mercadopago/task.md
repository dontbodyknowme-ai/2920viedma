# Tareas 009 — Ventas con Mercado Pago

> Las tareas se reescribieron el 2026-10-16. La versión anterior pedía crear
> los modelos `Pedido`, `PedidoItem` y `Comprador`, que **ya existen** como
> `Order`, `OrderItem` y `Customer`, y usaba `Order.status` para el pago, cuando
> ese campo ya significa el estado del envío. Ver `spec.md` §2.3 y D-7.

## T1 — Campo del estado del pago

**Cubre:** RF-05, RF-06

**Hecho cuando:**
- `Order` tiene `pagoEstado` (enum `EstadoPago`: `no_iniciado`, `pendiente`,
  `aprobado`, `rechazado`, `expirado`), default `no_iniciado`
- `Order` tiene `pagoId String?` (el id del pago en Mercado Pago)
- **`Order.status` no se toca**: sigue siendo el del envío, con sus seis valores
- `OrderTimeline` ya existe y los cambios de pago se asientan ahí
- `npm run db:migrate` corre sin errores
- Test: el enum `EstadoPago` tiene exactamente esos cinco valores

> **Lo único que esta tarea agrega al schema.** Si también creara modelos
> paralelos, el panel dejaría de ver los pedidos nuevos: se guardarían en tablas
> que `GET /api/orders` no lee.

---

## T2 — Esquemas Zod para crear pedido

**Cubre:** RF-02

**Hecho cuando:**
- `orderCreateSchema` valida: nombre (no vacío), apellido (no vacío), teléfono
  (formato válido), email (**opcional**, formato email si viene), dirección (no
  vacía), items (array **no vacío** de `{ vinoId, cantidad > 0 }`)
- **El schema rechaza `precioUnitario`** si viene. No es "lo ignoramos": es
  rechazarlo, así que un cliente viejo que lo mande se entera en vez de creer
  que pagó el precio que quiso.
- Test: body sin `nombre` → 400
- Test: body sin `email` → 201 (email es opcional)
- Test: body con `items: []` → 400
- Test: body con `precioUnitario` → 400

---

## T3 — Crear pedido + Preference de Mercado Pago

**Cubre:** RF-03, RF-04, RF-05 · **RNF-01, RNF-04**

**Hecho cuando:**
- `POST /api/orders` es **público** (sin `requireRole`, a diferencia del `GET` y
  el `PATCH` del mismo archivo)
- El total se calcula **leyendo `Wine.price` de la base**. El precio del cliente
  no se mira
- El `total` guardado en `Order.total` y el que se manda a Mercado Pago son **el
  mismo número**, no dos cálculos
- Se crea la Preference con `excluded_payment_types` para **`credit_card` y
  `debit_card`** (si solo se excluye la primera, sigue apareciendo la otra)
- La `payer.address` va con el formato de Mercado Pago (`street_name`,
  `street_number`, `city_name`, `zip_code`), no como un string
- El access token **no** sale del backend (RNF-04)
- Test: mandando `precioUnitario: 1` el total sigue siendo el de la base
- Test: la Preference excluye las dos tarjetas
- Test: un token ajeno no alcanza para leer el pedido creado

---

## T4 — Webhook de Mercado Pago

**Cubre:** RF-06 · **RNF-02**

**Hecho cuando:**
- `POST /api/orders/webhook` valida la firma `x-signature` contra el secreto
- **El `status` del cuerpo no se confía**: se consulta `GET /v1/payments/:id` a
  Mercado Pago y se usa ese
- `approved` → `pagoEstado = 'aprobado'`; `rejected` → `'rechazado'`
- **Idempotente**: una webhook repetida no cambia el estado dos veces ni suma el
  total dos veces al `Customer`
- Al aprobar, actualiza `Customer.totalOrders`, `.totalSpent` y `.lastOrderAt`
- Test: firma inválida → 401
- Test: approved → `pagoEstado` en `aprobado`
- Test: la **misma** webhook dos veces → el `totalSpent` del `Customer` se suma
  **una sola vez**

---

## T5 — Expiración de pedidos sin pagar

**Cubre:** RF-07

**Hecho cuando:**
- Un cron corre cada minuto
- Pedidos con `pagoEstado in ('no_iniciado', 'pendiente')` y más de 10 minutos →
  `pagoEstado = 'expirado'`
- **`Order.status` no se toca**
- Test: pedido de 11 minutos sin pagar → `expirado`, y `status` sigue `pendiente`

---

## T6 — Formulario de checkout en el frontend

**Cubre:** RF-01, RF-02, RF-03

**Hecho cuando:**
- `FormularioCheckout` con nombre, apellido, teléfono, email (opcional) y
  dirección. **No pide DNI ni contraseña**
- Los cuatro obligatorios no pueden estar vacíos
- Al confirmar → `POST /api/orders` con los datos + `{ vinoId, cantidad }` del
  carrito. **Sin precios**
- Con la `preferenceId` → redirige a
  `https://www.mercadopago.com.ar/checkout/v1/redirect?preference-id=<id>`
- Test del componente: el botón no se habilita con campos vacíos

---

## T7 — Pantalla de confirmación post-pago

**Cubre:** RF-09

**Hecho cuando:**
- Al volver con `?pago=aprobado`, muestra el número y el total desde
  `sessionStorage`
- **No consulta un endpoint público** para releer los datos del comprador (D-F)
- Se vacía el carrito
- Al volver con `?pago=fallido`, avisa y ofrece reintentar
- Test: sin `orderId` en `sessionStorage`, la página no rompe ni inventa un total

---

## T8 — El panel ve el estado del pago

**Cubre:** RF-05, RF-08

**Hecho cuando:**
- `order_drawer.tsx` muestra **estado del pago** y **estado del envío**, juntos
  pero separados: "Pago: aprobado" y "Envío: en camino" son dos hechos distintos
- El filtro del módulo sigue filtrando por **envío**. Filtrar por pago es
  abierto (D-G)
- **Un `vendedor` puede seguir pasando un pedido a `Entregado`** — esto ya
  funciona y esta tarea no puede romperlo
- Test: un `vendedor` sigue viendo el selector de estado del envío
- Test: el drawer muestra el pago y el envío por separado

---

## Al terminar

- [ ] `npm run typecheck && npm run lint && npm test` en verde
- [ ] `cd backend && npm run typecheck && npm run test` en verde
- [ ] Los criterios de `spec.md` §10
- [ ] `AGENTS.md` y `MEMORY.md` actualizados
- [ ] Merge **solo** si lo pide el usuario

## Antes de empezar

- [ ] **Access Token de Mercado Pago** — externo, no lo puede crear el agente
- [ ] **Secreto de la webhook** y la URL pública configurada

> Sin los dos, T1, T2, T5, T6, T7 y T8 se pueden hacer y verificar enteras. T3 y
> T4 se escriben pero no se pueden probar contra la pasarela real.
