# Tasks — Cobros online con Nave (checkout estilo Mercado Libre)

| | |
|---|---|
| **Estado** | Borrador v1 |
| **Fecha** | 2026-10-27 |
| **Basado en** | `spec.md` · `plan.md` |

**Cómo leer esto**
- `[ ]` pendiente · `[P]` se puede hacer en paralelo con otras tareas de la misma fase · `⛔` bloqueada por algo externo.
- `→` indica dependencia ("necesita que termine ...").
- Cada tarea tiene su **hecho cuando** (criterio de terminado).
- `[A CONFIRMAR]` = depende de la documentación de Nave. Mientras tanto, trabajar contra el mock.

```
Fase 0 (pre-requisitos) ─┬─> Fase 1 (fundaciones) ─> Fase 2 (módulo Nave + mock) ─> Fase 3 (backend checkout)
                         │                                                          ├─> Fase 4 (webhook y reconciliación)
                         │                                                          └─> Fase 5 (frontend)
                         └──────────────────────────────> Fase 6 (tests) ─> Fase 7 (sandbox y producción)
```

---

## Fase 0 — Pre-requisitos (no son código)

- [ ] **T001** Escribir a `integraciones@navenegocios.com`: pedir credenciales de sandbox y producción (Client ID, Client Secret, POS ID) y la documentación oficial, junto con las preguntas de `spec.md` §12.
  *Hecho cuando:* hay mail enviado y se tiene registro de la respuesta.
- [ ] **T002** Definir stack real: framework, base de datos/ORM, proveedor de mails, plan de Vercel. Completar `plan.md` §2.
  *Hecho cuando:* `plan.md` ya no tiene `[A DEFINIR]` en §2.
- [ ] **T003** Confirmar el tipo de producto (envío, retiro o digital) → define el bloque "Entrega".
  *Hecho cuando:* decisión anotada en `spec.md` FR-004.
- [ ] **T004** [P] Juntar capturas de Mercado Libre que se quieren tomar como referencia (carrito, pago, resumen, resultado).
  *Hecho cuando:* capturas disponibles para el diseño.
- [ ] **T005** [P] Confirmar con Nave que la cuenta de Banco Galicia correcta está asociada al comercio y consultar comisiones y plazos de acreditación.
  *Hecho cuando:* respuesta registrada.

## Fase 1 — Fundaciones

- [ ] **T010** Crear `.env.example` con todas las variables de `plan.md` §10 (sin valores) y cargar las de desarrollo en Vercel.
  *Hecho cuando:* la app arranca con `NAVE_MODE=mock` y sin credenciales reales.
- [ ] **T011** Migración de base de datos: `orders`, `order_items`, `payment_attempts`, `webhook_events` e índices (`plan.md` §5).
  *Hecho cuando:* la migración corre en limpio y se puede revertir.
- [ ] **T012** [P] Utilidades: `money.ts` (centavos ↔ formato ARS), `token.ts` (UUID v4), `log.ts` (log estructurado), esquemas zod de entrada.
  *Hecho cuando:* tests unitarios de `money` pasan.
- [ ] **T013** [P] `price-cart.ts`: recalcula líneas y total en el servidor con precios de la base; falla con `409` si precio o stock cambió.
  *Hecho cuando:* tests unitarios cubren precio alterado, producto inexistente y cantidad inválida.
- [ ] **T014** [P] `rate-limit.ts` para endpoints públicos.
  *Hecho cuando:* superar el límite devuelve `429`.

## Fase 2 — Módulo Nave y mock (→ T010)

- [ ] **T020** Definir la interfaz `NaveClient` y tipos en `lib/nave/types.ts` (`plan.md` §7).
  *Hecho cuando:* compila y la usan `mock.ts` y `http.ts`.
- [ ] **T021** `mock.ts`: cliente simulado con resultados configurables (aprobado, rechazado, vencido, pendiente) + endpoint de desarrollo que dispara un webhook simulado.
  *Hecho cuando:* se puede recorrer cada estado sin credenciales.
- [ ] **T022** ⛔ `http.ts`: obtener token OAuth 2.0 con credenciales de cliente y cachearlo hasta su vencimiento. `[A CONFIRMAR]` URLs y formato → T001.
  *Hecho cuando:* en sandbox se obtiene un token válido.
- [ ] **T023** ⛔ `http.ts`: `createPayment` y `getPayment` con los campos reales de Nave. `[A CONFIRMAR]` → T001, T022.
  *Hecho cuando:* en sandbox se crea un pago, se obtiene un link de checkout y se consulta su estado.
