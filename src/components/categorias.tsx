// `Wine` es el nombre del icono en lucide-react, no de lo que vende la tienda.
import { Wine as IconoVino, Gift, Candy, Utensils, type LucideIcon } from 'lucide-react'
import { DEPARTAMENTOS } from '../utils/departamentos'

/**
 * El icono y el detalle de cada departamento, por su `valor`.
 *
 * **La lista sale de `DEPARTAMENTOS`, no de aca.** Antes esta componente tenia su
 * propia lista de cuatro tarjetas, y quedo desincronizada de la taxonomia sin que
 * nada avisara: la homeSeguia mostrando una tarjeta llamada **"Comidas"** que ya
 * no era ningun departamento, mientras la taxonomia tenia **"Gastronomia"**. Dos
 * copias de la misma lista divergen en el primer cambio de una de las dos, y el
 * sintoma es una tienda que ofrece algo que no existe.
 *
 * Lo que si vive aca es lo que **no** sale de la taxonomia: el icono y el texto
 * de abajo. Son presentacion, y la taxonomia no deberia saber de copas.
 *
 * La clave es el `valor` del departamento, no el `etiqueta`: `Snacks y chocolates`
 * y `Bebidas` son los dos que viajan a la base y a la query, y asi una tarjeta
 * mal escrita se ve en el review en vez de mostrar un catalogo vacio.
 */
const PRESENTACION: Record<string, { icon: LucideIcon; detalle: string }> = {
  Bebidas: { icon: IconoVino, detalle: 'Con y sin alcohol' },
  Regalos: { icon: Gift, detalle: 'Detalles para regalar' },
  'Listo para comer': { icon: Utensils, detalle: 'Opciones preparadas' },
  'Snack y chocolates': { icon: Candy, detalle: 'Algo rico para disfrutar' }
}

/**
 * Que esta entrada de la taxonomia tiene su tarjeta en la home.
 *
 * Se exporta para que un test pueda comparar **las dos listas**. Sin el, agregar
 * un departamento lo deja invisible en la home sin error de compilacion ni de
 * test: la lista de `PRESENTACION` acepta cualquier clave y el `icon` seria
 * `undefined` en pantalla.
 */
export const tienePresentacion = (departamento: string): boolean =>
  Object.prototype.hasOwnProperty.call(PRESENTACION, departamento)

/**
 * Departamentos de la home: "¿Que estas buscando?".
 *
 * Un punto de entrada al catalogo, y el primero que **de verdad entra**: cada
 * tarjeta elige el departamento y baja al catalogo con el filtro puesto.
 *
 * ## Antes no hacían nada
 *
 * El boceto decia que no tenian que funcionar todavia, asi que eran tarjetas con
 * hover y sin `onClick`. Con la tienda ya armada y para compartir, una tarjeta
 * de "Bebidas" que al tocarla no hace nada es un boton roto: es la primera cosa
 * que prueba un visitante y no hay forma de distinguir "noImplemented todavia"
 * de "no ando".
 *
 * ## Por que el estado vive arriba y no aca
 *
 * El filtro de departamento lo tiene `ProductCatalog`, en el otro extremo de la
 * pagina. Si el `onClick` de la tarjeta lo setease aca, el catalogo no se
 * enteraria: haria falta un evento, un contexto o subir el estado a `App`. Se
 * sube a `App`, que ya es el dueno de `searchQuery` y de los filtros de precio,
 * y las dos mitades leen y escriben ahi. Lo que se pasa por prop es una funcion,
 * no el estado del filtro entero.
 */
export const Categorias = ({
  onSelectDepartamento
}: {
  /** Elige el departamento y lleva al catalogo. */
  onSelectDepartamento: (departamento: string) => void
}) => (
  <section className='mx-auto max-w-7xl px-6 py-12'>
    <h2 className='mb-8 font-serif text-2xl font-bold text-carbon md:text-3xl'>
      ¿Qué estás buscando?
    </h2>
    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
      {DEPARTAMENTOS.map((departamento) => {
        const presentacion = PRESENTACION[departamento.valor]

        // Sin la entrada no hay tarjeta, en vez de una con `undefined` adentro.
        // Es el mismo criterio del catalogo: cada fila muestra solo lo que tiene
        // algo que ofrecer.
        if (presentacion === undefined) return null

        const Icono = presentacion.icon

        return (
          <button
            key={departamento.valor}
            type='button'
            onClick={() => onSelectDepartamento(departamento.valor)}
            aria-label={`Ver productos de ${departamento.etiqueta}`}
            className='group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-blanco p-6 text-left transition-all duration-300 hover:border-verde-salvia/40 hover:shadow-lg focus-visible:border-verde-salvia focus-visible:outline-none'
          >
            <div className='rounded-xl bg-verde-50 p-3 text-verde-600 transition-colors group-hover:bg-verde-100'>
              <Icono className='h-6 w-6' aria-hidden='true' />
            </div>
            <div>
              <h3 className='font-serif text-lg font-bold text-carbon'>
                {departamento.etiqueta}
              </h3>
              <p className='text-sm text-neutral-500'>{presentacion.detalle}</p>
            </div>
          </button>
        )
      })}
    </div>
  </section>
)
