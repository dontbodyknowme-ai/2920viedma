import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { AdminWine } from '../../types/admin'
import { CATEGORIAS_ARRANCAMIENTO } from './constantes_categoria'
import { DEPARTAMENTOS, TIPOS_DE_VINO, gruposDe } from '../../utils/departamentos'
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
  /**
   * Las categorias que ya estan en uso, para el `datalist` de sugerencias.
   *
   * No restringen el campo: son sugerencias. El admin puede escribir una que no
   * este en la lista y esa queda creada por el producto que la use.
   */
  categoriasExistentes: string[]
  onClose: () => void
  onGuardar: (vino: Omit<AdminWine, 'id'> & { id?: string }) => Promise<void>
}

const ANIO_EN_CURSO = new Date().getFullYear()

const CAMPOS_VACIOS = {
  name: '',
  winery: '',
  varietal: '',
  category: CATEGORIAS_ARRANCAMIENTO,
  // El departamento arranca en Bebidas, que es lo mismo que hace el backend y
  // el `default` de la columna. Si aca arrancara vacio, un producto nuevo
  // guardado sin tocar el campo llegaria a la base sin departamento —y con eso
  // no apareceria en ninguna pestaña de stock, que es peor que estar en la
  // equivocada.
  //
  // El `as string` no es cosmetico: `DEPARTAMENTOS` es `as const`, asi que
  // `DEPARTAMENTOS[0].valor` es el literal `'Bebidas'` y el campo del estado
  // quedaria tipado como ese unico valor. El `<select>` puede poner cualquiera
  // de los tres y `cambiar('departamento', ...)` deja de compilar.
  departamento: DEPARTAMENTOS[0].valor as string,
  // El grupo **arranca vacio**, no en "Con alcohol": hay productos legitimos
  // sin grupo ("Energizantes") y arrancar siempre en el primero obliga al admin
  // a acordarse de vaciarlo.
  grupo: '',
  // El color arranca vacio y se muestra solo cuando la categoria es "Vinos".
  tipoVino: '',
  vintage: '',
  price: '',
  stock: '0',
  description: '',
  imageUrl: '',
  tastingNotes: '',
  foodPairing: '',
  activo: true
}

type EstadoFormulario = typeof CAMPOS_VACIOS

