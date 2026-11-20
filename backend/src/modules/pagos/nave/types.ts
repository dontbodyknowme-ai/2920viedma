import type { EstadoPagoRemoto } from '../proveedor.js'

/**
 * El contrato con Nave, en nuestros terminos (spec 012, D7).
 *
 * Vive separado de `ProveedorPagos` a proposito: `ProveedorPagos` es lo que el
 * checkout necesita (crear un cobro, preguntar su estado) y esta escrito en el
 * vocabulario que ya usa el resto del sistema. `ClienteNave` es lo que **Nave**
 * necesita. El adaptador (`index.ts`) es el unico lugar que traduce entre los
 * dos, y es el unico que cambia el dia que llegue la documentacion oficial.
 *
 * ## Por que `crearCobro` y no `crearPreference`
 *
 * "Preference" es el nombre de una entidad de Mercado Pago. Nave habla de
 * intenciones/cobros. Usar el nombre de una pasarela para hablar de otra es la
 * clase de deuda que despues hace que nadie sepa cual de las dos se esta
 * llamando de verdad.
 */

export interface DatosDelPagador {
  nombre: string
  apellido: string
  email: string
  telefono: string
  direccion: string
}

export interface LineaDelCobro {
  nombre: string
  cantidad: number
  /** Pesos enteros, ya resueltos desde la base. Nunca del navegador. */
  precioUnitario: number
}

export interface SolicitudCobro {
  /** Id del pedido. Es lo que permite cruzar el pago con la orden. */
  referencia: string
  /** Pesos enteros. La unidad de Nave se resuelve en `money.ts`. */
  total: number
  lineas: LineaDelCobro[]
  pagador: DatosDelPagador
  /**
   * `webhook` es la URL **del backend**: es la unica que Nave puede llamar sin
   * sesion de nadie. Las otras tres son a donde vuelve la persona.
   */
  urls: { exito: string; fallo: string; pendiente: string; webhook: string }
}

/**
 * El QR del cobro.
 *
 * Se guardan las dos formas porque no son intercambiables: `imagenUrl` es lo que
 * se pinta y `payload` es lo que se muestra para copiar o para generar el QR en
 * el cliente. Cual de las dos devuelve Nave es `[A CONFIRMAR]`; guardar solo una
 * obliga a adivinar.
 */
export interface QrDelCobro {
  imagenUrl?: string
  payload?: string
}

export interface CobroCreado {
  /** Id del cobro en Nave. Es la llave que despues busca el webhook. */
  id: string
  /** A donde se manda al comprador. Lo devuelve Nave, no se arma a mano. */
  checkoutUrl: string
  qr: QrDelCobro | null
  expiraEn: Date | null
}

/**
 * El estado crudo del cobro. **No** se traduce aca: la tabla de equivalencias
 * vive en `status-map.ts`, que es unica y testeable sin red.
 */
export interface EstadoDelCobro {
  id: string
  estado: string
  monto: number
  externalReference: string | null
  fechaAprobacion: string | null
  expiraEn: Date | null
}

export interface ClienteNave {
  crearCobro(solicitud: SolicitudCobro): Promise<CobroCreado>
  estadoDe(id: string): Promise<EstadoDelCobro>
}

/** Lo que el adaptador devuelve: el estado ya traducido al vocabulario nuestro. */
export type EstadoTraducido = EstadoPagoRemoto
