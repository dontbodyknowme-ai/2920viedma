import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  XCircle
} from 'lucide-react'
import { consultarPedido, mensajeDeErrorDeCheckout, reintentarPago } from '../api/checkout'
import type { PedidoPublico } from '../types/checkout'

/**
 * La pagina del pedido (spec 012, FR-009).
 *
 * ## Por que esta pagina existe
 *
 * Es la que cierra el circuito automatizado: el checkout crea el cobro **y**
 * manda aca. Muestra el link, el QR y el estado real, y se actualiza sola
 * mientras el pago esta en el aire.
 *
 * Antes el comprador volvia a `/?pago=aprobado`, un query param que no prueba
 * nada: cualquiera lo escribe. Aca el estado sale de `GET /api/track/:token`,
 * que es el unico que sabe si el banco cobro.
 *
 * ## Por que hace polling y no solo una consulta
 *
 * El pago con QR no vuelve por una redireccion: el comprador paga desde la app
 * del banco y la pestana se queda abierta. Sin polling, tendria que recargar a
 * mano para enterarse de que su pago entro.
 *
 * El intervalo se corta en los estados terminales (`aprobado`, `rechazado`,
 * `expirado`) y en transferencia, donde no hay nada que consultar.
 */
interface PedidoProps {
  /** El token publico, tomado de la URL. */
  token: string
  /**
   * Se llama **una sola vez** cuando el pedido aparece aprobado. `App` lo usa
   * para vaciar el carrito (D-D): se vacia con el pago, no al crear el pedido.
   */
  alAprobar?: () => void
}

/** Cada cuanto se le pregunta al backend por un pago en curso. */
export const INTERVALO_DE_POLLING_MS = 5000

