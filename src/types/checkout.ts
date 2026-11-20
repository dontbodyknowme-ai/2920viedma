/**
 * El checkout (spec 009 y spec 012).
 *
 * ## Por que vive en `src/pages/` y no dentro de `App.tsx`
 *
 * `App.tsx` tiene el estado del carrito y el drawer. El checkout es un **paso
 * distinto**: tiene URL propia y se puede recargar. Despues de crear el pedido,
 * el comprador pasa a `/pedido/:token` (spec 012), que es la pagina que consulta
 * el estado real y muestra el link/QR. Ya no hay vuelta por query param: un
 * `?pago=aprobado` lo escribe cualquiera y no prueba que se haya cobrado.
 *
 * Si viviera en `App.tsx`, recargar en `/checkout` perderia el carrito y el
 * comprador veria un formulario vacio sin saber que paso.
 */

/** Un item tal como lo manda el frontend: **id y cantidad, ningun precio**. */
export interface ItemDelCheckout {
  vinoId: string
  cantidad: number
}

export interface InstruccionesTransferencia {
  titular?: string
  alias?: string
  cbu?: string
  banco?: string
  monto: number
  referencia: string
}

/** Lo que el backend devuelve al crear el pedido. */
export interface PedidoCreado {
  modo?: 'transferencia' | 'mercadopago'
  orderId: string
  /**
   * Token publico del pedido (spec 012). Es la llave de `/pedido/:token`: el
   * `orderId` interno no se usa para armar URLs publicas.
   */
  orderToken: string
  /** Solo cuando modo es mercado pago */
  preferenceId?: string
  /** La URL del checkout. Se usa tal cual: armarla a mano es fragile. */
  initPoint?: string
  /** QR del cobro, si el proveedor lo devuelve (spec 012). */
  qr?: { imagenUrl?: string; payload?: string }
  /** Vencimiento del link/QR en ISO 8601, o `null`. */
  expiraEn?: string | null
  /** Pesos enteros. Es **el** numero, el mismo que guardo el backend. */
  total: number
  /** Solo cuando modo es transferencia */
  instrucciones?: InstruccionesTransferencia
}

/**
 * La vista publica del pedido (`GET /api/track/:token`).
 *
 * Es lo que la pagina del pedido puede mostrar sin sesion: sus items, el total,
 * el estado del pago y el link/QR. **No** trae el email, el telefono ni la
 * direccion del comprador, y tampoco el `orderId` interno.
 */
export interface PedidoPublico {
  orderToken: string
  /** Referencia corta para mostrar en pantalla y en el comprobante. */
  referencia: string
  modo: 'mercadopago' | 'transferencia'
  estado: string
  pagoEstado: 'no_iniciado' | 'pendiente' | 'aprobado' | 'rechazado' | 'expirado'
  total: number
  creadoEn: string
  items: { nombre: string; cantidad: number; precio: number }[]
  pago: {
    estado: string
    link: string | null
    qr: { imagenUrl?: string; payload?: string } | null
    expiraEn: string | null
  } | null
  instrucciones: InstruccionesTransferencia | null
}

/** Lo que pide el backend, sin precios. */
export interface DatosDelComprador {
  nombre: string
  apellido: string
  telefono: string
  email: string
  direccion: string
}
