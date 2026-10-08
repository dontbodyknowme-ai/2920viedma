import type { Wine } from '../types/vino'

/**
 * Validadores en tiempo de ejecucion para el contrato de datos de `Wine`.
 *
 * `Wine` y `WineCategory` son tipos de TypeScript, por lo que se borran al
 * compilar y no existen en runtime. Estos helpers reconstruyen ese contrato
 * para poder verificar los datos reales con `expect`.
 */

export const CATEGORIAS_VALIDAS = ['Tinto', 'Blanco', 'Rosado', 'Espumante'] as const

// involuntarily duplica la lista para poder compararla sin castear a string[],
// lo cual mantiene la type safety en tiempo de compilacion.
export type CategoriaValida = (typeof CATEGORIAS_VALIDAS)[number]

export const CAMPOS_REQUERIDOS: ReadonlyArray<keyof Wine> = [
  'id',
  'name',
  'winery',
  'varietal',
  'category',
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

export const esCategoriaValida = (valor: unknown): valor is CategoriaValida =>
  typeof valor === 'string' &&
  (CATEGORIAS_VALIDAS as ReadonlyArray<string>).includes(valor)

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