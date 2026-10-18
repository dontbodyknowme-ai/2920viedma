/**
 * La taxonomia de la tienda: que departamento es, que grupo tiene y a que
 * categoria pertenece.
 *
 * ## La forma
 *
 * Tres niveles, y el del medio es **opcional**:
 *
 *   Bebidas
 *     ├─ Con alcohol      → Vinos, Espumante, Cerveza, Aperitivos, Destilados
 *     ├─ Energizantes     → (sin grupo: cuelga directo del departamento)
 *     └─ Sin alcohol      → Gaseosas, Agua saborizada, Jugos
 *   Regalería            → (sin estructura por ahora)
 *   Gastronomía          → (sin estructura por ahora)
 *
 * Un producto tiene siempre `departamento` y `categoria`. El `grupo` es el que
 * puede faltar: "Energizantes" cuelga directo de Bebidas porque no es ni con
 * alcohol ni sin alcohol, y meterlo en alguno de los dos seria mentir.
 *
 * **Por que el grupo es un campo y no solo como se dibuja:** porque se filtra.
 * En el catalogo publico el filtro de "Con alcohol" tiene que devolver las
 * cervezas y los aperitivos sin que la pantalla sepa de antemano cuales son.
 *
 * ## Solo Bebidas tiene estructura
 *
 * Regalería y Gastronomía están vacias a proposito. El boceto de jerarquia
 * desarrollo **unicamente** como se organiza Bebidas, y inventar subcategorias
 * de Regalería seria inventar el catalogo de un negocio que todavia no se
 * existe. Cuando aparezca, se agrega el grupo y sus categorias aca, y el
 * catalogo los muestra solo.
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
          { valor: 'Espumante', etiqueta: 'Espumante' },
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
  { valor: 'Regalería', etiqueta: 'Regalería', grupos: [] },
  { valor: 'Gastronomía', etiqueta: 'Gastronomía', grupos: [] }
]

/** El valor de `departamento` que significa "sin filtro". */
export const SIN_DEPARTAMENTO = ''

/** El nombre de la pestaña que muestra todo. No es un departamento. */
export const PESTAÑA_TODOS = 'Todos'

/**
 * El nombre de la etiqueta que muestra la categoria "suelta" de un
 * departamento, la que cuelga sin grupo.
 *
 * Existe porque sin esto el filtro de categorias de "Energizantes" no tendria
 * que mostrar: el grupo ya esta en pantalla y no hay nada que elegir adentro.
 */
export const SIN_GRUPO = ''

/** El departamento del grupo vacio: "Energizantes" cuelga aca. */
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
