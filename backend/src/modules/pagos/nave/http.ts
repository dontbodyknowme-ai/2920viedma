import { aUnidadDeNave, deUnidadDeNave } from './money.js'
import type { ClienteNave, CobroCreado, EstadoDelCobro, SolicitudCobro } from './types.js'

/**
 * El cliente HTTP real de Nave (spec 012, T022/T023).
 *
 * ## Todo lo no verificado vive acá
 *
 * La documentación oficial de Nave todavía no está (`[A CONFIRMAR]`, T001). Por
 * eso este archivo cumple dos reglas:
 *
 * 1. **No inventa URLs.** La base y las dos rutas son variables de entorno sin
 *    default. Si falta una, `leerConfigNave` lo dice y el proveedor no se
 *    configura: preferible un arranque que avisa a un checkout que crea cobros
 *    contra `https://api.ejemplo.com`.
 * 2. **No inventa un shape de respuesta.** Se leen varios nombres posibles para
 *    los mismos datos (`id` / `payment_id` / `request_id`) y se falla con un
 *    mensaje que incluye el cuerpo recibido. Cuando llegue la doc, se borran los
 *    alias que no correspondan: es más seguro tolerar de más y ver el error en
 *    el log que adivinar uno y romper en silencio.
 *
 * El protocolo de token es OAuth 2.0 `client_credentials`, que es lo que declara
 * el plan (§7) y lo que Nave entrega como Client ID / Client Secret.
 */

export interface ConfigNave {
  baseUrl: string
  tokenPath: string
  paymentPath: string
  clientId: string
  clientSecret: string
  posId: string
}

/** Lo que `env.ts` puede aportar. Se tipa así para no acoplar el cliente a Zod. */
export interface FuenteConfigNave {
  NAVE_API_BASE?: string
  NAVE_TOKEN_PATH?: string
  NAVE_PAYMENT_PATH?: string
  NAVE_CLIENT_ID?: string
  NAVE_CLIENT_SECRET?: string
  NAVE_POS_ID?: string
}

const REQUERIDAS: (keyof FuenteConfigNave)[] = [
  'NAVE_API_BASE',
  'NAVE_TOKEN_PATH',
  'NAVE_PAYMENT_PATH',
  'NAVE_CLIENT_ID',
  'NAVE_CLIENT_SECRET',
  'NAVE_POS_ID'
]

/**
 * Devuelve la configuración o **la lista exacta** de lo que falta.
 *
 * La lista y no un `null`: "Nave no está configurado" no dice qué poner en
 * Render, y el que despliega a las 23:00 no tiene ganas de leer el código.
 */
export const leerConfigNave = (
  fuente: FuenteConfigNave
): { config: ConfigNave } | { faltan: string[] } => {
  const faltan = REQUERIDAS.filter((clave) => {
    const valor = fuente[clave]
    return valor === undefined || valor.trim() === ''
  })

  if (faltan.length > 0) return { faltan }

  return {
    config: {
      baseUrl: (fuente.NAVE_API_BASE ?? '').replace(/\/+$/, ''),
      tokenPath: fuente.NAVE_TOKEN_PATH ?? '',
      paymentPath: fuente.NAVE_PAYMENT_PATH ?? '',
      clientId: fuente.NAVE_CLIENT_ID ?? '',
      clientSecret: fuente.NAVE_CLIENT_SECRET ?? '',
      posId: fuente.NAVE_POS_ID ?? ''
    }
  }
}

/** Primer campo que exista y no sea vacío. `null` si ninguno. */
export const primerCampo = (objeto: Record<string, unknown>, campos: string[]): unknown => {
  for (const campo of campos) {
    const valor = objeto[campo]
    if (valor !== undefined && valor !== null && valor !== '') return valor
  }

  return null
}

const texto = (valor: unknown): string | null =>
  typeof valor === 'string' && valor !== '' ? valor : typeof valor === 'number' ? String(valor) : null

const numero = (valor: unknown): number | null =>
  typeof valor === 'number' && Number.isFinite(valor)
    ? valor
    : typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))
      ? Number(valor)
      : null

