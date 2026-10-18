import type { Wine } from '../types/vino'

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
 * El catalogo publico pide `/api/wines/public`, que **no** pagina y no acepta
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
  category: Wine['category'] | ''
  minPrice: number | ''
  maxPrice: number | ''
  searchQuery: string
}

export const filtrarVinos = (vinos: Wine[], filtros: Filtros): Wine[] => {
  const consulta = filtros.searchQuery.trim().toLowerCase()
  const min = filtros.minPrice === '' ? null : Number(filtros.minPrice)
  const max = filtros.maxPrice === '' ? null : Number(filtros.maxPrice)

  return vinos.filter((wine) => {
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
    // vacio del lado de la pantalla —que es justo lo que hace `''`— mientras que
    // el filtro `''` global significa "no filtrar". La distincion esta en que el
    // filtro de grupo solo se compara cuando hay un departamento elegido: sin
    // departamento no hay grupo que acotar.
    const matchesGrupo =
      filtros.departamento === '' || filtros.grupo === '' || wine.grupo === filtros.grupo

    const matchesCategory =
      filtros.category === '' || wine.category === filtros.category

    const matchesPrice =
      (min === null || wine.price >= min) && (max === null || wine.price <= max)

    // La categoría también se busca: el placeholder del buscador y el del navbar
    // prometen "nombre, marca o categoría", y sin esta línea el tercero no
    // encontraba nada. Un texto que promete una búsqueda que no existe es peor
    // que un placeholder más corto.
    //
    // Se busca tambien por departamento y grupo, porque son las palabras que el
    // usuario escribe ("busco gaseosas", "algo de regalería") y no estan en el
    // nombre del producto.
    const matchesSearch =
      wine.name.toLowerCase().includes(consulta) ||
      (wine.winery ?? '').toLowerCase().includes(consulta) ||
      (wine.varietal ?? '').toLowerCase().includes(consulta) ||
      wine.category.toLowerCase().includes(consulta) ||
      wine.departamento.toLowerCase().includes(consulta) ||
      (wine.grupo ?? '').toLowerCase().includes(consulta) ||
      (wine.tipoVino ?? '').toLowerCase().includes(consulta)

    return (
      matchesDepartamento &&
      matchesGrupo &&
      matchesCategory &&
      matchesPrice &&
      matchesSearch
    )
  })
}
