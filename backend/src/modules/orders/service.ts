import type { PrismaClient, EstadoPago } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { orderCreateSchema, type OrderCreateInput } from '../../shared/schemas.js'
import { AppError } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { obtenerProveedor } from '../pagos/proveedor.js'
import { env } from '../../config/env.js'

/**
 * Crear un pedido desde el checkout (spec 009, T3).
 *
 * Vive aparte de `routes.ts` a proposito: el modulo de pedidos tiene una sola
 * logica —leer y cambiar estados desde el panel— y esta es otra, con reglas
 * distintas. `routes.ts` traduce HTTP; aca pasan las cosas.
 */

/** El `P2002` de Prisma: violacion de una restriccion unica. */
const ES_UNIQUE = 'P2002'

export interface ResultadoCheckout {
  modo?: 'transferencia' | 'mercadopago'
  orderId: string
  /**
   * Token publico del pedido (spec 012, FR-009).
   *
   * Es lo unico que necesita el comprador para volver a ver su pedido. No es el
   * `orderId`: ese es el id interno y el panel lo usa para todo.
   */
  orderToken: string
  total: number
  preferenceId?: string
  initPoint?: string
  /** QR del cobro, si el proveedor lo devuelve (spec 012). */
  qr?: { imagenUrl?: string; payload?: string }
  /** Vencimiento del link/QR en ISO 8601. */
  expiraEn?: string | null
  instrucciones?: {
    titular?: string
    alias?: string
    cbu?: string
    banco?: string
    monto: number
    referencia: string
  }
}

/** El origen publico del frontend, para armar las `back_urls`. */
const origenPublico = (): string =>
  env.FRONTEND_ORIGIN ?? env.PUBLIC_API_URL ?? ''

/**
 * Resuelve el `Customer` del comprador (D-9).
 *
 * **Busca por email en minusculas**; si existe, reutiliza la ficha y le actualiza
 * el telefono; si no, crea una.
 *
 * ## Por que el `P2002` no se ignora
 *
 * Dos checkouts del mismo email al mismo tiempo: los dos buscan, los dos no
 * encuentran, los dos insertan, y **uno se lleva una violacion de unico**.
 *
 * Lo tipico seria dejar que reviente: el 500 le diria al comprador que "algo
 * fallo" y no tendria forma de reintentar sin perder el carrito. Ademas el
 * `P2002` puede venir por **cualquier** unico de la tabla —una clave ajena que
 * quedara—there que no es una carrera y no se debe reintentar.
 *
 * Por eso se mira **que** unico salto: si fue `Customer.email`, es la carrera y
 * se reintenta la busqueda; cualquier otro `P2002` se propaga.
 */
const resolverCustomer = async (
  prisma: PrismaClient,
  entrada: OrderCreateInput
): Promise<{ id: string }> => {
  const buscar = () =>
    prisma.customer.findUnique({ where: { email: entrada.email }, select: { id: true } })

  const nombreCompleto = `${entrada.nombre} ${entrada.apellido}`.trim()

  const existente = await buscar()
  if (existente !== null) {
    // El telefono es el unico dato que se corrige solo: la persona lo escribe
    // de otra forma cada vez y el CRM necesita la ultima version.
    await prisma.customer.update({
      where: { id: existente.id },
      data: { phone: entrada.telefono }
    })
    return existente
  }

  try {
    const creado = await prisma.customer.create({
      data: {
        name: nombreCompleto,
        email: entrada.email,
        phone: entrada.telefono
      },
      select: { id: true }
    })
    return creado
  } catch (error: unknown) {
    if (!esViolacionDeUnicoEn(error, 'email')) throw error

    // Carrera: otro checkout creo la ficha entre nuestra busqueda y nuestro
    // insert. Reintentamos la busqueda. Si tampoco lo encontramos, la exception
    // original es la que explica el problema.
    const despuesDeLaCarrera = await buscar()
    if (despuesDeLaCarrera === null) throw error
    return despuesDeLaCarrera
  }
}

/**
 * ¿Este error es la violacion de unicidad de **este** campo?
 *
 * El campo es **obligatorio** y no opcional a proposito: la primera version lo
 * tenia opcional y se llamaba sin argumento, asi que `campo === undefined`
 * devolvia `true` para **cualquier** `P2002`. El efecto era que un conflicto de
 * otra columna se tomaba por una carrera, se reintentaba la busqueda, y el
 * error real quedaba escondido dos operaciones mas adentro. Un parametro que
 * uno se puede olvidar es un parametro que uno se olvida; que lo obligatorio lo
 * convierta en un error de compilacion.
 */
