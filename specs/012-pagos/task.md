# Tasks — Cobros online con Nave (checkout estilo Mercado Libre)

| | |
|---|---|
| **Estado** | borrador |
| **Fecha** | 2026-10-27 |
| **Stack corregido** | 2026-10-28 |
| **Basado en** | `spec.md` · `plan.md` |

**Cómo leer esto**
- `[ ]` pendiente · `[P]` se puede hacer en paralelo con otras tareas de la misma fase · `⛔` bloqueada por algo externo.
- `→` indica dependencia ("necesita que termine ...").
- Cada tarea tiene su **hecho cuando** (criterio de terminado).
- `[A CONFIRMAR]` = depende de la documentación de Nave. Mientras tanto, trabajar contra el mock.
- **Stack:** React 18 + Vite / Fastify 4 + Prisma 5 / Neon / Render + Vercel. No se agregan frameworks. Las dependencias nuevas se justifican antes (ver `plan.md` §2).

```text
Fase 0 (pre-requisitos) ─┬─> Fase 1 (fundaciones) ─> Fase 2 (módulo Nave + mock) ─> Fase 3 (backend checkout)
                         │                                                          ├─> Fase 4 (webhook y reconciliación)
                         │                                                          └─> Fase 5 (frontend)
                         └──────────────────────────────> Fase 6 (tests) ─> Fase 7 (sandbox y producción)
```

---

## Fase 0 — Pre-requisitos (no son código)

- [ ] **T001** Escribir a `integraciones@navenegocios.com`: pedir credenciales de sandbox y producción (Client ID, Client Secret, POS ID) y la documentación oficial, junto con las preguntas de `spec.md` §12.
  *Hecho cuando:* hay mail enviado y se tiene registro de la respuesta.
- [ ] **T002** Cerrar las decisiones técnicas que quedan abiertas: proveedor de mails y si se suma E2E con Playwright. El resto del stack ya está decidido en `plan.md` §2.
  *Hecho cuando:* el proveedor de mails (o "sin mails" para el MVP) y la decisión sobre Playwright están anotados en `plan.md` §2 y §16.
- [ ] **T003** Confirmar el tipo de producto (envío, retiro o digital) → define el bloque "Entrega".
  *Hecho cuando:* decisión anotada en `spec.md` FR-004.
- [ ] **T004** [P] Juntar capturas de Mercado Libre que se quieren tomar como referencia (carrito, pago, resumen, resultado).
  *Hecho cuando:* capturas disponibles para el diseño.
- [ ] **T005** [P] Confirmar con Nave que la cuenta de Banco Galicia correcta está asociada al comercio y consultar comisiones y plazos de acreditación.
  *Hecho cuando:* respuesta registrada.

## Fase 1 — Fundaciones

- [ ] **T010** Agregar las variables nuevas de `plan.md` §10 a `backend/src/config/env.ts` **y** a `backend/.env.example` (sin valores), y cargarlas en Render. `deploy.test.ts` exige que schema y example coincidan.
  *Hecho cuando:* la app arranca con `NAVE_MODE=mock` y sin credenciales reales; los tests de deploy pasan.
- [ ] **T011** Migración Prisma: `Order.publicToken` (UUID único), `PaymentAttempt` y `WebhookEvent`, con sus índices (`plan.md` §5). **Se extiende** lo existente; no se crean `orders` ni `order_items` nuevas.
  *Hecho cuando:* `prisma migrate dev` corre en limpio y `prisma migrate deploy` también.
- [ ] **T012** [P] Utilidades: `nave/money.ts` (pesos enteros ↔ unidad de Nave `[A CONFIRMAR]`), `nave/status-map.ts`, log con Pino y los schemas Zod de entrada.
  *Hecho cuando:* tests unitarios de `money` y `status-map` pasan.
- [ ] **T013** [P] Reusar `crearPedido` (`modules/orders/service.ts`): ya recalcula el total con precios de la base y valida stock. Agregar el `409` explícito si precio o stock cambió entre el carrito y el pago.
  *Hecho cuando:* tests cubren precio alterado, producto inexistente y cantidad inválida.
- [ ] **T014** [P] Aplicar el rate limit existente (`ORDER_RATE_MAX`, `@fastify/rate-limit`) a los endpoints nuevos además de `POST /api/orders`.
  *Hecho cuando:* superar el límite devuelve `429` en cada endpoint público.

## Fase 2 — Módulo Nave y mock (→ T010)

- [ ] **T020** Definir la interfaz `NaveClient` y tipos en `backend/src/modules/pagos/nave/types.ts` (`plan.md` §7).
  *Hecho cuando:* compila y la usan `mock.ts` y `http.ts`.
- [ ] **T021** `nave/mock.ts`: cliente simulado con resultados configurables (aprobado, rechazado, vencido, pendiente) + endpoint de desarrollo que dispara un webhook simulado.
  *Hecho cuando:* se puede recorrer cada estado sin credenciales.
