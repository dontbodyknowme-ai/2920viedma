import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wine, PublicWine, WineCategory } from '../types/vino'
import { ProductCard } from './carta_de_productos'
import { filtrarVinos } from '../utils/filtros'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

const CATEGORIES: (WineCategory | 'Todos')[] = ['Todos', 'Tinto', 'Blanco', 'Rosado', 'Espumante']

interface ProductCatalogProps {
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

export const ProductCatalog = ({
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
}: ProductCatalogProps): React.ReactElement => {
  const [wines, setWines] = useState<Wine[]>([])

  // Type helper para convertir PublicWine[] a Wine[]
  const toWine = (pw: PublicWine): Wine => ({
    ...pw,
    description: pw.description ?? '',
    tastingNotes: pw.tastingNotes ?? '',
    foodPairing: pw.foodPairing ?? ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<WineCategory | 'Todos'>('Todos')
  const { hasRole } = useAuth()

  const availableVarietals = useMemo(
    () => Array.from(new Set(wines.map((w) => w.varietal))).sort(),
    [wines]
  )

  const isAdminOrGestor = hasRole('admin') || hasRole('gestor')

  // Cargar vinos desde la API pública
  useEffect(() => {
    const cargarVinos = async () => {
      try {
        setLoading(true)
        const data = await api.wines.public()
        setWines(data.map(toWine))
        setError(null)
      } catch {
        setError('Error al cargar los vinos. Intente nuevamente.')
      } finally {
        setLoading(false)
      }
    }
    cargarVinos()
  }, [])

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
      ? selectedVarietals.filter((v: string) => v !== varietal)
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

  if (loading) {
    return (
      <section id='catalogo' className='py-20 px-6 max-w-7xl mx-auto'>
        <div className='flex items-center justify-center py-20'>
          <div className='w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin' />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id='catalogo' className='py-20 px-6 max-w-7xl mx-auto'>
        <div className='text-center py-20'>
          <p className='text-wine-400 mb-4'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='px-6 py-3 bg-wine-700 hover:bg-wine-500 text-cream-100 rounded-xl font-semibold transition-colors'
          >
            Reintentar
          </button>
        </div>
      </section>
    )
  }

  return (
    <section id='catalogo' className='py-20 px-6 max-w-7xl mx-auto'>
      <div className='text-center mb-12'>
        <p className='text-gold-500 uppercase tracking-[0.25em] text-xs font-semibold mb-2'>
          Nuestra Colección
        </p>
        <h2 className='text-4xl md:text-5xl font-serif font-bold text-cream-100 mb-8'>
          Catálogo de Vinos
        </h2>
      </div>

      {/* Filtros */}
      <div className='mb-10 flex flex-col md:flex-row gap-6 max-w-4xl mx-auto'>
        {/* Categorías */}
        <div className='flex-1'>
          <label className='block text-sm font-medium text-gold-400 mb-2'>
            Tipo de Vino
          </label>
          <div className='flex flex-wrap gap-2'>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-wine-700 text-cream-100 border border-wine-500/50'
                    : 'bg-charcoal-800 text-neutral-300 hover:bg-charcoal-700 border border-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cepas */}
        {availableVarietals.length > 0 && (
          <div className='flex-1'>
            <div className='flex items-center justify-between mb-2'>
              <label className='block text-sm font-medium text-gold-400'>
                Cepa
              </label>
              {selectedVarietals.length > 0 && (
                <button
                  onClick={handleClearVarietals}
                  className='text-xs text-gold-400 hover:text-gold-300 underline'
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className='flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2'>
              {availableVarietals.map((varietal) => (
                <button
                  key={varietal}
                  onClick={() => handleVarietalToggle(varietal)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedVarietals.includes(varietal)
                      ? 'bg-gold-600 text-charcoal-950'
                      : 'bg-charcoal-800 text-neutral-300 hover:bg-charcoal-700 border border-neutral-700'
                  }`}
                >
                  {varietal}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rango de precio */}
        <div className='flex-1 min-w-[200px]'>
          <label className='block text-sm font-medium text-gold-400 mb-2'>
            Rango de Precio (ARS)
          </label>
          <div className='flex gap-2'>
            <input
              type='number'
              placeholder='Mín'
              value={minPrice === '' ? '' : minPrice}
              onChange={(e) => onMinPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
              className='flex-1 bg-charcoal-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-cream-100 placeholder-neutral-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm'
              min='0'
            />
            <input
              type='number'
              placeholder='Máx'
              value={maxPrice === '' ? '' : maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
              className='flex-1 bg-charcoal-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-cream-100 placeholder-neutral-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm'
              min='0'
            />
          </div>
          {(hasActivePriceFilter || hasActiveVarietalFilter || hasActiveCategoryFilter) && (
            <button
              onClick={() => {
                handleClearPrice()
                handleClearVarietals()
                setSelectedCategory('Todos')
              }}
              className='mt-2 w-full text-xs text-gold-400 hover:text-gold-300 underline'
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className='mb-10 max-w-2xl mx-auto'>
        <input
          type='text'
          placeholder='Buscar por nombre, bodega o cepa...'
          className='w-full bg-charcoal-800/80 border border-neutral-700/50 rounded-xl px-6 py-3.5 text-cream-100 placeholder-neutral-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-lg'
        />
      </div>

      {/* Grid de productos */}
      <AnimatePresence mode='popLayout'>
        {filteredWines.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='text-center py-20'
          >
            <p className='text-neutral-400 text-lg'>
              No se encontraron vinos con los filtros actuales
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          >
            {filteredWines.map((wine) => (
              <ProductCard
                key={wine.id}
                wine={wine}
                onAddToCart={onAddToCart}
                onSelectWine={onSelectWine}
                onEditWine={isAdminOrGestor ? onEditWine : undefined}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}