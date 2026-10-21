import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Producto } from '../types/producto'
import { subtituloProducto, tieneAnada } from '../utils/producto'

// RF-37 y constitucion 3: la vista rapida se monta siempre y es este
// `AnimatePresence`, interno al componente, el que decide cuando hay algo que
// mostrar. Si el montaje lo condicionara `App.tsx` con `vinoSeleccionado !== null`
// el componente se desmontaria de golpe al cerrar y la salida no se animaria.
interface VistaRapidaProductoProps {
  producto: Producto | null
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

export const VistaRapidaProducto = ({ producto, onClose }: VistaRapidaProductoProps) => {
  // Escape no lo exige ningun RF, pero cierra el panel y el listener solo existe
  // mientras hay un producto abierto. El cleanup evita acumular listeners.
  useEffect(() => {
    if (producto === null) return
    const alPulsarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', alPulsarEscape)
    return () => window.removeEventListener('keydown', alPulsarEscape)
  }, [producto, onClose])

  // Lo que hay, no lo que falta. Un producto que no es vino no tiene bodega ni
  // anada, y el separador solo (" • ") se ve como un dato roto.
  const subtitulo = producto !== null ? subtituloProducto(producto) : null

  return (
    <AnimatePresence>
      {producto !== null && (
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
              aria-label={`Vista rapida de ${producto.name}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className='bg-blanco border border-verde-800/60 rounded-2xl w-full max-w-3xl text-carbon shadow-2xl my-8 overflow-hidden'
            >
              {/* Sin `layout`: T6 demostro que la proyeccion de layout frena el
                  unmount cuando un hijo sale del arbol. `h-72` en movil para que
                  la imagen siga siendo mas grande que la de la tarjeta, que a una
                  columna ya ocupa todo el ancho y mide 256 px de alto (RF-35). */}
              <div className='grid md:grid-cols-2'>
                <div className='relative h-72 md:h-full bg-marfil'>
                  <img
                    src={producto.imageUrl}
                    alt={producto.name}
                    className='absolute inset-0 h-full w-full object-cover'
                  />
                </div>

                <div className='p-6 flex flex-col gap-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <h2 className='text-2xl font-serif font-bold text-carbon leading-tight'>
                      {producto.name}
                    </h2>
                    <button
                      type='button'
                      onClick={onClose}
                      className='text-neutral-600 hover:text-carbon p-2 rounded-lg hover:bg-neutral-200 transition-colors shrink-0'
                      aria-label='Cerrar detalle'
                    >
                      ✕
                    </button>
                  </div>

                  {/* Lo que hay, no lo que falta: una gaseosa o un energizante no
                      tienen bodega ni anada, y escribirlas igual dejaba un
                      " • " suelto y un "Cosecha" sin numero. Ver la nota de
                      `utils/producto.ts`. */}
                  {subtitulo !== null && (
                    <p className='text-verde-salvia/90 text-xs font-semibold uppercase tracking-widest'>
                      {subtitulo}
                    </p>
                  )}

                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='bg-verde-800/80 border border-verde-500/30 text-blanco text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold'>
                      {producto.category}
                    </span>
                    {tieneAnada(producto.vintage) && (
                      <span className='bg-blanco text-verde-salvia text-xs px-2.5 py-1 rounded-full font-serif font-bold border border-verde-salvia/20'>
                        Cosecha {producto.vintage}
                      </span>
                    )}
                  </div>

                  <p className='text-carbon text-2xl font-bold font-serif'>
                    {formatearPrecio(producto.price)}
                  </p>

                  {/* D-N: el chequeo es `!== undefined`, no un truthy check. Un
                      string vacio es un dato presente, no ausente. */}
                  {producto.tastingNotes !== undefined && (
                    <section>
                      <h3 className='text-xs uppercase tracking-widest text-verde-salvia/90 font-semibold mb-1'>
                        Notas de cata
                      </h3>
                      <p className='text-neutral-700 text-sm leading-relaxed'>
                        {producto.tastingNotes}
                      </p>
                    </section>
                  )}

                  {producto.foodPairing !== undefined && (
                    <section>
                      <h3 className='text-xs uppercase tracking-widest text-verde-salvia/90 font-semibold mb-1'>
                        Maridaje sugerido
                      </h3>
                      <p className='text-neutral-700 text-sm leading-relaxed'>
                        {producto.foodPairing}
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