- [ ] **T022** ⛔ `nave/http.ts`: obtener token OAuth 2.0 con credenciales de cliente y cachearlo hasta su vencimiento, usando `fetch`. `[A CONFIRMAR]` URLs y formato → T001.
  *Hecho cuando:* en sandbox se obtiene un token válido.
- [ ] **T023** ⛔ `nave/http.ts`: `createPayment` y `getPayment` con los campos reales de Nave. `[A CONFIRMAR]` → T001, T022.
  *Hecho cuando:* en sandbox se crea un pago, se obtiene un link de checkout y se consulta su estado.
- [ ] **T024** `nave/status-map.ts`: tabla única de mapeo de estados de Nave a `EstadoPago` (con mock hasta tener la doc). `[A CONFIRMAR]`
  *Hecho cuando:* todos los estados conocidos están mapeados y los desconocidos se registran en el log y quedan como `pendiente`.
- [ ] **T025** `nave/index.ts`: selecciona el cliente según `NAVE_MODE` (`mock` · `sandbox` · `production`).
  *Hecho cuando:* cambiar la variable cambia el cliente sin tocar código.

## Fase 3 — Backend de checkout (→ T011, T013, T025)

- [ ] **T030** Extender `POST /api/orders` (`modules/orders/routes.ts`): aceptar `method`, crear `PaymentAttempt`, crear el pago en Nave y devolver `checkoutUrl` + `orderToken` (`plan.md` §6).
  *Hecho cuando:* con el mock devuelve link; ante falla de Nave responde `502` y la orden queda `pendiente`.
- [ ] **T031** Protección contra duplicados: evitar crear dos órdenes por el mismo envío (clave de idempotencia por sesión/carrito o ventana de tiempo corta).
  *Hecho cuando:* dos requests simultáneos del mismo carrito producen una sola orden.
- [ ] **T032** `POST /api/track/:token/pay`: reutilizar intento vigente con el mismo método o crear uno nuevo; solo si la orden sigue `pendiente`.
  *Hecho cuando:* "reintentar" funciona tras un rechazo; con orden `aprobado` devuelve `409`.
- [ ] **T033** `GET /api/track/:token`: devuelve estado mínimo; si sigue `pendiente`, consulta a Nave (→ T041).
  *Hecho cuando:* un pago aprobado en el mock se refleja sin esperar el webhook.
- [ ] **T034** Validar `method` contra lista fija y aplicar `rate-limit` en los tres endpoints.
  *Hecho cuando:* métodos inválidos devuelven `400`.

## Fase 4 — Webhook y reconciliación (→ T025, T011)

- [ ] **T040** `POST /api/orders/webhook/nave`: guardar el evento en `WebhookEvent`, tomar el identificador, consultar el estado real, aplicar `aplicarPago`, responder `200` rápido. Verificar firma si Nave la ofrece. `[A CONFIRMAR]`
  *Hecho cuando:* con el mock, un webhook aprobado deja la orden en `aprobado`; un cuerpo falso no cambia nada.
- [ ] **T041** Extender `aplicarPago` (`modules/orders/service.ts`): transición condicional `pendiente|expirado → aprobado` (`plan.md` §8) y detección de duplicados.
  *Hecho cuando:* procesar la misma notificación 5 veces ejecuta el post-pago una sola vez.
- [ ] **T042** Post-pago: descontar stock (depende de la spec 010), mail de confirmación al comprador y aviso al dueño (si T002 definió proveedor).
  *Hecho cuando:* ambos mails se envían una vez y el stock baja una vez.
- [ ] **T043** [P] Registro de pagos duplicados (aprobado sobre orden ya `aprobado`) con una vista simple para el dueño (lista o consulta documentada).
  *Hecho cuando:* un doble pago simulado aparece listado con orden y monto.
- [ ] **T044** Reconciliación **in-process** con `setInterval(...).unref()` (igual que la expiración de la spec 009): consulta órdenes `pendiente` antiguas y aplica `aplicarPago` o `expirado`. Sumar `POST /api/orders/reconcile` con `requireRole('admin')` para forzar una pasada.
  *Hecho cuando:* un webhook "perdido" en el mock se recupera al ejecutar la reconciliación.
- [ ] **T045** Verificar que el intervalo corre y que `.unref()` no cuelga la suite de tests.
  *Hecho cuando:* los tests terminan solos y el barrido se ve en el log.

## Fase 5 — Frontend (→ T030 para integrar; el maquetado puede empezar antes)

- [ ] **T050** Extender `src/pages/checkout.tsx` "Revisá y confirmá" con los 3 bloques y resumen (`spec.md` FR-002).
  *Hecho cuando:* se ve y funciona en 360 px de ancho y en desktop.
- [ ] **T051** [P] Componente `src/components/checkout/PaymentOptions.tsx`: dos opciones, una preseleccionada; si Nave no permite preselección (T001), versión informativa.
  *Hecho cuando:* el método elegido viaja en `POST /api/orders`.
- [ ] **T052** [P] `src/components/checkout/StickyConfirmBar.tsx` para celular: total + botón "Confirmar compra" fijos abajo.
  *Hecho cuando:* no tapa campos ni el teclado y respeta las áreas seguras del dispositivo.