const fecha = (valor: unknown): Date | null => {
  const crudo = texto(valor)
  if (crudo === null) return null

  const fecha = new Date(crudo)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export interface OpcionesClienteHttp {
  /** Inyectable para los tests: no quieren red. */
  fetchImpl?: typeof fetch
  ahora?: () => number
}

export const crearClienteNaveHttp = (
  config: ConfigNave,
  opciones: OpcionesClienteHttp = {}
): ClienteNave => {
  const pedir = opciones.fetchImpl ?? fetch
  const ahora = opciones.ahora ?? (() => Date.now())

  let token: { valor: string; venceEn: number } | null = null

  /**
   * El token se cachea **hasta su vencimiento**, con un minuto de margen.
   *
   * Sin caché, cada cobro pide un token nuevo: dos llamadas de red por checkout
   * y un token por pedido en el log del proveedor. Con caché sin vencimiento, el
   * día que el token expira todos los cobros empiezan a dar 401 a la vez y hay
   * que reiniciar el servicio para arreglarlo.
   */
  const obtenerToken = async (): Promise<string> => {
    if (token !== null && token.venceEn > ahora()) return token.valor

    const cuerpo = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret
    })

    const respuesta = await pedir(`${config.baseUrl}${config.tokenPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo.toString()
    })

    if (!respuesta.ok) {
      // El cuerpo del error se recorta: puede traer datos de la cuenta y esto
      // termina en un log.
      const detalle = await respuesta.text().catch(() => '')
      throw new Error(`Nave respondio ${respuesta.status} al pedir el token: ${detalle.slice(0, 200)}`)
    }

    const json = (await respuesta.json()) as Record<string, unknown>
    const accessToken = texto(json.access_token)

    if (accessToken === null) {
      throw new Error('Nave no devolvio access_token (revisar NAVE_TOKEN_PATH)')
    }

    const segundos = numero(json.expires_in) ?? 3600
    token = { valor: accessToken, venceEn: ahora() + Math.max(30, segundos - 60) * 1000 }

    return token.valor
  }

  const conToken = async <T>(ruta: string, metodo: string, cuerpo?: unknown): Promise<T> => {
    const accessToken = await obtenerToken()

    const respuesta = await pedir(`${config.baseUrl}${ruta}`, {
      method: metodo,
      headers: {
        // El token va **solo** en el header: una query string queda en los logs
        // del proxy y en el historial del servidor.
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      throw new Error(`Nave respondio ${respuesta.status} en ${ruta}: ${detalle.slice(0, 300)}`)
    }

    return (await respuesta.json()) as T
  }

  return {
    async crearCobro(solicitud: SolicitudCobro): Promise<CobroCreado> {
      const cuerpo = {
        reference: solicitud.referencia,
        external_reference: solicitud.referencia,
        amount: aUnidadDeNave(solicitud.total),
        currency: 'ARS',
        description: `Pedido ${solicitud.referencia}`,
        pos_id: config.posId,
        callback_url: solicitud.urls.exito,
        back_urls: {
          success: solicitud.urls.exito,
          failure: solicitud.urls.fallo,
          pending: solicitud.urls.pendiente
        },
        notification_url: solicitud.urls.webhook,
        payer: {
          name: solicitud.pagador.nombre,
          surname: solicitud.pagador.apellido,
          email: solicitud.pagador.email,
          phone: { number: solicitud.pagador.telefono },
          address: solicitud.pagador.direccion
        },
        items: solicitud.lineas.map((linea) => ({
          name: linea.nombre,
          quantity: linea.cantidad,
          unit_price: aUnidadDeNave(linea.precioUnitario)
        }))
      }

      const json = await conToken<Record<string, unknown>>(config.paymentPath, 'POST', cuerpo)

      const id = texto(primerCampo(json, ['id', 'payment_id', 'paymentId', 'request_id', 'requestId']))
      const checkoutUrl = texto(
        primerCampo(json, ['checkout_url', 'checkoutUrl', 'init_point', 'initPoint', 'redirect_url', 'url'])
      )

      if (id === null || checkoutUrl === null) {
        throw new Error(
          `Nave devolvio un cobro sin id o sin URL de checkout. Cuerpo: ${JSON.stringify(json).slice(0, 400)}`
        )
      }

      const qrCrudo = json.qr
      const qrObjeto = typeof qrCrudo === 'object' && qrCrudo !== null ? (qrCrudo as Record<string, unknown>) : {}

      const qrImagen = texto(
        primerCampo(qrObjeto, ['image', 'image_url', 'imageUrl', 'url']) ??
          primerCampo(json, ['qr_url', 'qrUrl'])
      )
      const qrPayload = texto(primerCampo(qrObjeto, ['payload', 'data', 'content']))

      return {
        id,
        checkoutUrl,
        qr: qrImagen === null && qrPayload === null ? null : { imagenUrl: qrImagen ?? undefined, payload: qrPayload ?? undefined },
        expiraEn: fecha(primerCampo(json, ['expires_at', 'expiration_date', 'expiresAt']))
      }
    },

    async estadoDe(id: string): Promise<EstadoDelCobro> {
      const json = await conToken<Record<string, unknown>>(
        `${config.paymentPath}/${encodeURIComponent(id)}`,
        'GET'
      )

      const estado = texto(primerCampo(json, ['status', 'estado', 'state']))

      if (estado === null) {
        throw new Error(
          `Nave devolvio un cobro sin estado (${id}). Cuerpo: ${JSON.stringify(json).slice(0, 400)}`
        )
      }

      return {
        id,
        estado,
        monto: deUnidadDeNave(numero(primerCampo(json, ['amount', 'total', 'transaction_amount'])) ?? 0),
        externalReference: texto(primerCampo(json, ['external_reference', 'reference', 'externalReference'])),
        fechaAprobacion: texto(primerCampo(json, ['date_approved', 'approved_at', 'fechaAprobacion'])),
        expiraEn: fecha(primerCampo(json, ['expires_at', 'expiration_date', 'expiresAt']))
      }
    }
  }
}
