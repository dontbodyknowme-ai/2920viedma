import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { FormularioCheckout, type DatosDelFormulario } from '../components/checkout/formulario'
import { crearPedido, mensajeDeErrorDeCheckout } from '../api/checkout'
import type { CartItem } from '../types/producto'

/**
 * La pagina del checkout (spec 009 + spec 012).
 *
 * ## Un solo paso, y despues la pagina del pedido
 *
 * Antes esta pantalla creaba el pedido y mandaba al checkout del proveedor con
 * `window.location.assign`. Con el cobro automatizado eso ya no hace falta: el
 * backend crea el link **y** el QR en el mismo request, y el comprador se queda
 * en la tienda viendo `2. Tu pedido`, `3. Pago` y el estado real.
 *
 * Por eso `POST /api/orders` y `navegar('/pedido/:token')`: es una ruta de la
 * SPA, se puede recargar, y no depende de que el proveedor devuelva a la persona
 * a una URL con un query param que tenemos que interpretar.
 *
 * ## Lo que NO viaja
 *
 * Ningun precio. El resumen de aca es **para mirar**: el total que se cobra lo
 * calcula el backend con `Wine.price` y es el que vuelve en la respuesta.
 */
interface CheckoutProps {
  /** El carrito, para poder mandarlo. Viene de `App`. */
  items: CartItem[]
}

const pesos = (monto: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)

export const Checkout = ({ items }: CheckoutProps) => {
  const navegar = useNavigate()

  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')

  const total = items.reduce((suma, item) => suma + item.product.price * item.quantity, 0)
  const unidades = items.reduce((suma, item) => suma + item.quantity, 0)

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

      /**
       * El token es la unica llave: `/pedido/:token` vuelve a pedir todo
       * (`items`, `total`, estado) a `GET /api/track/:token`. No hace falta
       * guardar nada en el navegador, y no guardarlo evita dejar datos de la
       * compra en una maquina compartida.
       */
      navegar(`/pedido/${pedido.orderToken}`)
    } catch (error: unknown) {
      setErrorServidor(mensajeDeErrorDeCheckout(error))
      setEnviando(false)
    }
  }

  return (
    <main className='min-h-screen bg-charcoal-950 px-4 py-10 text-cream-100'>
      <div className='mx-auto max-w-5xl'>
        <button
          type='button'
          onClick={() => navegar('/')}
          className='mb-6 flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-cream-100'
        >
          <ArrowLeft className='h-4 w-4' />
          Volver a la tienda
        </button>

        <div className='mb-8'>
          <h1 className='font-serif text-3xl font-bold'>Finalizar compra</h1>
          <p className='mt-2 text-sm text-neutral-400'>
            No hace falta crear cuenta. Al confirmar te mostramos cómo pagar.
          </p>
        </div>

        {items.length === 0 ? (
          <div className='rounded-2xl border border-neutral-800 bg-charcoal-900 p-8 text-center'>
            <p className='text-lg font-medium'>Tu carrito está vacío</p>
            <p className='mt-2 text-sm text-neutral-400'>Elegí un vino del catálogo para empezar.</p>
            <button
              type='button'
              onClick={() => navegar('/')}
              className='mt-6 rounded-xl bg-wine-700 px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors hover:bg-wine-500'
            >
              Ver el catálogo
            </button>
          </div>
        ) : (
          <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]'>
            <section className='rounded-2xl border border-neutral-800 bg-charcoal-900 p-6'>
              <h2 className='mb-5 flex items-center gap-2 font-serif text-xl font-bold'>
                <span className='flex h-7 w-7 items-center justify-center rounded-full bg-gold-500/15 text-xs text-gold-400'>
                  1
                </span>
                Tus datos
              </h2>
              <FormularioCheckout
                alEnviar={(datos) => void enviar(datos)}
                enviando={enviando}
                errorServidor={errorServidor}
              />
            </section>

            <aside className='h-fit rounded-2xl border border-neutral-800 bg-charcoal-900 p-6 lg:sticky lg:top-6'>
              <h2 className='mb-4 flex items-center gap-2 font-serif text-xl font-bold'>
                <span className='flex h-7 w-7 items-center justify-center rounded-full bg-gold-500/15 text-xs text-gold-400'>
                  2
                </span>
                Tu pedido
              </h2>

              <ul className='space-y-3 border-b border-neutral-800 pb-4'>
                {items.map((item) => (
                  <li key={item.product.id} className='flex items-start justify-between gap-3 text-sm'>
                    <div>
                      <p className='font-medium text-cream-100'>{item.product.name}</p>
                      <p className='text-xs text-neutral-500'>
                        {item.quantity} × {pesos(item.product.price)}
                      </p>
                    </div>
                    <span className='whitespace-nowrap font-mono text-cream-200'>
                      {pesos(item.product.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className='flex items-center justify-between py-4'>
                <span className='text-sm text-neutral-400'>Total ({unidades} {unidades === 1 ? 'unidad' : 'unidades'})</span>
                <span className='font-mono text-xl font-bold text-gold-400'>{pesos(total)}</span>
              </div>

              <div className='rounded-xl border border-neutral-800 bg-charcoal-950 p-4'>
                <h3 className='flex items-center gap-2 text-sm font-semibold text-cream-100'>
                  <span className='flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/15 text-[10px] text-gold-400'>
                    3
                  </span>
                  Pago
                </h3>
                <p className='mt-2 text-xs leading-relaxed text-neutral-400'>
                  Al confirmar el pedido vas a ver{' '}
                  <strong className='text-cream-200'>cómo pagar</strong>, con el link y el QR si el
                  banco los genera. El estado se actualiza solo.
                </p>
                <p className='mt-3 flex items-center gap-1.5 text-[11px] text-neutral-500'>
                  <ShieldCheck className='h-3.5 w-3.5 text-emerald-400' aria-hidden='true' />
                  Los datos de la tarjeta no pasan por esta tienda.
                </p>
                <p className='mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500'>
                  <Lock className='h-3.5 w-3.5 text-emerald-400' aria-hidden='true' />
                  Pago procesado por el banco.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
