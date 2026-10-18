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
| Catálogo | 12 productos mock generados con PRNG sembrado |
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

### RF-06 — El estado del pedido se actualiza según el resultado del pago

| Estado | Significado |
|---|---|
| `pendiente` | El comprador inició el pago pero no lo completó |
| `pagado` | Mercado Pago confirmó el pago |
| `rechazado` | Mercado Pago rechazó el pago |
| `expirado` | El comprador no completó el pago en 10 minutos |

CUANDO Mercado Pago notifica un cambio de pago vía webhook, EL SISTEMA debe actualizar el estado del pedido en la base de datos.

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

### RNF-01 — El monto enviado a Mercado Pago coincide exactamente con el total del carrito

El monto que se envía a Mercado Pago debe ser la suma exacta de los precios de los productos en el carrito, en pesos argentinos enteros.

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
