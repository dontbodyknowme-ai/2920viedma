import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wine, WineCategory } from '../types/vino'

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onAddWine: (wine: Wine) => void
  onUpdateWine: (wine: Wine) => void
  wineToEdit: Wine | null
}

/**
 * Este es el formulario legacy de la tienda publica. El del panel es
 * `AdminWineForm`, que ya quedo migrado a input libre (spec 011); este seguia con
 * el `<select>` de cuatro categorias, asi que era el segundo lugar donde cargar
 * un queso era imposible.
 */
const CATEGORIAS_ARRANCAMIENTO: WineCategory = 'Tinto'

export const ProductForm = ({
  isOpen,
  onClose,
  onAddWine,
  onUpdateWine,
  wineToEdit
}: ProductFormProps) => {
  const [name, setName] = useState('')
  const [winery, setWinery] = useState('')
  const [varietal, setVarietal] = useState('')
  const [category, setCategory] = useState<WineCategory>(CATEGORIAS_ARRANCAMIENTO)
  const [vintage, setVintage] = useState<number>(new Date().getFullYear())
  const [price, setPrice] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  const isEditing = wineToEdit !== null

  useEffect(() => {
    if (wineToEdit) {
      setName(wineToEdit.name)
      setWinery(wineToEdit.winery)
      setVarietal(wineToEdit.varietal)
      setCategory(wineToEdit.category)
      setVintage(wineToEdit.vintage)
      setPrice(wineToEdit.price)
      setDescription(wineToEdit.description)
      setImageUrl(wineToEdit.imageUrl)
      setImagePreview(wineToEdit.imageUrl)
      setError('')
    } else {
      setName('')
      setWinery('')
      setVarietal('')
      setCategory('Tinto')
      setVintage(new Date().getFullYear())
      setPrice('')
      setDescription('')
      setImageUrl('')
      setImagePreview('')
      setError('')
    }
  }, [wineToEdit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !winery || price === '' || price === 0) return

    const wineData: Wine = {
      id: isEditing ? wineToEdit!.id : crypto.randomUUID(),
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

    if (isEditing) {
      onUpdateWine(wineData)
    } else {
      onAddWine(wineData)
    }

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
    setImagePreview('')
    setError('')
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('El archivo tiene que ser una imagen (PNG, JPG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
      setImageUrl(reader.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
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
                  {isEditing ? 'Editar Vino' : 'Cargar Nuevo Vino'}
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
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder='Tinto, Cerveza, Fiambre...'
                      className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-3 py-2.5 text-cream-100 placeholder-neutral-500 focus:outline-none focus:border-gold-500 text-sm'
                    />
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
                    Imagen del Vino
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      isDragging ? 'border-gold-500 bg-wine-900/20' : 'border-neutral-700'
                    }`}
                  >
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt='Vista previa'
                          className='max-h-40 mx-auto rounded-lg mb-3'
                        />
                        <p className='text-neutral-400 text-xs'>
                          Imagen cargada desde archivo (la URL se ignora)
                        </p>
                      </>
                    ) : (
                      <p className='text-neutral-400 text-sm'>
                        Arrastrá una imagen acá o{' '}
                        <label className='text-gold-500 cursor-pointer hover:underline'>
                          seleccioná un archivo
                          <input
                            type='file'
                            accept='image/*'
                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            className='hidden'
                          />
                        </label>
                      </p>
                    )}
                  </div>
                  {error && (
                    <p className='mt-2 text-red-500 text-xs' role='alert'>{error}</p>
                  )}
                  {!imagePreview && (
                    <div className='mt-3'>
                      <label className='block text-xs uppercase tracking-wider text-neutral-400 mb-1'>
                        O ingresá una URL de imagen
                      </label>
                      <input
                        type='url'
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value)
                          setImagePreview(e.target.value)
                        }}
                        placeholder='https://...'
                        className='w-full bg-charcoal-800 border border-neutral-700/60 rounded-xl px-4 py-2.5 text-cream-100 focus:outline-none focus:border-gold-500 text-sm'
                      />
                    </div>
                  )}
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
                    {isEditing ? 'Guardar Cambios' : 'Guardar Vino'}
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