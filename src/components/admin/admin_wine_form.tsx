import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { AdminWine, Wine } from '../../types/admin'
import { CATEGORIAS } from '../../hooks/useCatalogo'
import { api } from '../../api/client'

/**
 * Formulario de alta y edicion de vinos del panel.
 *
 * **No reutiliza `editor_formador_productos.tsx`, y esa es una decision que
 * viene de C-1.** Ese formulario produce un `Wine`, que es lo que ve un
 * visitante. Este produce un `AdminWine`, que suma `stock` y `activo`. Con C-1
 * resuelto, son dos tipos distintos y un solo formulario para los dos
 * tendria que hacer `mostrarInventario: boolean` y ensuciar las dos ramas de
 * envio con casts. Dos formularios, dos contratos limpios.
 *
 * `stock` y `activo` no existen en `Wine` porque el catalogo publico no los
 * necesita: ver RF-06 de la spec 004-b.
 */

interface AdminWineFormProps {
  isOpen: boolean
  /** `null` para crear, un vino para editar. */
  vino: AdminWine | null
  onClose: () => void
  onGuardar: (vino: Omit<AdminWine, 'id'> & { id?: string }) => Promise<void>
}

const ANIO_EN_CURSO = new Date().getFullYear()

const CAMPOS_VACIOS = {
  name: '',
  winery: '',
  varietal: '',
  category: 'Tinto' as Wine['category'],
  vintage: String(ANIO_EN_CURSO),
  price: '',
  stock: '0',
  description: '',
  imageUrl: '',
  tastingNotes: '',
  foodPairing: '',
  activo: true
}

type EstadoFormulario = typeof CAMPOS_VACIOS

