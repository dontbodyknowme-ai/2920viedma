import { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { requireRole } from '../auth/middleware.js'
import { orderCreateSchema } from '../../shared/schemas.js'
import { env } from '../../config/env.js'
import { crearPedido, aplicarPago, obtenerPedidoPublico, reintentarPago } from './service.js'
import { verificarFirmaWebhook, compararSecreto } from './firma.js'
import { reconciliarPagosPendientes } from './cron.js'
import { logger } from '../../utils/logger.js'

/** La URL publica del backend, que es la unica que un proveedor puede llamar. */
const urlDeWebhook = (ruta: string): string =>
  // `env.PUBLIC_API_URL` (validada) y no `process.env`: una barra final en la
  // variable producia `...com//api/orders/...` en la URL que se le da al
  // proveedor, y esa URL la usa el proveedor, no nosotros.
  `${env.PUBLIC_API_URL.replace(/\/+$/, '')}${ruta}`

/**
 * Techos de las dos rutas publicas que no crean cobros.
 *
 * `GET /api/track/:token` la consulta la pagina del pedido cada 5 segundos
 * (12 veces por minuto y por pestana), asi que el techo del checkout (10/min)
 * la dejaria sin actualizarse. El webhook lo llama el proveedor: se le deja un
 * margen amplio para que una rafaga legitima de notificaciones no se descarte
 * —descartarla es perder un pago— pero tampoco queda sin techo.
 */
const TRACK_RATE_MAX = 120
const WEBHOOK_RATE_MAX = 300

/**
 * El id del cobro segun Nave, sin inventar un shape.
 *
 * La documentacion oficial no esta (`[A CONFIRMAR]`, T001), asi que se aceptan
 * los nombres que un proveedor de pagos suele usar. **No** se acepta el estado:
 * el estado se pregunta a la API con ese id, igual que en Mercado Pago. Un
 * cuerpo con `status: approved` adentro no acredita nada.
 */
const idDeCobro = (cuerpo: unknown): string | null => {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null

  const raiz = cuerpo as Record<string, unknown>
  const datos =
    typeof raiz.data === 'object' && raiz.data !== null ? (raiz.data as Record<string, unknown>) : {}

  const candidatos = [
    datos.id,
    datos.payment_id,
    datos.paymentId,
    raiz.id,
    raiz.payment_id,
    raiz.paymentId,
    raiz.resource_id
  ]

  for (const candidato of candidatos) {
    if (typeof candidato === 'string' && candidato.trim() !== '') return candidato
    if (typeof candidato === 'number' && Number.isFinite(candidato)) return String(candidato)
  }

  return null
}

/**
 * El secreto compartido del webhook, de las cabeceras.
 *
 * ## Por que **no** se acepta `?secret=`
 *
 * Porque la URL queda en el log del request y en el del proxy: el secreto del
 * webhook terminaria escrito en cada linea de log. Si Nave solo soporta query
 * (no esta confirmado), es una decision pendiente de T001, no algo para resolver
 * aceptando el secreto en un lugar del que no se puede borrar.
 */
const secretoDelWebhook = (cabeceras: Record<string, unknown>): string | undefined => {
  const directo = cabeceras['x-nave-secret'] ?? cabeceras['x-webhook-secret']
  if (typeof directo === 'string') return directo

  const autorizacion = cabeceras.authorization
  if (typeof autorizacion !== 'string') return undefined

  const [esquema, valor] = autorizacion.split(' ')
  return esquema?.toLowerCase() === 'bearer' ? valor : undefined
}

export const ordersRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  /**
   * `POST /api/orders/webhook` — la notificacion de Mercado Pago (spec 009, T4).
   *
   * **Publica**, y por eso es la unica del proyecto que **no** puede fiarse de su
   * cuerpo. Es publica porque Mercado Pago no tiene sesion de nadie.
   *
   * Las tres reglas, en orden de por que:
   *
   * 1. **Valida la firma.** Sin esto, cualquiera que descubra la URL pone
   *    `aprobado` en un pedido que no se pago. Eso no es un bug de permisos, es
   *    un pedido gratis.
   * 2. **No cree el `status` del cuerpo.** La webhook solo dice *que* cambio;
   *    el estado real se pregunta a `GET /v1/payments/:id`. Un cuerpo sin
   *    validar seria una segunda puerta de entrada al mismo problema.
   * 3. **Es idempotente.** Mercado Pago reintenta. Una segunda notificacion no
   *    puede sumar dos veces el total al `Customer`.
   */
  fastify.post(
    '/api/orders/webhook',
    { schema: jsonSchemas.orders.webhook },
    async (request, reply) => {
      const cuerpo = request.body as { type?: string; action?: string; data?: { id?: string } }
      const pagoId = cuerpo.data?.id

      /**
       * Sin `data.id` **no hay nada que aplicar**, asi que se responde antes de
       * autenticar.
       *
       * No es una puerta abierta: lo que sale de esta rama es un `202` y nada
       * mas — no se toca la base, no se llama a Mercado Pago, no cambia ningun
       * pedido. Mercado Pago manda eventos asi (los de prueba del panel de
       * configuracion, por ejemplo) y contestarles `401` los haria reintentar
       * para siempre por algo que jamas vamos a procesar.
       *
       * La regla que si se respeta: **se autentica todo lo que actua**. Un
       * `data.id` presente y una firma invalida es `401`, sin excepciones.
       */
      if (pagoId === undefined || pagoId === '') {
        return reply.status(202).send({ received: true, applied: false })
      }

      const secreta = process.env.MERCADO_PAGO_WEBHOOK_SECRET

      if (secreta === undefined || secreta.trim() === '') {
        // Sin secreto **no se acepta ninguna notificacion**, ni siquiera una
        // legitima. Aceptar sin poder validar seria hacerlo a ciegas, que es el
        // escenario que esta ruta existe para evitar.
        return reply.status(503).send({
          code: 'WEBHOOK_NOT_CONFIGURED',
          message: 'La webhook de Mercado Pago no esta configurada'
        })
      }

      const valida = verificarFirmaWebhook(
        request.headers as Record<string, string | undefined>,
        pagoId,
        secreta
      )

      if (!valida) {
        return reply.status(401).send({
          code: 'INVALID_SIGNATURE',
          message: 'Firma de la notificacion invalida'
        })
      }

      const resultado = await aplicarPago(prisma, pagoId)

      return reply.status(200).send({
        received: true,
        applied: resultado.aplicado,
        estado: resultado.estado
      })
    }
  )

  /**
   * `POST /api/orders` — el checkout. **Publico**, a diferencia del `GET` y el
   * `PATCH` de este mismo archivo: lo llama alguien que no tiene sesion, porque
   * no tiene cuenta (spec 009, RF-01).
   *
   * El unico chequeo es el **shape**: que mande vinoId y cantidad, no precios.
   * Todo lo demas lo decide `service.ts`.
   */
  fastify.post(
    '/api/orders',
    {
      config: {
        rateLimit: {
          max: env.ORDER_RATE_MAX,
          timeWindow: env.RATE_LIMIT_WINDOW,
          keyGenerator: (request) => request.ip
        }
      },
      schema: jsonSchemas.orders.create
    },
    async (request, reply) => {
      const cuerpo = orderCreateSchema.safeParse(request.body)

      if (!cuerpo.success) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Datos invalidos',
          details: cuerpo.error.flatten()
        })
      }

      // La webhook necesita una URL **absoluta** y publica. `PUBLIC_API_URL` es
      // del backend; si no esta (que no deberia pasar, `env.ts` la exige), el
      // checkout falla con un error claro en vez de mandar una Preference sin
      // `notification_url`, que es el fallo invisible: el pedido queda esperando
      // pago para siempre sin que nadie sepa por que.
      const webhookUrl = urlDeWebhook(
        env.PAGO_MODO === 'nave' ? '/api/orders/webhook/nave' : '/api/orders/webhook'
      )

      const resultado = await crearPedido(prisma, request.body, webhookUrl)

      return reply.status(201).send(resultado)
    }
  )

  /**
   * `POST /api/orders/webhook/nave` — la notificacion de Nave (spec 012, FR-011).
   *
   * Mismas tres reglas que la de Mercado Pago, por los mismos motivos:
   *
   * 1. **Se autentica antes de tocar la base.** El secreto compartido se compara
   *    en tiempo constante.
   * 2. **El estado no sale del cuerpo.** Solo se toma el id del cobro y se
   *    pregunta a la API.
   * 3. **Se guarda el evento antes de procesarlo.** Si el procesamiento falla,
   *    queda `processed = false` como rastro de que el proveedor aviso. La
   *    reconciliacion **no relee este evento**: vuelve a preguntar por el
   *    `PaymentAttempt`, que sigue `pendiente` con su `referenciaExterna`, y
   *    `aplicarPago` es idempotente. La fuente de verdad es el intento, no la
   *    notificacion.
   *
   * Sin secreto configurado responde `503`: aceptar notificaciones que no se
   * pueden validar es peor que rechazarlas.
   */
  fastify.post(
    '/api/orders/webhook/nave',
    {
      config: {
        rateLimit: {
          max: WEBHOOK_RATE_MAX,
          timeWindow: env.RATE_LIMIT_WINDOW,
          keyGenerator: (request) => request.ip
        }
      },
      schema: jsonSchemas.orders.webhookNave
    },
    async (request, reply) => {
      const secreta = env.NAVE_WEBHOOK_SECRET

      if (secreta === undefined || secreta.trim() === '') {
        return reply.status(503).send({
          code: 'WEBHOOK_NOT_CONFIGURED',
          message: 'La webhook de Nave no esta configurada'
        })
      }

      const recibida = secretoDelWebhook(request.headers as Record<string, unknown>)

      if (!compararSecreto(recibida, secreta)) {
        return reply.status(401).send({
          code: 'INVALID_SIGNATURE',
          message: 'Firma de la notificacion invalida'
        })
      }

      const pagoId = idDeCobro(request.body)

      /**
       * Un evento sin id no es accionable, pero tampoco es un error del que el
       * proveedor tenga que enterarse: se acepta y no se toca nada. Devolver
       * 4xx haria que lo reintente para siempre por algo que nunca vamos a poder
       * procesar.
       */
      if (pagoId === null) {
        return reply.status(202).send({ received: true, applied: false })
      }

      const evento = await prisma.webhookEvent.create({
        data: {
          proveedor: 'nave',
          referencia: pagoId,
          payload: request.body as Prisma.InputJsonValue
        },
        select: { id: true }
      })

      try {
        const resultado = await aplicarPago(prisma, pagoId, 'Nave')

        await prisma.webhookEvent.update({
          where: { id: evento.id },
          data: { processed: true }
        })

        return reply.status(200).send({
          received: true,
          applied: resultado.aplicado,
          estado: resultado.estado
        })
      } catch (error: unknown) {
        /**
         * El evento **queda guardado** con `processed = false` a proposito: es
         * la unica prueba de que el proveedor aviso. No lo relee nadie; lo que
         * se reintenta es el intento de pago (`reconciliarPagosPendientes`), que
         * sigue `pendiente` y tiene `referenciaExterna`. Borrar el evento seria
         * perder el rastro sin ganar nada.
         */
        logger.error({ err: error, pagoId }, 'no se pudo procesar la webhook de Nave')
        throw error
      }
    }
  )

  /**
   * `GET /api/track/:token` — la pagina del pedido, publica (spec 012, FR-009).
   *
   * El token es aleatorio y no derivable del `orderId`. Es lo unico que necesita
   * el comprador para volver a ver su pedido, incluso desde otro dispositivo.
   */
  fastify.get(
    '/api/track/:token',
    {
      config: {
        rateLimit: {
          max: TRACK_RATE_MAX,
          timeWindow: env.RATE_LIMIT_WINDOW,
          keyGenerator: (request) => request.ip
        }
      },
      schema: jsonSchemas.orders.track
    },
    async (request) => {
      const { token } = request.params as { token: string }
      return obtenerPedidoPublico(prisma, token)
    }
  )

  /**
   * `POST /api/track/:token/pay` — reintentar el cobro (spec 012, D5).
   *
   * Con el mismo rate limit que el checkout: es la otra puerta que crea cobros
   * contra el proveedor y no puede quedar sin techo. Si el link vigente todavia
   * sirve, devuelve **ese** y no crea otro.
   */
  fastify.post(
    '/api/track/:token/pay',
    {
      config: {
        rateLimit: {
          max: env.ORDER_RATE_MAX,
          timeWindow: env.RATE_LIMIT_WINDOW,
          keyGenerator: (request) => request.ip
        }
      },
      schema: jsonSchemas.orders.trackPay
    },
    async (request, reply) => {
      const { token } = request.params as { token: string }

      const resultado = await reintentarPago(
        prisma,
        token,
        urlDeWebhook('/api/orders/webhook/nave')
      )

      return reply.status(201).send(resultado)
    }
  )

  /**
   * `POST /api/orders/reconcile` — reconciliacion manual (spec 012, FR-020).
   *
   * Existe ademas del cron para poder destrabar un deploy sin esperar el
   * intervalo, y para ver el resultado de una pasada. Solo `admin`: recorre
   * pedidos y llama al proveedor.
   */
  fastify.post(
    '/api/orders/reconcile',
    {
      preHandler: requireRole('admin'),
      schema: jsonSchemas.orders.reconcile
    },
    async () => reconciliarPagosPendientes(prisma)
  )

  fastify.get(
    '/api/orders',
    {
      preHandler: requireRole('admin', 'gestor', 'vendedor'),
      schema: jsonSchemas.orders.list
    },
    async (request) => {
      const { page, limit, status, pagoEstado, dateFrom, dateTo, search } = request.query as any
      const where: any = {}

      /**
       * `in` y no `=`, y **si o si** `in`.
       *
       * El filtro del panel es un multi-select, asi que `status` llega como
       * lista: `?status=pendiente&status=enviado`. Con `=` se buscaria un
       * estado literal que es un array, Prisma no matchea nada y la tabla sale
       * vacia **sin ningun error** — el peor sintoma posible, porque parece que
       * no hay pedidos.
       *
       * Y antes de esto era peor: el backend declaraba un `z.enum` de un valor y
       * el panel mandaba `"pendiente,enviado"`, asi que marcar dos casillas daba
       * un **400**. Ver el comentario de `orderQuerySchema`.
       */
      if (status !== undefined) where.status = { in: status }

      /**
       * El filtro de pago (spec 009, D-10), con `in` y en su propio campo.
       *
       * Los dos filtros se combinan solos: Prisma pone un AND entre las claves
       * de `where`, asi que "expirados **y** pendientes de envio" sale de
       * `{ status: { in: [...] }, pagoEstado: { in: [...] } }` sin escribir un
       * `AND` explicito.
       *
       * Y si los dos se dejan sin tocar, `where` queda vacio y se ve todo: no
       * hay un `where` "por defecto" que de fato que se note.
       */
      if (pagoEstado !== undefined) where.pagoEstado = { in: pagoEstado }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom + 'T00:00:00')
        if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59')
      }
      if (search) {
        where.OR = [
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { id: { contains: search } }
        ]
      }

      const [data, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, email: true } },
            items: { include: { producto: { select: { name: true, imageUrl: true } } } }
          }
        }),
        prisma.order.count({ where })
      ])

      return {
        data: data.map(order => ({
          ...order,
          items: order.items.map(item => ({
            productoId: item.productoId,
            productoNombre: item.producto.name,
            imageUrl: item.producto.imageUrl,
            quantity: item.quantity,
            price: item.price
          }))
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  )

  fastify.get(
    '/api/orders/:id',
    {
      preHandler: requireRole('admin', 'gestor', 'vendedor'),
      schema: jsonSchemas.orders.get
    },
    async (request, reply) => {
      const { id } = request.params as any

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: true,
          items: { include: { producto: { select: { name: true, imageUrl: true } } } },
          timeline: { orderBy: { createdAt: 'asc' } }
        }
      })

      if (!order) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Pedido no encontrado' })
      }

      return {
        ...order,
        items: order.items.map(item => ({
          productoId: item.productoId,
          productoNombre: item.producto.name,
          imageUrl: item.producto.imageUrl,
          quantity: item.quantity,
          price: item.price
        }))
      }
    }
  )

  fastify.patch(
    '/api/orders/:id',
    {
      preHandler: requireRole('admin', 'gestor', 'vendedor'),
      schema: jsonSchemas.orders.update
    },
    async (request, reply) => {
      const { id } = request.params as any
      const body = request.body as any
      const user = request.user!

      if (user.role === 'vendedor' && Object.keys(body).some(k => k !== 'status')) {
        return reply.status(403).send({ code: 'INSUFFICIENT_ROLE', message: 'Rol sin permiso para esta operación' })
      }

      const order = await prisma.order.findUnique({ where: { id } })
      if (!order) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Pedido no encontrado' })
      }

      // No-op solo si el unico campo es `status` y no cambio. Si vienen otros
      // campos (direccion, nombre del cliente), se aplican aunque el estado sea
      // el mismo.
      const soloStatus = Object.keys(body).every((k) => k === 'status')
      if (soloStatus && body.status && order.status === body.status) {
        const full = await prisma.order.findUnique({
          where: { id },
          include: {
            customer: true,
            items: { include: { producto: { select: { name: true, imageUrl: true } } } },
            timeline: { orderBy: { createdAt: 'asc' } }
          }
        })
        return full!
      }

      const dataPedido: Record<string, unknown> = {}
      if (body.status) dataPedido.status = body.status
      if (body.shippingAddress !== undefined) dataPedido.shippingAddress = body.shippingAddress

      await prisma.$transaction([
        prisma.order.update({ where: { id }, data: dataPedido }),
        ...(body.status && body.status !== order.status
          ? [prisma.orderTimeline.create({
              data: { orderId: id, status: body.status, author: user.name }
            })]
          : []),
        ...(body.customerName !== undefined
          ? [prisma.customer.update({
              where: { id: order.customerId },
              data: { name: body.customerName }
            })]
          : [])
      ])

      const full = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: true,
          items: { include: { producto: { select: { name: true, imageUrl: true } } } },
          timeline: { orderBy: { createdAt: 'asc' } }
        }
      })

      return full!
    }
  )
}