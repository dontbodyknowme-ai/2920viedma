# Plan 009 — Ventas con Mercado Pago

## Decisiones técnicas

### D-A — El checkout vive en el frontend, los pedidos en el backend

El comprador completa el formulario de datos en el frontend. Al confirmar, el frontend llama a `POST /api/pedidos` con los datos + items. El backend crea el pedido en `pendiente` y devuelve una `preference_id` de Mercado Pago. El frontend redirige al comprador a `https://www.mercadopago.com.ar/checkout/v1/redirect?preference-id=<id>`.

**Alternativa descartada:** Que el frontend cree la Preference directamente con el Access Token de Mercado Pago. Eso expone la credencial en el bundle público — cualquier persona puede verla desde las DevTools y crear pedidos falsos. El Access Token vive solo en el backend.

### D-B — El webhook actualiza el estado, no el frontend

El frontend redirige al comprador de vuelta a la tienda con un query param (`?pago=aprobado`). Eso es solo cosmético: la confirmación real viene del webhook de Mercado Pago al backend.

**Alternativa descartada:** Que el frontend consulte `GET /api/pedidos/:id` hasta ver si cambió el estado. Innecesario: el webhook ya hace el trabajo, y si el comprador cierra la pestaña antes de volver, el pedido se actualiza igual.

### D-C — Los pedidos pendientes expiran con un cron job

Un setInterval en el backend revisa cada minuto los pedidos en `pendiente` con más de 10 minutos de antigüedad y los marca como `expirado`.

**Alternativa descartada:** Expirar en el frontend al volver de Mercado Pago. No sirve: si el comprador no vuelve, nadie expira el pedido.

### D-D — El carrito se vacía solo cuando el pago es aprobado

El webhook recibe `payment.approved`, el backend marca el pedido como `pagado`, y el frontend vacía el carrito al volver con `?pago=aprobado`.

**Alternativa descartada:** Vaciar el carrito al crear el pedido. Si el comprador no paga, perdió el carrito.

---

## Archivos y responsabilidades

### Backend (`backend/src/`)

| Archivo | Responsabilidad |
|---|---|
| `modules/pedidos/routes.ts` | Rutas CRUD de pedidos + webhook de Mercado Pago |
| `modules/pedidos/servicio.ts` | Lógica de crear pedido, actualizar estado, expirar |
| `modules/pedidos/esquemas.ts` | Schemas Zod para validar entrada |
| `modules/pagos/proveedor.ts` | Crear Preference en Mercado Pago con el Access Token |
| `modules/pedidos/cron.ts` | Job que expira pedidos pendientes cada minuto |
| `prisma/schema.prisma` | Modelos `Pedido`, `PedidoItem`, `Comprador` |

### Frontend (`src/`)

| Archivo | Responsabilidad |
|---|---|
| `src/components/checkout/formulario.tsx` | Formulario de datos del comprador |
| `src/components/checkout/boton_pagar.tsx | Botón que crea el pedido y redirige a Mercado Pago |
| `src/components/checkout/confirmacion.tsx` | Pantalla de confirmación post-pago |

---

## Funciones y lógica

### 1. Crear pedido

```ts
// POST /api/pedidos
// Body: { nombre, apellido, telefono, email?, direccion, items: [{ vinoId, cantidad }] }
// Res: { preferenceId, pedidoId }
```

1. Validar body con Zod.
2. Calcular total: `sum(items.map(i => i.precioUnitario * i.cantidad))`.
3. Crear Preference en Mercado Pago:
   - `items`: array con `{ title, quantity, unit_price, currency_id: 'ARS' }`
   - `payer`: `{ name, surname, email?, phone, address }`
   - `payment_methods`: `{ excluded_payment_types: [{ id: 'credit_card' }] }`
   - `back_urls`: `{ success, failure, pending }` → redirigen al frontend con query param
4. Guardar pedido en DB con estado `pendiente`.
5. Devolver `{ preferenceId, pedidoId }`.

### 2. Webhook de Mercado Pago

```ts
// POST /api/webhooks/mercadopago
// Body: { action, data: { id } }
```

1. Validar firma del webhook (header `x-signature`).
2. Si `action` es `payment.created` o `payment.updated`:
   - Consultar el pago en Mercado Pago con `GET /v1/payments/:id`.
   - Si `status` es `approved` → marcar pedido como `pagado`.
   - Si `status` es `rejected` → marcar pedido como `rechazado`.

### 3. Expirar pedidos

```ts
// Cada minuto
const vencidos = await prisma.pedido.findMany({
  where: { estado: 'pendiente', creadoEn: { lt: new Date(Date.now() - 10 * 60 * 1000) } }
})
await prisma.pedido.updateMany({
  where: { id: { in: vencidos.map(p => p.id) } },
  data: { estado: 'expirado' }
})
```

---

## Interfaz

### POST /api/pedidos

**Request:**
```json
{
  "nombre": "María",
  "apellido": "González",
  "telefono": "+5491112345678",
  "email": "maria@example.com",
  "direccion": "Av. Corrientes 1234, Buenos Aires",
  "items": [
    { "vinoId": "abc123", "cantidad": 2 }
  ]
}
```

**Response 201:**
```json
{
  "preferenceId": "123456789-abcdef",
  "pedidoId": "pedido-uuid"
}
```

### GET /api/pedidos/:id

**Response 200:**
```json
{
  "id": "pedido-uuid",
  "estado": "pagado",
  "total": 15000,
  "items": [{ "nombre": "Malbec 2019", "cantidad": 2, "precioUnitario": 7500 }],
  "comprador": { "nombre": "María", "apellido": "González", "telefono": "...", "email": "...", "direccion": "..." },
  "creadoEn": "2026-10-15T12:00:00Z"
}
```

---

## Estrategia de tests

| RF | Test |
|---|---|
| RF-01 | El comprador puede crear pedido sin token JWT |
| RF-02 | Nombre/apellido/teléfono/direccion obligatorios; email opcional |
| RF-03 | El pedido se crea con preference_id de Mercado Pago |
| RF-04 | La Preference excluye tarjeta de crédito |
| RF-05 | El pedido se guarda en DB con estado `pendiente` |
| RF-06 | El webhook marca pedido como `pagado` cuando payment es `approved` |
| RF-07 | Los pedidos pendientes expiran a los 10 minutos |
| RF-08 | El admin ve los datos del comprador en el listado |
| RF-09 | El frontend muestra confirmación con número de pedido |

---

## RF cubiertos

| RF | Se cubre en |
|---|---|
| RF-01 a RF-09 | Tareas T1 a T8 |
