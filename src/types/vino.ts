/**
 * La categoria de un producto.
 *
 * **Es `string`, no una union de literales.** Antes era
 * `'Tinto' | 'Blanco' | 'Rosado' | 'Espumante'`, y eso obliga a editar el codigo
 * para agregar una categoria. Como el backend tampoco las restringe (el campo es
 * `String` en Prisma), el tipo de TypeScript era la unica restriccion y hacia
 * imposible cargar un queso o una cerveza.
 *
 * El costo de esta decision es que un typo (`'tinto'`) compila y no lo detecta
 * TypeScript. Lo cubre `esCategoriaValida` en `utils/validadores.ts`, que es el
 * unico lugar que puede mirarlo ahora que no hay una lista fija.
 */
export type WineCategory = string

export interface Wine {
  id: string
  name: string
  winery: string
  varietal: string
  category: WineCategory
  /**
   * El grupo de la tienda, que es un eje **distinto** de `category`.
   *
   * `category` dice que tipo de vino es —Tinto, Blanco, Rosado, Espumante— y
   * `departamento` dice a que seccion de la tienda pertenece: Bebidas,
   * Regalería, Snacks y chocolates, Comidas. Un Malbec es las dos a la vez, y por
   * eso no se metio el departamento adentro de `category`: habria que elegir uno
   * y se pierde el otro.
   *
   * Es texto libre y no una lista cerrada por el mismo motivo que
   * `WineCategory`. Ver `src/utils/departamentos.ts` para los cuatro que usa la
   * interfaz.
   */
  departamento: string
  vintage: number
  price: number
  description: string
  tastingNotes?: string
  foodPairing?: string
  imageUrl: string
}

export interface PublicWine {
  id: string
  name: string
  winery: string
  varietal: string
  category: WineCategory
  /** El grupo de la tienda. Eje distinto de `category`. Ver `Wine`. */
  departamento: string
  vintage: number
  price: number
  description: string | null
  tastingNotes: string | null
  foodPairing: string | null
  imageUrl: string
}

export interface CartItem {
  product: Wine
  quantity: number
}

export interface WineFilterState {
  category: WineCategory | 'Todos los productos'
  maxPrice: number | ''
  searchQuery: string
  minPrice: number | ''
}