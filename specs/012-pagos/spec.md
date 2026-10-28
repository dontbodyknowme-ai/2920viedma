# Spec — Cobros online con Nave (checkout estilo Mercado Libre)

| | |
|---|---|
| **Estado** | borrador |
| **Fecha** | 2026-10-27 |
| **Proyecto** | Tienda online existente (catálogo y carrito funcionando; frontend en Vercel y API en Render) |
| **Documentos relacionados** | `plan.md` (diseño técnico) · `task.md` (tareas) |

> **Convención:** `[A CONFIRMAR]` marca algo que depende de la documentación oficial de Nave o de una decisión pendiente. No implementar esos puntos "a ojo": aislarlos en el código y resolverlos cuando llegue la doc.

---

## 1. Resumen

Permitir que un comprador pague su pedido de forma rápida y sin fricción, con **tarjeta** o con su **billetera / app bancaria** (Mercado Pago, MODO, Ualá, Cuenta DNI, etc.), usando **Nave** como intermediario. El dinero se acredita en la cuenta de **Banco Galicia** del comercio.

La experiencia replica la **estructura y los patrones** del checkout de Mercado Libre (flujo corto, una opción preseleccionada, un único botón principal, resumen siempre visible), con marca propia.

## 2. Contexto

**Ya existe:** frontend en Vercel (React + Vite), API en Render (Fastify + Prisma) y base en Neon; catálogo; carrito; formulario donde el comprador completa sus datos.

**Falta:** cobro (integración con Nave), estados de pedido, confirmación al comprador y al dueño. El login queda para una etapa posterior y opcional.

## 3. Público y principios de UX

- **Público:** compradores de 30 años o más, mayormente desde el celular, en Argentina.
- **Principios:**
  1. Pocas pantallas, ninguna decisión innecesaria.
  2. Compra como invitado: nunca exigir cuenta para pagar.
  3. Una opción de pago preseleccionada y un único botón principal por pantalla.
  4. Total final (con envío) siempre visible antes de pagar. Sin sorpresas.
  5. Lenguaje simple y estados claros (aprobado / procesando / rechazado / vencido).
  6. Sin popups, sin cuentas regresivas agresivas, sin ofertas extra durante el checkout.
  7. Copiar patrones, no marca: no usar diseño ni logos de Mercado Libre. Los logos de billeteras, solo siguiendo sus guías de marca.

## 4. Alcance

**Dentro:**
- Página "Revisá y confirmá" (datos y entrega · cómo pagar · resumen).
- Creación de orden e intento de pago en Nave y redirección al checkout de Nave.
- Confirmación del pago por webhook y por consulta de estado (reconciliación).
- Página de pedido con estados y reintento de pago.
- Mails de confirmación (comprador y dueño).
- Modo simulado (mock) para desarrollar sin credenciales.

**Fuera (por ahora):**
- Login / cuentas de usuario (etapa posterior, opcional, con link por mail).
- Reembolsos automáticos `[A CONFIRMAR si Nave tiene API]` (por ahora, manuales desde el panel de Nave).
- Cuotas / financiación, cupones, múltiples monedas.
- Pago sin salir del sitio ("checkout transparente") `[A CONFIRMAR si Nave lo ofrece por API]`.
- Facturación electrónica `[A CONFIRMAR con tu contador]`.

## 5. Historias de usuario

### US-1 — Comprar y pagar (P1)
*Como comprador quiero finalizar mi compra en pocos pasos y pagar con mi billetera o tarjeta, para recibir mi pedido sin complicaciones.*

**Criterios de aceptación**
- **Dado** un carrito con productos, **cuando** toco "Continuar compra", **entonces** veo la página "Revisá y confirmá" con mis datos, el medio de pago y el resumen.
- **Dado** que no tengo cuenta, **cuando** completo mis datos, **entonces** puedo pagar sin registrarme.
- **Dado** que la página tiene una opción de pago preseleccionada, **cuando** toco "Confirmar compra", **entonces** soy redirigido a la pantalla de pago de Nave sin pasos intermedios.
- **Dado** que toqué "Confirmar compra", **cuando** vuelvo a tocarlo, **entonces** no se crea una segunda orden.

### US-2 — Saber si mi pago fue confirmado (P1)
*Como comprador quiero ver claramente si mi pago se aprobó, para quedarme tranquilo.*

- **Dado** que vuelvo de Nave, **cuando** la página de pedido carga, **entonces** veo "Estamos confirmando tu pago…" hasta tener el estado real.
- **Dado** que el pago fue aprobado, **entonces** veo número de pedido, resumen y recibo un mail de confirmación.
- **Dado** que el pago demora más de ~1 minuto en confirmarse, **entonces** veo un mensaje de "procesando" (no de error) y recibo un mail cuando se confirme.

### US-3 — Reintentar un pago fallido o vencido (P1)
*Como comprador quiero reintentar el pago sin volver a cargar mis datos.*

