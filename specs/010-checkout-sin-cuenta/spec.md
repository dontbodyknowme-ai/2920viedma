# Spec 010 — Checkout sin cuenta

**Estado:** `borrador`. **Escribir el `plan.md` recién con D-E y D-F resueltas.**
**Spec:** `010`
**Creada:** 2026-10-16
**Gobernada por:** `docs/CONSTITUCION.md`

**Origen:** el usuario pidió *"sin login de compradores, solamente se añade cuando
estén terminando el proceso de compra"*.

**Relación con la 009:** la 009 (`specs/009-ventas-mercadopago/`) ya decía lo
mismo en su D-1, pero su `plan.md` proponía crear los modelos `Pedido`,
`PedidoItem` y `Comprador`, **que ya existen con otros nombres**. Esta spec nace
para corregir eso antes de escribir una línea de código. La 009 queda archivada,
sin implementar.

---

## 1. Lo primero: el modelo de datos **ya existe**

Esta spec **no crea tablas**. El `schema.prisma` ya tiene los tres modelos que
el checkout necesita, y están completos:

| Lo que el checkout necesita | Lo que ya existe |
|---|---|
| El pedido | `Order` — con `total Int`, `status OrderStatus`, `shippingAddress Json` |
| Las líneas | `OrderItem` |
| Quién compró | `Customer` — con `name`, `phone?`, `email?` y las métricas de CRM |
| La traza | `OrderTimeline` |

Si se implementara el plan de la 009 tal cual, **el panel dejaría de ver los
pedidos nuevos**: se guardarían en tablas paralelas y `GET /api/orders` seguiría
leyendo las viejas. Es el mismo patrón de "la interfaz promete algo que el
backend no tiene", al revés.

**Lo único que esta spec agrega al schema es el estado del pago**, y es un campo
nuevo (D-B).

---

## 2. Objetivo

Un visitante compra sin cuenta. Al confirmar el pago se crea el `Order` con sus
datos, y **esos datos se le piden en ese momento**: no hay registro previo, ni
login, ni "mi cuenta".

### 2.1 Definiciones

- **Comprador:** la persona que compra. No tiene cuenta y no se le crea una.
- **Estado del envío:** si el pedido está siendo armado, va en camino, o llegó.
  Lo cambia **a mano** un vendedor cuando lo entrega.
- **Estado del pago:** si la plata entró, o todavía no. Lo cambia **la webhook**,
  nunca una persona.

---

## 3. Decisiones

| # | Decisión | Estado |
|---|---|---|
| D-A | El comprador **no** necesita login ni cuenta. Sus datos se piden al pagar | **Confirmada** (usuario) |
| D-B | El pago va en un **campo nuevo**; `Order.status` sigue siendo del envío | **Confirmada** (usuario) |
| D-C | Se reutilizan `Order`, `OrderItem` y `Customer`. **No** se crean modelos nuevos | **Confirmada** (esta spec) |
| D-D | El estado del envío lo cambia un `vendedor` **a mano**, p. ej. a `Entregado` | **Ya funciona** — ver §7 |
| D-E | Un comprador que vuelve, ¿es el mismo `Customer`? | 🔴 **ABIERTA** |
| D-F | ¿Mercado Pago entra en esta spec o se parte en dos? | 🔴 **ABIERTA** |
| D-G | ¿El panel filtra por estado de pago? | 🔴 **ABIERTA** |

---

## 4. Requisitos funcionales

### RF-01 — Comprar sin cuenta

CUANDO un visitante tiene productos en el carrito y pulsa "Pagar", EL SISTEMA
pide nombre, apellido, teléfono y dirección de envío. **No pide email ni
contraseña, y no pide DNI.** El email es opcional: si lo da, se valida.

### RF-02 — El pedido se crea con el estado del envío en `pendiente`

CUANDO el comprador confirma, EL SISTEMA crea el `Order` con los datos del
formulario, los items del carrito y el total, con `status = pendiente` — que es
"lo estamos armando", **no** "no pagó" — y el estado del pago en
`no_iniciado`.

### RF-03 — El estado del pago solo lo cambia la webhook

CUANDO Mercado Pago notifica un cambio, EL SISTEMA actualiza el estado del pago.
**Ningún endpoint acepta que un cliente escriba ese campo**, y una webhook
repetida no cambia el estado dos veces.

### RF-04 — El estado del envío lo cambia una persona

CUANDO un `vendedor` marca un pedido como entregado, EL SISTEMA cambia
`Order.status` a `entregado` y deja la entrada en `OrderTimeline`.

**Y esto hoy ya funciona** (§7). Esta spec lo tiene que **preservar**, no
construir. Si el checkout escribiera en tablas paralelas, el vendedor dejaría de
poder cambiar el estado sin que nadie se entere: el pedido aparecería y el botón
no haría nada.

### RF-05 — El panel muestra el estado del pago

CUANDO un `admin` o `gestor` abre un pedido, EL SISTEMA le muestra el estado del
pago **junto al** del envío, y no mezclados: "Pago: aprobado" y "Envío: en
camino" son dos hechos distintos.

### RF-06 — Confirmación al comprador

CUANDO el pago se aprueba, EL SISTEMA muestra una confirmación con el número de
pedido.

---

## 5. Requisitos no funcionales