const esViolacionDeUnicoEn = (error: unknown, campo: string): boolean => {
  if (typeof error !== 'object' || error === null) return false

  const codigo = (error as { code?: unknown }).code
  if (codigo !== ES_UNIQUE) return false

  // `meta.target` viene como array de columnas (`['email']`) en unas versiones y
  // como nombre de la restriccion (`'Customer_email_key'`) en otras. Se cubren
  // las dos comparando en minusculas.
  const meta = (error as { meta?: { target?: unknown } }).meta
  const objetivo = Array.isArray(meta?.target)
    ? meta?.target.join(',')
    : String(meta?.target ?? '')

  return objetivo.toLowerCase().includes(campo.toLowerCase())
}

/** Un vino que el cliente pidio y no existe, o esta dado de baja. */
export class VinoNoDisponible extends AppError {
  constructor(vinos: string[]) {
    super(
      'WINE_NOT_AVAILABLE',
      400,
      `Estos vinos ya no estan disponibles: ${vinos.join(', ')}`
    )
  }
}

/**
 * Los estados de Mercado Pago que nos importan, y a que estado nuestro.
 *
 * `in_process`, `authorized`, `pending`, `cancelled` y los que no estan aca
 * **dejan el pedido donde esta**: no son un fallo y no son un pago. Pasarlos a
 * `rechazado` seria mentir —el comprador puede estar esperando que el banco lo
 * confirme— y pasar a `aprobado` seria peor.
 *
 * Cuando el pago vuelve a `pending` despues de `in_process`, que es lo normal,
 * el pedido queda en `pendiente` y el cron lo expira si no se concreta.
 */
const ESTADO_REMOTO_A_NUESTRO: Record<string, 'aprobado' | 'rechazado' | 'pendiente' | 'expirado'> = {
  approved: 'aprobado',
  rejected: 'rechazado',
  /**
   * `cancelled` **no esta a proposito**, igual que dice el comentario de
   * arriba: una cancelacion voluntaria del comprador no es un rechazo. Antes
   * estaba mapeada a `rechazado` y el efecto era que el panel contaba como
   * intento fallido algo que la persona decidio no terminar, y el pedido quedaba
   * en un estado terminal que `reintentarPago` igual permite abandonar.
   *
   * Sin mapear, `aplicarPago` devuelve `aplicado: false` y el pedido sigue
   * `pendiente`: el cron lo expira si nadie paga, y si el comprador vuelve a
   * entrar puede generar un link nuevo.
   */
  charged_back: 'rechazado',
  pending: 'pendiente',
  in_process: 'pendiente',
  authorized: 'pendiente',
  /**
   * Vencido (spec 012). **No** es un rechazo: nadie intento pagar y fallo, el
   * link se consumio. Marcarlo `rechazado` haria que el panel cuente como
   * intentos fallidos un monton de pedidos que el comprador nunca pago.
   */
  expirado: 'expirado'
}

/**
 * Aplica un pago informado por la webhook (spec 009, T4).
 *
 * ## El estado NO viene del cuerpo de la webhook
 *
 * La notificacion dice *qué* cambio, no *en qué estado está*. Por eso se consulta
 * `GET /v1/payments/:id` a Mercado Pago. Si nos fiáramos del cuerpo, cualquiera
 * que descubra la URL mandaria `{ data: { id: <un pedido real> } }` con lo que
 * quiera adentro.
 *
 * ## Idempotencia: no hay "ya estaba aplicado"
 *
 * Mercado Pago **reintenta**, y el error tipico es sumar el total al `Customer`
 * dos veces. La forma tipica de evitarlo —leer el pedido, ver si ya esta
 * `aprobado`, y salir— tiene una carrera: dos notificaciones al mismo tiempo
 * leen las dos "no aprobado" y las dos suman.
 *
 * Por eso la transicion la hace **un unico `updateMany` condicional**, que en
 * Postgres es atomico: `WHERE pagoEstado <> 'aprobado'`. Solo el que cambia la
 * fila recibe `count === 1`, y solo ese toca el `Customer`. Los demas no tienen
 * que preguntar nada: el numero de filas afectadas lo dice.
 */
