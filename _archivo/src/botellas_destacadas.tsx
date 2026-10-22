import { motion } from 'framer-motion'
import { AnimatedSection } from './animated_section'
import type { Producto } from '../types/producto'
import { subtituloProducto, tieneAnada } from '../utils/producto'

/**
 * Botellas destacadas: las 3 mas caras del catalogo.
 *
 * **Va en su propia seccion, debajo del hero, y no adentro del.**
 *
 * Antes estaba en `absolute bottom-24` dentro de un `min-h-screen` que ya tenia
 * el canvas 3D en `absolute inset-0` y el titulo centrado: tres capas
 * compitiendo por el mismo espacio. El titulo tapaba la animacion y la fila de
 * botellas se comia el aire del hero.
 *
 * En flujo normal, debajo, ninguna tapa a ninguna. Y el hero pasa a ser una
 * disposicion partida —texto a la izquierda, botella 3D a la derecha— que es lo
 * que evita el solapamiento de origen.
 *
 * Esta en un componente aparte a proposito: si hay que sacarla del hero, se
 * borra el `<BotellasDestacadas />` de `hero.tsx` y este archivo.
 */

interface BotellasDestacadasProps {
  wines: Producto[]
  onSelectWine: (wine: Producto) => void
}

export const BotellasDestacadas = ({ wines, onSelectWine }: BotellasDestacadasProps) => {
  if (wines.length === 0) return null

  // Orden por precio descendente sin mutar el array recibido: `wines` viene del
  // estado de la app y mutarlo seria cambiar la fuente.
  const destacados = [...wines].sort((a, b) => b.price - a.price).slice(0, 3)

  return (
    <section
      aria-labelledby='titulo-destacadas'
      className='relative border-t border-neutral-200/60 bg-marfil/40'
    >
      <div className='mx-auto max-w-7xl px-6 py-20'>
        <AnimatedSection>
          <header className='mb-10 max-w-2xl'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-verde-salvia'>
              Seleccion de la casa
            </p>
            <h2
              id='titulo-destacadas'
              className='mt-3 font-serif text-3xl font-bold text-carbon md:text-4xl'
            >
              Botellas destacadas
            </h2>
            <p className='mt-3 text-neutral-600'>
              Las tres etiquetas mas caras de la cava. Una muestra de lo que guardamos para
              pedidos especiales.
            </p>
          </header>
        </AnimatedSection>

        <ul className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {destacados.map((wine, indice) => (
            <motion.li
              key={wine.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              // Escalonado de 120 ms: las tres entran en cascada y no de golpe.
              transition={{ duration: 0.6, delay: indice * 0.12, ease: 'easeOut' }}
            >
              <button
                type='button'
                onClick={() => onSelectWine(wine)}
                className='group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-blanco text-left transition-colors hover:border-verde-salvia/50'
              >
                <span className='relative block aspect-[4/3] w-full overflow-hidden'>
                  <img
                    src={wine.imageUrl}
                    alt={wine.name}
                    loading='lazy'
                    className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                  />
                  {/* El precio arriba a la derecha: es el dato por el que esta
                      ordenada la seccion, y sobre la foto no compite con el
                      nombre. */}
                  <span className='absolute right-3 top-3 rounded-full bg-marfil/80 px-2.5 py-1 text-xs font-bold text-verde-salvia backdrop-blur-sm'>
                    {new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                      maximumFractionDigits: 0
                    }).format(wine.price)}
                  </span>
                </span>

                <span className='flex flex-1 flex-col gap-1 p-5'>
                  <span className='font-serif text-base font-bold text-carbon transition-colors group-hover:text-verde-600'>
                    {wine.name}
                  </span>
                  {/* Lo que hay, no lo que falta: sin bodega ni anada no se
                      escribe una linea vacia. Ver `utils/producto.ts`. */}
                  {subtituloProducto(wine) !== null && (
                    <span className='text-sm text-neutral-600'>{subtituloProducto(wine)}</span>
                  )}
                  {tieneAnada(wine.vintage) && (
                    <span className='mt-auto pt-3 text-xs uppercase tracking-widest text-neutral-500'>
                      {wine.vintage}
                    </span>
                  )}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}