| # | Requisito |
|---|---|
| RNF-01 | El monto que se manda a Mercado Pago es **exactamente** el total del carrito, recalculado en el backend a partir de los precios de la base. El precio que manda el cliente **no** se usa: es el attacker |
| RNF-02 | La webhook se valida antes de confiarle nada |
| RNF-03 | El teléfono y la dirección de un comprador solo los lee `admin` o `gestor`, nunca `vendedor` — es dato personal de un cliente que no tiene cuenta en el sistema |
| RNF-04 | El access token de Mercado Pago **solo** existe en el backend. Si llega al bundle, cualquiera crea pedidos falsos desde las DevTools |

---

## 6. Casos límite

| Caso | Qué tiene que pasar |
|---|---|
| Dos personas con el mismo email | Ver **D-E**. Hoy `Customer.email` es `@unique`: el checkout puede chocar |
| El comprador no deja email | El pedido se crea sin email. Postgres permite varios `NULL` en un `UNIQUE`, así que **no** es un problema — ya está anotado en el schema |
| El comprador cierra la pestaña de pago | El pedido queda esperando pago y expira solo |
| La webhook llega dos veces | No cambia el estado dos veces ni duplica el pedido |
| Alguien edita el precio del carrito | El backend ignora el precio del cliente y recalcula (RNF-01) |
| La compra entra pero el pago nunca llega | El pedido expira y el stock se libera |

---

## 7. Lo que **ya funciona** y esta spec no puede romper

El usuario describió que el vendedor debería poder pasar un pedido a
`Entregado`. **Ya está hecho**, y son cuatro piezas independientes:

```
backend/src/shared/schemas.ts     orderUpdateSchema acepta 'entregado'
backend/src/modules/orders/routes.ts  PATCH /api/orders/:id → admin, gestor, vendedor
src/hooks/usePedidos.ts            ESTADOS_PEDIDO incluye { entregado: 'Entregado' }
src/components/admin/order_drawer.tsx  <select> con los seis estados
src/pages/admin/pedidos.tsx        ningún chequeo de rol: el vendedor lo ve igual
```

**No se verificó contra producción** porque la base tiene **cero pedidos**: el
seed carga vinos y clientes. El chequeo está escrito
(`npm run verificar:estado`, sin commitear) y funciona apenas exista uno.

---

## 8. Lo que falta decidir antes de escribir el plan

### 🔴 D-E — ¿Un comprador que vuelve es el mismo `Customer`?

Es la decisión más grande de la spec y depende de cómo mires `Customer`:

- **Es una ficha de cliente**: se busca por email y si existe se reutiliza. Un
  comprador que compra dos veces tiene dos pedidos y **una** ficha, con
  `totalOrders` y `totalSpent` creciendo. Es lo que el módulo CRM ya asume.
- **Es un registro por compra**: cada checkout crea un `Customer` nuevo. Es más
  simple y **no puede chocar** por email repetido, pero rompe el CRM: nadie
  aparece dos veces y las métricas de `Customer` no significan nada.

Con la opción de "email opcional", además, choca de una forma incómoda: dos
compradores **sin** email no se pueden distinguir nunca, y si los dos
compran, no hay forma de saber si son la misma persona.

Mi recomendación: **ficha de cliente, y email obligatorio** — que es lo que
resuelve el choque. Si el email tiene que ser opcional, entonces es registro
por compra.

### 🔴 D-F — ¿Mercado Pago ahora, o en dos partes?

Mercado Pago necesita dos cosas externas que **no puedo crear yo**:

- El **Access Token** de la cuenta
- Una **webhook** HTTPS pública. El backend ya está en `vinoteca-cava.onrender.com`,
  así que hay dirección; falta el secreto de la webhook

Mientras no existan, la spec se puede implementar casi entera y dejar el pago
para después. Dos partes posibles:

1. **Checkout primero**: formulario, creación del pedido, y estado del pago en
   `no_iniciado`. Todo verificable en producción. Después entra Mercado Pago.
2. **Todo junto**: se escribe Mercado Pago a ciegas y se verifica cuando tengas
   las credenciales.

Recomiendo la **1**: es lo único que se puede probar de verdad antes de tener
credenciales, y es la mitad del trabajo.

### 🟡 D-G — ¿El panel filtra por estado de pago?

Hoy el filtro de pedidos es por estado de envío. Con el pago en campo nuevo,
**el panel no puede filtrar "cuánto cobré"**. Se agrega el filtro, o se mira
abriendo cada pedido.

---

## 9. Fuera de alcance

| | Por qué |
|---|---|
| Cuentas de comprador, login, historial "mis pedidos" | El usuario los descartó: **no hay login de compradores** |
| Cálculo de envío | Se coordina por fuera, con el cliente |
| Facturación electrónica | No se emite factura |
| Cuotas | No se ofrecen |
| Devoluciones y reembolsos | No se gestionan |
| Migración del catálogo real | Es otra spec |

---

## 10. Criterios de finalización

- [ ] Un visitante compra sin registrarse, sin email y sin contraseña
- [ ] El checkout pide nombre, apellido, teléfono y dirección; no pide DNI
- [ ] El pedido se crea en las tablas que el panel **ya** lee
- [ ] El total lo recalcula el backend; el precio del cliente se ignora
- [ ] El estado del envío y el del pago son dos campos y no se mezclan
- [ ] Un `vendedor` puede seguir pasando un pedido a `Entregado`
- [ ] La webhook repetida no cambia el estado dos veces
- [ ] El access token de Mercado Pago no aparece en el bundle
- [ ] tests, typecheck, lint y build en verde