export const aplicarPago = async (
  prisma: PrismaClient,
  pagoId: string,
  /** Quien confirmo el pago. Aparece en el historial del panel. */
  origen: string = 'Mercado Pago'
): Promise<{ aplicado: boolean; estado: string }> => {
  // 1. El estado real, de la pasarela.
  const remoto = await obtenerProveedor().estadoDe(pagoId)

  const destino = ESTADO_REMOTO_A_NUESTRO[remoto.estado]
  if (destino === undefined) {
    // Un estado que no conocemos no se traduce: el pedido se queda como esta y
    // se responde 200. Devolver 4xx/5xx haria que Mercado Pago reintentara una
    // notificacion que no vamos a entender nunca.
    return { aplicado: false, estado: remoto.estado }
  }

  // 2. El pedido, por `external_reference` (el id del pedido que mandamos en la
  // Preference). **No** por `pagoId`: la webhook recibe el id del **pago**, y
  // ese no es la Preference. Es la llave correcta para cruzar los dos mundos.
  if (remoto.externalReference === null || remoto.externalReference === '') {
    return { aplicado: false, estado: remoto.estado }
  }

  const pedido = await prisma.order.findUnique({
    where: { id: remoto.externalReference },
    select: { id: true, customerId: true, total: true, pagoEstado: true }
  })

  if (pedido === null) {
    // Una notificacion de un pago que no es nuestro, o de una Preference vieja
    // que ya expiro. No es un error que haya que reportar.
    return { aplicado: false, estado: remoto.estado }
  }

  // 2b. El monto. Un `approved` con menos dinero del total no acredita nada:
  // el pedido queda para revision en vez de cerrarse como pagado a medias.
  if (destino === 'aprobado' && remoto.monto < pedido.total) {
    return { aplicado: false, estado: 'monto_insuficiente' }
  }

  // 3. La transicion, atomica. Los estados terminales (`aprobado`, `rechazado`)
  // no se pueden abandonar: un replay viejo no degrada un pedido ya resuelto.
  // `expirado` si puede pasar a `aprobado`: es un pago tardio y legitimo.
  const estadosOrigen: EstadoPago[] = destino === 'pendiente'
    ? ['no_iniciado', 'pendiente']
    : ['no_iniciado', 'pendiente', 'expirado']

  const transicion = await prisma.order.updateMany({
    where: { id: pedido.id, pagoEstado: { in: estadosOrigen } },
    data: { pagoEstado: destino }
  })

  if (transicion.count === 0) {
    // Ya estaba en ese estado. **No** se toca el `Customer` ni se agrega una
    // segunda entrada al historial: una reentrega no es un segundo pago.
    return { aplicado: false, estado: destino }
  }

  await prisma.orderTimeline.create({
    data: { orderId: pedido.id, pagoEstado: destino, origen }
  })

  // 4. Las metricas del cliente, **solo** al aprobar. Un rechazo no suma
  //    `totalSpent` ni `totalOrders`: el comprador no compro.
  if (destino === 'aprobado') {
    await prisma.customer.update({
      where: { id: pedido.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: pedido.total },
        lastOrderAt: new Date()
      }
    })
  }

  return { aplicado: true, estado: destino }
}

/** Los datos del comprador que viajan al proveedor. */
export interface PagadorDelCobro {
  nombre: string
  apellido: string
  email: string
  telefono: string
  direccion: string
}

interface LineaDelCobro {
  vinoId: string
  nombre: string
  cantidad: number
  precioUnitario: number
}

export interface CobroGenerado {
  preferenceId: string
  initPoint: string
  qr?: { imagenUrl?: string; payload?: string }
  expiraEn: string | null
}

/**
 * Pide el cobro al proveedor y deja el intento y el pedido actualizados.
 *
 * ## Por que esta separado de `crearPedido`
 *
 * Porque el reintento (`POST /api/track/:token/pay`) necesita **exactamente lo
 * mismo** sobre un pedido que ya existe: crear un intento, llamar al proveedor,
 * guardar link y QR, y marcar el pedido `pendiente`. Duplicarlo seria dos
 * lugares que crean cobros, y el dia que uno cambie (un campo nuevo, otra URL de
 * vuelta) el otro se queda atras sin que nada falle.
 *
 * El pedido ya tiene que existir: `referencia` es su id y es lo que cruza el pago
 * con la orden cuando llega el webhook.
 */
