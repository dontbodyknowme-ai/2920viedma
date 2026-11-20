import type { EstadoPago, PrismaClient } from '@prisma/client'
import { logger } from '../../utils/logger.js'
import { aplicarPago } from './service.js'

/**
 * Expiracion de pedidos sin pagar (spec 009, T5, RF-07).
 *
 * ## Por que un cron y no el frontend
 *
 * Si expirara el frontend al volver de Mercado Pago, un comprador que cierra la
 * pestana sin pagar **no expira nunca**: su pedido queda en `pendiente` para
 * siempre, y si el vino tiene stock reservado, ese stock no vuelve. La unica
 * forma de cubrir al que se va es que el servidor lo haga solo.
 *
 * ## Que expira
 *
 * `pagoEstado in ('no_iniciado', 'pendiente')` con mas de 10 minutos. Un pedido
 * `aprobado` o `rechazado` no expira: ya tiene su resultado.
 *
 * ## Que NO toca
 *
 * **`Order.status`.** `expirado` no existe en `OrderStatus` (D-7), y aunque
 * existiera significaria "el envio se vencio" — que no es lo que paso. Un pedido
 * que nadie pago no tiene un envio vencido: tiene un envio **que nunca se
 * mando**.
 *
 * ## El intervalo
 *
 * Un minuto. Mas seguido no aporta nada (la ventana es de 10 minutos) y es una
 * consulta por minuto de por vida; menos seguido deja pedidos colgados hasta
 * casi el doble del plazo.
 */

/** Minutos que un pedido espera antes de darse por abandoned. */
export const MINUTOS_PARA_EXPIRAR = 10

const unMinutoEnMs = 60 * 1000

/** Cuantos pedidos vencieron en la ultima pasada. Devuelve el numero. */
export const expirarPedidosSinPagar = async (prisma: PrismaClient): Promise<number> => {
  const limite = new Date(Date.now() - MINUTOS_PARA_EXPIRAR * unMinutoEnMs)

  /**
   * `updateMany` y no `findMany` + `update` por cada uno.
   *
   * Ademas de ser una sola consulta, es **atomico**: si dos instancias del
   * backend corren el cron a la vez (que es lo que pasa en un deploy con
   * solapamiento), cada pedido lo actualiza **una** vez. Con el ciclo
   * find-then-update, las dos lo leerian y las dos lo escribirian, y cada una
   * sumaria su propio `totalSpent`.
   *
   * El `where` vuelve a llevar `pagoEstado in (...)`: entre que se calcula el
   * `where` y que corre la consulta, la webhook pudo aprobar el pedido. Sin el,
   * un pago que llego a tiempo se pisaria con un `expirado`.
   */
  const { count } = await prisma.order.updateMany({
    where: {
      pagoEstado: { in: ['no_iniciado', 'pendiente'] },
      createdAt: { lt: limite }
    },
    data: { pagoEstado: 'expirado' }
  })

  return count
}

/**
 * Cuantos minutos se espera antes de preguntarle al proveedor por un intento
 * que sigue `pendiente`.
 *
 * Dos minutos y no cero: el webhook tarda unos segundos, y preguntar por cada
 * intento recien creado es una llamada de red por checkout que casi siempre
 * devuelve lo mismo que ya sabemos.
 */
export const MINUTOS_PARA_RECONCILIAR = 2

/**
 * Tope de intentos por pasada.
 *
 * Sin tope, un dia con muchos links abiertos y el proveedor lento convierte el
 * cron en una tormenta de requests. Con tope, lo que no entra en esta pasada
 * entra en la siguiente: el cron corre cada minuto.
 */
export const MAX_INTENTOS_POR_PASADA = 20

export interface ResultadoReconciliacion {
  /** Intentos que se marcaron vencidos porque su `expiresAt` ya paso. */
  vencidos: number
  /** Intentos que se le preguntaron al proveedor. */
  revisados: number
  /** Intentos cuyo pedido cambio de estado en esta pasada. */
  actualizados: number
}

/**
 * Reconcilia los pagos que quedaron en el aire (spec 012, FR-020).
 *
 * ## Por que hace falta ademas del webhook
 *
 * Un webhook se pierde: el backend estaba reiniciando, el proveedor no reintento,
 * o la notificacion se corto. Sin reconciliacion, ese pedido queda `pendiente`
 * para siempre y el comprador pago sin que el panel se entere.
 *
 * ## Por que no toca los aprobados
 *
 * `aplicarPago` es idempotente y su transicion es condicional: si el pago ya se
 * aplico, devuelve `aplicado: false` y no suma nada. Llamarlo de mas no rompe,
 * pero se evita igual: los terminales no se vuelven a preguntar.
 */
