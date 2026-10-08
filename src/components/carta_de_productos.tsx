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
      className='bg-charcoal-800/60 rounded-2xl border border-neutral-800 hover:border-wine-500/50 overflow-hidden flex flex-col justify-between group transition-colors shadow-lg hover:shadow-wine-900/20'
    >
      <div 
        className='relative h-64 overflow-hidden bg-charcoal-900 cursor-pointer'
        onClick={() => onSelectWine(wine)}
      >
        <img
          src={wine.imageUrl}
          alt={wine.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100'
        />
        <div className='absolute top-3 left-3 bg-wine-900/80 backdrop-blur-md border border-wine-500/30 text-cream-100 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold'>
          {wine.category}
        </div>
        <div className='absolute top-3 right-3 bg-charcoal-900/80 backdrop-blur-md text-gold-400 text-xs px-2.5 py-1 rounded-full font-serif font-bold border border-gold-500/20'>
          {wine.vintage}
        </div>
      </div>

      <div className='p-5 flex-1 flex flex-col justify-between'>
        <div>
          <p className='text-gold-500/90 text-xs font-semibold uppercase tracking-widest mb-1'>
            {wine.winery} • {wine.varietal}
          </p>
          <h3 
            onClick={() => onSelectWine(wine)}
            className='text-cream-100 font-serif text-xl font-bold line-clamp-1 cursor-pointer hover:text-gold-400 transition-colors mb-2'
          >
            {wine.name}
          </h3>
          <p className='text-neutral-400 text-sm line-clamp-2 mb-4 font-light'>
            {wine.description}
          </p>
        </div>

        <div className='pt-4 border-t border-neutral-800/80 flex items-center justify-between mt-auto'>
          <span className='text-cream-100 text-xl font-bold font-serif'>
            {formattedPrice}
          </span>
          <div className='flex items-center gap-2'>
            {onEditWine && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditWine(wine)
                }}
                className='bg-neutral-700 hover:bg-neutral-600 text-cream-200 text-xs uppercase tracking-wider font-bold px-3 py-2.5 rounded-xl transition-all duration-300 border border-neutral-600'
                aria-label={`Editar ${wine.name}`}
              >
                Editar
              </button>
            )}
            <button
              onClick={() => onAddToCart(wine)}
              className='bg-wine-700 hover:bg-wine-500 text-cream-100 text-xs uppercase tracking-wider font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-wine-900/40 border border-wine-500/20 active:scale-95'
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}