export const AdminWineForm = ({
  isOpen,
  vino,
  categoriasExistentes,
  onClose,
  onGuardar
}: AdminWineFormProps) => {
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
      // Bodega, cepa y anada pueden ser `null` desde que la tienda vendio cosas
      // que no las tienen. Sin el `?? ''` el `<input>` recibe `null`, que en
      // React deja el campo sin controlar, y `String(null)` en el anada
      // guardaria la palabra "null" como anada.
      winery: vino.winery ?? '',
      varietal: vino.varietal ?? '',
      category: vino.category,
      // `?? ''` y no un default: un producto que ya existia puede no tener
      // departamento si entro por una fila escrita a mano en SQL. Sin el fallback
      // el `<select>` queda sin valor —y `value` sin `onChange` valido es un
      // select deshabilitado en React.
      departamento: vino.departamento ?? '',
      // El grupo **si** puede ser null de legitimo: "Energizantes" cuelga
      // directo de Bebidas. Por eso el sentinela es `''` y hay una opcion que lo
      // representa, en vez de asumir un grupo por defecto.
      grupo: vino.grupo ?? '',
      tipoVino: vino.tipoVino ?? '',
      vintage: vino.vintage === null ? '' : String(vino.vintage),
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
    // El `if` por clave en vez de comparar `valor` a secas: `valor` es
    // `EstadoFormulario[K]`, que para `activo` es `boolean`, y compararlo contra
    // un `string` hace que TypeScript infiera `string | boolean` para el campo
    // del estado y despues el `setCampos` no compila.
    if (clave === 'departamento') {
      const nuevo = valor as string
      // Cambiar de departamento **borra el grupo y el color**: si no, quedan
      // colgando del departamento anterior y el filtro publico los pierde, porque
      // compara los dos campos a la vez.
      if (nuevo !== campos.departamento) {
        setCampos((previo) => ({ ...previo, departamento: nuevo, grupo: '', tipoVino: '' }))
        return
      }
    } else if (clave === 'category') {
      const nuevo = valor as string
      // Cambiar de categoria borra el color: si se estaba editando un vino y se
      // cambia a "Cerveza", el "Tinto" que quedo seria basura.
      if (nuevo !== campos.category) {
        setCampos((previo) => ({ ...previo, category: nuevo, tipoVino: '' }))
        return
      }
    }

    setCampos((previo) => ({ ...previo, [clave]: valor }))
  }

  // El color del vino **se muestra solo para la categoria "Vinos"**: es un
  // atributo de esa categoria, no un campo general. Fuera de ella se oculta
  // porque un `<select>` de "Tinto / Blanco" al lado de una cerveza es una
  // pregunta sin sentido, y lleno con "" el admin tendria que borrarlo a mano
  // para no guardar basura.
  const esVino = campos.category === 'Vinos'

  // Los grupos dependen del departamento elegido: son sus hijos. Cambiar de
  // departamento con un grupo escrito lo dejaria colgando de un grupo que no es
  // de ese departamento —y ahi el filtro publico lo pierde, porque compara los
  // dos campos a la vez.
  const gruposDisponibles = gruposDe(campos.departamento)

  const enviar = async (evento: React.FormEvent): Promise<void> => {
    evento.preventDefault()

    const nombre = campos.name.trim()
    const bodega = campos.winery.trim()
    const precio = Number(campos.price)
    // La cosecha vacia es `null` y no `0`: `Number('')` da `0`, que es un anada
    // invalido, y mandarlo a la base seria escribir una mentira.
    const cosecha = campos.vintage.trim() === '' ? null : Number(campos.vintage)
    const stock = Number(campos.stock)
    const departamento = campos.departamento

    const errores: string[] = []
    if (nombre === '') errores.push('El nombre es obligatorio')
    if (!Number.isFinite(precio) || precio <= 0) {
      errores.push('El precio tiene que ser un numero mayor que cero')
    }
    if (!Number.isInteger(stock) || stock < 0) {
      errores.push('El stock tiene que ser un entero igual o mayor que cero')
    }
    if (departamento === '') errores.push('El departamento es obligatorio')

    // **Bodega y anada dejaron de ser obligatorias.** Una gaseosa no tiene
    // ninguna de las dos, y exigirlas era el bug que hacia imposible vender
    // cualquier cosa que no fuera vino: el admin no tenia forma de cargar el
    // producto que queria.
    //
    // La anada se valida **solo si viene escrita**: vacia es `null` —una
    // gaseosa— y escrita tiene que ser un anada de verdad. `Number('')` es `0`,
    // que esta fuera del rango, asi que sin este `if` la fila se rechazaria con
    // un error de anada y no habria forma de guardarla sin anada.
    if (cosecha !== null && (!Number.isInteger(cosecha) || cosecha < 1850 || cosecha > ANIO_EN_CURSO + 1)) {
      errores.push(`La cosecha tiene que ser un entero entre 1850 y ${ANIO_EN_CURSO + 1}`)
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
        // Los tres que se volvieron opcionales van como `null` cuando el campo
        // esta vacio, y no como `''`: un string vacio en la base es "la bodega se
        // guardo vacia", que es un error de carga, no "no tiene bodega".
        winery: bodega === '' ? null : bodega,
        varietal: campos.varietal.trim() === '' ? null : campos.varietal.trim(),
        category: campos.category,
        departamento,
        // El grupo `''` significa "cuelga directo del departamento", que es de
        // legitimo para "Energizantes". Ahi va `null`.
        grupo: campos.grupo === '' ? null : campos.grupo,
        tipoVino: campos.tipoVino === '' ? null : campos.tipoVino,
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

  const campo = 'w-full rounded-xl border border-neutral-300 bg-blanco px-3 py-2.5 text-sm text-carbon focus:border-verde-salvia focus:outline-none'
  const etiqueta = 'mb-1 block text-[10px] uppercase tracking-widest text-neutral-600'

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
              className='flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-verde-800/60 bg-blanco text-carbon shadow-2xl'
            >
              <div className='flex items-center justify-between border-b border-neutral-200 px-6 py-4'>
                <h2 className='font-serif text-xl font-bold'>
                  {vino === null ? 'Nuevo vino' : 'Editar vino'}
                </h2>
                <button
                  type='button'
                  onClick={onClose}
                  aria-label='Cerrar formulario'
                  className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-blanco hover:text-carbon'
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
                    {/*
                      Input con `datalist`, no un `<select>`.

                      El `<select>` limiting a cuatro categorias hacia que
                      "crear una categoria" no existiera como operacion. Con este
                      input el admin escribe la que necesita y la categoria queda
                      creada por el producto que la usa; las que ya existen salen
                      como sugerencia, asi que no hay que acordarse de la
                      ortografia.

                      El filtro del catalogo se arma con las mismas categorias
                      que hay en uso, asi que la nueva aparece sola.
                    */}
                    <input
                      id='admin-category'
                      value={campos.category}
                      onChange={(e) => cambiar('category', e.target.value)}
                      placeholder='Tinto, Cerveza, Fiambre...'
                      list='admin-categorias'
                      className={campo}
                    />
                    <datalist id='admin-categorias'>
                      {categoriasExistentes.map((categoria) => (
                        <option key={categoria} value={categoria} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    {/*
                      Este es un `<select>` y no un input con `datalist`, al
                      contrario que "Categoria". La diferencia es a proposito:

                      - **Categoria** es texto libre: el admin carga una cerveza y
                        esa categoria tiene que poder existir sin tocar codigo.
                      - **Departamento** es la taxonomia de la tienda, que son
                        cuatro y estan decididas. Aceptar un quinto escrito a mano
                        haria que ese producto no aparezca en ninguna pestaña —
                        el usuario lo carga, no lo ve, y no hay error.

                      Y `value` controlado sin `onChange` es un select
                      deshabilitado en React, asi que el fallback de `''` de
                      arriba lleva su `<option>` vacio para que haya siempre algo
                      seleccionable.
                    */}
                    <label htmlFor='admin-departamento' className={etiqueta}>
                      Departamento *
                    </label>
                    <select
                      id='admin-departamento'
                      value={campos.departamento}
                      onChange={(e) => cambiar('departamento', e.target.value)}
                      className={campo}
                    >
                      {campos.departamento === '' && <option value=''>— sin departamento —</option>}
                      {DEPARTAMENTOS.map((departamento) => (
                        <option key={departamento.valor} value={departamento.valor}>
                          {departamento.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor='admin-grupo' className={etiqueta}>
                      Grupo
                    </label>
                    {/*
                      Tiene una opcion "Sin grupo" y **no** es obligatorio, porque
                      "Energizantes" cuelga directo de Bebidas: no es ni con
                      alcohol ni sin alcohol. Si fuera obligatorio, ese producto
                      tendria que mentir con el grupo.
                    */}
                    <select
                      id='admin-grupo'
                      value={campos.grupo}
                      onChange={(e) => cambiar('grupo', e.target.value)}
                      className={campo}
                    >
                      <option value=''>— sin grupo —</option>
                      {gruposDisponibles.map((grupoActual) => (
                        <option key={grupoActual.valor} value={grupoActual.valor}>
                          {grupoActual.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor='admin-vintage' className={etiqueta}>Cosecha</label>
                    {/*
                      Antes era obligatoria, con el `*`. Una gaseosa no tiene
                      anada, y exigirla era el bug que hacia imposible vender
                      cualquier cosa fuera del vino. Ahora vacia se guarda como
                      `null`, que es "no tiene anada" y no "anada cero".
                    */}
                    <input
                      id='admin-vintage'
                      type='number'
                      value={campos.vintage}
                      onChange={(e) => cambiar('vintage', e.target.value)}
                      placeholder='Sin anada'
                      className={campo}
                    />
                  </div>
                </div>

                {esVino && (
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                      <label htmlFor='admin-tipovino' className={etiqueta}>
                        Tipo de vino
                      </label>
                      {/*
                        Solo para la categoria "Vinos", y `<select>` a proposito:
                        "Tinto" y "Blanco" son un atributo de esa categoria, no
                        dos categorias hermanas. Con texto libre, dos Malbec
                        quedarian con colores distintos sin que nadie lo note.
                      */}
                      <select
                        id='admin-tipovino'
                        value={campos.tipoVino}
                        onChange={(e) => cambiar('tipoVino', e.target.value)}
                        className={campo}
                      >
                        <option value=''>— sin definir —</option>
                        {TIPOS_DE_VINO.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

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
                        className='flex items-center gap-2 cursor-pointer w-full px-4 py-3 border-2 border-dashed border-neutral-300 rounded-xl text-center text-neutral-600 hover:border-verde-salvia hover:bg-neutral-200 transition-colors'
                      >
                        <svg className='h-6 w-6 mx-auto text-neutral-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                        </svg>
                        <div className='flex flex-col'>
                          <span className='text-sm font-medium text-carbon'>Click o arrastra para subir imagen</span>
                          <span className='text-xs text-neutral-500'>Máx 5 MB · JPG, PNG, WebP</span>
                        </div>
                      </label>
                    </div>
                    {campos.imageUrl && (
                      <div className='relative w-24 h-24 rounded-lg overflow-hidden border border-verde-500/30'>
                        <img
                          src={campos.imageUrl}
                          alt='Previsualización'
                          className='w-full h-full object-cover'
                        />
                        <button
                          type='button'
                          onClick={() => cambiar('imageUrl', '')}
                          className='absolute top-1 right-1 bg-verde-600/90 text-blanco rounded-full p-1 hover:bg-verde-600 transition-colors'
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
                <label className='flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-blanco/40 px-4 py-3'>
                  <input
                    type='checkbox'
                    checked={campos.activo}
                    onChange={(e) => cambiar('activo', e.target.checked)}
                    className='h-4 w-4 accent-verde-salvia'
                  />
                  <span className='text-sm text-carbon'>
                    Visible en el catalogo
                    <span className='block text-xs text-neutral-500'>
                      Si lo desactivas, deja de aparecer en la tienda pero conserva sus pedidos.
                    </span>
                  </span>
                </label>

                {error !== '' && (
                  <p role='alert' className='rounded-xl border border-verde-500/50 bg-verde-800/40 px-4 py-3 text-sm text-blanco'>
                    {error}
                  </p>
                )}

                <div className='flex gap-3 border-t border-neutral-200 pt-4'>
                  <button
                    type='button'
                    onClick={onClose}
                    className='flex-1 rounded-xl border border-neutral-300 bg-blanco px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:bg-neutral-200'
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    disabled={guardando}
                    className='flex-1 rounded-xl border border-verde-500/40 bg-verde-600 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blanco transition-colors hover:bg-verde-600 disabled:opacity-50'
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
