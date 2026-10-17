import { motion } from 'framer-motion'
import { Wine } from '../types/vino'

interface ProductCardProps {
  wine: Wine
  onAddToCart: (wine: Wine) => void
  onSelectWine: (wine: Wine) => void
  onEditWine?: (wine: Wine) => void
}

export const ProductCard = ({ wine, onAddToCart, onSelectWine, onEditWine }: ProductCardProps) => {
  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(wine.price)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className='bg-blanco/60 rounded-2xl border border-neutral-200 hover:border-verde-500/50 overflow-hidden flex flex-col justify-between group transition-colors shadow-lg hover:shadow-verde-900/20'
    >
      <div 
        className='relative h-64 overflow-hidden bg-blanco cursor-pointer'
        onClick={() => onSelectWine(wine)}
      >
        <img
          src={wine.imageUrl}
          alt={wine.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100'
        />
        <div className='absolute top-3 left-3 bg-verde-800/80 backdrop-blur-md border border-verde-500/30 text-blanco text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold'>
          {wine.category}
        </div>
        <div className='absolute top-3 right-3 bg-blanco/80 backdrop-blur-md text-verde-salvia text-xs px-2.5 py-1 rounded-full font-serif font-bold border border-verde-salvia/20'>
          {wine.vintage}
        </div>
      </div>

      <div className='p-5 flex-1 flex flex-col justify-between'>
        <div>
          <p className='text-verde-salvia/90 text-xs font-semibold uppercase tracking-widest mb-1'>
            {wine.winery} • {wine.varietal}
          </p>
          <h3 
            onClick={() => onSelectWine(wine)}
            className='text-carbon font-serif text-xl font-bold line-clamp-1 cursor-pointer hover:text-verde-600 transition-colors mb-2'
          >
            {wine.name}
          </h3>
          <p className='text-neutral-600 text-sm line-clamp-2 mb-4 font-light'>
            {wine.description}
          </p>
        </div>

        <div className='pt-4 border-t border-neutral-200/80 flex items-center justify-between mt-auto'>
          <span className='text-carbon text-xl font-bold font-serif'>
            {formattedPrice}
          </span>
          <div className='flex items-center gap-2'>
            {onEditWine && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditWine(wine)
                }}
                className='bg-neutral-200 hover:bg-neutral-600 text-neutral-600 text-xs uppercase tracking-wider font-bold px-3 py-2.5 rounded-xl transition-all duration-300 border border-neutral-600'
                aria-label={`Editar ${wine.name}`}
              >
                Editar
              </button>
            )}
            <button
              onClick={() => onAddToCart(wine)}
              className='bg-verde-600 hover:bg-verde-600 text-blanco text-xs uppercase tracking-wider font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-verde-900/40 border border-verde-500/20 active:scale-95'
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}