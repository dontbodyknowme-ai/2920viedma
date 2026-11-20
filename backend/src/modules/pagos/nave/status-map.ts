/**
 * La única tabla que traduce estados de Nave a **nuestro** vocabulario
 * (spec 012, T024 y FR-019).
 *
 * ## Por qué traduce al vocabulario de Mercado Pago
 *
 * Suena raro, y es deliberado. `aplicarPago` (`modules/orders/service.ts`) ya
 * existe, ya es idempotente y ya tiene sus tests: su tabla
 * `ESTADO_REMOTO_A_NUESTRO` está escrita con los nombres que devuelve Mercado
 * Pago (`approved`, `rejected`, `pending`…). Traducir Nave a esos nombres deja
 * **una sola** función de confirmación para los dos proveedores, que es
 * justamente lo que pide el plan (§4: "la confirmación idempotente ya existe en
 * `aplicarPago`; el webhook de Nave llama a la misma función").
 *
 * La alternativa —una segunda tabla y una segunda `aplicarPago`— duplicaría la
 * transición condicional que evita cobrar dos veces. Ese es el código que menos
 * conviene tener dos veces.
 *
 * ## Los estados desconocidos no se inventan
 *
 * Se devuelve el valor crudo. `aplicarPago` lo busca en su tabla, no lo
 * encuentra y **no cambia nada**: el pedido se queda donde está y se registra.
 * Mapear `refunded` a `rechazado` degradaría un pedido ya aprobado; mapearlo a
 * `aprobado` sería peor. Un reembolso es un hecho distinto de un pago.
 */

/** Estados crudos de Nave → el nombre que entiende `aplicarPago`. */
const EQUIVALENCIAS: Readonly<Record<string, string>> = {
  // Aprobado. `authorized` cuenta como aprobado porque el dinero ya está
  // reservado; si después se captura, el estado vuelve igual.
  approved: 'approved',
  aprobado: 'approved',
  paid: 'approved',
  pagado: 'approved',
  succeeded: 'approved',
  success: 'approved',
  authorized: 'approved',
  acreditado: 'approved',

  // Rechazado. Es terminal: el comprador no pagó.
  rejected: 'rejected',
  rechazado: 'rejected',
  declined: 'rejected',
  failed: 'rejected',
  error: 'rejected',

  // En curso. Deja el pedido en `pendiente` y el cron lo expira si no se
  // concreta: pasar a `rechazado` mientras el banco confirma sería mentir.
  pending: 'pending',
  pendiente: 'pending',
  created: 'pending',
  creado: 'pending',
  processing: 'pending',
  in_process: 'in_process',
  requires_action: 'pending',

  // Vencido: el link expiró sin que nadie pagara. **No** es un rechazo.
  expired: 'expirado',
  expirado: 'expirado',
  vencido: 'expirado',

  // Cancelado por el comprador o por el comercio.
  cancelled: 'cancelled',
  canceled: 'cancelled',
  cancelado: 'cancelled',
  voided: 'cancelled'
}

/**
 * Traduce un estado de Nave.
 *
 * Normaliza antes de buscar: Nave puede mandar `APPROVED`, `Approved` o
 * `approved` para el mismo hecho, y una tabla que distingue mayúsculas es una
 * tabla que un día deja de matchear sin que nada haya cambiado de nuestro lado.
 */
export const traducirEstado = (estadoCrudo: string): string => {
  const normalizado = estadoCrudo.trim().toLowerCase()

  return EQUIVALENCIAS[normalizado] ?? estadoCrudo
}

/** Si el estado crudo es uno que sabemos interpretar. Sirve para los logs. */
export const esEstadoConocido = (estadoCrudo: string): boolean =>
  estadoCrudo.trim().toLowerCase() in EQUIVALENCIAS
