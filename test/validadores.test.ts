import { describe, it, expect } from 'vitest'
import type { Wine } from '../src/types/vino'
import {
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
  category: 'Tinto',
  departamento: 'Bebidas',
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
    { campo: 'winery', valor: '   ' },
    { campo: 'varietal', valor: undefined },
    // Desde la spec 011 la categoria es texto libre, asi que `'Naranja'` y
    // `'Todos'` ya no son invalidas: son categorias bien formadas. Lo que sigue
    // siendo invalido es la **forma** —vacia, en minuscula, o demasiado larga—
    // y lo que la lista fija cubria sin querer era justamente evitar que
    // `'tinto'` y `'Tinto'` fueran dos categorias distintas en el filtro.
    { campo: 'category', valor: '' },
    { campo: 'category', valor: '   ' },
    { campo: 'category', valor: 'tinto' },
    { campo: 'category', valor: 'A'.repeat(41) },
    { campo: 'vintage', valor: 1700 },
    { campo: 'vintage', valor: '2020' },
    { campo: 'price', valor: 0 },
    { campo: 'price', valor: -100 },
    { campo: 'description', valor: '' },
    { campo: 'imageUrl', valor: 'no-es-una-url' },
    { campo: 'imageUrl', valor: '/ruta/local.jpg' }
  ]

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
})

describe('validadores: cobertura de CAMPOS_REQUERIDOS', () => {
  it('incluye los 10 campos obligatorios de la interface Wine', () => {
    // Son 10 desde que `departamento` se sumo al contrato (antes 9). El numero
    // esta a proposito: es lo que hace que agregar un campo a `Wine` **no** pase
    // en verde. Sin el, el unico aviso seria que un fixture quedara sin el campo
    // nuevo —y eso recien lo ve `tsc` si el campo es requerido, que no siempre
    // pasa—. Con el, hay que decidir aca que el campo entra.
    expect(CAMPOS_REQUERIDOS).toHaveLength(10)
    expect([...CAMPOS_REQUERIDOS].sort()).toEqual(
      [
        'category',
        'departamento',
        'description',
        'id',
        'imageUrl',
        'name',
        'price',
        'varietal',
        'vintage',
        'winery'
      ].sort()
    )
  })

  it('no incluye los campos opcionales', () => {
    expect(CAMPOS_REQUERIDOS).not.toContain('tastingNotes')
    expect(CAMPOS_REQUERIDOS).not.toContain('foodPairing')
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