export const AdminWineForm = ({ isOpen, vino, onClose, onGuardar }: AdminWineFormProps) => {
  const [campos, setCampos] = useState<EstadoFormulario>(CAMPOS_VACIOS)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Al abrir, el formulario arranca en blanco para crear o con los datos del
  // vino para editar. Sin esto, cerrar un formulario de edicion y abrir el de
  // creacion dejaria los datos del vino anterior.
  useEffect(() => {
    if (!isOpen) return

    setError('')
    if (vino === null) {
      setCampos(CAMPOS_VACIOS)
      return
    }

    setCampos({
      name: vino.name,
      winery: vino.winery,
      varietal: vino.varietal,
      category: vino.category,
      vintage: String(vino.vintage),
      price: String(vino.price),
      stock: String(vino.stock),
      description: vino.description,
      imageUrl: vino.imageUrl,
      tastingNotes: vino.tastingNotes ?? '',
      foodPairing: vino.foodPairing ?? '',
      activo: vino.activo
    })
  }, [isOpen, vino])

  const cambiar = <K extends keyof EstadoFormulario>(clave: K, valor: EstadoFormulario[K]): void => {
    setCampos((previo) => ({ ...previo, [clave]: valor }))
  }

  const enviar = async (evento: React.FormEvent): Promise<void> => {
    evento.preventDefault()

    const nombre = campos.name.trim()
    const bodega = campos.winery.trim()
    const precio = Number(campos.price)
    const cosecha = Number(campos.vintage)
    const stock = Number(campos.stock)

    const errores: string[] = []
    if (nombre === '') errores.push('El nombre es obligatorio')
    if (bodega === '') errores.push('La bodega es obligatoria')
    if (!Number.isFinite(precio) || precio <= 0) {
      errores.push('El precio tiene que ser un numero mayor que cero')
    }
    if (!Number.isInteger(cosecha) || cosecha < 1850 || cosecha > ANIO_EN_CURSO + 1) {
      errores.push(`La cosecha tiene que ser un entero entre 1850 y ${ANIO_EN_CURSO + 1}`)
    }
    if (!Number.isInteger(stock) || stock < 0) {
      errores.push('El stock tiene que ser un entero igual o mayor que cero')
    }

    if (errores.length > 0) {
      setError(errores.join('. '))
      return
    }

    setGuardando(true)
    try {
      await onGuardar({
        ...(vino !== null && { id: vino.id }),
        name: nombre,
        winery: bodega,
        varietal: campos.varietal.trim() === '' ? 'Blend' : campos.varietal.trim(),
        category: campos.category,
        vintage: cosecha,
        price: precio,
        stock,
        activo: campos.activo,
        description: campos.description.trim(),
        imageUrl: campos.imageUrl.trim(),
        ...(campos.tastingNotes.trim() !== '' && { tastingNotes: campos.tastingNotes.trim() }),
        ...(campos.foodPairing.trim() !== '' && { foodPairing: campos.foodPairing.trim() })
      })
      onClose()
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'w-full rounded-xl border border-neutral-700 bg-charcoal-800 px-3 py-2.5 text-sm text-cream-100 focus:border-gold-500 focus:outline-none'
  const etiqueta = 'mb-1 block text-[10px] uppercase tracking-widest text-neutral-400'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm'
          />

          <div className='fixed inset-0 z-50 flex justify-end'>
            <motion.aside
              role='dialog'
              aria-modal='true'
              aria-label={vino === null ? 'Nuevo vino' : `Editar ${vino.name}`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className='flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-wine-900/60 bg-charcoal-900 text-cream-100 shadow-2xl'
            >
              <div className='flex items-center justify-between border-b border-neutral-800 px-6 py-4'>
                <h2 className='font-serif text-xl font-bold'>
                  {vino === null ? 'Nuevo vino' : 'Editar vino'}
                </h2>
                <button
                  type='button'
                  onClick={onClose}
                  aria-label='Cerrar formulario'
                  className='rounded-lg p-2 text-neutral-400 transition-colors hover:bg-charcoal-800 hover:text-cream-100'
                >
                  <X className='h-5 w-5' aria-hidden='true' />
                </button>
              </div>

              {/* `noValidate` desactiva la validacion nativa: sin esto, un campo
                  `required` vacio bloquea el `submit` en el navegador y nunca
                  corre el mensaje propio, que es el que explica todas las
                  condiciones incumplidas juntas. */}
              <form onSubmit={enviar} noValidate className='flex-1 space-y-4 px-6 py-5'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label htmlFor='admin-name' className={etiqueta}>Nombre *</label>
                    <input
                      id='admin-name'
                      value={campos.name}
                      onChange={(e) => cambiar('name', e.target.value)}
                      className={campo}
                    />
                  </div>
                  <div>
                    <label htmlFor='admin-winery' className={etiqueta}>Bodega *</label>
                    <input
                      id='admin-winery'
                      value={campos.winery}
                      onChange={(e) => cambiar('winery', e.target.value)}
                      className={campo}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                  <div>
                    <label htmlFor='admin-varietal' className={etiqueta}>Cepa</label>
                    <input
                      id='admin-varietal'
                      value={campos.varietal}
                      onChange={(e) => cambiar('varietal', e.target.value)}
                      placeholder='Malbec'
                      className={campo}
                    />
                  </div>
                  <div>
                    <label htmlFor='admin-category' className={etiqueta}>Categoria</label>
                    <select
                      id='admin-category'
                      value={campos.category}
                      onChange={(e) => cambiar('category', e.target.value as Wine['category'])}
                      className={campo}
                    >
                      {CATEGORIAS.map((categoria) => (
                        <option key={categoria} value={categoria}>
                          {categoria}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor='admin-vintage' className={etiqueta}>Cosecha *</label>
                    <input
                      id='admin-vintage'
                      type='number'
                      value={campos.vintage}
                      onChange={(e) => cambiar('vintage', e.target.value)}
                      className={campo}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label htmlFor='admin-price' className={etiqueta}>Precio (ARS) *</label>
                    <input
                      id='admin-price'
                      type='number'
                      value={campos.price}
                      onChange={(e) => cambiar('price', e.target.value)}
                      placeholder='45000'
                      className={campo}
                    />
                  </div>
                  <div>
                    <label htmlFor='admin-stock' className={etiqueta}>Stock *</label>
                    <input
                      id='admin-stock'
                      type='number'
                      value={campos.stock}
                      onChange={(e) => cambiar('stock', e.target.value)}
                      className={campo}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor='admin-image' className={etiqueta}>
                    Imagen del vino
                  </label>
                  <div className='space-y-2'>
                    <div className='relative'>
                      <input
                        type='file'
                        accept='image/*'
                        onChange={async (e) => {
                          const archivo = e.target.files?.[0]
                          if (!archivo) return
                          if (archivo.size > 5 * 1024 * 1024) {
                            alert('La imagen no puede superar 5 MB')
                            return
                          }
                          try {
                            const formData = new FormData()
                            formData.append('file', archivo)
                            const res = await api.upload.uploadFile(formData)
                            cambiar('imageUrl', res.url)
                          } catch (err: unknown) {
                            alert('Error al subir la imagen: ' + (err instanceof Error ? err.message : 'Error desconocido'))
                          }
                        }}
                        className='sr-only'
                        id='admin-image-upload'
                      />
                      <label
                        htmlFor='admin-image-upload'
                        className='flex items-center gap-2 cursor-pointer w-full px-4 py-3 border-2 border-dashed border-neutral-700 rounded-xl text-center text-neutral-400 hover:border-gold-500 hover:bg-charcoal-700 transition-colors'
                      >
                        <svg className='h-6 w-6 mx-auto text-neutral-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                        </svg>
                        <div className='flex flex-col'>
                          <span className='text-sm font-medium text-cream-100'>Click o arrastra para subir imagen</span>
                          <span className='text-xs text-neutral-500'>Máx 5 MB · JPG, PNG, WebP</span>
                        </div>
                      </label>
                    </div>
                    {campos.imageUrl && (
                      <div className='relative w-24 h-24 rounded-lg overflow-hidden border border-wine-500/30'>
                        <img
                          src={campos.imageUrl}
                          alt='Previsualización'
                          className='w-full h-full object-cover'
                        />
                        <button
                          type='button'
                          onClick={() => cambiar('imageUrl', '')}
                          className='absolute top-1 right-1 bg-wine-700/90 text-cream-100 rounded-full p-1 hover:bg-wine-500 transition-colors'
                          aria-label='Eliminar imagen'
                        >
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor='admin-description' className={etiqueta}>Descripcion</label>
                  <textarea
                    id='admin-description'
                    rows={3}
                    value={campos.description}
                    onChange={(e) => cambiar('description', e.target.value)}
                    className={`${campo} resize-none`}
                  />
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label htmlFor='admin-notes' className={etiqueta}>Notas de cata</label>
                    <textarea
                      id='admin-notes'
                      rows={2}
                      value={campos.tastingNotes}
                      onChange={(e) => cambiar('tastingNotes', e.target.value)}
                      className={`${campo} resize-none`}
                    />
                  </div>
                  <div>
                    <label htmlFor='admin-pairing' className={etiqueta}>Maridaje</label>
                    <textarea
                      id='admin-pairing'
                      rows={2}
                      value={campos.foodPairing}
                      onChange={(e) => cambiar('foodPairing', e.target.value)}
                      className={`${campo} resize-none`}
                    />
                  </div>
                </div>

                {/* El interruptor de activo es el que saca el vino del catalogo
                    sin borrarlo del historial de pedidos. */}
                <label className='flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-800 bg-charcoal-800/40 px-4 py-3'>
                  <input
                    type='checkbox'
                    checked={campos.activo}
                    onChange={(e) => cambiar('activo', e.target.checked)}
                    className='h-4 w-4 accent-gold-500'
                  />
                  <span className='text-sm text-cream-100'>
                    Visible en el catalogo
                    <span className='block text-xs text-neutral-500'>
                      Si lo desactivas, deja de aparecer en la tienda pero conserva sus pedidos.
                    </span>
                  </span>
                </label>

                {error !== '' && (
                  <p role='alert' className='rounded-xl border border-wine-500/50 bg-wine-900/40 px-4 py-3 text-sm text-cream-100'>
                    {error}
                  </p>
                )}

                <div className='flex gap-3 border-t border-neutral-800 pt-4'>
                  <button
                    type='button'
                    onClick={onClose}
                    className='flex-1 rounded-xl border border-neutral-700 bg-charcoal-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-800'
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    disabled={guardando}
                    className='flex-1 rounded-xl border border-wine-500/40 bg-wine-700 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cream-100 transition-colors hover:bg-wine-500 disabled:opacity-50'
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.aside>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
