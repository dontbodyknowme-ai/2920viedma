import { describe, it, expect } from 'vitest'
import { subtituloProducto, tieneAnada } from '../src/utils/producto'

/**
 * Como se rotula un producto que no es vino.
 *
 * ## Que se rompia
 *
 * La tarjeta, la vista rapida, el carrito y las botellas destacadas escribian
 * el subtitulo como `{producto.winery} • {producto.varietal}`, y el badge de
 * la foto como `{producto.vintage}` a secas. Para un producto **sin bodega** —
 * una gaseosa, un energizante, un chocolate, unas papas— eso deja:
 *
 *   - el separador solo: **" • "**
 *   - un badge con la forma de un ano y nada adentro
 *
 * Y la mitad del catalogo no es vino. La foto de un Monster Energy con un " • "
 * arriba se ve como una foto de un producto roto.
 *
 * ## Por que estos tests existen
 *
 * Porque el arreglo es de los que **se pueden volver a romper sin que nadie se
 * entere**: si alguien vuelve a escribir `{producto.winery} • {producto.varietal}`
 * en un componente, los tests de este archivo siguen en verde —miden la
 * funcion, no la pantalla—. Los que miran la pantalla son los de
 * `test/tarjetas_home.test.ts`.
 */

describe('subtituloProducto', () => {
  it('escribe bodega y cepa, separados', () => {
    expect(
      subtituloProducto({ winery: 'Bodega Catena Zapata', varietal: 'Malbec' })
    ).toBe('Bodega Catena Zapata • Malbec')
  })

  it('escribe solo la bodega cuando no hay cepa', () => {
    expect(subtituloProducto({ winery: 'Bodega Norton', varietal: null })).toBe('Bodega Norton')
  })

  it('escribe solo la cepa cuando no hay bodega', () => {
    // Una IPA tiene varietal pero no bodega. El separador no va adelante: queda
    // " • Malbec" y parece que le falta la mitad de la linea.
    expect(subtituloProducto({ winery: null, varietal: 'Malbec' })).toBe('Malbec')
  })

  it('no escribe nada cuando no hay ninguno de los dos', () => {
    // `null` y no `''`: el que lo usa tiene que **omitir la linea entera**.
    // Un `<p>` vacio con `mb-2` deja el hueco igual de visible.
    expect(subtituloProducto({ winery: null, varietal: null })).toBeNull()
  })

  it('trata el string vacio como dato ausente', () => {
    // Distinto de `null` en el tipo, pero en pantalla es lo mismo: un dato
    // vacio no se ve. Ojo con la regla de la vista rapida (D-N): un string
    // vacio es un dato *presente* para el caso de la descripcion, que se
    // muestra aunque este vacia. Aca lo que se decide es *que se imprime*.
    expect(subtituloProducto({ winery: '', varietal: null })).toBeNull()
    expect(subtituloProducto({ winery: '   ', varietal: null })).toBeNull()
    expect(subtituloProducto({ winery: '', varietal: 'Malbec' })).toBe('Malbec')
  })
})

describe('tieneAnada', () => {
  it('acepta un ano', () => {
    expect(tieneAnada(2020)).toBe(true)
  })

  it('rechaza la ausencia de ano', () => {
    // La anada es `null` para todo lo que no es vino. Un producto sin ano no
    // tiene que dejar un badge con la forma de un ano y nada adentro.
    expect(tieneAnada(null)).toBe(false)
    expect(tieneAnada(undefined)).toBe(false)
  })

  it('rechaza un numero que no es un ano', () => {
    // `NaN` e `Infinity` son numeros, y un truthy check los aceptaria. Un ano
    // es un numero finito: cualquier otra cosa es un dato roto.
    expect(tieneAnada(Number.NaN)).toBe(false)
    expect(tieneAnada(Number.POSITIVE_INFINITY)).toBe(false)
  })
})