const generarCobro = async (
  prisma: PrismaClient,
  pedido: { id: string; publicToken: string },
  pagador: PagadorDelCobro,
  lineas: LineaDelCobro[],
  total: number,
  webhookUrl: string
): Promise<CobroGenerado> => {
  const origen = origenPublico()

  /**
   * Las `back_urls` apuntan a `/pedido/:token`, **no** a `/?pago=aprobado`.
   *
   * La pagina del pedido es la que consulta el estado real y muestra el QR o el
   * boton de reintento. Volver al inicio con un query param obligaba al
   * comprador a adivinar que paso con su plata.
   */
  const urls = {
    exito: `${origen}/pedido/${pedido.publicToken}`,
    fallo: `${origen}/pedido/${pedido.publicToken}?pago=fallido`,
    pendiente: `${origen}/pedido/${pedido.publicToken}?pago=pendiente`,
    webhook: webhookUrl
  }

  /**
   * Un intento por checkout (D5), creado **antes** de llamar al proveedor.
   *
   * Si la llamada falla, el intento queda `expirado` y se ve en el panel que
   * hubo un intento que no llego a tener link. Crearlo despues de la respuesta
   * dejaria los fallos invisibles: el unico rastro seria un 502 en el log.
   */
  const intento = await prisma.paymentAttempt.create({
    data: { orderId: pedido.id, proveedor: env.PAGO_MODO, estado: 'pendiente' },
    select: { id: true }
  })

  try {
    const cobro = await obtenerProveedor().crearPreference({
      pagador,
      lineas,
      total,
      urls,
      referencia: pedido.id
    })

    await prisma.paymentAttempt.update({
      where: { id: intento.id },
      data: {
        referenciaExterna: cobro.id,
        checkoutUrl: cobro.initPoint,
        qrImagenUrl: cobro.qr?.imagenUrl ?? null,
        qrPayload: cobro.qr?.payload ?? null,
        expiresAt:
          cobro.expiraEn === undefined || cobro.expiraEn === null ? null : new Date(cobro.expiraEn)
      }
    })

    /**
     * `pagoEstado = pendiente` en cuanto existe el cobro.
     *
     * Antes solo lo movia el webhook, asi que un pedido con link abierto se veia
     * en el panel igual que uno que nunca salio del formulario. La distincion
     * importa para liberar stock y para saber a quien llamar.
     *
     * ## `updateMany` condicional, no `update`
     *
     * Entre el chequeo de `reintentarPago` y esta linea hay una llamada de red
     * al proveedor. Si el webhook aprueba el pedido en esa ventana, un `update`
     * incondicional lo devuelve a `pendiente` y le pisa el `pagoId`: cuando
     * llegue la reentrega del webhook, `aplicarPago` vera `pendiente`, aplicara
     * la transicion otra vez y **sumara `totalSpent` por segunda vez**. Es
     * exactamente la carrera que el `updateMany` de `aplicarPago` evita.
     */
    const { count } = await prisma.order.updateMany({
      where: { id: pedido.id, pagoEstado: { not: 'aprobado' } },
      data: { pagoEstado: 'pendiente', pagoId: cobro.id }
    })

    if (count === 0) {
      /**
       * El pedido se pago mientras creabamos el cobro. No se degrada ni se pisa
       * `pagoId`: el cobro recien creado queda huerfano en el proveedor (no hay
       * API de cancelacion confirmada), pero el pedido no se cuenta dos veces.
       */
      await prisma.paymentAttempt
        .update({ where: { id: intento.id }, data: { estado: 'expirado' } })
        .catch(() => undefined)

      logger.warn(
        { orderId: pedido.id, cobro: cobro.id },
        'el pedido ya estaba aprobado al crear el cobro: no se degrada'
      )

      throw new AppError('ALREADY_PAID', 409, 'Este pedido ya esta pagado')
    }

    return {
      preferenceId: cobro.id,
      initPoint: cobro.initPoint,
      ...(cobro.qr === undefined ? {} : { qr: cobro.qr }),
      expiraEn: cobro.expiraEn ?? null
    }
  } catch (error: unknown) {
    // Un `AppError` de esta misma funcion (el pedido ya estaba pagado) se
    // propaga tal cual: convertirlo en 502 mandaria al comprador a reintentar
    // un pago que ya existe.
    if (error instanceof AppError) throw error

    /**
     * El proveedor no respondio. **No** se borra el pedido: queda en
     * `no_iniciado`, el cron lo expira y el comprador puede reintentar desde
     * `/pedido/:token`.
     *
     * El intento se marca `expirado`, no `rechazado`: nadie rechazo nada. Un
     * `rechazado` haria que las metricas contaran como intentos fallidos del
     * comprador algo que fue una caida del proveedor.
     */
    await prisma.paymentAttempt
      .update({ where: { id: intento.id }, data: { estado: 'expirado' } })
      .catch(() => undefined)

    logger.error(
      { err: error, orderId: pedido.id, proveedor: env.PAGO_MODO },
      'no se pudo crear el cobro'
    )

    throw new AppError(
      'PAYMENT_PROVIDER_ERROR',
      502,
      'No pudimos generar el link de pago. Proba de nuevo en un momento.'
    )
  }
}

