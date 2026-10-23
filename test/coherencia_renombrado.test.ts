import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, type Dirent } from 'node:fs'
import { extname, join } from 'node:path'

/**
 * Que el renombre Wine -> Producto no vuelva para atras **a medias**.
 *
 * ## El bug que este test vigila
 *
 * Un revert + reapply de un merge rebobino cinco archivos a su contenido
 * pre-rename: `App.tsx` importaba `./types/vino` (un archivo que ya no existe),
 * `order_drawer.tsx` leia `item.wineId` contra un `OrderItem` que ya tenia
 * `productoId`, y los tests se importaban entre dos andamiajes distintos. Cada
 * archivo por separado "era de un estado anterior", y el arbol entero no
 * compilaba: el CI del frontend murio despues de un deploy verde.
 *
 * Ese modo de falla no lo ve ningun test de comportamiento: cada mitad era
 * consistente por dentro. Solo un test que **mire los nombres** en todo el
 * arbol puede cortarlo, y por eso vive aca.
 *
 * ## Que se prohube y que no
 *
 * Se prohiben los identificadores muertos del renombre: los modulos
 * `types/vino` y `datos/vino`, los campos `wineId`/`wineName`, los props
 * `onSelectWine`/`onEditWine`, y las claves `INITIAL_WINES`/`CLAVE_VINOS`.
 *
 * `onAddWine` **no esta prohibido** a proposito: es el nombre vigente del prop
 * del formulario de productos. Prohibir cada cosa que suena a vino robaria el
 * proyecto de palabra —y un nombre vivo es lo que es, no un resto del renombre.
 *
 * ## Los dos gotchas que el extractor tiene que respetar
 *
 * **Gotcha 35**: se sacan los comentarios **antes** de escanear. Hoy hay un
 * comentario en `contrato_checkout.test.ts` que menciona `wineId` para explicar
 * por que el backend usa `vinoId` — sin esto, ese comentario prohibiria el
 * renombre por el solo hecho de narrarlo.
 *
 * **Gotcha 37**: la busqueda no usa distancia ni contexto elástico, sino que
 * recorre archivo por archivo y matchea nombres enteros con `\b`. Un regex con
 * `{0,400}` o un literal multilina no matchean igual en el working copy.
 *
 * Los archivos **faltantes son un fallo**, no un pase: si `types/producto.ts`
 * desaparece, el semaforo es rojo y no "no hubo nada que mirar".
 */

const RAIZ = join(__dirname, '..')
const EXTENSIONES = ['.ts', '.tsx']

/** Recorre la carpeta y devuelve las rutas relativas de los fuentes. */
const fuentes = (carpeta: string): string[] => {
  const ruta = join(RAIZ, carpeta)
  let entradas: Dirent[]
  try {
    entradas = readdirSync(ruta, { withFileTypes: true })
  } catch {
    throw new Error(`No se pudo leer la carpeta "${carpeta}"; el test no puede mirar nada`)
  }

  return entradas.flatMap((entrada) => {
    const relativo = `${carpeta}/${entrada.name}`

    if (entrada.isDirectory()) return fuentes(relativo)
    if (EXTENSIONES.includes(extname(entrada.name))) return [relativo]

    return []
  })
}

/**
 * Saca los comentarios de un fuente TypeScript.
 *
 * De linea: solo cuando `//` esta al borde de la linea o despues de un espacio
 * — y **no** despues de `:`, que es el caso de `https://` en una URL de
 * string —. Y de bloque con regex `non-greedy`: los comentarios largos con
 * asteriscos dobles adentro no se los lleva.
 */
const sacarComentarios = (fuente: string): string => {
  const sinBloque = fuente.replace(/\/\*[\s\S]*?\*\//g, ' ')

  return sinBloque
    .split('\n')
    .map((linea) => {
      const corte = linea.search(/(^|\s)\/\//)

      if (corte === -1) return linea

      return linea.slice(0, corte)
    })
    .join('\n')
}

/** Los nombres muertos: cada uno con lo que tiene que ser en su lugar. */
const PROHIBIDOS: Array<{ patron: RegExp; reemplazo: string }> = [
  { patron: /types\/vino/, reemplazo: 'types/producto' },
  { patron: /datos\/vino/, reemplazo: 'datos/productos' },
  { patron: /\bwineId\b/, reemplazo: 'productoId' },
  { patron: /\bwineName\b/, reemplazo: 'productoNombre' },
  { patron: /\bwineToEdit\b/, reemplazo: 'productoToEdit' },
  { patron: /\bonSelectWine\b/, reemplazo: 'onSelectProducto' },
  { patron: /\bonEditWine\b/, reemplazo: 'onEditProducto' },
  { patron: /\bINITIAL_WINES\b/, reemplazo: 'PRODUCTOS_INICIALES' },
  { patron: /\bCLAVE_VINOS\b/, reemplazo: 'CLAVE_PRODUCTOS' }
]

/** Los archivos que el renombre introdujo. Si alguno falta, el arbol esta roto. */
const IMPRESCINDIBLES: Array<{ archivo: string; con: string; que: string }> = [
  { archivo: 'src/types/producto.ts', con: 'export interface Producto', que: 'el tipo Producto' },
  {
    archivo: 'src/types/producto.ts',
    con: 'export interface ProductoPublico',
    que: 'el tipo ProductoPublico'
  },
  {
    archivo: 'src/datos/productos.ts',
    con: 'export const PRODUCTOS_INICIALES',
    que: 'el semillero del catalogo'
  },
  {
    archivo: 'test/andamiaje.ts',
    con: 'export const CLAVE_PRODUCTOS',
    que: 'la clave del localStorage del catalogo'
  }
]

describe('el renombre Wine -> Producto esta completo', () => {
  it('los archivos del renombre existen y exportan lo que los demas importan', () => {
    for (const { archivo, con, que } of IMPRESCINDIBLES) {
      let contenido: string

      try {
        contenido = readFileSync(join(RAIZ, archivo), 'utf8')
      } catch {
        throw new Error(`"${archivo}" no existe; el renombre consiste de que ahi viva ${que}`)
      }

      expect(contenido, `${archivo} tiene que declarar ${que}`).toContain(con)
    }
  })

  it('ningun fuente usa un identificador del antes del renombre', () => {
    const faltas: string[] = []

    for (const archivo of fuentes('src').concat(fuentes('test'))) {
      const limpio = sacarComentarios(readFileSync(join(RAIZ, archivo), 'utf8'))

      for (const { patron, reemplazo } of PROHIBIDOS) {
        if (patron.test(limpio)) {
          faltas.push(`${archivo} usa "${patron.source}" — va "${reemplazo}"`)
        }
      }
    }

    // El mensaje junta todas: un solo renombre a medias puede traer diez, y
    // arreglarlas de a una con re-corridos de suite cuesta mas que leerlas juntas.
    expect(
      faltas,
      `quedan ${faltas.length} usos del renombre incompleto:\n${faltas.join('\n')}`
    ).toEqual([])
  })
})
