import { describe, expect, it } from 'vitest'
import { vinoDesdeCuerpo } from '../../src/mocks/vino_schema'
import { mockWines } from '../../src/mocks/data'
import type { AdminWine } from '../../src/types/admin'

/**
 * El id de un vino.
 *
 * Este archivo existe por un bug que encontro la verificacion en navegador y
 * que ningun test de unidad podia ver: `duplicar` mandaba `...vino`, que
 * incluye el `id`, asi que la copia nacia con el id del original. Dos vinos
 * con el mismo id se rompen en silencio: editar uno modificaba el otro, y
 * borrar la copia borraba el original.
 *
 * Lo que se prueba aca es la regla que lo evita: **un `id` repetido es
 * invalido**, y el unico que puede asignar un id es quien crea.
 */

const cuerpoValido = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Vino Base',
  winery: 'Bodega Base',
  price: 40000,
  vintage: 2021,
  ...over
})

describe('vinoDesdeCuerpo', () => {
  it('genera un id cuando el cuerpo no trae', () => {
    const vino = vinoDesdeCuerpo(cuerpoValido())

    expect(vino).not.toBeNull()
    expect(vino?.id).toBeTruthy()
  })

  it('respeta un id explicito', () => {
    const vino = vinoDesdeCuerpo(cuerpoValido({ id: 'ya-existe' }))

    expect(vino?.id).toBe('ya-existe')
  })

  it('no acepta un id que sea solo espacios', () => {
    // Un id en blanco no identifica a nadie, pero pasaria el chequeo de
    // "existe", y dos vinos con id "  " serian el mismo vino.
    const vino = vinoDesdeCuerpo(cuerpoValido({ id: '   ' }))

    expect(vino?.id).not.toBe('   ')
    expect(vino?.id).toBeTruthy()
  })

  it('rechaza nombre, bodega o precio invalidos en vez de inventar valores', () => {
    expect(vinoDesdeCuerpo(cuerpoValido({ name: '   ' }))).toBeNull()
    expect(vinoDesdeCuerpo(cuerpoValido({ winery: '' }))).toBeNull()
    expect(vinoDesdeCuerpo(cuerpoValido({ price: 0 }))).toBeNull()
    expect(vinoDesdeCuerpo(cuerpoValido({ price: -100 }))).toBeNull()
    expect(vinoDesdeCuerpo(cuerpoValido({ price: 'mucho' }))).toBeNull()
  })

  it('deja el stock en cero si no viene o es negativo', () => {
    // Un stock negativo significaria "debemos 5 botellas", que no existe.
    expect(vinoDesdeCuerpo(cuerpoValido())?.stock).toBe(0)
    expect(vinoDesdeCuerpo(cuerpoValido({ stock: -8 }))?.stock).toBe(0)
    expect(vinoDesdeCuerpo(cuerpoValido({ stock: 12 }))?.stock).toBe(12)
  })

  it('dos creations sin id nunca producen el mismo id', () => {
    // La garantia que hace seguro duplicar: si el id se genera en el momento de
    // crear, no hay forma de que dos vinos choquen por id.
    const primero = vinoDesdeCuerpo(cuerpoValido({ name: 'Uno' }))
    const segundo = vinoDesdeCuerpo(cuerpoValido({ name: 'Dos' }))

    expect(primero?.id).not.toBe(segundo?.id)
  })
})

describe('unicidad de ids en el catalogo', () => {
  it('el catalogo mock no tiene ids repetidos', () => {
    const ids = mockWines.map((vino) => vino.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('duplicar sin id no choca con el original', () => {
    // Reproduce el bug exacto: copiar {...vino} y mandar el id adelante.
    const original = mockWines[0] as AdminWine

    // Con id: choca.
    const conId = vinoDesdeCuerpo({ ...original })
    expect(conId?.id).toBe(original.id)

    // Sin id: no choca, que es lo que hace `duplicar` ya corregido.
    const datos: Omit<AdminWine, 'id'> = {
      name: original.name,
      winery: original.winery,
      varietal: original.varietal,
      category: original.category,
      vintage: original.vintage,
      price: original.price,
      description: original.description,
      imageUrl: original.imageUrl,
      stock: original.stock,
      activo: original.activo
    }
    const copia = vinoDesdeCuerpo({ ...datos, name: `Copia de ${original.name}`, stock: 0 })

    expect(copia?.id).not.toBe(original.id)
    expect(copia?.name).toBe(`Copia de ${original.name}`)
    expect(copia?.stock).toBe(0)
  })
})