- [ ] **T024** `status-map.ts`: tabla única de mapeo de estados de Nave a estados internos (con mock hasta tener la doc). `[A CONFIRMAR]`
  *Hecho cuando:* todos los estados conocidos están mapeados y los desconocidos se registran en el log y quedan como `PENDING`.
- [ ] **T025** `lib/nave/index.ts`: selecciona el cliente según `NAVE_MODE` (`mock` · `sandbox` · `production`).
  *Hecho cuando:* cambiar la variable cambia el cliente sin tocar código.

## Fase 3 — Backend de checkout (→ T011, T013, T025)

- [ ] **T030** `POST /api/checkout`: validar → `priceCart` → crear orden `PENDING` + ítems + intento → crear pago en Nave → devolver `checkoutUrl` y `orderToken` (`plan.md` §6).
  *Hecho cuando:* con el mock devuelve link; ante falla de Nave responde `502` y la orden queda `PENDING`.
- [ ] **T031** Protección contra duplicados: evitar crear dos órdenes por el mismo envío (clave de idempotencia por sesión/carrito o ventana de tiempo corta).
  *Hecho cuando:* dos requests simultáneos del mismo carrito producen una sola orden.
- [ ] **T032** `POST /api/orders/[token]/pay`: reutilizar intento vigente con el mismo método o crear uno nuevo; solo si la orden está `PENDING`.
  *Hecho cuando:* "reintentar" funciona tras un rechazo; con orden `PAID` devuelve `409`.
- [ ] **T033** `GET /api/orders/[token]/status`: devuelve estado mínimo; si sigue `PENDING`, consulta a Nave (→ T041).
  *Hecho cuando:* un pago aprobado en el mock se refleja sin esperar el webhook.
- [ ] **T034** Validar `method` contra lista fija y aplicar `rate-limit` en los tres endpoints.
  *Hecho cuando:* métodos inválidos devuelven `400`.

## Fase 4 — Webhook y reconciliación (→ T025, T011)

- [ ] **T040** `POST /api/webhooks/nave`: guardar evento, tomar el identificador, consultar el estado real, aplicar `markPaid`, responder `200` rápido. Verificar firma si Nave la ofrece. `[A CONFIRMAR]`
  *Hecho cuando:* con el mock, un webhook aprobado deja la orden en `PAID`; un cuerpo falso no cambia nada.
- [ ] **T041** `mark-paid.ts`: actualización condicional `PENDING → PAID` (`plan.md` §8) y detección de duplicados.
  *Hecho cuando:* procesar la misma notificación 5 veces ejecuta `afterPaid` una sola vez.
- [ ] **T042** `after-paid.ts`: descontar stock, mail de confirmación al comprador, aviso al dueño.
  *Hecho cuando:* ambos mails se envían una vez y el stock baja una vez.
- [ ] **T043** [P] Registro de pagos duplicados (aprobado sobre orden ya `PAID`) con una vista simple para el dueño (lista o consulta documentada).
  *Hecho cuando:* un doble pago simulado aparece listado con orden y monto.
- [ ] **T044** `GET /api/cron/reconcile` protegido con `CRON_SECRET`: consulta órdenes `PENDING` antiguas y aplica `markPaid` o `EXPIRED`.
  *Hecho cuando:* un webhook "perdido" en el mock se recupera al ejecutar la reconciliación.
- [ ] **T045** Configurar la programación del cron según el plan de Vercel (T002): con Hobby, una vez por día; con Pro, cada pocos minutos.
  *Hecho cuando:* el cron figura configurado y se vio correr al menos una vez.

## Fase 5 — Frontend (→ T030 para integrar; el maquetado puede empezar antes)

- [ ] **T050** Página `/checkout` "Revisá y confirmá" con los 3 bloques y resumen (`spec.md` FR-002).
  *Hecho cuando:* se ve y funciona en 360 px de ancho y en desktop.
- [ ] **T051** [P] Componente `PaymentOptions`: dos opciones, una preseleccionada; si Nave no permite preselección (T001), versión informativa.
  *Hecho cuando:* el método elegido viaja en `POST /api/checkout`.
- [ ] **T052** [P] `StickyConfirmBar` para celular: total + botón "Confirmar compra" fijos abajo.
  *Hecho cuando:* no tapa campos ni el teclado y respeta las áreas seguras del dispositivo.
- [ ] **T053** Botón "Confirmar compra" con estados (normal, cargando "Te llevamos a Nave…", error con reintento) y deshabilitado al primer toque.
  *Hecho cuando:* doble toque rápido crea una sola orden.
