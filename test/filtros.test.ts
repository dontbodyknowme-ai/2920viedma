import { describe, it, expect } from 'vitest'
import { filtrarVinos, type Filtros } from '../src/utils/filtros'
import type { Producto } from '../src/types/producto'

/**
 * El filtro del catalogo publico, con la taxonomia de tres niveles.
 *
 * ## Que se verifica y por que importa
 *
 * Que los tres niveles **achiquen** y no se reemplacen. Es el error que hace la
 * diferencia entre un filtro y una pestana: si el ultimo elegido gana, elegir
 * "Bebidas" y despues "Cerveza" devuelve las cervezas de toda la tienda, y el
 * usuario cree que esta viendo las bebidas.
 *
 * Y el caso del grupo `null` —"Energizantes", que cuelga directo de Bebidas—
 * que es el unico que un `wine.grupo === filtros.grupo` a secas no puede
 * distinguir de "no filtrar por grupo".
 */

const producto = (over: Partial<Producto> = {}): Producto => ({
  id: 'v1',
  name: 'Gran Reserva Malbec',
  winery: 'Bodega Catena Zapata',
  varietal: 'Malbec',
  category: 'Vinos',
  departamento: 'Bebidas',
  grupo: 'Con alcohol',
  tipoVino: 'Tinto',
  vintage: 2020,
  price: 45000,
  description: 'Crianza en barrica',
  imageUrl: 'https://example.com/malbec.jpg',
  ...over
})

/** Filtros vacios: es lo que hay cuando el usuario todavia no toco nada. */
const sinFiltros: Filtros = {
  departamento: '',
  grupo: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  searchQuery: ''
}

describe('filtrarVinos: la busqueda tiene que cubrir lo que promete el placeholder', () => {
  it('encuentra por nombre', () => {
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'malbec' })).toHaveLength(1)
  })

  it('encuentra por marca (bodega)', () => {
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'catena' })).toHaveLength(1)
  })

  it('encuentra por cepa (varietal)', () => {
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'Malbec' })).toHaveLength(1)
  })

  it('encuentra por categoria', () => {
    // Sin esta linea, escribir "Gaseosas" no encontraba nada aunque el
    // placeholder prometa "categoria".
    const gaseosa = producto({ id: 'g', name: 'Cola 2L', category: 'Gaseosas', grupo: 'Sin alcohol' })
    expect(filtrarVinos([gaseosa], { ...sinFiltros, searchQuery: 'gaseosas' })).toHaveLength(1)
  })

  it('encuentra por DEPARTAMENTO y por GRUPO', () => {
    // Son las palabras que el usuario escribe ("busco algo de regalería") y no
    // estan en el nombre del producto: sin esto, no encuentra nada.
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'bebidas' })).toHaveLength(1)
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'con alcohol' })).toHaveLength(1)
  })

  it('encuentra por el color del producto', () => {
    // "Tinto" es un `tipoVino`, no una categoria: es donde lo busca el usuario
    // que quiere un tinto y no le importa si el producto es de Bodega o no.
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'tinto' })).toHaveLength(1)
  })

  it('buscar por una categoria no confunde una con otra', () => {
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'cerveza' })).toHaveLength(0)
  })

  it('no matchea cuando la consulta no esta en ningun campo', () => {
    expect(filtrarVinos([producto()], { ...sinFiltros, searchQuery: 'zzzz' })).toHaveLength(0)
  })

  it('es insensible a mayusculas', () => {
    expect(
      filtrarVinos([producto({ name: 'MALBEC' })], { ...sinFiltros, searchQuery: 'malbec' })
    ).toHaveLength(1)
  })

  it('ignora espacios al principio y al final', () => {
    expect(
      filtrarVinos([producto()], { ...sinFiltros, searchQuery: '   malbec  ' })
    ).toHaveLength(1)
  })

  it('una consulta vacia devuelve todo', () => {
    // Regresion: si `consulta` vacia no matcheara, el catalogo arranca vacio.
    expect(filtrarVinos([producto(), producto({ id: 'v2' })], sinFiltros)).toHaveLength(2)
  })

  it('un producto sin bodega ni anada no rompe la busqueda', () => {
    // Una gaseosa viene con `winery: null` y `vintage: null`. Con
    // `wine.winery.toLowerCase()` a secas eso es un `TypeError` y el catalogo
    // entero no renderiza.
    const gaseosa = producto({
      id: 'g',
      name: 'Gaseosa de Cola 2L',
      category: 'Gaseosas',
      grupo: 'Sin alcohol',
      winery: null,
      varietal: null,
      vintage: null
    })
    expect(() => filtrarVinos([gaseosa], { ...sinFiltros, searchQuery: 'cola' })).not.toThrow()
    expect(filtrarVinos([gaseosa], { ...sinFiltros, searchQuery: 'cola' })).toHaveLength(1)
  })
})