/**
 * La vista publica de un pedido (spec 012, FR-009).
 *
 * ## Que se muestra y que no
 *
 * El comprador ve **su** pedido: items, total, estado y el link/QR para pagar.
 * No ve el `orderId` interno, ni el email, ni el telefono de nadie: el token es
 * la unica llave y no hace falta exponer mas para contestar "como va mi pago".
 *
 * ## Por que el modo sale del intento y no del env
 *
 * `env.PAGO_MODO` dice como se cobra **hoy**. Si el comercio cambia de proveedor,
 * un pedido viejo seguiria mostrando el link del proveedor con el que se creo.
 * El intento guarda `proveedor`, asi que es el que manda; sin intentos, el
 * pedido es de transferencia (es el unico modo que no crea intento).
 */
export interface PedidoPublico {
  orderToken: string
  /** Referencia corta para mostrar y para el comprobante. No es el id interno. */
  referencia: string
  modo: 'mercadopago' | 'transferencia'
  estado: string
  pagoEstado: EstadoPago
  total: number
  creadoEn: string
  items: { nombre: string; cantidad: number; precio: number }[]
  pago: {
    estado: EstadoPago
    link: string | null
    qr: { imagenUrl?: string; payload?: string } | null
    expiraEn: string | null
  } | null
  instrucciones: ResultadoCheckout['instrucciones'] | null
}