- [ ] **T054** [P] Autocompletado: guardar datos del comprador en `localStorage` con opción "Borrar mis datos".
  *Hecho cuando:* una segunda compra aparece con el formulario precargado.
- [ ] **T055** Página `/pedido/[token]` con polling cada 2–3 s durante ~60 s y los 4 estados (aprobado, procesando, rechazado, vencido), cada uno con su botón.
  *Hecho cuando:* con el mock se ven los 4 estados; pasado el minuto se muestra "procesando", no error.
- [ ] **T056** Botón "Reintentar pago" conectado a `POST /api/orders/[token]/pay`.
  *Hecho cuando:* tras un rechazo simulado se llega a un nuevo checkout sin recargar datos.
- [ ] **T057** Pasada de accesibilidad: inputs de 16 px o más, objetivos de 44–48 px o más, contraste AA, `autocomplete`/`inputmode`, foco visible, textos de error claros.
  *Hecho cuando:* Lighthouse de accesibilidad en `/checkout` es de 90 o más.
- [ ] **T058** Copy final: texto previo al salto ("Pagás en la pantalla segura de Nave y volvés acá"), total con envío, mensajes de error en lenguaje simple.
  *Hecho cuando:* revisado por alguien del público objetivo.

## Fase 6 — Pruebas (→ Fases 3, 4 y 5)

- [ ] **T060** Unitarias: `priceCart`, `markPaid` (idempotencia), `status-map`, `money`.
  *Hecho cuando:* pasan en CI.
- [ ] **T061** Integración con mock: aprobado, rechazado, vencido, webhook duplicado, webhook perdido (reconciliación), doble clic, precio cambiado.
  *Hecho cuando:* los 7 escenarios pasan.
- [ ] **T062** E2E con Playwright: flujo feliz en viewport móvil y desktop; reintento tras rechazo.
  *Hecho cuando:* pasan en CI.

## Fase 7 — Sandbox y producción (→ T001, T023, Fase 6)

- [ ] **T070** ⛔ Cambiar a `NAVE_MODE=sandbox` y registrar la URL pública del webhook (dominio de producción con credenciales sandbox, o bypass de Vercel si Nave admite query strings).
  *Hecho cuando:* Nave logra entregar un webhook de prueba.
- [ ] **T071** ⛔ Matriz de QA en sandbox: cada medio de pago × cada resultado (aprobado, rechazado, vencido, abandono).
  *Hecho cuando:* matriz completa y sin fallas abiertas.
- [ ] **T072** Revisión de seguridad: secretos fuera del frontend y del repo, `method` validado, rate limit activo, webhook verificado, logs sin datos sensibles.
  *Hecho cuando:* checklist firmado.
- [ ] **T073** ⛔ Cargar credenciales de producción solo en el entorno Production; dejar `PAYMENTS_ENABLED=false`.
  *Hecho cuando:* el despliegue de producción funciona con el botón de pago oculto.
- [ ] **T074** ⛔ Compra real de monto bajo con `PAYMENTS_ENABLED=true`: verificar que la orden pasa a `PAID`, que llegan los mails y que el dinero aparece en la cuenta de Galicia con referencia a la orden.
  *Hecho cuando:* se cumple `spec.md` SC-06.
- [ ] **T075** Monitoreo básico: revisión o alerta de órdenes `PENDING` de más de 1 hora y lista de pagos duplicados.
  *Hecho cuando:* se puede responder "¿qué pagos quedaron sin confirmar?" en menos de un minuto.
- [ ] **T076** Runbook de una página: qué hacer si un pago aparece en Nave pero la orden sigue `PENDING`, cómo reembolsar un duplicado (manual desde el panel de Nave `[A CONFIRMAR]`) y cómo apagar los cobros con el flag.
  *Hecho cuando:* documento guardado junto al repositorio.
- [ ] **T077** Lanzamiento: activar para todos los compradores y revisar las primeras ventas.
  *Hecho cuando:* las primeras 5 ventas reales terminan en `PAID` sin intervención manual.

---

## Camino mínimo (si hay que priorizar)

`T001 → T002 → T010 → T011 → T013 → T020 → T021 → T025 → T030 → T040 → T041 → T050 → T053 → T055 → T061 → T070 → T074`

Con eso se puede cobrar una venta real de punta a punta. El resto (autocompletado, reconciliación avanzada, runbook, monitoreo) se suma enseguida después.
