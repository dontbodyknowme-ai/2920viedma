# Spec 009 — Ventas con Mercado Pago

**Estado:** `borrador`
**Spec:** `009`
**Creada:** 2026-10-15
**Gobernada por:** `docs/CONSTITUCION.md`
**Spec previa:** `specs/006-permisos-rol/` (completa)
**Spec siguiente:** `specs/010-catalogo-real/` (migración de datos mock)

---

## 1. Objetivo

Permitir que un visitante compre productos de la tienda sin necesidad de registrarse, pagando a través de Mercado Pago con cualquier medio de pago excepto tarjeta de crédito. El envío se coordina aparte con el cliente.

### 1.1 Definiciones

- **Comprador:** Persona que visita la tienda, agrega productos al carrito y paga. No tiene cuenta de usuario en el sistema.
- **Pedido:** Registro de una compra confirmada o pendiente de pago.
- **Webhook:** Notificación que Mercado Pago envía al backend cuando el estado de un pago cambia.
- **Medio de pago:** Forma en que el comprador paga (efectivo, transferencia, Mercado Pago balance, etc.).

---

## 2. Contexto

### 2.1 Estado actual

| Aspecto | Valor |
|---|---|
| Catálogo | 12 vinos mock generados con PRNG sembrado |
| Carrito | `localStorage` con `vinoteca_cart` |
| Backend | Fastify en `:3000`, spec 004-b completa |
| Auth | JWT access 15min + refresh rotativo 7d cookie httpOnly (solo admin/gestor/vendedor) |
| Pedidos (admin) | Existe módulo de pedidos en el panel, pero no hay flujo de compra del lado del cliente |

### 2.2 Decisiones confirmadas

| # | Decisión | Estado |
|---|---|---|
| D-1 | El comprador NO necesita login ni cuenta | Confirmada |
| D-2 | Se usa Mercado Pago como pasarela de pago | Confirmada |
| D-3 | NO se acepta tarjeta de crédito ni pagos en cuotas | Confirmada |
| D-4 | El envío se coordina aparte con el cliente (no lo calcula Mercado Pago) | Confirmada |
| D-5 | El backend debe estar expuesto con dominio + HTTPS para recibir webhooks | Pendiente de dominio |
| D-6 | La migración del catálogo real se hace en la spec 010, no en esta | Confirmada |
| D-7 | El estado del pago va en un **campo nuevo**; `Order.status` sigue siendo del envío | **Confirmada** (usuario, 2026-10-16) |
| D-8 | Se **reutilizan** `Order`, `OrderItem` y `Customer`. No se crean modelos paralelos | **Confirmada** — ver §2.3 |
| D-9 | Un comprador que vuelve, ¿es el mismo `Customer`? | 🔴 **ABIERTA** — ver §2.4 |
| D-10 | ¿El panel filtra por estado de pago, o solo por envío? | 🔴 **ABIERTA** — ver §2.5 |
| D-11 | ¿Mercado Pago se implementa de una o en dos partes? | 🔴 **ABIERTA** — ver `task.md` |

### 2.4 D-9 — ¿Un comprador que vuelve es el mismo `Customer`?

Es la decisión más grande de la spec y depende de cómo se mire `Customer`:

- **Es una ficha de cliente:** se busca por email y si existe se reutiliza. Un
  comprador que compra dos veces tiene **dos pedidos y una** ficha, y
  `totalOrders` / `totalSpent` crecen. Es lo que el módulo CRM ya asume.
- **Es un registro por compra:** cada checkout crea un `Customer` nuevo. Es más
  simple y **no puede chocar** por email repetido, pero rompe el CRM: nadie
  aparece dos veces y las métricas de `Customer` no significan nada.

Con el email **opcional** (RF-02) choca de una forma incómoda: dos compradores
sin email **no se pueden distinguir nunca**.

> **Recomendación: ficha de cliente, con email obligatorio.** Es lo único que
> resuelve el choque con `@unique` de una vez. Si el email tiene que ser
> opcional, entonces es registro por compra.

