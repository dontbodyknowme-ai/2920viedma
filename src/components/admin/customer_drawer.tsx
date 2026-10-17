import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, Phone, Plus, Tag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from './status_badge'
import type { Customer, Order } from '../../types/admin'

/**
 * Drawer de detalle del cliente.
 *
 * Tres pestanas: pedidos, notas y datos. El historial de pedidos se recibe
 * aparte porque el `Customer` no lo trae: viene de `/api/customers/:id`, que lo
 * arma con los pedidos que el cliente tiene.
 *
 * **El error de las notas y el de los tags son separados.** Un fallo al guardar
 * una nota no puede mostrarse como si fuera un problema con los tags, y al
 * reves. Cada panel muestra el suyo.
 */

type Pestana = 'pedidos' | 'notas' | 'datos'

const dinero = (valor: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(valor)

const fechaCorta = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })

/**
 * Chip de tag.
 *
 * `StatusBadge` no se usa aca porque solo acepta las cuatro etiquetas que el
 * tema define (`nuevo`, `vip`, `frecuente`, `mayorista`) y el CRM deja agregar
 * tags libres. Un tag desconocido no tiene familia de color, asi que este chip
 * es neutro.
 */
const ChipTag = ({
  tag,
  onQuitar
}: {
  tag: string
  onQuitar?: (tag: string) => void
}) => (
  <span className='inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-blanco px-2.5 py-1 text-xs text-neutral-700'>
    {tag}
    {onQuitar !== undefined && (
      <button
        type='button'
        onClick={() => onQuitar(tag)}
        aria-label={`Quitar tag ${tag}`}
        className='rounded-full p-0.5 transition-colors hover:bg-neutral-200 hover:text-verde-600'
      >
        <X className='h-3 w-3' aria-hidden='true' />
      </button>
    )}
  </span>
)

interface CustomerDrawerProps {
  isOpen: boolean
  cliente: Customer | null
  /** Historial de pedidos del cliente. */
  pedidos: Order[]
  /** Tags que existen en toda la base, para el autocompletado. */
  tagsSugeridas: string[]
  isLoading: boolean
  onClose: () => void
  onAgregarNota: (texto: string) => Promise<void>
  onToggleTag: (tag: string) => Promise<void>
}

