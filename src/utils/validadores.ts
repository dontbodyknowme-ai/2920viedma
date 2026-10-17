import type { Wine } from '../types/vino'

/**
 * Validadores en tiempo de ejecucion para el contrato de datos de `Wine`.
 *
 * `Wine` y `WineCategory` son tipos de TypeScript, por lo que se borran al
 * compilar y no existen en runtime. Estos helpers reconstruyen ese contrato
 * para poder verificar los datos reales con `expect`.
 */

/**
 * Longitud maxima de una categoria.
 *
 * No es arbitraria: es lo que hace que el boton del filtro quepa en una linea en
 * movil. Una categoria mas larga que esto es probablemente un nombre de producto
 * cargado en el campo equivocado.
 */
export const CATEGORIA_MAX_LONGITUD = 40

/**
 * Valida la **forma** de una categoria, no su valor.
 *
 * Antes comparaba contra `CATEGORIAS_VALIDAS`, una lista fija de cuatro. Con el
 * enum del backend eliminado (spec 011) no hay lista que valga: la categoria la
 * elige el admin y puede ser la que necesite.
 *
 * Lo que si se sigue exigiendo, porque es lo que la lista fija cubria sin
 * querer:
 *
 * - **no vacia**, ni con espacios alrededor
 * - **empieza en mayuscula**: `'tinto'` y `'Tinto'` serian dos categorias
 *   distintas en el filtro, y el usuario veria el mismo vino dos veces al
 *   filtrar. La lista fija hacia esto imposible por construccion; ahora lo
 *   hace esta linea.
 */
export const esCategoriaValida = (valor: unknown): valor is string => {
  if (typeof valor !== 'string') return false

  const limpia = valor.trim()
  if (limpia.length === 0 || limpia.length > CATEGORIA_MAX_LONGITUD) return false

  return limpia[0] === limpia[0]?.toUpperCase()
}

export const CAMPOS_REQUERIDOS: ReadonlyArray<keyof Wine> = [
  'id',
  'name',
  'winery',
  'varietal',
  'category',
  'departamento',
  'vintage',
  'price',
  'description',
  'imageUrl'
]

export const CAMPOS_OPCIONALES: ReadonlyArray<keyof Wine> = ['tastingNotes', 'foodPairing']

// Un vino no puede ser mas viejo que las primeras cosechas vpn documentadas,
// ni del futuro (salvo la tolerancia de una vendimia en curso).
export const ANIO_MINIMO = 1850

export const ANIO_MAXIMO_TOLERANCIA = 1

export const esTextoNoVacio = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0

export const esPrecioValido = (valor: unknown): boolean =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0

export const esAnioRazonable = (
  valor: unknown,
  anioActual: number = new Date().getFullYear()
): boolean =>
  typeof valor === 'number' &&
  Number.isInteger(valor) &&
  valor >= ANIO_MINIMO &&
  valor <= anioActual + ANIO_MAXIMO_TOLERANCIA

export const esUrlHttpValida = (valor: unknown): boolean => {
  if (!esTextoNoVacio(valor)) return false

  try {
    const url = new URL(valor)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Devuelve la lista de campos requeridos que faltan o tienen tipo incorrecto.
 * Un array vacio significa que el objeto cumple el contrato.
 */
export const camposRequeridosInvalidos = (vino: Wine): Array<string> =>
  CAMPOS_REQUERIDOS.filter((campo) => {
    const valor = vino[campo]

    switch (campo) {
      case 'category':
        return !esCategoriaValida(valor)
      case 'vintage':
        return !esAnioRazonable(valor)
      case 'price':
        return !esPrecioValido(valor)
      case 'imageUrl':
        return !esUrlHttpValida(valor)
      default:
        return !esTextoNoVacio(valor)
    }
  }).map((campo) => String(campo))

/**
 * Un campo opcional es valido si esta ausente (`undefined`) o si es un string
 * no vacio. Se rechaza `null` y el string vacio.
 */
export const esCampoOpcionalValido = (valor: unknown): boolean =>
  valor === undefined || esTextoNoVacio(valor)