- [ ] **T053** Botón "Confirmar compra" con estados (normal, cargando "Te llevamos a Nave…", error con reintento) y deshabilitado al primer toque.
  *Hecho cuando:* doble toque rápido crea una sola orden.
- [ ] **T054** [P] Autocompletado: guardar datos del comprador en `localStorage` con opción "Borrar mis datos".
  *Hecho cuando:* una segunda compra aparece con el formulario precargado.
- [ ] **T055** Página `src/pages/pedido.tsx` (`/pedido/:token` en `src/router.tsx`) con polling cada 2–3 s durante ~60 s y los 4 estados (aprobado, procesando, rechazado, vencido), cada uno con su botón.
  *Hecho cuando:* con el mock se ven los 4 estados; pasado el minuto se muestra "procesando", no error.
- [ ] **T056** Botón "Reintentar pago" conectado a `POST /api/track/:token/pay`.
  *Hecho cuando:* tras un rechazo simulado se llega a un nuevo checkout sin recargar datos.
- [ ] **T057** Pasada de accesibilidad: inputs de 16 px o más, objetivos de 44–48 px o más, contraste AA, `autocomplete`/`inputmode`, foco visible, textos de error claros.
  *Hecho cuando:* Lighthouse de accesibilidad en `/checkout` es de 90 o más.
- [ ] **T058** Copy final: texto previo al salto ("Pagás en la pantalla segura de Nave y volvés acá"), total con envío, mensajes de error en lenguaje simple.
  *Hecho cuando:* revisado por alguien del público objetivo.

## Fase 6 — Pruebas (→ Fases 3, 4 y 5)

- [ ] **T060** Unitarias (Vitest): `status-map`, `money`, `aplicarPago` (idempotencia).
  *Hecho cuando:* pasan en CI.
- [ ] **T061** Integración con mock: aprobado, rechazado, vencido, webhook duplicado, webhook perdido (reconciliación), doble clic, precio cambiado.
  *Hecho cuando:* los 7 escenarios pasan.
- [ ] **T062** `[A DEFINIR]` E2E con Playwright: flujo feliz en viewport móvil y desktop; reintento tras rechazo. Solo si T002 justifica la dependencia.
  *Hecho cuando:* pasan en CI.

## Fase 7 — Sandbox y producción (→ T001, T023, Fase 6)

- [ ] **T070** ⛔ Cambiar a `NAVE_MODE=sandbox` y registrar en Nave la URL pública del webhook: `${PUBLIC_API_URL}/api/orders/webhook/nave` (el deploy de Render, no una preview de Vercel).
  *Hecho cuando:* Nave logra entregar un webhook de prueba.
- [ ] **T071** ⛔ Matriz de QA en sandbox: cada medio de pago × cada resultado (aprobado, rechazado, vencido, abandono).
  *Hecho cuando:* matriz completa y sin fallas abiertas.
- [ ] **T072** Revisión de seguridad: secretos fuera del frontend y del repo, `method` validado, rate limit activo, webhook verificado, logs sin datos sensibles.
  *Hecho cuando:* checklist firmado.
- [ ] **T073** ⛔ Cargar credenciales de producción solo en Render (Production); dejar `PAYMENTS_ENABLED=false`.
  *Hecho cuando:* el despliegue de producción funciona con el botón de pago oculto.
- [ ] **T074** ⛔ Compra real de monto bajo con `PAYMENTS_ENABLED=true`: verificar que la orden pasa a `aprobado`, que llegan los mails (si hay proveedor) y que el dinero aparece en la cuenta de Galicia con referencia a la orden.
  *Hecho cuando:* se cumple `spec.md` SC-06.
- [ ] **T075** Monitoreo básico: revisión o alerta de órdenes `pendiente` de más de 1 hora y lista de pagos duplicados.
  *Hecho cuando:* se puede responder "¿qué pagos quedaron sin confirmar?" en menos de un minuto.
- [ ] **T076** Runbook de una página: qué hacer si un pago aparece en Nave pero la orden sigue `pendiente`, cómo reembolsar un duplicado (manual desde el panel de Nave `[A CONFIRMAR]`) y cómo apagar los cobros con el flag.
  *Hecho cuando:* documento guardado junto al repositorio.
- [ ] **T077** Lanzamiento: activar para todos los compradores y revisar las primeras ventas.
  *Hecho cuando:* las primeras 5 ventas reales terminan en `aprobado` sin intervención manual.

---

## Camino mínimo (si hay que priorizar)

`T001 → T002 → T010 → T011 → T013 → T020 → T021 → T025 → T030 → T040 → T041 → T050 → T053 → T055 → T061 → T070 → T074`

Con eso se puede cobrar una venta real de punta a punta. El resto (autocompletado, reconciliación avanzada, runbook, monitoreo) se suma enseguida después.

> **Ojo con T042:** descontar y restaurar stock es la spec 010, que hoy está sin iniciar. Hasta que exista, el post-pago no toca stock y el checkout solo valida que haya al momento de crear el pedido.
