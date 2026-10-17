import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { Wine, PublicWine } from '../types/vino'
import { ProductCard } from './carta_de_productos'
import { filtrarVinos } from '../utils/filtros'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

/**
 * Las categorias del filtro del catalogo.
 *
 * Son **fijas**, no derivadas de los datos. El boceto de diseno de la home
 * marca estas cinco (Todos los productos, Bebidas, Regaleria, Snacks y
 * chocolates, Comidas) como la taxonomia de la tienda, y son las mismas que
 * usan las tarjetas de categorias de arriba.
 *
 * Ojo: los productos de hoy son vinos (Tinto/Blanco/Rosado/Espumante), asi que
 * filtrar por estas categorias todavia no devuelve resultados. El filtro esta
 * listo para cuando el catalogo pase a esta taxonomia.
 */
const CATEGORIAS_CATALOGO = [
  'Todos los productos',
  'Bebidas',
  'Regalería',
  'Snacks y chocolates',
  'Comidas'
]

interface ProductCatalogProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onAddToCart: (wine: Wine) => void
  onSelectWine: (wine: Wine) => void
  onEditWine: (wine: Wine) => void
  minPrice: number | ''
  maxPrice: number | ''
  onMinPriceChange: (value: number | '') => void
  onMaxPriceChange: (value: number | '') => void
}

export const ProductCatalog = ({
  searchQuery,
  onSearchChange,
  onAddToCart,
  onSelectWine,
  onEditWine,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange
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
  const [selectedCategory, setSelectedCategory] = useState('Todos los productos')
  const { hasRole } = useAuth()

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
    searchQuery
  }

  const filteredWines = useMemo(
    () => filtrarVinos(wines, filtros),
    [wines, selectedCategory, minPrice, maxPrice, searchQuery]
  )

  const isAdminOrGestor = hasRole('admin') || hasRole('gestor')

  return (
    <section id='catalogo' className='py-20 px-6 max-w-7xl mx-auto'>
      <div className='mb-10'>
        <h2 className='font-serif text-3xl font-bold text-carbon'>
          Catálogo de productos
        </h2>
        <p className='mt-2 text-neutral-600'>
          Encontrá lo que necesitás para disfrutar, regalar o compartir.
        </p>
      </div>

      {/* Categoría */}
      <div className='mb-8'>
        <label className='block text-sm font-medium text-carbon mb-3'>
          Categoría
        </label>
        <div className='grid grid-cols-2 gap-3'>
          {CATEGORIAS_CATALOGO.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-verde-600 text-blanco border-verde-600'
                  : 'bg-blanco text-carbon border-neutral-300 hover:border-verde-salvia'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Precio */}
      <div className='mb-8'>
        <label className='block text-sm font-medium text-carbon mb-3'>
          Precio (ARS)
        </label>
        <div className='flex gap-3'>
          <input
            type='number'
            placeholder='Mínimo'
            value={minPrice === '' ? '' : minPrice}
            onChange={(e) => onMinPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
            className='flex-1 bg-blanco border border-neutral-300 rounded-xl px-4 py-3 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia'
            min='0'
          />
          <input
            type='number'
            placeholder='Máximo'
            value={maxPrice === '' ? '' : maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
            className='flex-1 bg-blanco border border-neutral-300 rounded-xl px-4 py-3 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia'
            min='0'
          />
        </div>
      </div>

      {/* Búsqueda */}
      <div className='mb-10'>
        <div className='relative'>
          <Search
            className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400'
            aria-hidden='true'
          />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='¿Qué necesitás hoy?'
            aria-label='Buscar productos'
            className='w-full bg-blanco border border-neutral-300 rounded-xl py-3.5 pl-12 pr-5 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia'
          />
        </div>
      </div>

      {/* Contenido: loading, error o grilla */}
      {loading ? (
        <div className='flex items-center justify-center py-20'>
          <div className='w-12 h-12 border-4 border-verde-salvia border-t-transparent rounded-full animate-spin' />
        </div>
      ) : error ? (
        <div className='text-center py-20'>
          <p className='text-verde-500 mb-4'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='px-6 py-3 bg-verde-600 hover:bg-verde-600 text-blanco rounded-xl font-semibold transition-colors'
          >
            Reintentar
          </button>
        </div>
      ) : (
        <AnimatePresence mode='popLayout'>
          {filteredWines.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='text-center py-20'
            >
              <p className='text-neutral-600 text-lg'>
                No se encontraron productos con los filtros actuales
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
      )}
    </section>
  )
}