export const CustomerDrawer = ({
  isOpen,
  cliente,
  pedidos,
  tagsSugeridas,
  isLoading,
  onClose,
  onAgregarNota,
  onToggleTag
}: CustomerDrawerProps) => {
  const [pestana, setPestana] = useState<Pestana>('pedidos')
  const [nota, setNota] = useState('')
  const [errorNota, setErrorNota] = useState('')
  const [errorTag, setErrorTag] = useState('')
  const [tagNuevo, setTagNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Al abrir, arranca en "Pedidos" y sin borrador. Si no, una nota a medio
  // escribir de un cliente se leeria en el siguiente.
  useEffect(() => {
    if (!isOpen) return
    setPestana('pedidos')
    setNota('')
    setErrorNota('')
    setErrorTag('')
    setTagNuevo('')
  }, [isOpen, cliente?.id])

  const agregarNota = async (): Promise<void> => {
    const texto = nota.trim()
    if (texto === '') {
      setErrorNota('La nota no puede estar vacia.')
      return
    }

    setGuardando(true)
    setErrorNota('')
    try {
      await onAgregarNota(texto)
      setNota('')
    } catch (fallo) {
      setErrorNota(fallo instanceof Error ? fallo.message : 'No se pudo guardar la nota')
    } finally {
      setGuardando(false)
    }
  }

  const agregarTag = async (): Promise<void> => {
    const texto = tagNuevo.trim()
    if (texto === '' || cliente === null) return

    setGuardando(true)
    setErrorTag('')
    try {
      await onToggleTag(texto)
      setTagNuevo('')
    } catch (fallo) {
      setErrorTag(fallo instanceof Error ? fallo.message : 'No se pudo guardar el tag')
    } finally {
      setGuardando(false)
    }
  }

  const pestanas: Array<{ id: Pestana; etiqueta: string }> = [
    { id: 'pedidos', etiqueta: `Pedidos (${pedidos.length})` },
    { id: 'notas', etiqueta: `Notas (${cliente?.notes.length ?? 0})` },
    { id: 'datos', etiqueta: 'Datos' }
  ]

  return (
    <AnimatePresence>
      {isOpen && cliente !== null && (
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
              aria-label={`Cliente ${cliente.name}`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className='flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-verde-800/60 bg-blanco text-carbon shadow-2xl'
            >
              {/* --- Header --- */}
              <div className='flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4'>
                <div className='min-w-0'>
                  <h2 className='truncate font-serif text-xl font-bold'>{cliente.name}</h2>
                  <p className='mt-0.5 truncate text-xs text-neutral-600'>{cliente.email}</p>

                  {cliente.tags.length > 0 && (
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {cliente.tags.map((tag) => (
                        <ChipTag key={tag} tag={tag} />
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  aria-label='Cerrar detalle del cliente'
                  className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-blanco hover:text-carbon'
                >
                  <X className='h-5 w-5' aria-hidden='true' />
                </button>
              </div>

              {isLoading ? (
                <div className='flex-1 space-y-3 p-6'>
                  {Array.from({ length: 6 }, (_, indice) => (
                    <div key={indice} className='h-14 animate-pulse rounded-xl bg-blanco' />
                  ))}
                </div>
              ) : (
                <>
                  {/* --- Tabs --- */}
                  <div
                    role='tablist'
                    aria-label='Secciones del cliente'
                    className='flex gap-1 border-b border-neutral-200 px-6'
                  >
                    {pestanas.map((item) => (
                      <button
                        key={item.id}
                        type='button'
                        role='tab'
                        aria-selected={pestana === item.id}
                        onClick={() => setPestana(item.id)}
                        className={[
                          'border-b-2 px-3 py-3 text-xs font-semibold transition-colors',
                          pestana === item.id
                            ? 'border-verde-salvia text-verde-salvia'
                            : 'border-transparent text-neutral-600 hover:text-carbon'
                        ].join(' ')}
                      >
                        {item.etiqueta}
                      </button>
                    ))}
                  </div>

                  <div className='flex-1 space-y-4 px-6 py-5'>
                    {/* --- Pedidos --- */}
                    {pestana === 'pedidos' && (
                      <>
                        {pedidos.length === 0 ? (
                          <p className='py-8 text-center text-sm text-neutral-500'>
                            Este cliente todavia no tiene pedidos.
                          </p>
                        ) : (
                          <ul className='space-y-3'>
                            {pedidos.map((pedido) => (
                              <li key={pedido.id}>
                                <Link
                                  to={`/admin/pedidos?id=${pedido.id}`}
                                  onClick={onClose}
                                  className='flex items-center gap-3 rounded-xl border border-neutral-200 bg-blanco/40 p-3 transition-colors hover:border-verde-salvia/40'
                                >
                                  <div className='min-w-0 flex-1'>
                                    <p className='font-mono text-xs text-carbon'>
                                      {pedido.id}
                                    </p>
                                    <p className='mt-0.5 text-xs text-neutral-500'>
                                      {fechaCorta(pedido.createdAt)}
                                    </p>
                                  </div>
                                  <StatusBadge estado={pedido.status} size='sm' />
                                  <span className='shrink-0 text-sm font-semibold text-carbon'>
                                    {dinero(pedido.total)}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}

                    {/* --- Notas --- */}
                    {pestana === 'notas' && (
                      <>
                        <div className='flex gap-2'>
                          <label htmlFor='nota-cliente' className='sr-only'>
                            Nueva nota interna
                          </label>
                          <textarea
                            id='nota-cliente'
                            rows={2}
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            placeholder='Nota interna...'
                            className='flex-1 resize-none rounded-xl border border-neutral-300 bg-blanco px-3 py-2 text-sm focus:border-verde-salvia focus:outline-none'
                          />
                          <button
                            type='button'
                            onClick={() => void agregarNota()}
                            disabled={guardando}
                            aria-label='Agregar nota'
                            className='shrink-0 self-start rounded-xl border border-verde-500/40 bg-verde-600 p-2.5 text-carbon transition-colors hover:bg-verde-600 disabled:opacity-50'
                          >
                            <Plus className='h-4 w-4' aria-hidden='true' />
                          </button>
                        </div>

                        {errorNota !== '' && (
                          <p
                            role='alert'
                            className='rounded-xl border border-verde-500/50 bg-verde-800/40 px-3 py-2 text-sm'
                          >
                            {errorNota}
                          </p>
                        )}

                        {cliente.notes.length === 0 ? (
                          <p className='py-6 text-center text-sm text-neutral-500'>
                            Sin notas internas.
                          </p>
                        ) : (
                          <ul className='space-y-3'>
                            {/* La mas reciente primero: la nota que se acaba de
                                escribir es la que el admin quiere releer. */}
                            {[...cliente.notes].reverse().map((registro) => (
                              <li
                                key={registro.id}
                                className='rounded-xl border border-neutral-200 bg-blanco/40 p-3'
                              >
                                <p className='text-sm text-carbon'>{registro.text}</p>
                                <p className='mt-1.5 text-xs text-neutral-500'>
                                  {registro.author} ·{' '}
                                  {new Date(registro.createdAt).toLocaleString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}

                    {/* --- Datos --- */}
                    {pestana === 'datos' && (
                      <>
                        <dl className='space-y-3 text-sm'>
                          <div className='flex items-center gap-2'>
                            <Mail className='h-4 w-4 shrink-0 text-neutral-500' aria-hidden='true' />
                            <dt className='sr-only'>Email</dt>
                            <dd className='truncate text-neutral-700'>{cliente.email}</dd>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Phone className='h-4 w-4 shrink-0 text-neutral-500' aria-hidden='true' />
                            <dt className='sr-only'>Telefono</dt>
                            <dd className='text-neutral-700'>{cliente.phone}</dd>
                          </div>
                          <div className='grid grid-cols-2 gap-3 border-t border-neutral-200 pt-3'>
                            <div>
                              <dt className='text-xs uppercase tracking-widest text-neutral-500'>
                                Pedidos
                              </dt>
                              <dd className='mt-0.5 text-lg font-bold text-carbon'>
                                {cliente.totalOrders}
                              </dd>
                            </div>
                            <div>
                              <dt className='text-xs uppercase tracking-widest text-neutral-500'>
                                Total gastado
                              </dt>
                              <dd className='mt-0.5 text-lg font-bold text-verde-salvia'>
                                {dinero(cliente.totalSpent)}
                              </dd>
                            </div>
                          </div>
                          <div className='border-t border-neutral-200 pt-3'>
                            <dt className='text-xs uppercase tracking-widest text-neutral-500'>
                              Cliente desde
                            </dt>
                            <dd className='mt-0.5 text-neutral-700'>
                              {fechaCorta(cliente.createdAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className='text-xs uppercase tracking-widest text-neutral-500'>
                              Ultimo pedido
                            </dt>
                            <dd className='mt-0.5 text-neutral-700'>
                              {cliente.lastOrderAt === null
                                ? 'Nunca'
                                : fechaCorta(cliente.lastOrderAt)}
                            </dd>
                          </div>
                        </dl>

                        {/* CE-04: un cliente puede no tener ni email ni telefono.
                            No es motivo para no guardarlo, pero la fila tiene
                            que avisar que falta un dato de contacto. */}
                        {(cliente.email === '' || cliente.phone === '') && (
                          <p
                            role='status'
                            className='rounded-xl border border-verde-salvia/40 bg-verde-salvia/10 px-3 py-2 text-sm'
                          >
                            Este cliente no tiene{' '}
                            {cliente.email === '' && cliente.phone === ''
                              ? 'email ni telefono'
                              : cliente.email === ''
                                ? 'email'
                                : 'telefono'}
                            . No se podra avisarle de novedades por mail.
                          </p>
                        )}

                        {/* --- Tags --- */}
                        <div className='border-t border-neutral-200 pt-4'>
                          <h3 className='mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-600'>
                            <Tag className='h-3.5 w-3.5' aria-hidden='true' />
                            Tags
                          </h3>

                          <div className='mb-3 flex flex-wrap gap-1.5'>
                            {cliente.tags.length === 0 ? (
                              <p className='text-sm text-neutral-500'>Sin tags.</p>
                            ) : (
                              cliente.tags.map((tag) => (
                                <ChipTag
                                  key={tag}
                                  tag={tag}
                                  onQuitar={(cual) => void onToggleTag(cual)}
                                />
                              ))
                            )}
                          </div>

                          <div className='flex gap-2'>
                            <label htmlFor='tag-cliente' className='sr-only'>
                              Agregar tag
                            </label>
                            <input
                              id='tag-cliente'
                              list='tags-sugeridas'
                              value={tagNuevo}
                              onChange={(e) => setTagNuevo(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void agregarTag()
                                }
                              }}
                              placeholder='vip, mayorista...'
                              className='flex-1 rounded-xl border border-neutral-300 bg-blanco px-3 py-2 text-sm focus:border-verde-salvia focus:outline-none'
                            />
                            <button
                              type='button'
                              onClick={() => void agregarTag()}
                              disabled={guardando || tagNuevo.trim() === ''}
                              aria-label='Agregar tag'
                              className='shrink-0 rounded-xl border border-verde-500/40 bg-verde-600 px-3 py-2 text-xs font-semibold text-carbon transition-colors hover:bg-verde-600 disabled:opacity-50'
                            >
                              Agregar
                            </button>
                          </div>

                          {/*
                            El datalist vive aca y no en la pagina porque las
                            sugerencias tienen que ser de **todos** los clientes,
                            no solo de los de la pagina actual: con 10 filas
                            visibles, el filtro de tags solo ofreceria las tags
                            que ya estan en pantalla.
                          */}
                          <datalist id='tags-sugeridas'>
                            {tagsSugeridas.map((tag) => (
                              <option key={tag} value={tag} />
                            ))}
                          </datalist>

                          {errorTag !== '' && (
                            <p
                              role='alert'
                              className='mt-2 rounded-xl border border-verde-500/50 bg-verde-800/40 px-3 py-2 text-sm'
                            >
                              {errorTag}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </motion.aside>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/** Exportado para que los tests verifiquen el listado de pestanas. */
export { ChipTag }