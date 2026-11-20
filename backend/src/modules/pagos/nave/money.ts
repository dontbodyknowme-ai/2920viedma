/**
 * Pesos enteros ↔ unidad de Nave (spec 012, D8).
 *
 * ## Por que hay un archivo para dos identidades
 *
 * Todo el sistema (`Order.total`, `OrderItem.price`, `Product.price`) usa
 * **pesos enteros**, no centavos (D-15 de la spec 009). Si Nave pide centavos,
 * la conversión no puede quedar suelta en `http.ts`: se aplicaría dos veces, o
 * ninguna, y el síntoma sería un cobro de $150.000 por uno de $1.500 o al revés.
 *
 * Hoy las dos funciones son la identidad porque **no está confirmado** que Nave
 * use centavos (`[A CONFIRMAR]`, T001). Eso no las hace decorativas: cuando
 * llegue la documentación, el cambio es `* 100` y `/ 100` **acá**, y ningún otro
 * archivo se entera.
 *
 * El tipo `number` no protege de mezclar unidades. Lo que protege es que este
 * sea el único lugar donde se multiplica: un `total / 100` escrito a mano en
 * otro archivo es un bug de dinero, y esos no los agarra el compilador.
 */

/** Nuestros pesos → la unidad que espera Nave. */
export const aUnidadDeNave = (pesos: number): number => pesos

/** La unidad de Nave → nuestros pesos. */
export const deUnidadDeNave = (monto: number): number => monto

/** Formatea para logs y mensajes. Nunca para decidir montos. */
export const formatearPesos = (pesos: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(pesos)
