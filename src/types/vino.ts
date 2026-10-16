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
  category: WineCategory | 'Todos'
  maxPrice: number | ''
  searchQuery: string
  minPrice: number | ''
  selectedVarietals: string[]
}