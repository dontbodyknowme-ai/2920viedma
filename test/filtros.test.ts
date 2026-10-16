import { describe, it, expect } from 'vitest'
import type { Wine } from '../src/types/vino'
import { filtrarVinos } from '../src/utils/filtros'

/**
 * Tests del filtrado del catalogo.
 *
 * El foco es `matchesSearch`, porque el placeholder de los dos buscadores
 * ("Buscar por nombre, marca o categoria...") promete cuatro cosas: nombre,
 * marca (bodega) y categoria. Si una de las tres no se busca, el texto miente:
 * el usuario escribe, no aparece nada, y no hay forma de saber si fallo la
 * busqueda o si el producto no existe.
 *
 * `matchesCategory` es la que decide el filtro "Tipo de Producto".
 */

const vino = (over: Partial<Wine> = {}): Wine => ({
  id: 'v1',
  name: 'Malbec Reserva',
  winery: 'Bodega Norton',
  varietal: 'Malbec',
  category: 'Tinto',
  vintage: 2020,
  price: 45000,
  description: 'Crianza en barrica',
  imageUrl: 'https://example.com/malbec.jpg',
  ...over
})

/** Filtros vacios: es lo que hay cuando el usuario todavia no toco nada. */
const sinFiltros = {
  categoria: 'Todos' as const,
  minPrice: '' as const,
  maxPrice: '' as const,
  selectedVarietals: [] as string[],
  searchQuery: ''
}

describe('filtrarVinos: la busqueda tiene que cubrir lo que promete el placeholder', () => {
  it('encuentra por nombre', () => {
    const r = filtrarVinos([vino()], { ...sinFiltros, searchQuery: 'malbec' })
    expect(r).toHaveLength(1)
  })

  it('encuentra por marca (bodega)', () => {
    const r = filtrarVinos([vino()], { ...sinFiltros, searchQuery: 'norton' })
    expect(r).toHaveLength(1)
  })

  it('encuentra por cepa (varietal)', () => {
    const r = filtrarVinos([vino()], { ...sinFiltros, searchQuery: 'Malbec' })
    expect(r).toHaveLength(1)
  })

  it('encuentra por CATEGORIA — este es el que faltaba', () => {
    // Sin esta linea, escribir "Tinto" no encontraba nada aunque el placeholder
    // prometa "categoria". El vino de `vino()` es de categoria "Tinto".
    const r = filtrarVinos([vino()], { ...sinFiltros, searchQuery: 'tinto' })
    expect(r).toHaveLength(1)
  })

  it('buscar por CATEGORIA no confunde una con otra', () => {
    // Regresion de la linea de arriba: "Espumante" no puede devolver un Tinto.
    const r = filtrarVinos([vino()], { ...sinFiltros, searchQuery: 'espumante' })
    expect(r).toHaveLength(0)
  })

  it('no matchea cuando la consulta no esta en ningun campo', () => {
    const r = filtrarVinos([vino()], { ...sinFiltros, searchQuery: 'zzzz' })
    expect(r).toHaveLength(0)
  })

  it('es insensible a mayusculas', () => {
    const r = filtrarVinos([vino({ name: 'MALBEC' })], {
      ...sinFiltros,
      searchQuery: 'malbec'
    })
    expect(r).toHaveLength(1)
  })

  it('ignora espacios al principio y al final', () => {
    const r = filtrarVinos([vino()], { ...sinFiltros, searchQuery: '   malbec  ' })
    expect(r).toHaveLength(1)
  })

  it('una consulta vacia devuelve todo', () => {
    // Regresion: si `consulta` vacia no matcheara, el catalogo arranque vacio.
    const r = filtrarVinos([vino(), vino({ id: 'v2' })], sinFiltros)
    expect(r).toHaveLength(2)
  })
})

describe('filtrarVinos: filtro por categoria (el boton "Tipo de Producto")', () => {
  const catalogo = [
    vino({ id: 'a', category: 'Tinto' }),
    vino({ id: 'b', category: 'Blanco' }),
    vino({ id: 'c', category: 'Espumante' })
  ]

  it('"Todos" devuelve el catalogo completo', () => {
    expect(filtrarVinos(catalogo, sinFiltros)).toHaveLength(3)
  })

  it('una categoria devuelve solo la suya', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, categoria: 'Blanco' })
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe('b')
  })
})

describe('filtrarVinos: rango de precio', () => {
  const catalogo = [
    vino({ id: 'barato', price: 10000 }),
    vino({ id: 'medio', price: 30000 }),
    vino({ id: 'caro', price: 90000 })
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
    const r = filtrarVinos(catalogo, {
      ...sinFiltros,
      minPrice: 20000,
      maxPrice: 50000
    })
    expect(r.map((w) => w.id)).toEqual(['medio'])
  })
})

describe('filtrarVinos: los filtros se combinan con AND', () => {
  const catalogo = [
    vino({ id: 'tinto-barato', category: 'Tinto', price: 10000 }),
    vino({ id: 'tinto-caro', category: 'Tinto', price: 90000 }),
    vino({ id: 'blanco-medio', category: 'Blanco', price: 30000 })
  ]

  it('categoria + precio deja solo lo que cumple las dos', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, categoria: 'Tinto', maxPrice: 20000 })
    expect(r.map((w) => w.id)).toEqual(['tinto-barato'])
  })

  it('un filtro de precio imposible devuelve vacio, no todo', () => {
    const r = filtrarVinos(catalogo, { ...sinFiltros, minPrice: 50000, maxPrice: 60000 })
    expect(r).toHaveLength(0)
  })
})
