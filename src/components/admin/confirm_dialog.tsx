import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Dialogo de confirmacion reutilizable (D-09).
 *
 * Es el unico modal de confirmacion del panel: eliminar un vino, cambiar el
 * estado de un pedido y las demas acciones destructivas lo usan. Un componente
 * por accion seria N copias del mismo overlay y del mismo manejo de Escape.
 *
 * Se monta siempre y su `AnimatePresence` interno decide si hay algo que
 * mostrar. Montarlo con `isOpen &&` lo desmontaria de golpe al cerrar y la
 * animacion de salida no correria, que es lo que la constitucion 3 pide para
 * todo panel y modal.
 */

type Variante = 'danger' | 'warning' | 'info'

const VARIANTES: Record<Variante, { boton: string; botonOscuro: boolean }> = {
  danger: {
    boton: 'bg-wine-700 hover:bg-wine-500 text-cream-100 border-wine-500/40',
    botonOscuro: true
  },
  warning: {
    boton: 'bg-gold-500 hover:bg-gold-400 text-charcoal-950 border-gold-400/50',
    botonOscuro: true
  },
  info: {
    boton: 'bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 border-neutral-600',
    botonOscuro: false
  }
}

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: Variante
  /** Bloquea el cierre mientras la accion asincrona corre. */
  loading?: boolean
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false
}: ConfirmDialogProps) => {
  // Escape cierra el dialogo. El listener solo existe mientras esta abierto, y
  // el cleanup evita acumularlos al abrir y cerrar repetidas veces.
  useEffect(() => {
    if (!isOpen) return

    const alPulsarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', alPulsarEscape)
    return () => window.removeEventListener('keydown', alPulsarEscape)
  }, [isOpen, loading, onClose])

  const estilos = VARIANTES[variant]

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

          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div
              role='alertdialog'
              aria-modal='true'
              aria-label={title}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className='w-full max-w-md rounded-2xl border border-wine-900/60 bg-charcoal-900 p-6 text-cream-100 shadow-2xl'
            >
              <h3 className='font-serif text-xl font-bold'>{title}</h3>
              <p className='mt-3 text-sm leading-relaxed text-neutral-300'>{message}</p>

              <div className='mt-6 flex gap-3'>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='flex-1 rounded-xl border border-neutral-700 bg-charcoal-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-50'
                >
                  {cancelText}
                </button>
                <button
                  type='button'
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 rounded-xl border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${estilos.boton}`}
                >
                  {loading ? 'Procesando...' : confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
