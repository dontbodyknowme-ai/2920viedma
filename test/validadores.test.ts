import { describe, it, expect } from 'vitest'
import type { Wine } from '../src/types/vino'
import {
  CAMPOS_OPCIONALES,
  CAMPOS_REQUERIDOS,
  camposRequeridosInvalidos,
  esAnioRazonable,
  esCampoOpcionalValido,
  esCategoriaValida,
  esPrecioValido,
  esTextoNoVacio,
  esUrlHttpValida
} from '../src/utils/validadores'

/**
 * Tests "de los validadores".
 *
 * Su proposito es evitar que la suite de integridad de datos pase en verde por
 * una asercion vacia: si un validador acceptara cualquier cosa, estos tests
 * fallarian. Cada caso parte de un vino valido y le inyecta una sola mutacion,
 * verificando que el validador la detecta y que reporta el campo exacto.
 */

const vinoValido = (): Wine => ({
  id: 'test-1',
  name: 'Test Malbec',
  winery: 'Bodega Test',
  varietal: 'Malbec',
  category: 'Vinos',
  departamento: 'Bebidas',
  grupo: 'Con alcohol',
  tipoVino: 'Tinto',
  vintage: 2020,
  price: 45000,
  description: 'Vino de prueba para validar el contrato de datos.',
  tastingNotes: 'Ciruela y vainilla.',
  foodPairing: 'Carnes rojas.',
  imageUrl: 'https://example.com/vino.jpg'
})

describe('validadores: punto de partida', () => {
  it('un vino de referencia no reporta campos invalidos', () => {
    expect(camposRequeridosInvalidos(vinoValido())).toEqual([])
  })

  it('el vino de referencia cumple cada validador por separado', () => {
    const vino = vinoValido()

    expect(esTextoNoVacio(vino.name)).toBe(true)
    expect(esCategoriaValida(vino.category)).toBe(true)
    expect(esPrecioValido(vino.price)).toBe(true)
    expect(esAnioRazonable(vino.vintage)).toBe(true)
    expect(esUrlHttpValida(vino.imageUrl)).toBe(true)
    expect(esCampoOpcionalValido(vino.tastingNotes)).toBe(true)
    expect(esCampoOpcionalValido(undefined)).toBe(true)
  })
})

describe('validadores: deteccion de mutaciones campo por campo', () => {
  const mutaciones: Array<{ campo: keyof Wine; valor: unknown }> = [
    { campo: 'id', valor: '' },
    { campo: 'id', valor: '   ' },
    { campo: 'id', valor: 7 },
    { campo: 'name', valor: '' },
    // Desde la spec 011 la categoria es texto libre, asi que `'Naranja'` y
    // `'Todos'` ya no son invalidas: son categorias bien formadas. Lo que sigue
    // siendo invalido es la **forma** —vacia, en minuscula, o demasiado larga—
    // y lo que la lista fija cubria sin querer era justamente evitar que
    // `'tinto'` y `'Tinto'` fueran dos categorias distintas en el filtro.
    { campo: 'category', valor: '' },
    { campo: 'category', valor: '   ' },
    { campo: 'category', valor: 'tinto' },
    { campo: 'category', valor: 'A'.repeat(41) },
    // `departamento` y `grupo` son los dos niveles de la taxonomia de la tienda
    // y los dos tienen que estar: un producto sin departamento no aparece en
    // ninguna pestaña de stock, y uno sin grupo no se puede colocar en "Con
    // alcohol" ni en "Sin alcohol".
    { campo: 'departamento', valor: '' },
    { campo: 'departamento', valor: '   ' },
    { campo: 'departamento', valor: 42 },
    { campo: 'price', valor: 0 },
    { campo: 'price', valor: -100 },
    { campo: 'description', valor: '' },
    { campo: 'imageUrl', valor: 'no-es-una-url' },
    { campo: 'imageUrl', valor: '/ruta/local.jpg' }
  ]

  /**
   * `winery`, `varietal` y `vintage` **no** aparecen en la lista de arriba.
   *
   * Antes eran requeridos y estas mutaciones los detectaban. Dejaron de serlo
   * cuando la tienda paso a vender cosas que no son vino: una gaseosa no tiene
   * bodega, ni cepa, ni anada, y exigirlas era lo que hacia imposible cargarla.
   * Ver el `describe` de abajo, que si los cubre.
   */

  mutaciones.forEach(({ campo, valor }) => {
    it(`detecta ${String(campo)} = ${JSON.stringify(valor)}`, () => {
      const vino = { ...vinoValido(), [campo]: valor }

      expect(camposRequeridosInvalidos(vino as Wine)).toEqual([String(campo)])
    })
  })

  it('reporta todos los campos rotos a la vez, sin duplicados', () => {
    const roto = {
      ...vinoValido(),
      name: '',
      price: 0,
      imageUrl: 'nope',
      category: 'rosa'
    }

    expect(camposRequeridosInvalidos(roto as Wine).sort()).toEqual(
      ['category', 'imageUrl', 'name', 'price'].sort()
    )
  })

  it('un producto sin bodega, ni cepa, ni anada NO se marca como roto', () => {
    // La regresion de este cambio: los tres campos volvieron opcionales porque
    // una gaseosa no los tiene. Con ellos en `CAMPOS_REQUERIDOS`, este producto
    // —que es perfectamente valido— se reportaria con tres campos invalidos y el
    // catalogo entero se veria como datos rotos.
    const gaseosa = {
      ...vinoValido(),
      category: 'Gaseosas',
      grupo: 'Sin alcohol',
      tipoVino: null,
      winery: null,
      varietal: null,
      vintage: null
    }

    expect(camposRequeridosInvalidos(gaseosa as Wine)).toEqual([])
  })

  it('pero un producto con la bodega en blanco SI se marca', () => {
    // `null` es "no tiene bodega". `''` es "la bodega se guardo vacia", que es un
    // error de carga distinto y no se debe colar.
    const conBodegaVacia = { ...vinoValido(), winery: '' }

    expect(esCampoOpcionalValido(conBodegaVacia.winery)).toBe(false)
  })
})

