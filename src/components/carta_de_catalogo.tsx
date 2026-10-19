import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { Producto, ProductoPublico } from '../types/producto'
import { ProductCard } from './carta_de_productos'
import { filtrarVinos } from '../utils/filtros'
import {
  DEPARTAMENTOS,
  categoriasDe,
  gruposDe
} from '../utils/departamentos'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

/**
 * El catalogo publico, con la navegacion de la taxonomia.
 *
 * ## Por que tres niveles y no una grilla de categorias
 *
 * La tienda dejo de ser una vinateria. La taxonomia son tres niveles —
 * departamento, grupo y categoria— y meterlos en una sola lista de botones hace
 * dos cosas malas: la lista tiene treinta elementos que no entran en pantalla, y
 * el filtro ofrece "Cerveza" sin decir de que departamento es, que es
 * justamente lo que el usuario quiere saber antes de elegir.
 *
 * Con los tres niveles, cada fila muestra solo lo que tiene sentido **debajo** de
 * lo que ya se elegio: sin departamento no hay grupos que ofrecer, y sin grupo no
 * hay categorias. Es el mismo criterio con el que funciona un arbol de archivos,
 * y evita el caso de una categoria valida que no se puede alcanzar.
 *
 * ## El filtro es local
 *
 * `/api/products/public` devuelve todos los activos sin paginar ni filtrar, asi que
 * `filtrarVinos` corre aca. Ver la nota de `utils/filtros.ts`.
 *
 * ## La taxonomia viene de `utils/departamentos.ts`
 *
 * No esta escrita en este componente: la misma lista la usan el panel (pestanas
 * de stock), el desplegable de la columna "Categoria" y el formulario. Tres
 * copias divergen en el primer cambio.
 */

interface ProductCatalogProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onAddToCart: (producto: Producto) => void
  onSelectProducto: (producto: Producto) => void
  onEditProducto: (producto: Producto) => void
  minPrice: number | ''
  maxPrice: number | ''
  onMinPriceChange: (value: number | '') => void
  onMaxPriceChange: (value: number | '') => void
  /**
   * El departamento elegido, y quien lo elige.
   *
   * **Vive en `App` y no aca** porque las tarjetas de "¿Qué estás buscando?" de la
   * home lo mueven: el usuario toca "Bebidas" arriba y el filtro de abajo tiene
   * que quedar en "Bebidas". Con el estado aca, el `onClick` de la tarjeta tendria
   * que lanzar un evento o un contexto entero solo para avisarle.
   */
  departamento: string
  onDepartamentoChange: (departamento: string) => void
}

/**
 * Un boton de la navegacion de la taxonomia.
 *
 * Va aparte porque son cinco filas con el mismo marcado y con el mismo estado
 * activo: copiar el `className` a mano cinco veces es donde un cambio se aplica
 * en cuatro y se olvida el quinto, y el quinto queda con el color del estado
 * anterior.
 */
