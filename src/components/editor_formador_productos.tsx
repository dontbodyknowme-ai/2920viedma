import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wine, WineCategory } from '../types/wine'

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onAddWine: (wine: Wine) => void
}

const CATEGORIES: WineCategory[] = ['Tinto', 'Blanco', 'Rosado', 'Espumante']

export const ProductForm = ({ isOpen, onClose, onAddWine }: ProductFormProps) => {
  const [name, setName] = useState('')
  const [winery, setWinery] = useState('')
  const [varietal, setVarietal] = useState('')
  const [category, setCategory] = useState<WineCategory>('Tinto')
  const [vintage, setVintage] = useState<number>(new Date().getFullYear())
  const [price, setPrice] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !winery || !price) return

    const newWine: Wine = {
      id: crypto.randomUUID(),
      name,
      winery,
      varietal: varietal || 'Blend',
      category,
      vintage: Number(vintage),
      price: Number(price),
      description,
      imageUrl:
        imageUrl ||
        'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800'
    }

    onAddWine(newWine)
    handleReset()
    onClose()
  }

  const handleReset = () => {
    setName('')
    setWinery('')
    setVarietal('')
    setCategory('Tinto')
    setVintage(new Date().getFullYear())
    setPrice('')
    setDescription('')
    setImageUrl('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='bg-charcoal-900 border border-wine-900/60 rounded-2xl p-6 md:p-8 w-full max-w-xl text-cream-100 shadow-2xl relative my-8'
            >
              <div className='flex justify-between items-center mb-6 border-b border-neutral-800 pb-4'>
                <h2 className='text-2xl font-serif font-bold text-cream-100'>
                  Cargar Nuevo Vino
                </h2>
                <button
                  onClick={onClose}
                  className='text-neutral-400 hover:text-cream-100 text-lg p-1'
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                    Nombre de la Etiqueta *
                  </label>
                  <input
                    type='text'
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='Ej: Gran Reserva Malbec'
                    className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                  />
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                      Bodega *
                    </label>
                    <input
                      type='text'
                      required
                      value={winery}
                      onChange={(e) => setWinery(e.target.value)}
                      placeholder='Ej: Catena Zapata'
                      className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                    />
                  </div>
                  <div>
                    <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                      Varietal / Cepa
                    </label>
                    <input
                      type='text'
                      value={varietal}
                      onChange={(e) => setVarietal(e.target.value)}
                      placeholder='Ej: Malbec, Cabernet'
                      className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <div>
                    <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                      Categoría
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as WineCategory)}
                      className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-3 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                      Año (Cosecha)
                    </label>
                    <input
                      type='number'
                      value={vintage}
                      onChange={(e) => setVintage(Number(e.target.value))}
                      className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                    />
                  </div>
                  <div>
                    <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                      Precio ($) *
                    </label>
                    <input
                      type='number'
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder='35000'
                      className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                    URL de la Imagen
                  </label>
                  <input
                    type='url'
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder='https://...'
                    className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                  />
                </div>

                <div>
                  <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder='Notas de cata, crianza en barrica, maridaje...'
                    className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm resize-none'
                  />
                </div>

                <div className='flex gap-3 pt-4 border-t border-neutral-800'>
                  <button
                    type='button'
                    onClick={onClose}
                    className='flex-1 bg-charcoal-800 hover:bg-neutral-800 text-cream-200 py-3 rounded-xl text-xs uppercase font-semibold tracking-wider transition-colors'
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    className='flex-1 bg-wine-700 hover:bg-wine-500 text-cream-100 py-3 rounded-xl text-xs uppercase font-semibold tracking-wider transition-colors shadow-lg shadow-wine-900/50 border border-wine-500/30'
                  >
                    Guardar Vino
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}