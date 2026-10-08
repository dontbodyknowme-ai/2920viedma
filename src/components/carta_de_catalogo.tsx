import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wine, WineCategory } from '../types/vino'
import { ProductCard } from './carta_de_productos'
import { filtrarVinos } from '../utils/filtros'

interface ProductCatalogProps {
  wines: Wine[]
  searchQuery: string
  onAddToCart: (wine: Wine) => void
  onSelectWine: (wine: Wine) => void
  onEditWine: (wine: Wine) => void
  minPrice: number | ''
  maxPrice: number | ''
  selectedVarietals: string[]
  onMinPriceChange: (value: number | '') => void
  onMaxPriceChange: (value: number | '') => void
  onVarietalsChange: (value: string[]) => void
}

const CATEGORIES: (WineCategory | 'Todos')[] = ['Todos', 'Tinto', 'Blanco', 'Rosado', 'Espumante']

export const ProductCatalog = ({
  wines,
  searchQuery,
  onAddToCart,
  onSelectWine,
  onEditWine,
  minPrice,
  maxPrice,
  selectedVarietals,
  onMinPriceChange,
  onMaxPriceChange,
  onVarietalsChange
}: ProductCatalogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<WineCategory | 'Todos'>('Todos')

  const availableVarietals = useMemo(
    () => Array.from(new Set(wines.map((w) => w.varietal))).sort(),
    [wines]
  )

  const filtros = {
    categoria: selectedCategory,
    minPrice,
    maxPrice,
    selectedVarietals,
    searchQuery
  }

  const filteredWines = useMemo(
    () => filtrarVinos(wines, filtros),
    [wines, selectedCategory, minPrice, maxPrice, selectedVarietals, searchQuery]
  )

  const handleVarietalToggle = (varietal: string) => {
    const newSelected = selectedVarietals.includes(varietal)
      ? selectedVarietals.filter((v) => v !== varietal)
      : [...selectedVarietals, varietal]
    onVarietalsChange(newSelected)
  }

  const handleClearPrice = () => {
    onMinPriceChange('')
    onMaxPriceChange('')
  }

  const handleClearVarietals = () => {
    onVarietalsChange([])
  }

  const hasActivePriceFilter = minPrice !== '' || maxPrice !== ''
  const hasActiveVarietalFilter = selectedVarietals.length > 0
  const hasActiveCategoryFilter = selectedCategory !== 'Todos'

  return (
    <section id='catalogo' className='py-20 px-6 max-w-7xl mx-auto'>
      <div className='text-center mb-12'>
        <p className='text-gold-500 uppercase tracking-[0.25em] text-xs font-semibold mb-2'>
          Nuestra Colección
        </p>
        <h2 className='text-3xl md:text-5xl font-serif text-cream-100 font-bold'>
          Catálogo de Vinos
        </h2>
      </div>

      <div className='mb-8'>
        <div className='flex flex-wrap items-center justify-center gap-3 mb-6'>
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

        <div className='flex flex-wrap items-center justify-center gap-4 mb-6'>
          <div className='flex items-center gap-2'>
            <label htmlFor='minPrice' className='text-neutral-400 text-sm whitespace-nowrap'>
              Precio mínimo
            </label>
            <input
              id='minPrice'
              type='number'
              min='0'
              step='1000'
              value={minPrice}
              onChange={(e) => {
                const val = e.target.value
                onMinPriceChange(val === '' ? '' : Number(val))
              }}
              placeholder='0'
              className='w-28 bg-charcoal-800 border border-neutral-700/60 rounded-xl px-3 py-2 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
              aria-label='Precio mínimo'
            />
          </div>
          <div className='flex items-center gap-2'>
            <label htmlFor='maxPrice' className='text-neutral-400 text-sm whitespace-nowrap'>
              Precio máximo
            </label>
            <input
              id='maxPrice'
              type='number'
              min='0'
              step='1000'
              value={maxPrice}
              onChange={(e) => {
                const val = e.target.value
                onMaxPriceChange(val === '' ? '' : Number(val))
              }}
              placeholder='∞'
              className='w-28 bg-charcoal-800 border border-neutral-700/60 rounded-xl px-3 py-2 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
              aria-label='Precio máximo'
            />
          </div>
          {hasActivePriceFilter && (
            <button
              onClick={handleClearPrice}
              className='text-gold-500 hover:text-gold-400 text-xs font-semibold uppercase tracking-wider transition-colors'
              aria-label='Limpiar filtros de precio'
            >
              Limpiar precio
            </button>
          )}
        </div>

        <div className='flex flex-wrap items-center justify-center gap-2 mb-6'>
          <span className='text-neutral-400 text-xs uppercase tracking-wider mr-2'>
            Cepas:
          </span>
          {availableVarietals.map((varietal) => (
            <button
              key={varietal}
              onClick={() => handleVarietalToggle(varietal)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase transition-all duration-300 ${
                selectedVarietals.includes(varietal)
                  ? 'bg-wine-700 text-cream-100 border border-gold-500/40 shadow-lg shadow-wine-900/40'
                  : 'bg-charcoal-800/80 text-neutral-400 hover:text-cream-100 border border-neutral-800'
              }`}
              aria-pressed={selectedVarietals.includes(varietal)}
            >
              {varietal}
            </button>
          ))}
          {hasActiveVarietalFilter && (
            <button
              onClick={handleClearVarietals}
              className='text-gold-500 hover:text-gold-400 text-xs font-semibold uppercase tracking-wider transition-colors'
              aria-label='Limpiar filtros de cepa'
            >
              Limpiar cepas
            </button>
          )}
        </div>

        {(hasActivePriceFilter || hasActiveVarietalFilter || hasActiveCategoryFilter) && (
          <div className='text-center'>
            <button
              onClick={() => {
                handleClearPrice()
                handleClearVarietals()
                setSelectedCategory('Todos')
              }}
              className='text-gold-500/80 hover:text-gold-500 text-xs font-semibold uppercase tracking-wider transition-colors'
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
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
                onEditWine={onEditWine}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  )
}