describe('filtrarVinos: los tres niveles de la taxonomia', () => {
  /** Un producto por rama, que es lo que hace falta para que el filtro distinga. */
  const catalogo = [
    producto({ id: 'producto-tinto', category: 'Vinos', grupo: 'Con alcohol', tipoVino: 'Tinto' }),
    producto({ id: 'producto-blanco', category: 'Vinos', grupo: 'Con alcohol', tipoVino: 'Blanco' }),
    producto({ id: 'cerveza', category: 'Cerveza', grupo: 'Con alcohol', tipoVino: null, varietal: null, vintage: null }),
    producto({ id: 'gaseosa', category: 'Gaseosas', grupo: 'Sin alcohol', tipoVino: null }),
    producto({ id: 'energizante', category: 'Energizantes', grupo: null, tipoVino: null }),
    producto({ id: 'copas', name: 'Set de Copas', category: 'Vajilla', departamento: 'Regalería', grupo: null, tipoVino: null }),
    producto({ id: 'chocolate', name: 'Chocolate Amargo', category: 'Chocolates', departamento: 'Snacks y chocolates', grupo: null, tipoVino: null }),
    producto({ id: 'papas', name: 'Papas Chips', category: 'Snacks salados', departamento: 'Snacks y chocolates', grupo: null, tipoVino: null })
  ]

  it('un departamento sin estructura agrupa lo suyo igual', () => {
    // "Snacks y chocolates" no tiene grupos, asi que `grupo` es `null` en sus
    // productos. El filtro tiene que devolver **los dos**, y no confundirlos
    // con "sin filtro": la prueba es que las otras ramas quedan afuera.
    const r = filtrarVinos(catalogo, {
      ...sinFiltros,
      departamento: 'Snacks y chocolates'
    })
    expect(r.map((p) => p.id)).toEqual(['chocolate', 'papas'])
  })

  it('sin filtros devuelve el catalogo completo', () => {
    expect(filtrarVinos(catalogo, sinFiltros)).toHaveLength(8)
  })

  it('el departamento acota a lo suyo', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, departamento: 'Bebidas' })
    expect(r.map((w) => w.id)).toEqual([
      'producto-tinto',
      'producto-blanco',
      'cerveza',
      'gaseosa',
      'energizante'
    ])
  })

  it('el grupo acota DENTRO del departamento', () => {
    // Este es el test que distingue "achicar" de "reemplazar": si el grupo
    // borrara el departamento, "Con alcohol" traeria tambien las copas.
    const r = filtrarVinos(catalogo, {
      ...sinFiltros,
      departamento: 'Bebidas',
      grupo: 'Con alcohol'
    })
    expect(r.map((w) => w.id)).toEqual(['producto-tinto', 'producto-blanco', 'cerveza'])
  })

  it('la categoria acota dentro del grupo, y los tres se suman', () => {
    const r = filtrarVinos(catalogo, {
      ...sinFiltros,
      departamento: 'Bebidas',
      grupo: 'Con alcohol',
      category: 'Vinos'
    })
    expect(r.map((w) => w.id)).toEqual(['producto-tinto', 'producto-blanco'])
  })

  it('un grupo que no existe da vacio, no todo', () => {
    const r = filtrarVinos(catalogo, {
      ...sinFiltros,
      departamento: 'Bebidas',
      grupo: 'ConWithoutAlcohol'
    })
    expect(r).toHaveLength(0)
  })

  it('un producto SIN grupo no aparece al filtrar por un grupo', () => {
    // El energizante cuelga directo de Bebidas. Si el filtro de grupo no
    // distinguishiera "sin grupo" de "todos", apareceria bajo "Con alcohol".
    const r = filtrarVinos(catalogo, {
      ...sinFiltros,
      departamento: 'Bebidas',
      grupo: 'Con alcohol'
    })
    expect(r.map((w) => w.id)).not.toContain('energizante')
  })

  it('pero SI aparece cuando no se filtra por grupo', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, departamento: 'Bebidas', grupo: '' })
    expect(r.map((w) => w.id)).toContain('energizante')
  })

  it('el grupo no se aplica si no hay departamento elegido', () => {
    // Filtrar por grupo sin departamento es una combinacion que la pantalla
    // nunca produce: la fila de grupos no se renderiza sin departamento. Si
    // llegara, el filtro tiene que ignorarlo en vez de devolver una tabla
    // rarísima. Por eso el resultado es el catalogo **completo**, 8.
    const r = filtrarVinos(catalogo, { ...sinFiltros, grupo: 'Con alcohol' })
    expect(r).toHaveLength(catalogo.length)
  })

  it('un departamento que no existe da vacio', () => {
    expect(filtrarVinos(catalogo, { ...sinFiltros, departamento: 'Ferretería' })).toHaveLength(0)
  })
})

describe('filtrarVinos: rango de precio', () => {
  const catalogo = [
    producto({ id: 'barato', price: 10000 }),
    producto({ id: 'medio', price: 30000 }),
    producto({ id: 'caro', price: 90000 })
  ]

  it('solo min acota el piso', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, minPrice: 25000 })
    expect(r.map((w) => w.id)).toEqual(['medio', 'caro'])
  })

  it('solo max acota el techo', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, maxPrice: 35000 })
    expect(r.map((w) => w.id)).toEqual(['barato', 'medio'])
  })

  it('min y max juntos acotan los dos extremos', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, minPrice: 20000, maxPrice: 50000 })
    expect(r.map((w) => w.id)).toEqual(['medio'])
  })
})

describe('filtrarVinos: los filtros se combinan con AND', () => {
  const catalogo = [
    producto({ id: 'tinto-barato', category: 'Vinos', tipoVino: 'Tinto', price: 10000 }),
    producto({ id: 'tinto-caro', category: 'Vinos', tipoVino: 'Tinto', price: 90000 }),
    producto({ id: 'blanco-medio', category: 'Vinos', tipoVino: 'Blanco', price: 30000 })
  ]

  it('categoria + precio deja solo lo que cumple las dos', () => {
    const r = filtrarVinos(catalogo, {
      ...sinFiltros,
      departamento: 'Bebidas',
      category: 'Vinos',
      maxPrice: 20000
    })
    expect(r.map((w) => w.id)).toEqual(['tinto-barato'])
  })

  it('un filtro de precio imposible devuelve vacio, no todo', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, minPrice: 50000, maxPrice: 60000 })
    expect(r).toHaveLength(0)
  })
})
