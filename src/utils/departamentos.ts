/**
 * La taxonomia de la tienda: que departamento es, que grupo tiene y a que
 * categoria pertenece.
 *
 * ## La forma
 *
 * Tres niveles, y el del medio es **opcional**:
 *
 *   Bebidas
 *     ├─ Con alcohol      → Vinos, Cerveza, Aperitivos, Destilados
 *     ├─ Energizantes     → (sin subcategorias: el grupo **es** la hoja)
 *     └─ Sin alcohol      → Gaseosas, Agua saborizada, Jugos
 *   Regalos            → (sin estructura por ahora)
 *   Listo para comer          → (sin estructura por ahora)
 *   Snack y chocolates  → (sin estructura por ahora)
 *
 * Un producto tiene siempre `departamento` y `categoria`. El `grupo` es el que
 * puede faltar, y solo falta en los departamentos que **no tienen estructura**:
 * un vaso de regaloeria no es "con alcohol" ni "sin alcohol", asi que no hay que
 * inventarle un grupo.
 *
 * Y "Energizantes" **si** es un grupo, aunque no tenga subcategorias: es una
 * hoja de la rama de bebidas. Meterlo en "Con alcohol" o en "Sin alcohol" seria
 * mentir, y dejarlo sin grupo tampoco, porque entonces el filtro de grupo
 * ofreceria "Energizantes" —la fila lo lista, porque es un grupo declarado— y no
 * devolveria nada: el producto tendria `grupo: null`. Un boton de filtro que
 * lleva a cero resultados.
 *
 * **Por que el grupo es un campo y no solo como se dibuja:** porque se filtra.
 * En el catalogo publico el filtro de "Con alcohol" tiene que devolver las
 * cervezas y los aperitivos sin que la pantalla sepa de antemano cuales son.
 *
 * ## Solo Bebidas tiene estructura
 *
 * Regalos, Listo para comer y Snack y chocolates están vacías a proposito. El
 * boceto de jerarquia desarrollo **unicamente** como se organiza Bebidas, e
 * inventar subcategorias de las otras seria inventar el catalogo de un negocio
 * que todavia no se existe. Cuando aparezca, se agrega el grupo y sus categorias
 * aca, y el catalogo los muestra solo.
 *
 * ## Los strings de `valor` son contrato con la base
 *
 * El filtro del servidor es `where.departamento = <valor>` y
 * `where.categoria = <valor>`, o sea coincidencia **exacta**: un accento
 * distinto o una mayuscula de mas y el producto no aparece en ninguna
 * categoria. `etiqueta` es lo que se lee y puede cambiar; `valor` no, sin
 * migracion.
 */
export interface CategoriaDeTienda {
  valor: string
  etiqueta: string
}

export interface GrupoDeTienda {
  valor: string
  etiqueta: string
  categorias: CategoriaDeTienda[]
}

export interface DepartamentoDeTienda {
  valor: string
  etiqueta: string
  grupos: GrupoDeTienda[]
}

export const DEPARTAMENTOS: DepartamentoDeTienda[] = [
  {
    valor: 'Bebidas',
    etiqueta: 'Bebidas',
    grupos: [
      {
        valor: 'Con alcohol',
        etiqueta: 'Con alcohol',
        categorias: [
          { valor: 'Vinos', etiqueta: 'Vinos' },
          { valor: 'Cerveza', etiqueta: 'Cerveza' },
          { valor: 'Aperitivos', etiqueta: 'Aperitivos' },
          { valor: 'Destilados', etiqueta: 'Destilados' }
        ]
      },
      {
        valor: 'Energizantes',
        etiqueta: 'Energizantes',
        // Sin categorias: cuelga directo del departamento. Ver la nota de
        // cabecera sobre por que el grupo es opcional.
        categorias: []
      },
      {
        valor: 'Sin alcohol',
        etiqueta: 'Sin alcohol',
        categorias: [
          { valor: 'Gaseosas', etiqueta: 'Gaseosas' },
          { valor: 'Agua saborizada', etiqueta: 'Agua saborizada' },
          { valor: 'Jugos', etiqueta: 'Jugos' }
        ]
      }
    ]
  },
  { valor: 'Regalos', etiqueta: 'Regalos', grupos: [] },
  { valor: 'Listo para comer', etiqueta: 'Listo para comer', grupos: [] },
  {
    valor: 'Snack y chocolates',
    etiqueta: 'Snack y chocolates',
    // Sin estructura, como Regalos y Listo para comer. El boceto dibuja la
    // jerarquía solo de Bebidas, y "chocolates / alfajores / papas chips" es
    // una division que todavía no se decidió: agregarla acá sería inventarla.
    // Cuando se defina, se pone el grupo y sus categorías en esta línea y el
    // catálogo y el formulario los muestran solos.
    grupos: []
  }
]

/** El valor de `departamento` que significa "sin filtro". */
export const SIN_DEPARTAMENTO = ''

/** El nombre de la pestaña que muestra todo. No es un departamento. */
export const PESTAÑA_TODOS = 'Todos'