- **Dado** un pago rechazado o vencido, **cuando** toco "Reintentar pago", **entonces** se crea un intento nuevo para la misma orden y voy a Nave.
- **Dado** que ya hay un intento vigente con el mismo medio, **entonces** se reutiliza en lugar de crear otro.

### US-4 — Que se me avise de cada venta (P1, dueño)
*Como dueño quiero saber qué pedidos se pagaron y que el dinero corresponda a cada orden.*

- **Dado** una orden que pasa a `aprobado`, **entonces** recibo un mail con el detalle del pedido y los datos del comprador.
- **Dado** un pago aprobado sobre una orden ya pagada, **entonces** queda registrado como **duplicado** para reembolsarlo.

### US-5 — Volver a comprar más rápido (P2)
*Como comprador frecuente quiero que mis datos se autocompleten.*

- **Dado** que ya compré antes desde este navegador, **entonces** el formulario aparece con mis datos y puedo editarlos.

## 6. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El carrito tiene un botón "Continuar compra" que lleva a "Revisá y confirmá". |
| FR-002 | "Revisá y confirmá" es una sola página con 3 bloques: (1) datos y entrega, con botón Editar; (2) "Elegí cómo pagar"; (3) resumen con total final y botón principal "Confirmar compra". En celular, el resumen y el botón van en una barra fija inferior. |
| FR-003 | La compra se hace como invitado. No se requiere login. |
| FR-004 | Campos mínimos: nombre, mail, teléfono. Dirección solo si el pedido tiene envío `[A CONFIRMAR tipo de producto]`. |
| FR-005 | El total se calcula **siempre en el servidor** con los precios de la base de datos. Nunca se confía en montos enviados por el navegador. |
| FR-006 | Opciones de pago: "Billetera o app del banco" (QR / dinero en cuenta) y "Tarjeta de crédito o débito". Una queda preseleccionada. Si Nave no permite preseleccionar el medio, el bloque pasa a ser informativo (lista de medios aceptados). |
| FR-007 | "Confirmar compra" crea la orden (`pendiente`) y un intento de pago en Nave, y redirige al checkout de Nave. |
| FR-008 | El botón se deshabilita al primer toque. El servidor además evita órdenes duplicadas. |
| FR-009 | `/pedido/:token` usa un token aleatorio no adivinable (no el ID secuencial). |
| FR-010 | El estado de pago se confirma **solo** por webhook o por consulta directa a Nave. Volver de Nave **nunca** prueba el pago. |
| FR-011 | El procesamiento del webhook es idempotente: la misma notificación repetida no duplica descuentos de stock ni mails. |
| FR-012 | Existe una reconciliación que consulta a Nave las órdenes `pendiente` antiguas, y se dispara también cuando el comprador abre su pedido. |
| FR-013 | La página de pedido muestra 4 estados: aprobado, procesando, rechazado, vencido. Cada uno con un botón de siguiente paso. |
| FR-014 | "Reintentar pago" crea un intento nuevo para la misma orden. |
| FR-015 | Al pasar a `aprobado` se envía mail de confirmación al comprador y aviso al dueño. |
| FR-016 | Los datos del comprador se guardan en el navegador para autocompletar la próxima compra (el comprador puede borrarlos). |
| FR-017 | Un pago aprobado sobre una orden ya `aprobado` se registra como duplicado. |
| FR-018 | Existe un modo simulado (`NAVE_MODE=mock`) que permite probar todos los estados sin credenciales. |
| FR-019 | Todo acceso a Nave está aislado en un único módulo (`backend/src/modules/pagos/nave/`) con interfaz clara. |
| FR-020 | Se guarda un registro de cada notificación recibida de Nave. |

## 7. Requisitos no funcionales

- **Seguridad**
  - Credenciales de Nave solo en variables de entorno del servidor. Nunca en el frontend ni en el repositorio.
  - Los datos de tarjeta **no pasan por el backend** propio (checkout por redirección o tokenización en el navegador `[A CONFIRMAR]`).
  - El webhook no confía en el cuerpo recibido: re-consulta el estado real a Nave y, si Nave ofrece firma, la verifica `[A CONFIRMAR]`.
  - Validación de entradas en todos los endpoints públicos, lista fija para el campo `method`, rate limiting.
  - Logs sin datos personales sensibles.
- **Rendimiento:** crear el intento de pago y redirigir en menos de ~2 s en condiciones normales (depende de Nave). El webhook responde rápido.
- **Accesibilidad:** inputs de 16 px o más, botones de 44–48 px o más, contraste WCAG AA, navegable por teclado, etiquetas visibles en los campos.
- **Mobile first:** diseño pensado para celular, con barra inferior fija.
- **Idioma y moneda:** español rioplatense, pesos argentinos (ARS).
- **Observabilidad:** log estructurado de cada cambio de estado. Alerta si una orden queda `pendiente` más de 1 hora.
- **Compatibilidad:** navegadores recientes en Android e iOS y desktop.

## 8. Entidades

