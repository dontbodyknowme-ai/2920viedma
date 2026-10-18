import type { Producto } from '../types/producto'

/**
 * Validadores en tiempo de ejecucion para el contrato de datos de `Producto`.
 *
 * `Producto` y `CategoriaProducto` son tipos de TypeScript, por lo que se borran al
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
 *   distintas en el filtro, y el usuario veria el mismo producto dos veces al
 *   filtrar. La lista fija hacia esto imposible por construccion; ahora lo
 *   hace esta linea.
 */
export const esCategoriaValida = (valor: unknown): valor is string => {
  if (typeof valor !== 'string') return false

  const limpia = valor.trim()
  if (limpia.length === 0 || limpia.length > CATEGORIA_MAX_LONGITUD) return false

  return limpia[0] === limpia[0]?.toUpperCase()
}

/**
 * Los campos que **siempre** tiene que tener un producto.
 *
 * `grupo` y `tipoVino` son obligatorios de negocio pero admiten `null` de
 * legitimo —"Energizantes" cuelga sin grupo y una cerveza no tiene color de
 * producto—, asi que **no entran en ninguna de las dos listas**: no son requeridos
 * (hay productos sin ellos) y tampoco son opcionales a la vista de
 * `esCampoOpcionalValido`, que acepta `undefined` y no `null`. Meterlos en
 * `CAMPOS_OPCIONALES` los haria pasar por ausentes, que en runtime es otra cosa:
 * la API manda `null`.
 *
 * Los verifica `test/taxonomia.test.ts`, que mira el arbol entero y no campos
 * sueltos.
 */
export const CAMPOS_REQUERIDOS: ReadonlyArray<keyof Producto> = [
  'id',
  'name',
  'category',
  'departamento',
  'price',
  'description',
  'imageUrl'
]

/**
 * Opcionales de verdad.
 *
 * `winery`, `varietal` y `vintage` se volvieron opcionales cuando la tienda dejo
 * de ser una vinateria: una gaseosa no tiene bodega, ni cepa, ni anada.
 * `undefined` y `null` valen los dos —una API puede mandar cualquiera de los
 * dos—, asi que el validador acepta `undefined` y el `null` se cubre en el test
 * de taxonomia.
 */
export const CAMPOS_OPCIONALES: ReadonlyArray<keyof Producto> = [
  'tastingNotes',
  'foodPairing',
  'winery',
  'varietal',
  'vintage'
]

// Un producto no puede ser mas viejo que las primeras cosechas vpn documentadas,
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
export const camposRequeridosInvalidos = (producto: Producto): Array<string> =>
  CAMPOS_REQUERIDOS.filter((campo) => {
    const valor = producto[campo]

    switch (campo) {
      case 'category':
        return !esCategoriaValida(valor)
      case 'price':
        return !esPrecioValido(valor)
      case 'imageUrl':
        return !esUrlHttpValida(valor)
      default:
        return !esTextoNoVacio(valor)
    }
  }).map((campo) => String(campo))

/**
 * Un campo opcional es valido si esta ausente (`undefined`), si es un `null`, o
 * si es un string no vacio.
 *
 * **El `null` se sumo cuando la tienda dejo de vender solo productos.** Una API que
 * serializa `String?` de Prisma manda `null` para una gaseosa sin bodega, y sin
 * aceptarlo el producto entero se marcaba como invalido. Antes solo se
 * aceptaba `undefined`, y `null` se rechazaba a proposito: era un dato roto.
 * Ahora `null` es la forma correcta de decir "este producto no tiene bodega".
 *
 * Sigue rechazando el string vacio: `''` no es "no tiene bodega", es "la bodega
 * se guardo vacia", que es un error de carga.
 */
export const esCampoOpcionalValido = (valor: unknown): boolean =>
  valor === undefined || valor === null || esTextoNoVacio(valor)