/**
 * El valor de `grupo` que significa "sin filtro".
 *
 * No es lo mismo que `grupo: null` en un producto: el filtro `''` pide todos los
 * grupos de un departamento, y `null` es un producto que no tiene grupo —que solo
 * existe en los departamentos sin estructura.
 */
export const SIN_GRUPO = ''

/**
 * El grupo sin subcategorias: "Energizantes".
 *
 * Sus productos llevan `grupo: 'Energizantes'` y `category: 'Energizantes'`: el
 * grupo y la hoja son el mismo nombre, porque no hay un nivel mas abajo. Ver la
 * nota de cabecera.
 */
export const GRUPO_SUELTO: CategoriaDeTienda = {
  valor: 'Energizantes',
  etiqueta: 'Energizantes'
}

/** Los grupos de un departamento. */
export const gruposDe = (departamento: string): GrupoDeTienda[] =>
  DEPARTAMENTOS.find((d) => d.valor === departamento)?.grupos ?? []

/**
 * La etiqueta de la pestaña de stock de un departamento.
 *
 * "Stock de bebidas", no "Bebidas": la pestaña **es** el stock de esa cosa, y
 * leer "Bebidas" arriba de una tabla de stock obliga a un paso de inferencia que
 * no hace falta. El `toLowerCase` es lo que produce "bebidas" en vez de
 * "Bebidas" —que es como lo escribe la persona que lo pide, no como esta escrita
 * la columna.
 *
 * Vive aca y no en la pagina del panel para que el test pueda fijarla: es una
 * regla de escritura, y una regla de escritura en un componente es una regla que
 * solo se verifica abriendo el panel.
 */
export const etiquetaDeStock = (departamento: string): string =>
  `Stock de ${departamento.toLowerCase()}`

/**
 * Todas las categorias que cuelgan de un departamento, grupos incluidos.
 *
 * Se usan para el desplegable de la columna "Categoria" del panel: tiene que
 * ofrecer lo mismo que el filtro del catalogo publico, y si cada uno armara su
 * lista aparecia una categoria en uno y no en el otro.
 */
export const categoriasDe = (departamento: string): string[] => {
  const propios = DEPARTAMENTOS.find((d) => d.valor === departamento)?.grupos ?? []

  return propios.flatMap((grupo) => [
    ...grupo.categorias.map((categoria) => categoria.valor),
    // El grupo sin categorias es el que cuelga suelto, asi que el nombre del
    // grupo **es** el de la categoria.
    ...(grupo.categorias.length === 0 ? [grupo.valor] : [])
  ])
}

/**
 * Las categorias que pertenecen a un grupo especifico dentro de un departamento.
 *
 * Cuando el usuario ya eligio un grupo, el filtro de categoria solo debe ofrecer
 * las subcategorias de ESE grupo, no las de todos los grupos del departamento.
 *
 * - Si el grupo no tiene subcategorias (ej. "Energizantes"), devuelve array vacio:
 *   el filtro de categoria se oculta porque el grupo YA ES la hoja.
 * - Si el grupo tiene subcategorias (ej. "Con alcohol", "Sin alcohol"), devuelve
 *   solo esas subcategorias.
 * - Si no hay grupo elegido (grupo === ''), devuelve todas las categorias del
 *   departamento (comportamiento legacy para compatibilidad).
 */
export const categoriasDeGrupo = (departamento: string, grupo: string): string[] => {
  if (grupo === '') {
    return categoriasDe(departamento)
  }
  const depto = DEPARTAMENTOS.find((d) => d.valor === departamento)
  if (!depto) return []
  const grupoEncontrado = depto.grupos.find((g) => g.valor === grupo)
  if (!grupoEncontrado) return []
  // Si el grupo no tiene subcategorias, el grupo mismo es la hoja: no hay
  // filtro de categoria que mostrar.
  if (grupoEncontrado.categorias.length === 0) return []
  return grupoEncontrado.categorias.map((c) => c.valor)
}

/**
 * Indica si un grupo tiene subcategorias (es decir, si hay que mostrar el
 * filtro de categoria cuando ese grupo esta seleccionado).
 */
export const grupoTieneSubcategorias = (departamento: string, grupo: string): boolean => {
  if (grupo === '') return true
  const depto = DEPARTAMENTOS.find((d) => d.valor === departamento)
  if (!depto) return false
  const grupoEncontrado = depto.grupos.find((g) => g.valor === grupo)
  return (grupoEncontrado?.categorias.length ?? 0) > 0
}

/**
 * El `tipoVino` de cada categoria de producto.
 *
 * Es la unica parte de la taxonomia que esta en codigo y **no** en la base: el
 * color es una propiedad de la *categoria*, no del producto. Si viviera en el
 * producto, cargar dos Malbec uno Tinto y otro Blanco —que es un error— seria
 * indistinguible de dos productos legitimos.
 *
 * Por eso es un `<select>` en el formulario y no texto libre: el admin elige de
 * la lista y no puede inventar "Tintoo".
 */
export const TIPOS_DE_VINO = [
  'Tinto',
  'Blanco',
  'Rosado',
  'Espumante'
] as const

export type TipoDeVino = (typeof TIPOS_DE_VINO)[number]