export const obtenerPedidoPublico = async (
  prisma: PrismaClient,
  token: string
): Promise<PedidoPublico> => {
  const pedido = await prisma.order.findUnique({
    where: { publicToken: token },
    include: {
      items: { include: { producto: { select: { name: true } } } },
      attempts: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  })

  if (pedido === null) {
    throw new AppError('NOT_FOUND', 404, 'No encontramos ese pedido')
  }

  const ultimo = pedido.attempts[0]

  const modo: PedidoPublico['modo'] =
    ultimo === undefined ? 'transferencia' : 'mercadopago'

  const instrucciones =
    modo !== 'transferencia'
      ? null
      : {
          titular: env.TRANSFERENCIA_TITULAR,
          alias: env.TRANSFERENCIA_ALIAS,
          cbu: env.TRANSFERENCIA_CBU,
          banco: env.TRANSFERENCIA_BANCO,
          monto: pedido.total,
          referencia: (env.TRANSFERENCIA_CONCEPTO || 'Pedido {orderId}').replace(
            '{orderId}',
            pedido.publicToken.slice(0, 8).toUpperCase()
          )
        }

  return {
    orderToken: pedido.publicToken,
    referencia: pedido.publicToken.slice(0, 8).toUpperCase(),
    modo,
    estado: pedido.status,
    pagoEstado: pedido.pagoEstado,
    total: pedido.total,
    creadoEn: pedido.createdAt.toISOString(),
    items: pedido.items.map((item) => ({
      nombre: item.producto.name,
      cantidad: item.quantity,
      precio: item.price
    })),
    pago:
      ultimo === undefined
        ? null
        : {
            estado: ultimo.estado,
            link: ultimo.checkoutUrl,
            qr:
              ultimo.qrImagenUrl === null && ultimo.qrPayload === null
                ? null
                : {
                    ...(ultimo.qrImagenUrl === null ? {} : { imagenUrl: ultimo.qrImagenUrl }),
                    ...(ultimo.qrPayload === null ? {} : { payload: ultimo.qrPayload })
                  },
            expiraEn: ultimo.expiresAt === null ? null : ultimo.expiresAt.toISOString()
          },
    instrucciones
  }
}

/** Un pedido viejo que ya no tiene `Customer` no deberia ser reintentable. */
const direccionDe = (shippingAddress: unknown): string => {
  if (typeof shippingAddress !== 'object' || shippingAddress === null) return ''
  const valor = (shippingAddress as Record<string, unknown>).direccion
  return typeof valor === 'string' ? valor : ''
}

const partirNombre = (nombreCompleto: string): { nombre: string; apellido: string } => {
  const partes = nombreCompleto.trim().split(/\s+/).filter((parte) => parte !== '')
  return { nombre: partes[0] ?? '', apellido: partes.slice(1).join(' ') }
}

/**
 * Reintenta el cobro de un pedido que quedo sin pagar (spec 012).
 *
 * ## Por que no crea otro pedido
 *
 * Crear uno nuevo duplicaria stock reservado y ensuciaria el panel con pedidos
 * que nadie pago. El pedido es el mismo; lo que cambia es el intento.
 *
 * ## Por que reutiliza el link vigente
 *
 * Si el comprador recarga la pagina y toca "pagar" dos veces, generar dos cobros
 * deja dos links vivos para el mismo pedido, y si paga en los dos el segundo
 * llega como un pago de mas. Con el link vigente se devuelve el mismo.
 */
export const reintentarPago = async (
  prisma: PrismaClient,
  token: string,
  webhookUrl: string
): Promise<ResultadoCheckout> => {
  const pedido = await prisma.order.findUnique({
    where: { publicToken: token },
    include: {
      customer: true,
      items: { include: { producto: { select: { name: true } } } },
      attempts: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  })

  if (pedido === null) {
    throw new AppError('NOT_FOUND', 404, 'No encontramos ese pedido')
  }

  if (pedido.pagoEstado === 'aprobado') {
    throw new AppError('ALREADY_PAID', 409, 'Este pedido ya esta pagado')
  }

  if (env.PAGO_MODO === 'transferencia') {
    throw new AppError('NOT_RETRYABLE', 400, 'Este pedido se paga por transferencia')
  }

  const ultimo = pedido.attempts[0]
  const vigente =
    ultimo !== undefined &&
    ultimo.estado === 'pendiente' &&
    ultimo.checkoutUrl !== null &&
    (ultimo.expiresAt === null || ultimo.expiresAt.getTime() > Date.now())

  if (vigente) {
    return {
      modo: 'mercadopago',
      orderId: pedido.id,
      orderToken: pedido.publicToken,
      total: pedido.total,
      preferenceId: ultimo.referenciaExterna ?? ultimo.id,
      initPoint: ultimo.checkoutUrl ?? '',
      ...(ultimo.qrImagenUrl === null && ultimo.qrPayload === null
        ? {}
        : {
            qr: {
              ...(ultimo.qrImagenUrl === null ? {} : { imagenUrl: ultimo.qrImagenUrl }),
              ...(ultimo.qrPayload === null ? {} : { payload: ultimo.qrPayload })
            }
          }),
      expiraEn: ultimo.expiresAt === null ? null : ultimo.expiresAt.toISOString()
    }
  }

  const { nombre, apellido } = partirNombre(pedido.customer.name)

  const cobro = await generarCobro(
    prisma,
    { id: pedido.id, publicToken: pedido.publicToken },
    {
      nombre,
      apellido,
      email: pedido.customer.email ?? '',
      telefono: pedido.customer.phone ?? '',
      direccion: direccionDe(pedido.shippingAddress)
    },
    pedido.items.map((item) => ({
      vinoId: item.productoId,
      nombre: item.producto.name,
      cantidad: item.quantity,
      precioUnitario: item.price
    })),
    pedido.total,
    webhookUrl
  )

  return {
    modo: 'mercadopago',
    orderId: pedido.id,
    orderToken: pedido.publicToken,
    total: pedido.total,
    ...cobro
  }
}

export const crearPedido = async (
  prisma: PrismaClient,
  cuerpo: unknown,
  webhookUrl: string
): Promise<ResultadoCheckout> => {
  // El schema **ya** rechazo los precios que vengan de mas (T2). Aca no se los
  // vuelve a mirar: no hay `precioUnitario` en el tipo, no hay de donde sacarlo.
  const entrada = orderCreateSchema.parse(cuerpo)

  const ids = [...new Set(entrada.items.map((item) => item.vinoId))]

  const vinos = await prisma.product.findMany({
    where: { id: { in: ids }, activo: true },
    select: { id: true, name: true, price: true, stock: true }
  })

  const porId = new Map(vinos.map((vino) => [vino.id, vino]))

  const faltantes = ids.filter((id) => !porId.has(id))
  if (faltantes.length > 0) throw new VinoNoDisponible(faltantes)

  /**
   * El total sale de aca, de `Wine.price`, y es **el mismo numero** que se
   * guarda en `Order.total` y el que se manda a Mercado Pago.
   *
   * No se calculan por separado a proposito: si difirieran aunque sea un peso,
   * la webhook podria aprobar un monto que el panel nunca muestra, que es
   * exactamente el tipo de mentira que esta spec vino a arreglar.
   */
  const lineas = entrada.items.map((item) => {
    const vino = porId.get(item.vinoId)!

    return {
      vinoId: vino.id,
      nombre: vino.name,
      cantidad: item.cantidad,
      precioUnitario: vino.price
    }
  })

  const sinStock = lineas
    .filter((linea) => (porId.get(linea.vinoId)?.stock ?? 0) < linea.cantidad)
    .map((linea) => linea.nombre)

  if (sinStock.length > 0) {
    throw new AppError('INSUFFICIENT_STOCK', 400, `Sin stock suficiente: ${sinStock.join(', ')}`)
  }

  const total = lineas.reduce((suma, linea) => suma + linea.precioUnitario * linea.cantidad, 0)

  if (total <= 0) {
    throw new AppError('EMPTY_ORDER', 400, 'El pedido no tiene monto')
  }

  const cliente = await resolverCustomer(prisma, entrada)

  /**
   * El pedido se crea **antes** de pedirle el cobro al proveedor.
   *
   * Al reves —cobro primero y despues pedido— el proveedor no tendria a que
   * referenciar el pago, porque el id del pedido todavia no existe. Y el orden
   * importa por el fallo: si el proveedor no responde queda un pedido en
   * `no_iniciado`, que expira a los 10 minutos y el cron lo marca `expirado`.
   * Eso es correcto, y ademas deja el rastro de que alguien **intento** comprar.
   *
   * Al reves, si el cobro falla no queda nada, y el comprador solo ve un error.
   */
  const pedido = await prisma.order.create({
    data: {
      customerId: cliente.id,
      total,
      // Se genera **aca** y no se deja al `@default(uuid())` del schema porque
      // hace falta el valor para armar las `back_urls`, y leerlo despues seria
      // otra consulta en el camino critico del checkout.
      publicToken: randomUUID(),
      shippingAddress: { direccion: entrada.direccion },
      items: {
        create: lineas.map((linea) => ({
          productoId: linea.vinoId,
          quantity: linea.cantidad,
          // El precio congelado **de la base**, no el que mandaba el cliente y no
          // el de hoy: es el que se cobró.
          price: linea.precioUnitario
        }))
      }
    },
    select: { id: true, publicToken: true }
  })

  const orderToken = pedido.publicToken

  if (env.PAGO_MODO === 'transferencia') {
    /**
     * La referencia es la **corta y publica**, no `pedido.id`.
     *
     * Es el mismo valor que muestra `/pedido/:token`. Usar el id interno aca
     * haria que el comprador transfiera con una referencia distinta de la que ve
     * despues, y ademas filtraria un id que no hace falta exponer.
     */
    const referencia = pedido.publicToken.slice(0, 8).toUpperCase()
    const concepto = (env.TRANSFERENCIA_CONCEPTO || 'Pedido {orderId}').replace(
      '{orderId}',
      referencia
    )

    return {
      modo: 'transferencia',
      orderId: pedido.id,
      orderToken,
      total,
      instrucciones: {
        titular: env.TRANSFERENCIA_TITULAR,
        alias: env.TRANSFERENCIA_ALIAS,
        cbu: env.TRANSFERENCIA_CBU,
        banco: env.TRANSFERENCIA_BANCO,
        monto: total,
        referencia: concepto
      }
    }
  }

  const cobro = await generarCobro(
    prisma,
    { id: pedido.id, publicToken: orderToken },
    {
      nombre: entrada.nombre,
      apellido: entrada.apellido,
      email: entrada.email,
      telefono: entrada.telefono,
      direccion: entrada.direccion
    },
    lineas,
    total,
    webhookUrl
  )

  return {
    modo: 'mercadopago',
    orderId: pedido.id,
    orderToken,
    total,
    ...cobro
  }
}
