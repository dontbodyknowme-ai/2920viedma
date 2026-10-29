import type { ClienteNave, CobroCreado, EstadoDelCobro, SolicitudCobro } from './types.js'
import { randomUUID } from 'node:crypto'

/**
 * El simulador de Nave (spec 012, T021 y FR-018).
 *
 * ## Por qué existe
 *
 * Sin credenciales no hay forma de recorrer el circuito: ni link, ni QR, ni
 * aprobado, ni rechazado. Con el simulador, `NAVE_MODE=mock` permite probar
 * **todos** los estados de punta a punta, incluido el webhook, y el código que
 * corre es el mismo que en producción salvo este archivo.
 *
 * ## Por qué el link apunta a nuestra propia API
 *
 * Un `checkoutUrl` de mentira (`https://ejemplo.com/pagar`) convierte cada
 * prueba en un callejón: se puede verificar que el botón redirige, pero no que
 * la orden cambie de estado. Apuntando a `/pago-simulado/:id` —una página que
 * sirve este mismo backend— el circuito se cierra: se aprueba, se dispara el
 * webhook y la orden pasa a `aprobado` de verdad.
 *
 * ## Lo que este archivo NO simula
 *
 * El HTML del checkout de Nave, sus comisiones, sus plazos ni sus validaciones.
 * Simula **el contrato**: crear un cobro, dar un link y un QR, informar estado.
 */
export class SimuladorNave implements ClienteNave {
  private readonly cobros = new Map<string, EstadoDelCobro>()

  constructor(
    /** Origen público de la API, para armar el link del simulador. */
    private readonly baseUrl: string
  ) {}

  async crearCobro(solicitud: SolicitudCobro): Promise<CobroCreado> {
    /**
     * El id lleva un UUID y no un contador en memoria.
     *
     * `PaymentAttempt.referenciaExterna` es `@unique` y vive en Postgres, pero el
     * contador vive en el proceso: al reiniciar vuelve a `1` y el primer cobro
     * choca con la fila de la corrida anterior (`P2002`), el intento se marca
     * `expirado` y el checkout devuelve 502. En Render free el proceso se duerme
     * y despierta seguido, asi que no es un caso raro: es el estado normal.
     */
    const id = `nave_mock_${randomUUID()}`
    const expiraEn = new Date(Date.now() + 30 * 60 * 1000)

    this.cobros.set(id, {
      id,
      estado: 'pendiente',
      monto: solicitud.total,
      externalReference: solicitud.referencia,
      fechaAprobacion: null,
      expiraEn
    })

    return {
      id,
      checkoutUrl: `${this.baseUrl}/pago-simulado/${id}`,
      // El SVG lo sirve `GET /pago-simulado/:id/qr.svg`. No es un QR escaneable
      // y lo dice: un QR falso que parece real es peor que no tener QR.
      qr: {
        imagenUrl: `${this.baseUrl}/pago-simulado/${id}/qr.svg`,
        payload: `NAVE-SIMULADO:${solicitud.referencia}:${solicitud.total}`
      },
      expiraEn
    }
  }

  async estadoDe(id: string): Promise<EstadoDelCobro> {
    const cobro = this.cobros.get(id)

    if (cobro === undefined) {
      throw new Error(`el simulador no conoce el cobro ${id}`)
    }

    return { ...cobro }
  }

  /** Lo usa la página del simulador. Devuelve `false` si el id no existe. */
  cambiarEstado(id: string, estado: 'aprobado' | 'rechazado' | 'vencido'): boolean {
    const cobro = this.cobros.get(id)
    if (cobro === undefined) return false

    cobro.estado = estado
    if (estado === 'aprobado') cobro.fechaAprobacion = new Date().toISOString()

    return true
  }

  /** Para que la página del simulador pueda mostrar el monto y la referencia. */
  ver(id: string): EstadoDelCobro | null {
    const cobro = this.cobros.get(id)
    return cobro === undefined ? null : { ...cobro }
  }
}