const pesos = (monto: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(monto)

const esTerminal = (estado: PedidoPublico['pagoEstado']): boolean =>
  estado === 'aprobado' || estado === 'rechazado' || estado === 'expirado'

/**
 * Si el link todavia se puede usar.
 *
 * `expiraEn` lo informa el proveedor al crear el cobro. `null` significa "no
 * informo vencimiento", y en ese caso el link se considera vigente: es lo que
 * hacia antes, y esconder un link que no sabemos que vencio es peor.
 */
const linkVigente = (pago: NonNullable<PedidoPublico['pago']>): boolean => {
  if (pago.link === null) return false
  if (pago.expiraEn === null) return true

  const vence = new Date(pago.expiraEn).getTime()

  return Number.isNaN(vence) || vence > Date.now()
}

/**
 * El estado que se le muestra al comprador.
 *
 * ## Dos relojes distintos
 *
 * `expirarPedidosSinPagar` marca el **pedido** como `expirado` a los 10 minutos,
 * que es la ventana de Mercado Pago. El link de Nave vive 30. Si la pagina se
 * guiara solo por `Order.pagoEstado`, al minuto 15 diria "el link vencio" y
 * esconderia un link que funciona: el comprador generaria otro (o se iria)
 * mientras el suyo todavia sirve.
 *
 * Por eso manda el **intento**: si sigue `pendiente` y no paso su `expiraEn`,
 * hay algo para pagar y se muestra como pendiente. Si el intento ya vencio, o
 * el pedido esta resuelto, se muestra eso.
 */
const estadoVisible = (pedido: PedidoPublico): PedidoPublico['pagoEstado'] => {
  // Un pago resuelto manda: el cron no puede deshacerlo y la pagina no debe
  // contradecirlo.
  if (pedido.pagoEstado === 'aprobado' || pedido.pagoEstado === 'rechazado') {
    return pedido.pagoEstado
  }

  // El intento es el que sabe si ese link ya no sirve.
  if (pedido.pago?.estado === 'expirado') return 'expirado'

  // El pedido se expiro por reloj, pero el link sigue vigente.
  if (pedido.pagoEstado === 'expirado' && pedido.pago !== null && linkVigente(pedido.pago)) {
    return 'pendiente'
  }

  return pedido.pagoEstado
}

const fecha = (iso: string): string => {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleString('es-AR')
}

interface ResumenDeEstado {
  titulo: string
  detalle: string
  tono: string
  icono: 'ok' | 'error' | 'espera'
}

const RESUMEN: Record<PedidoPublico['pagoEstado'], ResumenDeEstado> = {
  no_iniciado: {
    titulo: 'Estamos generando tu cobro',
    detalle: 'En unos segundos vas a ver el link y el QR para pagar.',
    tono: 'border-gold-500/40 bg-gold-500/10 text-gold-300',
    icono: 'espera'
  },
  pendiente: {
    titulo: 'Esperando el pago',
    detalle: 'Escaneá el QR desde la app de tu banco o abrí el link de pago. Esta pantalla se actualiza sola.',
    tono: 'border-gold-500/40 bg-gold-500/10 text-gold-300',
    icono: 'espera'
  },
  aprobado: {
    titulo: 'Pago aprobado',
    detalle: 'Recibimos tu pago. Ya estamos preparando el pedido.',
    tono: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    icono: 'ok'
  },
  rechazado: {
    titulo: 'El pago no se completó',
    detalle: 'No se cobró nada. Podés generar un link nuevo y probar otra vez.',
    tono: 'border-wine-500/50 bg-wine-900/40 text-cream-100',
    icono: 'error'
  },
  expirado: {
    titulo: 'El link de pago venció',
    detalle: 'Pasó el tiempo para pagar. Generá un link nuevo para terminar la compra.',
    tono: 'border-wine-500/50 bg-wine-900/40 text-cream-100',
    icono: 'error'
  }
}

export const Pedido = ({ token, alAprobar }: PedidoProps) => {
  const navegar = useNavigate()

  const [pedido, setPedido] = useState<PedidoPublico | null>(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [errorDeReintento, setErrorDeReintento] = useState('')
  const [reintentando, setReintentando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  /** El carrito se vacia una sola vez, aunque el polling devuelva lo mismo. */
  const avisado = useRef(false)
  const temporizadorDelAviso = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Consulta el pedido y programa la siguiente consulta.
   *
   * Se para en los estados terminales y en transferencia. Deliberadamente **no**
   * se para ante un error de red: un 500 o una caida momentanea del backend no
   * significa que el pago no exista, y dejar de preguntar condenaria la pagina
   * a decir "pendiente" para siempre. El 404 si corta: ese token no existe.
   */
  useEffect(() => {
    let vivo = true
    let parar = false
    let temporizador: ReturnType<typeof setTimeout> | undefined

    setCargando(true)
    setError('')

    if (token === '') {
      setError('No encontramos ese pedido')
      setCargando(false)
      return
    }

    const consultar = async (): Promise<void> => {
      try {
        const dato = await consultarPedido(token)
        if (!vivo) return

        setPedido(dato)
        setError('')

        if (esTerminal(estadoVisible(dato)) || dato.modo === 'transferencia') parar = true
      } catch (fallo: unknown) {
        if (!vivo) return

        setError(mensajeDeErrorDeCheckout(fallo))

        const estado = (fallo as { status?: unknown }).status
        if (estado === 404) parar = true
      } finally {
        if (vivo) {
          setCargando(false)

          if (!parar) {
            temporizador = setTimeout(() => {
              void consultar()
            }, INTERVALO_DE_POLLING_MS)
          }
        }
      }
    }

    void consultar()

    return () => {
      vivo = false
      if (temporizador !== undefined) clearTimeout(temporizador)
    }
  }, [token])

  /**
   * `alAprobar` una sola vez.
   *
   * `App` pasa una funcion nueva en cada render, asi que este efecto se vuelve a
   * ejecutar; el `ref` es lo que evita vaciar dos veces el carrito de una compra
   * que el comprador todavia esta mirando.
   */
  useEffect(() => {
    if (pedido?.pagoEstado !== 'aprobado' || avisado.current) return

    avisado.current = true
    alAprobar?.()
  }, [pedido?.pagoEstado, alAprobar])

  useEffect(
    () => () => {
      if (temporizadorDelAviso.current !== null) clearTimeout(temporizadorDelAviso.current)
    },
    []
  )

  const refrescar = async (): Promise<void> => {
    if (token === '') return

    setActualizando(true)
    try {
      setPedido(await consultarPedido(token))
      setError('')
    } catch (fallo: unknown) {
      setError(mensajeDeErrorDeCheckout(fallo))
    } finally {
      setActualizando(false)
    }
  }

  const generarNuevoLink = async (): Promise<void> => {
    if (token === '') return

    setReintentando(true)
    setErrorDeReintento('')

    try {
      // El backend devuelve el link vigente si todavia sirve. Despues se relee
      // el pedido: el estado lo manda la consulta, no la respuesta del reintento.
      await reintentarPago(token)
      setPedido(await consultarPedido(token))
      setError('')
    } catch (fallo: unknown) {
      setErrorDeReintento(mensajeDeErrorDeCheckout(fallo))
    } finally {
      setReintentando(false)
    }
  }

  const copiar = (texto: string): void => {
    if (typeof navigator.clipboard?.writeText !== 'function') return

    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiado(texto)
        if (temporizadorDelAviso.current !== null) clearTimeout(temporizadorDelAviso.current)
        temporizadorDelAviso.current = setTimeout(() => setCopiado(null), 2000)
      })
      .catch(() => undefined)
  }

  const volver = (): void => {
    void navegar('/')
  }

  // ---------------------------------------------------------------- cargando
  if (cargando && pedido === null) {
    return (
      <main className='flex min-h-screen items-center justify-center bg-charcoal-950 px-4 text-cream-100'>
        <p role='status' className='flex items-center gap-3 text-sm text-neutral-400'>
          <Loader2 className='h-5 w-5 animate-spin' aria-hidden='true' />
          Consultando tu pedido...
        </p>
      </main>
    )
  }

  // ------------------------------------------------------------------- error
  if (pedido === null) {
    return (
      <main className='flex min-h-screen items-center justify-center bg-charcoal-950 px-4 py-10 text-cream-100'>
        <div className='w-full max-w-md rounded-2xl border border-wine-500/40 bg-charcoal-900 p-8 text-center'>
          <AlertTriangle className='mx-auto h-10 w-10 text-wine-400' aria-hidden='true' />
          <h1 className='mt-4 font-serif text-2xl font-bold'>No pudimos mostrar el pedido</h1>
          <p role='alert' className='mt-3 text-sm text-neutral-400'>
            {error === '' ? 'Probá de nuevo en un momento.' : error}
          </p>
          <button
            type='button'
            onClick={volver}
            className='mt-6 rounded-xl bg-wine-700 px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors hover:bg-wine-500'
          >
            Volver a la tienda
          </button>
        </div>
      </main>
    )
  }

  const transferencia = pedido.modo === 'transferencia'
  const estadoMostrado = transferencia ? pedido.pagoEstado : estadoVisible(pedido)
  const resumen = transferencia
    ? {
        titulo: pedido.pagoEstado === 'aprobado' ? 'Pago registrado' : 'Pagá por transferencia',
        detalle:
          pedido.pagoEstado === 'aprobado'
            ? 'Recibimos tu pago. Ya estamos preparando el pedido.'
            : 'Transferí el total a la cuenta de abajo y mandanos el comprobante.',
        tono:
          pedido.pagoEstado === 'aprobado'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-neutral-700 bg-charcoal-900 text-cream-100',
        icono: pedido.pagoEstado === 'aprobado' ? ('ok' as const) : ('espera' as const)
      }
    : RESUMEN[estadoMostrado]

  const Icono =
    resumen.icono === 'ok' ? CheckCircle2 : resumen.icono === 'error' ? XCircle : Clock

  const puedeReintentar = !transferencia && estadoMostrado !== 'aprobado'
  /**
   * Solo hay bloque de pago si hay algo que pagar. Un intento que fallo antes
   * de recibir link (`checkoutUrl: null`, sin QR) dejaria una tarjeta vacia
   * diciendo "escanéalo" sin nada que escanear; en ese caso el camino es
   * "Generar link nuevo".
   */
  const hayAlgoParaPagar =
    pedido.pago !== null && (pedido.pago.link !== null || pedido.pago.qr !== null)
  const mostrarPago =
    !transferencia &&
    (estadoMostrado === 'pendiente' || estadoMostrado === 'no_iniciado') &&
    hayAlgoParaPagar

  return (
    <main className='min-h-screen bg-charcoal-950 px-4 py-10 text-cream-100'>
      <div className='mx-auto max-w-3xl'>
        <button
          type='button'
          onClick={volver}
          className='mb-6 flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-cream-100'
        >
          <ArrowLeft className='h-4 w-4' />
          Volver a la tienda
        </button>

        <header className='mb-6 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='font-serif text-3xl font-bold'>Tu pedido</h1>
            <p className='mt-1 text-sm text-neutral-400'>
              Referencia <span className='font-mono text-cream-200'>{pedido.referencia}</span>
              {pedido.creadoEn !== '' && ` · ${fecha(pedido.creadoEn)}`}
            </p>
          </div>
          <button
            type='button'
            onClick={() => void refrescar()}
            disabled={actualizando}
            className='flex items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-gold-500 hover:text-cream-100 disabled:opacity-50'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${actualizando ? 'animate-spin' : ''}`} aria-hidden='true' />
            Actualizar
          </button>
        </header>

        <section
          role='status'
          data-estado={estadoMostrado}
          className={`mb-6 flex items-start gap-4 rounded-2xl border p-5 ${resumen.tono}`}
        >
          <Icono className='mt-0.5 h-6 w-6 shrink-0' aria-hidden='true' />
          <div>
            <h2 className='text-lg font-semibold'>{resumen.titulo}</h2>
            <p className='mt-1 text-sm opacity-90'>{resumen.detalle}</p>
            {error !== '' && (
              <p role='alert' className='mt-2 text-xs text-wine-300'>
                {error} · Seguimos consultando.
              </p>
            )}
          </div>
        </section>

        {mostrarPago && (
          <section className='mb-6 rounded-2xl border border-neutral-800 bg-charcoal-900 p-6'>
            <h2 className='flex items-center gap-2 font-serif text-xl font-bold'>
              <QrCode className='h-5 w-5 text-gold-400' aria-hidden='true' />
              Pagá ahora
            </h2>

            <div className='mt-5 grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]'>
              <div className='flex flex-col items-center gap-2'>
                {pedido.pago?.qr?.imagenUrl !== undefined ? (
                  <img
                    src={pedido.pago.qr.imagenUrl}
                    alt='Código QR para pagar'
                    className='h-44 w-44 rounded-xl border border-neutral-700 bg-white p-2'
                  />
                ) : (
                  <div className='flex h-44 w-44 items-center justify-center rounded-xl border border-dashed border-neutral-700 text-center text-xs text-neutral-500'>
                    El QR se muestra en la app del banco
                  </div>
                )}
                <span className='text-[11px] uppercase tracking-widest text-neutral-500'>Escanéalo</span>
              </div>

              <div className='space-y-4'>
                {pedido.pago?.link !== null && pedido.pago?.link !== undefined && (
                  <a
                    href={pedido.pago.link}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 rounded-xl bg-wine-700 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-colors hover:bg-wine-500'
                  >
                    Abrir el link de pago
                    <ExternalLink className='h-4 w-4' aria-hidden='true' />
                  </a>
                )}

                {pedido.pago?.qr?.payload !== undefined && pedido.pago?.qr?.payload !== '' && (
                  <div>
                    <p className='text-[10px] uppercase tracking-widest text-neutral-500'>
                      Código para pegar en el banco
                    </p>
                    <div className='mt-1 flex items-start gap-2'>
                      <code className='min-w-0 flex-1 break-all rounded-lg border border-neutral-700 bg-charcoal-950 px-3 py-2 font-mono text-xs text-cream-200'>
                        {pedido.pago.qr.payload}
                      </code>
                      <button
                        type='button'
                        onClick={() => copiar(pedido.pago!.qr!.payload!)}
                        aria-label='Copiar el código de pago'
                        className='shrink-0 rounded-lg border border-neutral-700 p-2 text-neutral-400 transition-colors hover:border-gold-500 hover:text-cream-100'
                      >
                        <Copy className='h-4 w-4' aria-hidden='true' />
                      </button>
                    </div>
                    {copiado === pedido.pago.qr.payload && (
                      <p className='mt-1 text-xs text-emerald-400'>Copiado</p>
                    )}
                  </div>
                )}

                {pedido.pago?.expiraEn !== null && pedido.pago?.expiraEn !== undefined && (
                  <p className='text-xs text-neutral-500'>
                    El link vence el {fecha(pedido.pago.expiraEn)}.
                  </p>
                )}

                <p className='text-xs leading-relaxed text-neutral-400'>
                  Después de pagar, esta pantalla se actualiza sola. Si querés, tocá{' '}
                  <strong className='text-cream-200'>Actualizar</strong>.
                </p>
              </div>
            </div>
          </section>
        )}

        {transferencia && pedido.instrucciones !== null && (
          <section className='mb-6 rounded-2xl border border-neutral-800 bg-charcoal-900 p-6'>
            <h2 className='font-serif text-xl font-bold'>Datos para transferir</h2>

            <dl className='mt-4 space-y-2 text-sm'>
              {pedido.instrucciones.titular !== undefined && (
                <div className='flex justify-between gap-3'>
                  <dt className='text-neutral-500'>Titular</dt>
                  <dd className='text-right text-cream-200'>{pedido.instrucciones.titular}</dd>
                </div>
              )}
              {pedido.instrucciones.alias !== undefined && (
                <div className='flex justify-between gap-3'>
                  <dt className='text-neutral-500'>Alias</dt>
                  <dd className='flex items-center gap-2 text-right font-mono text-cream-200'>
                    {pedido.instrucciones.alias}
                    <button
                      type='button'
                      onClick={() => copiar(pedido.instrucciones!.alias!)}
                      aria-label='Copiar el alias'
                      className='rounded p-1 text-neutral-500 hover:text-cream-100'
                    >
                      <Copy className='h-3.5 w-3.5' aria-hidden='true' />
                    </button>
                  </dd>
                </div>
              )}
              {pedido.instrucciones.cbu !== undefined && (
                <div className='flex justify-between gap-3'>
                  <dt className='text-neutral-500'>CBU</dt>
                  <dd className='flex items-center gap-2 text-right font-mono text-cream-200'>
                    {pedido.instrucciones.cbu}
                    <button
                      type='button'
                      onClick={() => copiar(pedido.instrucciones!.cbu!)}
                      aria-label='Copiar el CBU'
                      className='rounded p-1 text-neutral-500 hover:text-cream-100'
                    >
                      <Copy className='h-3.5 w-3.5' aria-hidden='true' />
                    </button>
                  </dd>
                </div>
              )}
              {pedido.instrucciones.banco !== undefined && (
                <div className='flex justify-between gap-3'>
                  <dt className='text-neutral-500'>Banco</dt>
                  <dd className='text-right text-cream-200'>{pedido.instrucciones.banco}</dd>
                </div>
              )}
              <div className='flex justify-between gap-3 border-t border-neutral-800 pt-2'>
                <dt className='text-neutral-500'>Monto</dt>
                <dd className='text-right font-mono text-lg font-bold text-gold-400'>
                  {pesos(pedido.instrucciones.monto)}
                </dd>
              </div>
              <div className='flex justify-between gap-3'>
                <dt className='text-neutral-500'>Referencia</dt>
                <dd className='text-right font-mono text-cream-200'>
                  {pedido.instrucciones.referencia}
                </dd>
              </div>
            </dl>

            <p className='mt-4 text-xs leading-relaxed text-neutral-400'>
              Usá la referencia en el concepto de la transferencia. Cuando la veamos, marcamos el
              pedido como pagado.
            </p>
          </section>
        )}

        {puedeReintentar && (
          <section className='mb-6 rounded-2xl border border-neutral-800 bg-charcoal-900 p-6'>
            <h2 className='font-serif text-xl font-bold'>¿Necesitás otro link?</h2>
            <p className='mt-2 text-sm text-neutral-400'>
              Generamos un cobro nuevo sin crear otro pedido. Si el link anterior todavía sirve, te
              devolvemos el mismo.
            </p>

            {errorDeReintento !== '' && (
              <p role='alert' className='mt-3 text-sm text-wine-300'>
                {errorDeReintento}
              </p>
            )}

            <button
              type='button'
              onClick={() => void generarNuevoLink()}
              disabled={reintentando}
              className='mt-4 inline-flex items-center gap-2 rounded-xl bg-wine-700 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-colors hover:bg-wine-500 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {reintentando ? (
                <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
              ) : (
                <RefreshCw className='h-4 w-4' aria-hidden='true' />
              )}
              {reintentando ? 'Generando...' : 'Generar link nuevo'}
            </button>
          </section>
        )}

        <section className='rounded-2xl border border-neutral-800 bg-charcoal-900 p-6'>
          <h2 className='font-serif text-xl font-bold'>Detalle</h2>

          <ul aria-label='Productos del pedido' className='mt-4 space-y-3 border-b border-neutral-800 pb-4'>
            {pedido.items.map((item, indice) => (
              <li
                key={`${item.nombre}-${indice}`}
                className='flex items-start justify-between gap-3 text-sm'
              >
                <div>
                  <p className='font-medium text-cream-100'>{item.nombre}</p>
                  <p className='text-xs text-neutral-500'>
                    {item.cantidad} × {pesos(item.precio)}
                  </p>
                </div>
                <span className='whitespace-nowrap font-mono text-cream-200'>
                  {pesos(item.precio * item.cantidad)}
                </span>
              </li>
            ))}
          </ul>

          <div className='flex items-center justify-between pt-4'>
            <span className='text-sm text-neutral-400'>
              Total ({pedido.items.reduce((suma, item) => suma + item.cantidad, 0)} unidades)
            </span>
            <span className='font-mono text-xl font-bold text-gold-400'>{pesos(pedido.total)}</span>
          </div>
        </section>
      </div>
    </main>
  )
}
