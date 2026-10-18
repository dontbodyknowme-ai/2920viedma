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
  /** Bodega. `null` para lo que no viene de una. */
  winery: string | null
  /** Cepa. `null` para lo que no la tiene. */
  varietal: string | null
  /** Anada. `null` para lo que no es vino. */
  vintage: number | null
  /**
   * La **hoja** de la taxonomia: Vinos, Cerveza, Gaseosas, Jugos.
   *
   * Antes era el tipo de vino —Tinto, Blanco, Rosado, Espumante— y el backend la
   * validaba con un enum cerrado, que rechazaba una cerveza con un 400. Ahora es
   * texto libre y el color del vino vive en `tipoVino`.
   */
  category: WineCategory
  /**
   * El departamento de la tienda: el nivel mas alto.
   *
   * Los tres niveles son ejes distintos y un producto los tiene **a la vez**:
   * un Malbec es `departamento: 'Bebidas'`, `grupo: 'Con alcohol'`,
   * `category: 'Vinos'` y `tipoVino: 'Tinto'`. Filtrar por cualquiera de los tres
   * acota a los anteriores, no lo reemplaza.
   */
  departamento: string
  /**
   * El nivel medio: "Con alcohol", "Sin alcohol".
   *
   * `null` cuando el producto cuelga directo del departamento. "Energizantes" es
   * el caso: no es ni con alcohol ni sin alcohol, y colgarlo de un grupo seria
   * mentir sobre el producto.
   */
  grupo: string | null
  /** Color del vino. `null` fuera de la categoria "Vinos". */
  tipoVino: string | null
  price: number
  description: string
  tastingNotes?: string
  foodPairing?: string
  imageUrl: string
}

export interface PublicWine {
  id: string
  name: string
  winery: string | null
  varietal: string | null
  vintage: number | null
  category: WineCategory
  departamento: string
  grupo: string | null
  tipoVino: string | null
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