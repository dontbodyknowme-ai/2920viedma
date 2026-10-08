import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Wine } from '../types/vino'

// RF-37 y constitucion 3: la vista rapida se monta siempre y es este
// `AnimatePresence`, interno al componente, el que decide cuando hay algo que
// mostrar. Si el montaje lo condicionara `App.tsx` con `vinoSeleccionado !== null`
// el componente se desmontaria de golpe al cerrar y la salida no se animaria.
interface VistaRapidaProductoProps {
  wine: Wine | null
  onClose: () => void
}

// El mismo formateo de `carta_de_productos.tsx`, para que el precio se lea
// igual en la tarjeta y en la vista rapida.
const formatearPrecio = (price: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(price)

export const VistaRapidaProducto = ({ wine, onClose }: VistaRapidaProductoProps) => {
  // Escape no lo exige ningun RF, pero cierra el panel y el listener solo existe
  // mientras hay un vino abierto. El cleanup evita acumular listeners.
  useEffect(() => {
    if (wine === null) return
    const alPulsarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', alPulsarEscape)
    return () => window.removeEventListener('keydown', alPulsarEscape)
  }, [wine, onClose])

  return (
    <AnimatePresence>
      {wine !== null && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/80 backdrop-blur-md z-50'
          />

          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto'>
            <motion.div
              role='dialog'
              aria-modal='true'
              aria-label={`Vista rapida de ${wine.name}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className='bg-charcoal-900 border border-wine-900/60 rounded-2xl w-full max-w-3xl text-cream-100 shadow-2xl my-8 overflow-hidden'
            >
              {/* Sin `layout`: T6 demostro que la proyeccion de layout frena el
                  unmount cuando un hijo sale del arbol. `h-72` en movil para que
                  la imagen siga siendo mas grande que la de la tarjeta, que a una
                  columna ya ocupa todo el ancho y mide 256 px de alto (RF-35). */}
              <div className='grid md:grid-cols-2'>
                <div className='relative h-72 md:h-full bg-charcoal-950'>
                  <img
                    src={wine.imageUrl}
                    alt={wine.name}
                    className='absolute inset-0 h-full w-full object-cover'
                  />
                </div>

                <div className='p-6 flex flex-col gap-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <h2 className='text-2xl font-serif font-bold text-cream-100 leading-tight'>
                      {wine.name}
                    </h2>
                    <button
                      type='button'
                      onClick={onClose}
                      className='text-neutral-400 hover:text-cream-100 p-2 rounded-lg hover:bg-neutral-800 transition-colors shrink-0'
                      aria-label='Cerrar detalle'
                    >
                      ✕
                    </button>
                  </div>

                  <p className='text-gold-500/90 text-xs font-semibold uppercase tracking-widest'>
                    {wine.winery} • {wine.varietal}
                  </p>

                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='bg-wine-900/80 border border-wine-500/30 text-cream-100 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold'>
                      {wine.category}
                    </span>
                    <span className='bg-charcoal-800 text-gold-400 text-xs px-2.5 py-1 rounded-full font-serif font-bold border border-gold-500/20'>
                      Cosecha {wine.vintage}
                    </span>
                  </div>

                  <p className='text-cream-100 text-2xl font-bold font-serif'>
                    {formatearPrecio(wine.price)}
                  </p>

                  {/* D-N: el chequeo es `!== undefined`, no un truthy check. Un
                      string vacio es un dato presente, no ausente. */}
                  {wine.tastingNotes !== undefined && (
                    <section>
                      <h3 className='text-xs uppercase tracking-widest text-gold-500/90 font-semibold mb-1'>
                        Notas de cata
                      </h3>
                      <p className='text-neutral-300 text-sm leading-relaxed'>
                        {wine.tastingNotes}
                      </p>
                    </section>
                  )}

                  {wine.foodPairing !== undefined && (
                    <section>
                      <h3 className='text-xs uppercase tracking-widest text-gold-500/90 font-semibold mb-1'>
                        Maridaje sugerido
                      </h3>
                      <p className='text-neutral-300 text-sm leading-relaxed'>
                        {wine.foodPairing}
                      </p>
                    </section>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}