### 2.5 D-10 — ¿El panel filtra por estado de pago?

Hoy el filtro de `/admin/pedidos` es por **estado de envío** y consulta
`?status=`. Con el pago en campo nuevo, el panel **no puede filtrar "cuánto
cobraron hoy"** sin abrir pedido por pedido.

Agregar el filtro, o dejarlo así y que el estado de pago se vea al abrir el
pedido. No bloquea la implementación.

### 2.3 Corrección: los modelos ya existen

La primera versión de esta spec proponía crear los modelos `Pedido`, `PedidoItem`
y `Comprador`. **Los tres ya existen, con otros nombres**, y están completos para
el checkout:

| Lo que la spec pedía | Lo que ya existe |
|---|---|
| `Pedido` con estado, total y dirección | `Order` — `total Int`, `status OrderStatus`, `shippingAddress Json` |
| `PedidoItem` | `OrderItem` |
| `Comprador` con nombre, teléfono y email | `Customer` — `name`, `phone?`, `email?`, `totalOrders`, `totalSpent` |

Crear modelos paralelos **dejaría al panel sin ver los pedidos nuevos**: se
guardarían en tablas que `GET /api/orders` no lee. Es el mismo patrón de "la
interfaz promete algo que el backend no tiene", pero al revés.

**Lo único que esta spec agrega al schema es el campo del pago.**

---

## 3. Requisitos funcionales

### RF-01 — El comprador puede iniciar el pago sin estar logueado

CUANDO un visitante tiene productos en el carrito y pulsa "Pagar", EL SISTEMA debe permitirle continuar sin pedirle email ni contraseña.

### RF-02 — Datos obligatorios y opcionales del comprador

CUANDO el comprador pulsa "Pagar", EL SISTEMA debe pedirle:

| Campo | Obligatorio | Validación |
|---|---|---|
| Nombre | Sí | No vacío |
| Apellido | Sí | No vacío |
| Teléfono | Sí | Formato telefónico válido |
| Email | Opcional | Si se ingresa, formato email válido |
| Dirección de envío | Sí | No vacío |

El DNI **no se pide**.

### RF-03 — El pago se procesa a través de Mercado Pago

CUANDO el comprador confirma sus datos, EL SISTEMA debe redirigirlo a Mercado Pago para completar el pago en un solo pago (sin cuotas).

### RF-04 — No se ofrece tarjeta de crédito

CUANDO el comprador está en el checkout de Mercado Pago, EL SISTEMA debe ocultar la opción de tarjeta de crédito. Cualquier otro medio de pago (efectivo, transferencia, balance de Mercado Pago) debe estar disponible.

### RF-05 — El pedido se registra en el backend

CUANDO el comprador inicia el pago, EL SISTEMA debe registrar el pedido en la base de datos con:

- Datos del comprador (nombre, apellido, teléfono, email si lo ingresó, dirección)
- Productos del carrito (nombre, cantidad, precio unitario)
- Monto total en pesos argentinos enteros
- Estado del pago

### RF-06 — El estado del pago se actualiza según el resultado

El pago va en un **campo propio**, separado de `Order.status`.

> **Por qué no reusar `status`** (decisión del usuario, y corrección a la versión
> anterior de esta spec): `Order.status` ya significa **en qué anda el envío** —
> `pendiente`, `preparando`, `enviado`, `entregado`, `cancelado`, `devuelto` — y
> el panel lo cambia **a mano** cuando un vendedor entrega. Si el pago compartiera
> ese campo, un pedido en `cancelado` no diría si la plata entró, y el selector
> del panel mezclaría dos preguntas distintas en un solo control.

| `pago` | Significado | Quién lo cambia |
|---|---|---|
| `no_iniciado` | El comprador llenó el formulario, todavía no abrió Mercado Pago | El backend, al crear el pedido |
| `pendiente` | Abrió Mercado Pago y no terminó | La webhook |
| `aprobado` | Mercado Pago confirmó el pago | La webhook |
| `rechazado` | Mercado Pago rechazó el pago | La webhook |
| `expirado` | No se completó en 10 minutos | El cron |

