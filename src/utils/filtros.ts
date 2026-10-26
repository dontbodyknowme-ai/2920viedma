import type { Producto } from '../types/producto'

/**
 * El filtro del catalogo publico.
 *
 * ## Los tres niveles se filtran juntos
 *
 * La taxonomia tiene departamento, grupo y categoria, y un producto esta en los
 * tres a la vez. Elegir "Bebidas" y luego "Con alcohol" y luego "Cerveza" **va
 * achicando**: son tres condiciones AND sobre el mismo producto, no tres filtros
 * que se reemplazan.
 *
 * Por eso los tres se comparan aca en vez de que la pantalla decida cual es el
 * "ultimo elegido": si el ultimo fuera el que manda, elegir Bebidas y despues
 * Cerveza devolveria las cervezas de **toda** la tienda, no las de bebidas.
 *
 * ## Por que el filtro es local y no del servidor
 *
 * El catalogo publico pide `/api/products/public`, que **no** pagina y no acepta
 * filtros: devuelve todos los productos activos. Asi que el filtrado ocurre aca
 * sobre esa lista. Es lo que allowe que al tocar un nivel se ajusten los
 * desplegables de abajo sin volver a pedir nada.
 *
 * El panel, en cambio, si filtra en el servidor (`useCatalogo`), porque ahi la
 * lista puede ser de miles de filas. Son dos caminos distintos a proposito.
 */

export interface Filtros {
  /**
   * El departamento elegido. `''` es "todos".
   *
   * El sentinela era `'Todos los productos'` y ahora es `''`: era una cadena que
   * podia colisionar con una categoria llamada asi, y sobre todo no significaba
   * "sin filtro" en ningun otro lado del codigo. `''` es lo que ya usan todos los
   * demas filtros del panel.
   */
  departamento: string
  /** El grupo elegido. `''` es "todos". `null` en el producto = cuelga suelto. */
  grupo: string
  /** La hoja elegida: Vinos, Cerveza, Gaseosas. `''` es "todas". */
  category: Producto['category'] | ''
  /** La bodega elegida. `''` es "todas". */
  winery: string
  minPrice: number | ''
  maxPrice: number | ''
  searchQuery: string
}

/**
 * Deja el texto comparable: minusculas y **sin tildes**.
 *
 * Sin esto, buscar `regaleria` no encuentra nada aunque la etiqueta del filtro
 * diga **"Regalos"**. Y no es un caso raro: en espanol la tilde casi nunca se
 * escribe, ni en un teclado ni en un celular con autocorrector.
 *
 * El sintoma es de los peores que puede tener un buscador: **no hay error, no
 * hay estado vacio raro, no hay nada que reportar**. El usuario escribe, no ve
 * resultados, y la conclusion que saca es que el producto no existe. Y el
 * buscador no fallo: esta comparando `i` con `í`.
 *
 * `NFD` descompone `í` en `i` + diacritico, y los diacriticos viven en el rango
 * `0300`-`036f`, que es lo que se borra despues. La alternativa —una tabla de
 * equivalencias escrita a mano— se desincroniza en la primera palabra con
 * doble acento.
 */
export const normalizarTexto = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Todos los campos por los que se busca, ya normalizados. */
const camposDeBusqueda = (producto: Producto): string[] =>
  [
    producto.name,
    producto.winery,
    producto.varietal,
    producto.category,
    producto.departamento,
    producto.grupo,
    producto.tipoVino,
    producto.description
  ]
    .filter((campo): campo is string => typeof campo === 'string' && campo !== '')
    .map(normalizarTexto)

export const filtrarVinos = (productos: Producto[], filtros: Filtros): Producto[] => {
  const consulta = normalizarTexto(filtros.searchQuery.trim())
  const min = filtros.minPrice === '' ? null : Number(filtros.minPrice)
  const max = filtros.maxPrice === '' ? null : Number(filtros.maxPrice)

  return productos.filter((wine) => {
    // Los tres niveles. Cada uno acota al anterior en vez de reemplazarlo.
    const matchesDepartamento =
      filtros.departamento === '' || wine.departamento === filtros.departamento

    // El grupo tiene una regla que los otros dos no tienen: `''` significa
    // "todos los grupos", pero el sentinela que el filtro tiene que saber
    // distinguir es "sin grupo". Un producto con `grupo: null` (Energizantes)
    // **no** tiene que aparecer nunca al filtrar por "Con alcohol", y con un
    // `wine.grupo === filtros.grupo` a secas no habria forma de pedirlo.
    //
    // Por eso el filtro de grupo es exacto y `null` se representa como string
    // vacio del lado de la pantalla —que es justo lo que hace `''`— mientras
    // que el filtro `''` global significa "no filtrar". La distincion esta en
    // que el filtro de grupo solo se compara cuando hay un departamento
    // elegido: sin departamento no hay grupo que acotar.
    const matchesGrupo =
      filtros.departamento === '' || filtros.grupo === '' || wine.grupo === filtros.grupo

    const matchesCategory =
      filtros.category === '' || wine.category === filtros.category

    const matchesWinery =
      filtros.winery === '' || wine.winery === filtros.winery

    const matchesPrice =
      (min === null || wine.price >= min) && (max === null || wine.price <= max)

    // La categoria tambien se busca: el placeholder del buscador y el del
    // navbar prometen "nombre, marca o categoria", y sin esta linea el tercero
    // no encontraba nada. Un texto que promete una busqueda que no existe es
    // peor que un placeholder mas corto.
    //
    // Se busca tambien por departamento y grupo, porque son las palabras que el
    // usuario escribe ("busco gaseosas", "algo de regaleria") y no estan en el
    // nombre del producto. Y por la **descripcion**: es lo unico que hay para
    // un producto sin marca ni cepa —una gaseosa, un alfajor—, donde todos los
    // demas campos vienen en `null` y la busqueda se reduce al nombre.
    const matchesSearch = camposDeBusqueda(wine).some((campo) => campo.includes(consulta))

    return (
      matchesDepartamento &&
      matchesGrupo &&
      matchesCategory &&
      matchesWinery &&
      matchesPrice &&
      matchesSearch
    )
  })
}
