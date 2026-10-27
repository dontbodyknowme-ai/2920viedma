import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle, Copy, ArrowLeft } from 'lucide-react'
import { FormularioCheckout, type DatosDelFormulario } from '../components/checkout/formulario'
import { crearPedido, mensajeDeErrorDeCheckout } from '../api/checkout'
import {
  borrarResumen,
  guardarResumen,
  leerResumen,
  resultadoDeLaUrl,
  type InstruccionesTransferencia
} from '../types/checkout'
import type { CartItem } from '../types/producto'

/**
 * La pagina del checkout (spec 009, T6 y T7).
 *
 * Son **tres estados en la misma pagina**, y por que:
 *
 * - **formulario** â€” el visitante lleno el carrito y pulsa "Finalizar Pedido"
 * - **pagando** â€” se creo el pedido y estamos mandando a Mercado Pago
 * - **confirmacion / error** â€” el comprador volvio de Mercado Pago
 *
 * Que sea una sola pagina y no tres rutas importa porque **al volver de Mercado
 * Pago el comprador llega por query param** (`?pago=aprobado`) y no tiene el
 * carrito en memoria: si la confirmacion fuera otra ruta, el `sessionStorage`
 * seria lo unico que la sostenga.
 */
interface CheckoutProps {
  /** El carrito, para poder mandarlo. Viene de `App`. */
  items: CartItem[]
  /** Se llama cuando el pago se aprobo, para vaciar el carrito. */
  alConfirmar: () => void
}

export const Checkout = ({ items, alConfirmar }: CheckoutProps) => {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const resultado = resultadoDeLaUrl(parametros.toString())

  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')
  const [instrucciones, setInstrucciones] = useState<InstruccionesTransferencia | null>(null)
  const [orderId, setOrderId] = useState<string>('')

  // Se lee **una vez**, al montar. Y se borra despues: el resumen es de esta
  // compra, y dejarlo da al siguiente que abra la pestana en el mismo
  // navegador el numero de pedido de otra persona.
  const [resumen] = useState(() => leerResumen())

  if (resultado !== null) {
    return (
      <ResultadoDelPago
        resultado={resultado}
        resumen={resumen}
        alVolver={() => {
          borrarResumen()
          alConfirmar()
          navegar('/')
        }}
        alReintentar={() => {
          borrarResumen()
          navegar('/')
        }}
      />
    )
  }

  if (instrucciones !== null) {
    return (
      <InstruccionesTransferenciaPage
        instrucciones={instrucciones}
        orderId={orderId}
        alFinalizar={() => {
          borrarResumen()
          alConfirmar()
          navegar('/')
        }}
      />
    )
  }

  const enviar = async (datos: DatosDelFormulario) => {
    setEnviando(true)
    setErrorServidor('')

    try {
      const pedido = await crearPedido(
        {
          nombre: datos.nombre,
          apellido: datos.apellido,
          telefono: datos.telefono,
          email: datos.email,
          direccion: datos.direccion
        },
        // **Solo el id y la cantidad.** El precio lo pone el backend.
        items.map((item) => ({ vinoId: item.product.id, cantidad: item.quantity }))
      )

      guardarResumen({ orderId: pedido.orderId, total: pedido.total, items: [] })

      if ((pedido.modo === 'transferencia' || pedido.modo === 'nave') && pedido.instrucciones) {
        setOrderId(pedido.orderId)
        setInstrucciones(pedido.instrucciones)
        setEnviando(false)
        return
      }

      // Se va a Mercado Pago con `location.assign` y **no** con `navigate`: es
      // una pagina de otro origen, y un router de SPA no puede(topicar)arla.
      if (pedido.initPoint) {
        window.location.assign(pedido.initPoint)
      } else {
        setErrorServidor('No se pudo obtener el link de pago')
        setEnviando(false)
      }
    } catch (error: unknown) {
      setErrorServidor(mensajeDeErrorDeCheckout(error))
      setEnviando(false)
    }
  }

  return (
    <main className='min-h-screen bg-charcoal-950 px-4 py-10 text-cream-100'>
      <div className='mx-auto max-w-md'>
        <h1 className='mb-1 text-center font-serif text-3xl font-bold'>Finalizar compra</h1>
        <p className='mb-8 text-center text-sm text-neutral-400'>
          No hace falta crear cuenta. Solo necesitamos estos datos para coordinar.
        </p>

        <FormularioCheckout
          alEnviar={(datos) => void enviar(datos)}
          enviando={enviando}
          errorServidor={errorServidor}
        />
      </div>
    </main>
  )
}

interface InstruccionesProps {
  instrucciones: InstruccionesTransferencia
  orderId: string
  alFinalizar: () => void
}

const copiar = async (texto: string) => {
  try {
    await navigator.clipboard.writeText(texto)
  } catch {
    // ignorar
  }
}

