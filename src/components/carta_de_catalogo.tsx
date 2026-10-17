import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wine, PublicWine, WineCategory } from '../types/vino'
import { ProductCard } from './carta_de_productos'
import { filtrarVinos } from '../utils/filtros'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

/**
 * "Todos" va aparte de las categorias porque **no** es una categoria: no esta en
 * el catalogo y no se puede filtrar por ella, solo la desactiva.
 */
const TODOS = 'Todos'

interface ProductCatalogProps {
  searchQuery: string
  onSearchChange: (query: string) => void
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
  onSearchChange,
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

  /**
   * Las categorias salen **del catalogo**, no de una lista del codigo.
   *
   * Antes era `['Tinto', 'Blanco', 'Rosado', 'Espumante']` escrito a mano. Con
   * esa lista, cargar un queso obligaba a editar el componente: el producto
   * existia, se veia en la grilla y no aparecia en ningun filtro. Agregar una
   * categoria era un paso que se olvidaba, y el sintoma —un producto que no se
   * puede filtrar— no parece un bug sino que falto cargarlo.
   *
   * Ahora el filtro y el buscador derivan del mismo lugar, asi que no pueden
   * desincronizarse. `esCategoriaValida` evita que entren typos y se creen
   * categorias duplicadas (`'tinto'` y `'Tinto'`).
   */
  const availableCategories = useMemo(
    () => Array.from(new Set(wines.map((w) => w.category))).sort(),
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
          <div className='w-12 h-12 border-4 border-verde-salvia border-t-transparent rounded-full animate-spin' />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id='catalogo' className='py-20 px-6 max-w-7xl mx-auto'>
        <div className='text-center py-20'>
          <p className='text-verde-500 mb-4'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='px-6 py-3 bg-verde-600 hover:bg-verde-600 text-blanco rounded-xl font-semibold transition-colors'
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
        <h2 className='text-4xl md:text-5xl font-serif font-bold text-carbon mb-8'>
          Catálogo de Productos
        </h2>
      </div>

      {/* Filtros */}
      <div className='mb-10 flex flex-col md:flex-row gap-6 max-w-4xl mx-auto'>
        {/* Categorías */}
        <div className='flex-1'>
          <label className='block text-sm font-medium text-verde-salvia mb-2'>
            Tipo de Producto
          </label>
          <div className='flex flex-wrap gap-2'>
            {[TODOS, ...availableCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-verde-600 text-blanco border border-verde-500/50'
                    : 'bg-blanco text-neutral-700 hover:bg-neutral-200 border border-neutral-300'
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
              <label className='block text-sm font-medium text-verde-salvia'>
                Cepa
              </label>
              {selectedVarietals.length > 0 && (
                <button
                  onClick={handleClearVarietals}
                  className='text-xs text-verde-salvia hover:text-verde-salvia underline'
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
                      ? 'bg-verde-600 text-blanco'
                      : 'bg-blanco text-neutral-700 hover:bg-neutral-200 border border-neutral-300'
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
          <label className='block text-sm font-medium text-verde-salvia mb-2'>
            Rango de Precio (ARS)
          </label>
          <div className='flex gap-2'>
            <input
              type='number'
              placeholder='Mín'
              value={minPrice === '' ? '' : minPrice}
              onChange={(e) => onMinPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
              className='flex-1 bg-blanco border border-neutral-300 rounded-xl px-4 py-2.5 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia text-sm'
              min='0'
            />
            <input
              type='number'
              placeholder='Máx'
              value={maxPrice === '' ? '' : maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
              className='flex-1 bg-blanco border border-neutral-300 rounded-xl px-4 py-2.5 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia text-sm'
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
              className='mt-2 w-full text-xs text-verde-salvia hover:text-verde-salvia underline'
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
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder='Buscar por nombre, marca o categoría...'
          aria-label='Buscar productos'
          className='w-full bg-blanco/80 border border-neutral-300/50 rounded-xl px-6 py-3.5 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia text-lg'
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
            <p className='text-neutral-600 text-lg'>
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