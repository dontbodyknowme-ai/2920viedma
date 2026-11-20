import type { EstadoPagoRemoto, PreferenceCreada, ProveedorPagos } from '../proveedor.js'
import { crearClienteNaveHttp, leerConfigNave, type FuenteConfigNave } from './http.js'
import { SimuladorNave } from './mock.js'
import { traducirEstado } from './status-map.js'
import type { ClienteNave } from './types.js'

/**
 * El adaptador entre Nave y el checkout (spec 012, T025).
 *
 * ## Por qué hay un adaptador y no una segunda interfaz pública
 *
 * El plan original proponía `NaveClient` **además** de `ProveedorPagos`. Son la
 * misma cosa con nombres distintos, y dos interfaces que describen lo mismo
 * terminan divergiendo: un día `crearPedido` llama a una y el webhook a la otra.
 *
 * Acá hay una sola interfaz pública —`ProveedorPagos`, la que ya usa todo el
 * sistema— y una sola implementación por proveedor. `ClienteNave` queda del lado
 * de adentro, pegado al HTTP, y no lo ve nadie más.
 *
 * ## Por qué el estado se traduce acá
 *
 * Porque es el borde: hacia adentro el resto del sistema habla el vocabulario de
 * `aplicarPago`, y `status-map.ts` es la única tabla que lo produce. Si la
 * traducción quedara en cada llamador, habría dos tablas y una de las dos se
 * olvidaría.
 */

export const proveedorDesdeCliente = (cliente: ClienteNave): ProveedorPagos => ({
  async crearPreference(solicitud): Promise<PreferenceCreada> {
    const cobro = await cliente.crearCobro({
      referencia: solicitud.referencia,
      total: solicitud.total,
      lineas: solicitud.lineas.map((linea) => ({
        nombre: linea.nombre,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario
      })),
      pagador: solicitud.pagador,
      urls: solicitud.urls
    })

    return {
      id: cobro.id,
      initPoint: cobro.checkoutUrl,
      ...(cobro.qr === null ? {} : { qr: cobro.qr }),
      expiraEn: cobro.expiraEn === null ? null : cobro.expiraEn.toISOString()
    }
  },

  async estadoDe(id): Promise<EstadoPagoRemoto> {
    const cobro = await cliente.estadoDe(id)

    return {
      id: cobro.id,
      estado: traducirEstado(cobro.estado),
      monto: cobro.monto,
      fechaAprobacion: cobro.fechaAprobacion,
      externalReference: cobro.externalReference
    }
  }
})

/**
 * Un proveedor que existe para fallar con el motivo exacto.
 *
 * Se registra cuando `NAVE_MODE` pide sandbox o producción y falta configuración.
 * La alternativa —no registrar nada— deja el checkout con el error genérico
 * "Mercado Pago no está configurado", que apunta al proveedor equivocado y no
 * dice qué variable falta.
 */
export const proveedorRoto = (motivo: string): ProveedorPagos => {
  const fallar = (): never => {
    throw new Error(`Nave no esta configurado: ${motivo}`)
  }

  return {
    async crearPreference() {
      return fallar()
    },
    async estadoDe() {
      return fallar()
    }
  }
}

/**
 * El simulador activo, si `NAVE_MODE=mock`.
 *
 * Vive a nivel de módulo porque las rutas de desarrollo (`/pago-simulado/:id`)
 * necesitan **el mismo** objeto que creó los cobros: son un `Map` en memoria.
 * Inyectarlo por parámetro obligaría a pasarlo por tres capas para llegar a una
 * ruta que solo existe en mock.
 */
let simuladorActivo: SimuladorNave | null = null

export const obtenerSimuladorNave = (): SimuladorNave | null => simuladorActivo

export interface NaveConfigurado {
  proveedor: ProveedorPagos
  simulador: SimuladorNave | null
  /** `null` si quedó bien; si no, qué falta o por qué no se configuró. */
  problema: string | null
}

export const crearProveedorNave = (
  modo: 'mock' | 'sandbox' | 'production',
  fuente: FuenteConfigNave,
  opciones: { baseUrl: string; produccion: boolean; fetchImpl?: typeof fetch }
): NaveConfigurado => {
  if (modo === 'mock') {
    /**
     * El simulador **no existe con `NODE_ENV=production`**.
     *
     * `NAVE_MODE=mock` registra `/pago-simulado/:id/aprobado`, una ruta publica
     * que llama a `aplicarPago` y deja el pedido `aprobado` sin que nadie haya
     * pagado. Con el default del repo (`mock`) y un deploy que no fije la
     * variable, eso no es "no cobra plata real": es cualquiera con un link de
     * checkout aprobandose el pedido y sumando `totalSpent`.
     *
     * Se devuelve un proveedor **roto** en vez de `null` para que el checkout
     * falle con el motivo exacto en lugar del generico "no hay proveedor
     * configurado", que manda a buscar en el lugar equivocado.
     */
    if (opciones.produccion) {
      simuladorActivo = null

      return {
        proveedor: proveedorRoto('NAVE_MODE=mock no esta permitido en produccion'),
        simulador: null,
        problema:
          'NAVE_MODE=mock con NODE_ENV=production: no se registra el simulador ni se crean cobros'
      }
    }

    const simulador = new SimuladorNave(opciones.baseUrl)
    simuladorActivo = simulador

    return { proveedor: proveedorDesdeCliente(simulador), simulador, problema: null }
  }

  simuladorActivo = null

  const leida = leerConfigNave(fuente)

  if ('faltan' in leida) {
    return {
      proveedor: proveedorRoto(`faltan ${leida.faltan.join(', ')}`),
      simulador: null,
      problema: `NAVE_MODE=${modo} pero faltan ${leida.faltan.join(', ')}`
    }
  }

  const cliente = crearClienteNaveHttp(leida.config, { fetchImpl: opciones.fetchImpl })

  return { proveedor: proveedorDesdeCliente(cliente), simulador: null, problema: null }
}