export const reconciliarPagosPendientes = async (
  prisma: PrismaClient
): Promise<ResultadoReconciliacion> => {
  const ahora = new Date()

  /**
   * 1a. Antes de dar un link por vencido, preguntarle al proveedor.
   *
   * El vencimiento es el ultimo momento en el que todavia se puede recuperar un
   * pago cuya webhook se perdio (Render dormido, deploy, notificacion cortada).
   * Si se marca `expirado` sin preguntar, el paso 2 —que solo mira
   * `estado: 'pendiente'`— no lo consulta nunca mas y el pedido queda colgado
   * aunque el dinero se haya cobrado.
   */
  const porVencer = await prisma.paymentAttempt.findMany({
    where: {
      estado: 'pendiente',
      referenciaExterna: { not: null },
      expiresAt: { not: null, lt: ahora }
    },
    take: MAX_INTENTOS_POR_PASADA,
    select: { id: true, referenciaExterna: true }
  })

  for (const intento of porVencer) {
    if (intento.referenciaExterna === null) continue

    try {
      const resultado = await aplicarPago(prisma, intento.referenciaExterna, 'Nave')

      /**
       * Solo los terminales. `monto_insuficiente` y los estados desconocidos
       * dejan el intento `pendiente` para que la pasada siguiente lo venza: no
       * hay nada mas que preguntar.
       */
      if (resultado.estado === 'aprobado' || resultado.estado === 'rechazado') {
        await prisma.paymentAttempt.update({
          where: { id: intento.id },
          data: { estado: resultado.estado as EstadoPago }
        })
      }
    } catch (error: unknown) {
      // Un proveedor caido no puede impedir que el resto de los links venza.
      logger.warn(
        { err: error, intento: intento.id },
        'no se pudo consultar un intento por vencer'
      )
    }
  }

  /**
   * 1b. Los que quedaron `pendiente`: nadie pago.
   *
   * `expirado` y **no** `rechazado`: nadie intento pagar y fallo. Es el mismo
   * criterio que usa `aplicarPago` para el estado remoto `expired`.
   */
  const vencidos = await prisma.paymentAttempt.updateMany({
    where: { estado: 'pendiente', expiresAt: { not: null, lt: ahora } },
    data: { estado: 'expirado' }
  })

  const limite = new Date(ahora.getTime() - MINUTOS_PARA_RECONCILIAR * unMinutoEnMs)

  /**
   * 2. Los pendientes con id externo. `referenciaExterna: { not: null }` no es
   * decorativo: un intento que nunca recibio id del proveedor no se puede
   * consultar, y preguntar por `undefined` seria un 404 por minuto.
   */
  const pendientes = await prisma.paymentAttempt.findMany({
    where: {
      estado: 'pendiente',
      referenciaExterna: { not: null },
      createdAt: { lt: limite }
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_INTENTOS_POR_PASADA,
    select: { id: true, referenciaExterna: true }
  })

  let actualizados = 0

  for (const intento of pendientes) {
    if (intento.referenciaExterna === null) continue

    try {
      const resultado = await aplicarPago(prisma, intento.referenciaExterna, 'Nave')

      if (resultado.aplicado) actualizados += 1

      /**
       * El intento refleja el mismo hecho que el pedido. `monto_insuficiente` y
       * los estados desconocidos **no** son terminales: el pedido queda como
       * esta y se vuelve a preguntar en la proxima pasada.
       */
      if (
        resultado.estado === 'aprobado' ||
        resultado.estado === 'rechazado' ||
        resultado.estado === 'expirado'
      ) {
        await prisma.paymentAttempt.update({
          where: { id: intento.id },
          data: { estado: resultado.estado as EstadoPago }
        })
      }
    } catch (error: unknown) {
      /**
       * Un intento que falla **no** corta la pasada: los demas son pedidos
       * distintos y tienen derecho a su reconciliacion. Se registra y se sigue;
       * el proximo minuto se reintenta.
       */
      logger.warn(
        { err: error, intento: intento.id },
        'no se pudo reconciliar un intento de pago'
      )
    }
  }

  return { vencidos: vencidos.count, revisados: pendientes.length, actualizados }
}

/**
 * Arranca el cron y lo **apaga** cuando la app cierra.
 *
 * El `unref()` no es cosmetico: en Node, un `setInterval` vivo mantiene el
 * proceso abierto. Sin `unref`, el `npm test` de un archivo que arranque la app
 * **no termina nunca** —queda esperando que el intervalo se vacie— y el sintoma es
 * un test que pasa en verde y cuelga la suite.
 */
export const arrancarCronPedidos = (prisma: PrismaClient): (() => void) => {
  const intervalo = setInterval(() => {
    expirarPedidosSinPagar(prisma).catch((error: unknown) => {
      // Un fallo del cron **no** puede voltear la app: la app sigue atendiendo
      // pedidos aunque la expiracion falle. Se registra y se sigue; el proximo
      // minuto se reintenta solo.
      logger.error({ err: error }, 'el cron de expiracion fallo')
    })

    reconciliarPagosPendientes(prisma).catch((error: unknown) => {
      // Mismo criterio que la expiracion: un webhook perdido se reintenta el
      // proximo minuto, y la app no se cae por eso.
      logger.error({ err: error }, 'el cron de reconciliacion fallo')
    })
  }, unMinutoEnMs)

  if (typeof intervalo.unref === 'function') intervalo.unref()

  return () => clearInterval(intervalo)
}