- **Order:** id, token público, estado, datos del comprador, datos de entrega (si aplica), subtotal, envío, total, moneda, fechas.
- **OrderItem:** orden, producto, nombre y precio al momento de la compra, cantidad.
- **PaymentAttempt:** orden, medio elegido, identificador del pago en Nave, link de checkout, estado, vencimiento.
- **WebhookEvent:** identificador de pago, fecha de recepción, contenido recibido, procesado sí/no.

## 9. Estados

**Orden:** `pendiente` → `aprobado` · `pendiente` → `expirado` · `pendiente` → `rechazado` (si no quedan intentos posibles).
Solo `pendiente` puede pasar a `aprobado`. `aprobado` es final.

**Intento de pago:** `no_iniciado` → `pendiente` → `aprobado` · `rechazado` · `expirado`.
Se reusa el enum `EstadoPago` del proyecto (no se inventa un estado paralelo). Si el comprador abandona, el intento queda `pendiente` hasta expirar.
La correspondencia entre estados de Nave y estos estados es `[A CONFIRMAR con la doc]`.

## 10. Casos borde

- El comprador cierra la pestaña en Nave y vuelve más tarde: puede reabrir `/pedido/:token` y reintentar.
- El comprador paga pero nunca vuelve a la tienda: el webhook o la reconciliación confirman igual.
- El webhook llega duplicado, tarde, o nunca llega.
- Dos intentos de la misma orden: el comprador paga ambos.
- Cambio de precio o stock entre que arma el carrito y paga.
- El link de pago vence (por defecto ~15 minutos en el plugin oficial de WooCommerce de Nave; `[A CONFIRMAR]` para la API).
- Nave no responde o devuelve error al crear el pago: mensaje claro y posibilidad de reintentar, sin perder la orden.
- Doble clic en "Confirmar compra" o en "Reintentar pago".

## 11. Criterios de éxito

- **SC-01:** un comprador nuevo llega del carrito a la pantalla de pago de Nave en **3 pantallas o menos** y en menos de 2 minutos.
- **SC-02:** **0** órdenes pagadas sin pasar a `aprobado` pasados 10 minutos (por webhook o reconciliación).
- **SC-03:** **0** descuentos de stock o mails duplicados por un mismo pago.
- **SC-04:** la compra completa se puede hacer desde un celular sin zoom ni scroll horizontal.
- **SC-05:** accesibilidad del checkout con puntaje de 90 o más en Lighthouse.
- **SC-06:** una compra real de monto bajo llega a la cuenta de Galicia y se puede asociar a su orden.

## 12. Preguntas abiertas

### Para Nave (escribir a `integraciones@navenegocios.com`)
1. Credenciales de sandbox y producción (Client ID, Client Secret, POS ID) y documentación oficial de la API.
2. ¿Qué medios quedan habilitados en mi checkout (tarjetas, MODO, QR con Mercado Pago y otras billeteras)?
3. Al crear el pago, ¿se puede indicar el medio para que el checkout abra directo en ese?
4. En celular, ¿hay deep link o botón "abrir mi app" en el flujo QR? (Nadie puede escanear con el mismo teléfono lo que tiene en pantalla.) ¿Qué hace el parámetro `mobile`?
5. ¿Existe "checkout transparente" por API para desarrollo propio? ¿Cómo se tokeniza la tarjeta sin pasar datos por mi backend?
6. ¿Cómo verifico que un webhook es auténtico (firma, secreto, IP)? ¿Reintenta si no respondo 200?
7. ¿Se pueden crear varios pagos para la misma orden? ¿Qué identificador debe ser único?
8. ¿Hay API de reembolsos? ¿Cómo se hacen hoy?
9. Comisiones y plazos de acreditación en Galicia por cada medio de pago.
10. Usuarios y tarjetas de prueba en sandbox. ¿Cuánto dura el link de pago y es configurable?

### Para vos
- Proveedor de mails (hoy no hay) y si se suma E2E con Playwright. El resto del stack ya está decidido en `plan.md` §2.
- ¿Productos físicos con envío o retiro, o digitales?
- Capturas de las pantallas de Mercado Libre que querés tomar como referencia.
- ¿Hace falta facturación electrónica por cada venta?

## 13. Supuestos y riesgos

**Supuestos**
- Nave ofrece checkout por redirección con QR y tarjetas, y notificaciones por webhook.
- La cuenta de Galicia del comercio ya está asociada a Nave.

**Riesgos**
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Nave no permite preseleccionar medio | Doble elección (tu página + Nave) | Dejar el bloque de pago informativo con un solo botón |
| QR en celular incómodo para el público | Abandono en móvil | Preguntar por deep link; plan B: sumar otro medio (ej. Mercado Pago) |
| Webhook que no llega | Pagos sin confirmar | Reconciliación + consulta al abrir el pedido |
| Render free se duerme | El webhook tarda en despertar | Reintentos de Nave + reconciliación posterior |
| Barrido de reconciliación sin cronjob | Pagos sin confirmar | Cron in-process + consulta al abrir el pedido |
| Documentación de Nave incompleta | Retrasos | Mock desde el día 1 y módulo `backend/src/modules/pagos/nave/` aislado |
