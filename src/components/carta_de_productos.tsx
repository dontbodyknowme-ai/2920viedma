import { motion } from 'framer-motion'
import { Producto } from '../types/producto'
import { subtituloProducto, tieneAnada } from '../utils/producto'

interface ProductCardProps {
  producto: Producto
  onAddToCart: (producto: Producto) => void
  onSelectProducto: (producto: Producto) => void
  onEditProducto?: (producto: Producto) => void
}

export const ProductCard = ({ producto, onAddToCart, onSelectProducto, onEditProducto }: ProductCardProps) => {
  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(producto.price)

  // Lo que hay, no lo que falta. Una gaseosa o un energizante no tienen bodega
  // ni anada, y escribirlos igual dejaba un " • " suelto y un badge con la
  // forma de un ano vacio. Ver la nota de `utils/producto.ts`.
  const subtitulo = subtituloProducto(producto)

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
        onClick={() => onSelectProducto(producto)}
      >
        <img
          src={producto.imageUrl}
          alt={producto.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100'
        />
        <div className='absolute top-3 left-3 bg-verde-800/80 backdrop-blur-md border border-verde-500/30 text-blanco text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold'>
          {producto.category}
        </div>
        {tieneAnada(producto.vintage) && (
          <div className='absolute top-3 right-3 bg-blanco/80 backdrop-blur-md text-verde-salvia text-xs px-2.5 py-1 rounded-full font-serif font-bold border border-verde-salvia/20'>
            {producto.vintage}
          </div>
        )}
      </div>

      <div className='p-5 flex-1 flex flex-col justify-between'>
        <div>
          {subtitulo !== null && (
            <p className='text-verde-salvia/90 text-xs font-semibold uppercase tracking-widest mb-1'>
              {subtitulo}
            </p>
          )}
          <h3 
            onClick={() => onSelectProducto(producto)}
            className='text-carbon font-serif text-xl font-bold line-clamp-1 cursor-pointer hover:text-verde-600 transition-colors mb-2'
          >
            {producto.name}
          </h3>
          <p className='text-neutral-600 text-sm line-clamp-2 mb-4 font-light'>
            {producto.description}
          </p>
        </div>

        <div className='pt-4 border-t border-neutral-200/80 mt-auto flex flex-col gap-3'>
          <span className='text-carbon text-xl font-bold font-serif'>
            {formattedPrice}
          </span>
          {onEditProducto && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditProducto(producto)
              }}
              className='w-full bg-neutral-200 hover:bg-neutral-600 text-neutral-600 text-xs uppercase tracking-wider font-bold px-3 py-2.5 rounded-xl transition-all duration-300 border border-neutral-600'
              aria-label={`Editar ${producto.name}`}
            >
              Editar
            </button>
          )}
          <button
            onClick={() => onAddToCart(producto)}
            className='w-full bg-verde-600 hover:bg-verde-500 text-blanco text-sm uppercase tracking-wider font-bold px-4 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-verde-900/40 border border-verde-500/20 active:scale-95'
          >
            Agregar
          </button>
        </div>
      </div>
    </motion.div>
  )
}