const InstruccionesTransferenciaPage = ({ instrucciones, orderId, alFinalizar }: InstruccionesProps) => {
  const [copiado, setCopiado] = useState<string | null>(null)

  const copiarDato = async (clave: string, texto?: string) => {\r\n    if (!texto) return\r\n    await copiar(texto)\r\n    setCopiado(clave)\r\n    setTimeout(() => setCopiado(null), 1500)\r\n  }\r\n\r\n  const esNave = !!(instrucciones.codigo || instrucciones.qrUrl || instrucciones.linkCobro)

  return (
    <main className='min-h-screen bg-charcoal-950 px-4 py-10 text-cream-100'>
      <div className='mx-auto max-w-lg'>
        <button
          onClick={alFinalizar}
          className='mb-6 flex items-center gap-2 text-sm text-neutral-400 hover:text-cream-100'
        >
          <ArrowLeft className='h-4 w-4' />
          Volver a la tienda
        </button>

        <div className='mb-6 text-center'>
          <CheckCircle2 className='mx-auto mb-4 h-14 w-14 text-emerald-400' />
          <h1 className='mb-2 font-serif text-3xl font-bold'>Â¡Pedido generado!</h1>
          <p className='text-neutral-400'>
            RealizÃ¡ la transferencia con los datos que te dejamos abajo
          </p>
        </div>

        <div className='mb-6 rounded-2xl border border-neutral-800 bg-charcoal-900 p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <p className='text-xs uppercase tracking-widest text-neutral-500'>Pedido</p>
              <p className='mt-1 font-mono text-lg text-cream-100'>{orderId}</p>
            </div>
            <div className='text-right'>
              <p className='text-xs uppercase tracking-widest text-neutral-500'>Total a transferir</p>
              <p className='mt-1 text-2xl font-semibold text-gold-400'>
                ${instrucciones.monto.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            {instrucciones.titular && (
              <DatoTransferencia
                etiqueta='Titular'
                valor={instrucciones.titular}
                copiado={copiado === 'titular'}
                onCopiar={() => copiarDato('titular', instrucciones.titular)}
              />
            )}
            {instrucciones.banco && (
              <DatoTransferencia
                etiqueta='Banco'
                valor={instrucciones.banco}
                copiado={copiado === 'banco'}
                onCopiar={() => copiarDato('banco', instrucciones.banco)}
              />
            )}
            {instrucciones.alias && (
              <DatoTransferencia
                etiqueta='Alias'
                valor={instrucciones.alias}
                copiado={copiado === 'alias'}
                onCopiar={() => copiarDato('alias', instrucciones.alias)}
              />
            )}
            {instrucciones.cbu && (
              <DatoTransferencia
                etiqueta='CBU/CVU'
                valor={instrucciones.cbu}
                copiado={copiado === 'cbu'}
                onCopiar={() => copiarDato('cbu', instrucciones.cbu)}
              />
            )}
            {instrucciones.referencia && (
              <DatoTransferencia
                etiqueta='Referencia / Concepto'
                valor={instrucciones.referencia}
                copiado={copiado === 'ref'}
                onCopiar={() => copiarDato('ref', instrucciones.referencia)}
              />
            )}
          </div>
        </div>

        <div className='mb-6 rounded-xl border border-gold-500/30 bg-gold-900/10 p-4 text-sm text-cream-100'>
          <p className='font-medium text-gold-400'>Importante</p>
          <p className='mt-1 text-neutral-300'>
            Una vez realizada la transferencia, enviÃ¡ el comprobante por WhatsApp o mail con el nÃºmero de pedido{' '}
            <span className='font-mono'>{orderId}</span>. Cuando confirmemos el pago, tu pedido pasarÃ¡ a preparaciÃ³n.
          </p>
        </div>

        <button
          onClick={alFinalizar}
          className='w-full rounded-xl bg-wine-700 py-3.5 text-sm font-semibold uppercase tracking-wider text-cream-100 transition-colors hover:bg-wine-500'
        >
          Entendido, volver a la tienda
        </button>
      </div>
    </main>
  )
}

interface DatoProps {
  etiqueta: string
  valor: string
  copiado: boolean
  onCopiar: () => void
}

const DatoTransferencia = ({ etiqueta, valor, copiado, onCopiar }: DatoProps) => (
  <div className='flex items-center justify-between rounded-xl border border-neutral-700/60 bg-charcoal-800 px-4 py-3'>
    <div>
      <p className='text-xs uppercase tracking-widest text-neutral-500'>{etiqueta}</p>
      <p className='mt-1 break-all font-mono text-sm text-cream-100'>{valor}</p>
    </div>
    <button
      onClick={onCopiar}
      className='ml-4 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-neutral-300 hover:bg-charcoal-700 hover:text-cream-100'
    >
      <Copy className='h-3.5 w-3.5' />
      {copiado ? 'Copiado' : 'Copiar'}
    </button>
  </div>
)

interface ResultadoProps {
  resultado: 'aprobado' | 'fallido' | 'pendiente'
  resumen: { orderId: string; total: number; items: { vinoId: string; cantidad: number }[] } | null
  alVolver: () => void
  alReintentar: () => void
}

/**
 * Lo que se ve al volver de Mercado Pago.
 *
 * ## Por que el total sale del `sessionStorage` y no de un endpoint
 *
 * Un `GET /api/orders/:id` publico devolveria nombre, telefono y direccion de un
 * comprador que **no tiene cuenta en el sistema**, con soloKnowing el id. Ese
 * endpoint publico existia en la primera version de la spec y se saco (D-F de
 * `plan.md`).
 *
 * La confirmacion necesita **el numero y el monto**, que son los unicos datos que
 * la persona ya conocio. Esos se guardaron antes de ir a Mercado Pago.
 *
 * ## Y si el resumen no esta
 *
 * Puede pasar: el comprador abrio la tienda en otra pestana, o borro el
 * almacenamiento. La pagina **no inventa un total** â€”un "$0" o un total al
 * azar seria una mentira que el comprador lleva al mostradorâ€”: avisa que no lo
 * encontro y lo manda a la tienda.
 */
const ResultadoDelPago = ({ resultado, resumen, alVolver, alReintentar }: ResultadoProps) => {
  const aprobado = resultado === 'aprobado'

  if (resultado === 'pendiente') {
    return (
      <Aviso
        icono={<Loader2 className='h-12 w-12 animate-spin text-gold-400' aria-hidden='true' />}
        titulo='Tu pago se esta procesando'
        texto='Mercado Pago nos confirmara en un momento. No hace falta que hagas nada.'
        accion={{ texto: 'Volver a la tienda', alHacer: alVolver }}
      />
    )
  }

  if (!aprobado) {
    return (
      <Aviso
        icono={<XCircle className='h-12 w-12 text-wine-400' aria-hidden='true' />}
        titulo='El pago no se completo'
        texto='Tu carrito sigue intacto. Podes intentarlo de nuevo cuando quieras.'
        accion={{ texto: 'Intentar de nuevo', alHacer: alReintentar }}
      />
    )
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-charcoal-950 px-4 text-cream-100'>
      <div className='w-full max-w-md rounded-2xl border border-neutral-800 bg-charcoal-900 p-8 text-center'>
        <CheckCircle2 className='mx-auto h-12 w-12 text-gold-400' aria-hidden='true' />

        <h1 className='mt-4 font-serif text-2xl font-bold'>Pedido confirmado</h1>

        {resumen === null ? (
          <>
            <p className='mt-3 text-sm text-neutral-400'>
              Tu pago se registro. No encontramos el detalle del pedido en esta
              sesion, asi que te loanamos por email.
            </p>
            <p className='mt-3 text-sm text-neutral-300'>
              Si ya lo habias pagado desde este navegador, recargÃ¡ la pagina y el
              detalle vuelve a aparecer.
            </p>
          </>
        ) : (
          <>
            <p className='mt-3 text-sm text-neutral-400'>
              Guardamos tu pedido y te escribimos con el seguimiento.
            </p>

            <dl className='mt-6 space-y-3 rounded-xl border border-neutral-800 bg-charcoal-950 p-4 text-left'>
              <div className='flex justify-between gap-4'>
                <dt className='text-xs uppercase tracking-widest text-neutral-500'>Pedido</dt>
                <dd className='font-mono text-sm text-cream-100'>{resumen.orderId}</dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt className='text-xs uppercase tracking-widest text-neutral-500'>Total</dt>
                <dd className='font-mono text-sm font-bold text-gold-400'>
                  {new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    maximumFractionDigits: 0
                  }).format(resumen.total)}
                </dd>
              </div>
            </dl>
          </>
        )}

        <button
          type='button'
          onClick={alVolver}
          className='mt-6 w-full rounded-xl bg-wine-700 py-3 text-sm font-semibold uppercase tracking-wider text-cream-100 transition-colors hover:bg-wine-500'
        >
          Volver a la tienda
        </button>
      </div>
    </main>
  )
}

interface AvisoProps {
  icono: React.ReactNode
  titulo: string
  texto: string
  accion: { texto: string; alHacer: () => void }
}

const Aviso = ({ icono, titulo, texto, accion }: AvisoProps) => (
  <main className='flex min-h-screen items-center justify-center bg-charcoal-950 px-4 text-cream-100'>
    <div className='w-full max-w-md rounded-2xl border border-neutral-800 bg-charcoal-900 p-8 text-center'>
      {icono}
      <h1 className='mt-4 font-serif text-2xl font-bold'>{titulo}</h1>
      <p className='mt-3 text-sm text-neutral-400'>{texto}</p>
      <button
        type='button'
        onClick={accion.alHacer}
        className='mt-6 w-full rounded-xl bg-wine-700 py-3 text-sm font-semibold uppercase tracking-wider text-cream-100 transition-colors hover:bg-wine-500'
      >
        {accion.texto}
      </button>
    </div>
  </main>
)


