import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wine, WineCategory } from '../types/vino'
import { ProductCard } from './carta_de_productos'

interface ProductCatalogProps {
  wines: Wine[]
  searchQuery: string
  onAddToCart: (wine: Wine) => void
  onSelectWine: (wine: Wine) => void
}

const CATEGORIES: (WineCategory | 'Todos')[] = ['Todos', 'Tinto', 'Blanco', 'Rosado', 'Espumante']

export const ProductCatalog = ({
  wines,
  searchQuery,
  onAddToCart,
  onSelectWine
}: ProductCatalogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<WineCategory | 'Todos'>('Todos')

  const filteredWines = useMemo(() => {
    const consulta = searchQuery.trim().toLowerCase()

    return wines.filter((wine) => {
      const matchesCategory = selectedCategory === 'Todos' || wine.category === selectedCategory
      const matchesSearch =
        wine.name.toLowerCase().includes(consulta) ||
        wine.winery.toLowerCase().includes(consulta) ||
        wine.varietal.toLowerCase().includes(consulta)

      return matchesCategory && matchesSearch
    })
  }, [wines, selectedCategory, searchQuery])

  return (
    <section id='catalogo' className='scroll-mt-28 md:scroll-mt-24 py-20 px-6 max-w-7xl mx-auto'>
      <div className='text-center mb-12'>
        <p className='text-gold-500 uppercase tracking-[0.25em] text-xs font-semibold mb-2'>
          Nuestra Colección
        </p>
        <h2 className='text-3xl md:text-5xl font-serif text-cream-100 font-bold'>
          Catálogo de Vinos
        </h2>
      </div>

      <div className='flex flex-wrap items-center justify-center gap-3 mb-12'>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
              selectedCategory === cat
                ? 'bg-wine-700 text-cream-100 border border-gold-500/40 shadow-lg shadow-wine-900/40 scale-105'
                : 'bg-charcoal-800/80 text-neutral-400 hover:text-cream-100 border border-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredWines.length === 0 ? (
        <div className='text-center py-16 bg-charcoal-800/30 rounded-2xl border border-neutral-800/50'>
          <p className='text-cream-200 text-lg font-serif mb-1'>No se encontraron etiquetas</p>
          <p className='text-neutral-500 text-sm'>Intenta cambiar los filtros o el término de búsqueda.</p>
        </div>
      ) : (
        <motion.div 
          layout
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
        >
          <AnimatePresence>
            {filteredWines.map((wine) => (
              <ProductCard
                key={wine.id}
                wine={wine}
                onAddToCart={onAddToCart}
                onSelectWine={onSelectWine}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  )
}