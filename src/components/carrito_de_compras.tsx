import { motion, AnimatePresence } from 'framer-motion'
import { CartItem } from '../types/vino'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (wineId: string, delta: number) => void
  onRemoveItem: (wineId: string) => void
  onCheckout: () => void
}

export const CartDrawer = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}: CartDrawerProps) => {
  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  const formattedTotal = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(totalAmount)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50'
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className='fixed top-0 right-0 bottom-0 w-full max-w-md bg-blanco border-l border-verde-800/50 text-carbon z-50 flex flex-col shadow-2xl'
          >
            <div className='p-6 border-b border-neutral-200 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <h2 className='text-2xl font-serif font-bold text-carbon'>
                  Tu Cava
                </h2>
                <span className='bg-verde-800/80 text-verde-salvia text-xs px-2.5 py-0.5 rounded-full border border-verde-500/30 font-mono'>
                  {items.reduce((acc, item) => acc + item.quantity, 0)} items
                </span>
              </div>
              <button
                onClick={onClose}
                className='text-neutral-600 hover:text-carbon p-2 rounded-lg hover:bg-neutral-200 transition-colors'
                aria-label='Cerrar carrito'
              >
                ✕
              </button>
            </div>

            <div className='flex-1 overflow-y-auto p-6 space-y-4'>
              {items.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center text-center text-neutral-500'>
                  <p className='text-lg font-serif mb-2 text-neutral-600'>
                    El carrito está vacío
                  </p>
                  <p className='text-sm'>Explora el catálogo para agregar tus vinos preferidos.</p>
                </div>
              ) : (
                items.map(({ product, quantity }) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className='bg-blanco/80 p-4 rounded-xl border border-neutral-200 flex gap-4 items-center'
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className='w-16 h-20 object-cover rounded-lg bg-marfil'
                    />
                    <div className='flex-1 min-w-0'>
                      <h4 className='font-serif font-bold text-sm text-carbon truncate'>
                        {product.name}
                      </h4>
                      <p className='text-xs text-verde-salvia/90 mb-2'>
                        {product.winery}
                      </p>
                      <span className='text-sm font-bold text-carbon'>
                        ${(product.price * quantity).toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className='flex flex-col items-end gap-2'>
                      <div className='flex items-center gap-2 bg-blanco px-2 py-1 rounded-lg border border-neutral-300/50'>
                        <button
                          onClick={() => onUpdateQuantity(product.id, -1)}
                          className='text-neutral-600 hover:text-carbon px-1'
                        >
                          -
                        </button>
                        <span className='text-xs font-mono font-bold px-1'>
                          {quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(product.id, 1)}
                          className='text-neutral-600 hover:text-carbon px-1'
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem(product.id)}
                        className='text-xs text-neutral-500 hover:text-verde-600 transition-colors'
                      >
                        Eliminar
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className='p-6 border-t border-neutral-200 bg-marfil/80 space-y-4'>
                <div className='flex justify-between items-center text-lg font-serif'>
                  <span className='text-neutral-600'>Total Estimado:</span>
                  <span className='text-verde-salvia font-bold text-xl'>
                    {formattedTotal}
                  </span>
                </div>
                <button
                  onClick={onCheckout}
                  className='w-full bg-verde-600 hover:bg-verde-600 text-blanco py-3.5 rounded-xl font-semibold tracking-wider uppercase transition-all duration-300 shadow-lg shadow-verde-900/50 border border-verde-500/30'
                >
                  Finalizar Pedido
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}