`Order.status` arranca en `pendiente` **sin relación con el pago**: significa
"lo estamos armando".

CUANDO Mercado Pago notifica un cambio vía webhook, EL SISTEMA debe actualizar
el estado del **pago**, nunca el del envío.

### RF-07 — Los pedidos pendientes expiran a los 10 minutos

SI un pedido queda en estado `pendiente` por más de 10 minutos, ENTONCES EL SISTEMA debe marcarlo como `expirado`.

### RF-08 — El admin ve los pedidos en el panel

CUANDO un admin o gestor entra al módulo de pedidos, EL SISTEMA debe mostrarle:

- Nombre del comprador
- Email (si lo ingresó)
- Teléfono
- Dirección de envío
- Productos del pedido
- Monto total
- Estado del pago

### RF-09 — El comprador recibe la confirmación del pedido

CUANDO el pago es aprobado, EL SISTEMA debe mostrar al comprador una confirmación con el número de pedido.

---

## 4. Requisitos no funcionales

### RNF-01 — El monto lo recalcula el backend, nunca lo manda el cliente

> **Corrección a la versión anterior de esta spec.** Decía *"el monto enviado debe
> ser la suma exacta de los precios de los productos en el carrito"*. Eso es un
> agujero: el carrito vive en el `localStorage` del navegador, así que quien
> quiera puede abrir la DevTools, poner `precioUnitario: 1` y pagar un pedido de
> $150.000 con $2.

EL SISTEMA debe **ignorar por completo los precios que mande el cliente** y
calcular el total a partir de `Wine.price` en la base. Del pedido solo se acepta
**qué** vinos y **cuántos**. El mismo número que se guarda en `Order.total` es el
que se manda a Mercado Pago: si se calcularan por separado, la webhook podría
aprobar un monto distinto del que el panel muestra.

Todos los precios son **pesos enteros**.

### RNF-02 — El webhook valida la autenticidad de la notificación

El backend debe verificar que la notificación del webhook realmente viene de Mercado Pago (validación de firma o token).

### RNF-03 — Los datos del comprador se guardan de forma segura

El teléfono y dirección del comprador se guardan en la base de datos con acceso restringido (solo admin/gestor).

---

## 5. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| El comprador cierra la ventana de Mercado Pago sin pagar | El pedido queda como `pendiente` y expira a los 10 minutos |
| El pago es rechazado por Mercado Pago | El pedido queda como `rechazado` y el comprador puede reintentar |
| El webhook llega dos veces | El sistema no duplica el pedido ni cambia el estado dos veces |
| El carrito está vacío al pulsar "Pagar" | El sistema no permite avanzar al checkout |
| El comprador no ingresa email | El pedido se registra sin email (campo opcional) |
| El comprador ingresa un email inválido | El sistema no permite avanzar hasta corregirlo |

---

## 6. Fuera de alcance

- **Carga del catálogo real:** Se hace en la spec 010 (migración de datos mock). Esta spec asume que el catálogo real ya está cargado.
- **Cálculo de envío:** No se calcula en el checkout. Se coordina por fuera.
- **Facturación electrónica:** No se emite factura automática.
- **Cuentas de comprador:** No se crea cuenta de usuario para el comprador.
- **Devoluciones:** No se gestionan devoluciones en esta spec.
- **Pagos en cuotas:** No se ofrecen cuotas.

---

## 7. Criterios de finalización

- [ ] Un visitante puede comprar sin estar logueado
- [ ] El checkout pide nombre, apellido, teléfono y dirección (email opcional, sin DNI)
- [ ] El pago se procesa a través de Mercado Pago sin ofrecer tarjeta de crédito ni cuotas
- [ ] El pedido se registra en la base de datos con estado correcto
- [ ] Los pedidos pendientes expiran a los 10 minutos
- [ ] El webhook actualiza el estado del pedido automáticamente
- [ ] El admin ve los pedidos en el panel con todos los datos del comprador
- [ ] El comprador recibe confirmación del pedido
