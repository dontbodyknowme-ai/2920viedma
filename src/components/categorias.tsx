// `Wine` es el nombre del icono en lucide-react, no de lo que vende la tienda.
import { Wine as IconoVino, Gift, Candy, Utensils } from 'lucide-react'

const CATEGORIAS = [
  { icon: IconoVino, titulo: 'Bebidas', detalle: 'Con y sin alcohol' },
  { icon: Gift, titulo: 'Regalería', detalle: 'Detalles para regalar' },
  { icon: Candy, titulo: 'Snacks y chocolates', detalle: 'Algo rico para disfrutar' },
  { icon: Utensils, titulo: 'Comidas', detalle: 'Opciones preparadas' }
]

/**
 * Categorias de la home: "Que estas buscando?".
 *
 * Cuatro tarjetas con icono, titulo y detalle. Son el segundo punto de entrada
 * al catalogo, despues del buscador.
 *
 * El boceto marca que los botones no tienen que funcionar todavia: por ahora son
 * tarjetas con hover, no enlaces. Si despues se quiere que filtren el catalogo,
 * se les agrega el click y el estado.
 */
export const Categorias = () => (
  <section className='mx-auto max-w-7xl px-6 py-12'>
    <h2 className='mb-8 font-serif text-2xl font-bold text-carbon md:text-3xl'>
      ¿Qué estás buscando?
    </h2>
    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
      {CATEGORIAS.map((c) => (
        <button
          key={c.titulo}
          type='button'
          className='group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-blanco p-6 text-left transition-all duration-300 hover:border-verde-salvia/40 hover:shadow-lg'
        >
          <div className='rounded-xl bg-verde-50 p-3 text-verde-600 transition-colors group-hover:bg-verde-100'>
            <c.icon className='h-6 w-6' aria-hidden='true' />
          </div>
          <div>
            <h3 className='font-serif text-lg font-bold text-carbon'>{c.titulo}</h3>
            <p className='text-sm text-neutral-500'>{c.detalle}</p>
          </div>
        </button>
      ))}
    </div>
  </section>
)
