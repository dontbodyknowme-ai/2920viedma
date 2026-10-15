# Tareas 009 — Ventas con Mercado Pago

## T1 — Modelo de datos: Pedido, PedidoItem, Comprador

**Cubre:** RF-05, RF-08

**Hecho cuando:**
- Prisma schema tiene modelos `Pedido`, `PedidoItem`, `Comprador`
- `Pedido` tiene: id, estado (enum: pendiente/pagado/rechazado/expirado), total (Int), preferenceId, compradorId, creadoEn, actualizadoEn
- `PedidoItem` tiene: id, pedidoId, vinoId, nombre, cantidad, precioUnitario
- `Comprador` tiene: id, nombre, apellido, telefono, email (opcional), direccion
- `prisma migrate dev` corre sin errores

---

## T2 — Esquemas Zod para crear pedido

**Cubre:** RF-02, RF-05

**Hecho cuando:**
- `POST /api/pedidos` valida: nombre (string no vacío), apellido (string no vacío), telefono (string con formato válido), email (string opcional, formato email si está), direccion (string no vacío), items (array no vacío de { vinoId: string, cantidad: number > 0 })
- Test: body sin `nombre` → 400
- Test: body sin `email` → 201 (email opcional)
- Test: body con items vacío → 400

---

## T3 — Lógica de crear pedido + Preference de Mercado Pago

**Cubre:** RF-03, RF-04, RF-05, RNF-01

**Hecho cuando:**
- `POST /api/pedidos` crea el pedido en DB con estado `pendiente`
- Se crea una Preference en Mercado Pago con los datos del comprador, items, total en ARS, y `excluded_payment_types: [{ id: 'credit_card' }]`
- El response incluye `{ preferenceId, pedidoId }`
- Test: el total enviado a Mercado Pago coincide con suma(items × precioUnitario)
- Test: la Preference excluye 'credit_card'

---

## T4 — Webhook de Mercado Pago

**Cubre:** RF-06, RNF-02

**Hecho cuando:**
- `POST /api/webhooks/mercadopago` valida la firma (header `x-signature`)
- Si payment.status = 'approved' → pedido pasa a `pagado`
- Si payment.status = 'rejected' → pedido pasa a `rechazado`
- Test: webhook con firma inválida → 401
- Test: webhook con payment approved → pedido en DB queda `pagado`
- Test: webhook con payment rejected → pedido en DB queda `rechazado`

---

## T5 — Expiración de pedidos pendientes

**Cubre:** RF-07

**Hecho cuando:**
- Un cron job corre cada minuto
- Pedidos en `pendiente` con más de 10 minutos → pasan a `expirado`
- Test: pedido creado hace 11 minutos con estado `pendiente` → pasa a `expirado` tras el cron

---

## T6 — Formulario de checkout en el frontend

**Cubre:** RF-01, RF-02, RF-03

**Hecho cuando:**
- Componente `FormularioCheckout` con campos: nombre, apellido, teléfono, email (opcional), dirección
- Validación: los 4 obligatorios no pueden estar vacíos
- Al confirmar → llama a `POST /api/pedidos` con los datos + items del carrito
- Recibe `preferenceId` → redirige a `https://www.mercadopago.com.ar/checkout/v1/redirect?preference-id=<id>`

---

## T7 — Pantalla de confirmación post-pago

**Cubre:** RF-09

**Hecho cuando:**
- Al volver de Mercado Pago con `?pago=aprobado`, el frontend muestra "Pedido confirmado" con el número de pedido
- Se vacía el carrito (`localStorage` se limpia)
- Al volver con `?pago=fallido`, el frontend muestra "El pago no se completó" y ofrece reintentar

---

## T8 — El admin ve los pedidos en el panel

**Cubre:** RF-08

**Hecho cuando:**
- El módulo `/admin/pedidos` muestra: nombre, email, teléfono, dirección, productos, monto, estado
- Los pedidos se pueden filtrar por estado