describe('validadores: cobertura de CAMPOS_REQUERIDOS', () => {
  it('incluye los 7 campos obligatorios de la interface Wine', () => {
    // **Son 7, antes 10.** `winery`, `varietal` y `vintage` dejaron de ser
    // requeridos cuando la tienda paso a vender cosas que no son vino, y se
    // movieron a `CAMPOS_OPCIONALES`. Quedan 10 − 3 = 7.
    //
    // El numero esta a proposito: es lo que hace que agregar un campo a `Wine`
    // **no** pase en verde. Sin el, el unico aviso seria que un fixture quedara
    // sin el campo nuevo —y eso recien lo ve `tsc` si el campo es requerido, que
    // no siempre pasa—. Con el, hay que decidir aca que el campo entra.
    expect(CAMPOS_REQUERIDOS).toHaveLength(7)
    expect([...CAMPOS_REQUERIDOS].sort()).toEqual(
      [
        'category',
        'departamento',
        'description',
        'id',
        'imageUrl',
        'name',
        'price'
      ].sort()
    )
  })

  it('los que se volvieron opcionales estan en CAMPOS_OPCIONALES', () => {
    // El otro lado del mismo cambio: si se sacaron de los requeridos y no
    // entraron en los opcionales, quedan **en ninguna de las dos listas** y el
    // test de integridad los trataria como propiedades fuera del contrato.
    expect(CAMPOS_OPCIONALES).toContain('winery')
    expect(CAMPOS_OPCIONALES).toContain('varietal')
    expect(CAMPOS_OPCIONALES).toContain('vintage')
  })

  it('no incluye los campos opcionales', () => {
    expect(CAMPOS_REQUERIDOS).not.toContain('tastingNotes')
    expect(CAMPOS_REQUERIDOS).not.toContain('foodPairing')
    expect(CAMPOS_REQUERIDOS).not.toContain('winery')
    expect(CAMPOS_REQUERIDOS).not.toContain('varietal')
    expect(CAMPOS_REQUERIDOS).not.toContain('vintage')
  })

  it('un objeto vacio reporta todos los campos requeridos como invalidos', () => {
    expect(camposRequeridosInvalidos({} as Wine).sort()).toEqual([...CAMPOS_REQUERIDOS].map(String).sort())
  })
})

describe('validadores: limites de los rangos', () => {
  it('el limite inferior de vintage es inclusivo', () => {
    expect(esAnioRazonable(1850)).toBe(true)
    expect(esAnioRazonable(1849)).toBe(false)
  })

  it('permite como maximo el anio actual mas la tolerancia de vendimia', () => {
    const anioActual = new Date().getFullYear()

    expect(esAnioRazonable(anioActual + 1)).toBe(true)
    expect(esAnioRazonable(anioActual + 2)).toBe(false)
  })

  it('acepta el anio actual exacto', () => {
    expect(esAnioRazonable(new Date().getFullYear())).toBe(true)
  })

  it('precio acepta el minimo valido y rechaza el cero', () => {
    expect(esPrecioValido(0.01)).toBe(true)
    expect(esPrecioValido(0)).toBe(false)
  })

  it('texto no vacio distingue espacios de contenido real', () => {
    expect(esTextoNoVacio('a')).toBe(true)
    expect(esTextoNoVacio(' a ')).toBe(true)
    expect(esTextoNoVacio('')).toBe(false)
    expect(esTextoNoVacio('   ')).toBe(false)
  })
})