const BotonFiltro = ({
  activo,
  onClick,
  children
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type='button'
    onClick={onClick}
    aria-pressed={activo}
    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
      activo
        ? 'border-verde-600 bg-verde-600 text-blanco'
        : 'border-neutral-300 bg-blanco text-carbon hover:border-verde-salvia'
    }`}
  >
    {children}
  </button>
)

export const ProductCatalog = ({
  searchQuery,
  onSearchChange,
  onAddToCart,
  onSelectProducto,
  onEditProducto,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  departamento,
  onDepartamentoChange
}: ProductCatalogProps): React.ReactElement => {
  const [productos, setWines] = useState<Producto[]>([])

  // Type helper para convertir ProductoPublico[] a Producto[]
  const toWine = (pw: ProductoPublico): Producto => ({
    ...pw,
    description: pw.description ?? '',
    tastingNotes: pw.tastingNotes ?? '',
    foodPairing: pw.foodPairing ?? ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grupo, setGrupo] = useState('')
  const [categoria, setCategoria] = useState<Producto['category'] | ''>('')
  const { hasRole } = useAuth()

  /**
   * Cambiar el departamento **borra los niveles de abajo**, venga de donde venga.
   *
   * Sin esto: se elige "Bebidas" + "Con alcohol" + "Cerveza", despues se elige
   * "Regalería" desde la tarjeta de la home, y el filtro queda diciendo "Grupo:
   * todos" y "Tipo de producto: Cerveza" sobre productos de regalería. El
   * resultado es una tabla vacia con un filtro que dice una cosa y muestra otra:
   * el filtro mas confuso que se puede construir.
   *
   * Por eso el reset esta **aca**, en un `useEffect` sobre `departamento`, y no
   * dentro de `elegirDepartamento`. Si viviera en el manejador del click, el
   * cambio que viene de la home pasaria sin pasar por el.
   */
  useEffect(() => {
    setGrupo('')
    setCategoria('')
  }, [departamento])

  /**
   * Elegir un nivel **borra los de abajo**.
   *
   * Sin esto: se elige "Bebidas" + "Con alcohol" + "Cerveza", despues se cambia
   * a "Sin alcohol" y la categoria sigue siendo "Cerveza". El resultado es una
   * tabla vacia y un filtro que dice "Cerveza" en pantalla: el filtro mas
   * confuso que se puede construir. Cada vez que se toca un nivel, los de abajo
   * vuelven a "todos".
   */
  const elegirDepartamento = (valor: string): void => {
    onDepartamentoChange(valor)
  }

  const elegirGrupo = (valor: string): void => {
    setGrupo(valor)
    setCategoria('')
  }

  // Cargar productos desde la API pública
  useEffect(() => {
    const cargarVinos = async () => {
      try {
        setLoading(true)
        const data = await api.products.public()
        setWines(data.map(toWine))
        setError(null)
      } catch {
        setError('Error al cargar los productos. Intente nuevamente.')
      } finally {
        setLoading(false)
      }
    }
    cargarVinos()
  }, [])

  const filtros = {
    departamento,
    grupo,
    category: categoria,
    minPrice,
    maxPrice,
    searchQuery
  }

  const filteredWines = useMemo(
    () => filtrarVinos(productos, filtros),
    [productos, departamento, grupo, categoria, minPrice, maxPrice, searchQuery]
  )

  const isAdminOrGestor = hasRole('admin') || hasRole('gestor')

  // Los grupos y categorias de lo que esta elegido. Se calculan aqui y no en el
  // render del boton porque se usan dos veces (la fila y el contador).
  const gruposVisibles = useMemo(() => gruposDe(departamento), [departamento])
  const categoriasVisibles = useMemo(() => categoriasDe(departamento), [departamento])

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

      {/*
        La navegacion de la taxonomia, un nivel por fila.

        **Cada fila solo aparece si tiene algo que ofrecer.** Sin departamento
        elegido no hay grupos que listar, y sin grupo no hay categorias. Mostrar
        una fila vacia hace creer que hay un filtro y no hay nada que elegir.

        El boton de "Todos" esta en cada fila y no hay uno global: "todos" a nivel
        de grupo significa "todos los grupos de *este* departamento", que no es
        lo mismo que "todos los productos". Un unico "Todos" arriba mezclaria las
        dos cosas y no se podria volver a un nivel intermedio.
      */}
      <div className='space-y-6'>
        <div>
          <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500'>
            Departamento
          </p>
          <div className='flex flex-wrap gap-2'>
            <BotonFiltro activo={departamento === ''} onClick={() => elegirDepartamento('')}>
              Todos
            </BotonFiltro>
            {DEPARTAMENTOS.map((depto) => (
              <BotonFiltro
                key={depto.valor}
                activo={departamento === depto.valor}
                onClick={() => elegirDepartamento(depto.valor)}
              >
                {depto.etiqueta}
              </BotonFiltro>
            ))}
          </div>
        </div>

        {departamento !== '' && gruposVisibles.length > 0 && (
          <div>
            <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500'>
              Grupo
            </p>
            <div className='flex flex-wrap gap-2'>
              <BotonFiltro activo={grupo === ''} onClick={() => elegirGrupo('')}>
                Todos
              </BotonFiltro>
              {gruposVisibles.map((grupoActual) => (
                <BotonFiltro
                  key={grupoActual.valor}
                  activo={grupo === grupoActual.valor}
                  onClick={() => elegirGrupo(grupoActual.valor)}
                >
                  {grupoActual.etiqueta}
                </BotonFiltro>
              ))}
            </div>
          </div>
        )}

        {departamento !== '' && categoriasVisibles.length > 0 && (
          <div>
            <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500'>
              Tipo de producto
            </p>
            <div className='flex flex-wrap gap-2'>
              <BotonFiltro
                activo={categoria === ''}
                onClick={() => setCategoria('')}
              >
                Todos
              </BotonFiltro>
              {categoriasVisibles.map((categoriaActual) => (
                <BotonFiltro
                  key={categoriaActual}
                  activo={categoria === categoriaActual}
                  onClick={() => setCategoria(categoriaActual)}
                >
                  {categoriaActual}
                </BotonFiltro>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Precio */}
      <div className='mb-8'>
        <label className='block text-sm font-medium text-carbon mb-3'>
          Precio (ARS)
        </label>
        <div className='flex flex-col gap-3'>
          <input
            type='number'
            placeholder='Mínimo'
            value={minPrice === '' ? '' : minPrice}
            onChange={(e) => onMinPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
            className='w-full bg-blanco border border-neutral-300 rounded-xl px-4 py-3 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia'
            min='0'
          />
          <input
            type='number'
            placeholder='Máximo'
            value={maxPrice === '' ? '' : maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value === '' ? '' : parseInt(e.target.value))}
            className='w-full bg-blanco border border-neutral-300 rounded-xl px-4 py-3 text-carbon placeholder-neutral-500 focus:outline-none focus:border-verde-salvia focus:ring-1 focus:ring-verde-salvia'
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
              {filteredWines.map((producto) => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  onAddToCart={onAddToCart}
                  onSelectProducto={onSelectProducto}
                  onEditProducto={isAdminOrGestor ? onEditProducto : undefined}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  )
}
