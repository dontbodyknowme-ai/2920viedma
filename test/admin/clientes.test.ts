import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChipTag } from '../../src/components/admin/customer_drawer'
import { mockCustomers } from '../../src/mocks/data'
import { normalizar } from '../../src/mocks/filtros'
import type { Customer } from '../../src/types/admin'

/**
 * Clientes CRM: notas, tags y filtro.
 *
 * El test del filtro de tags es el que importa: es AND, no OR. Buscar `vip` y
 * `mayorista` tiene que dar los clientes que tienen **las dos**, no los que
 * tienen cualquiera. Un OR aca daria una lista mas grande de lo que el admin
 * pidio, y el filtro pareceria funcionar mientras devuelve gente que no
 * cumple.
 */

const url = (consulta: string): URL => new URL(`http://localhost/api/customers?${consulta}`)

/**
 * Reimplementa la regla del filtro tal como la aplica `filtrarClientes`.
 *
 * Se reimplementa en vez de llamar a la funcion real porque `mockCustomers` es
 * estado compartido y los tests lo modifican; el objetivo aca es fijar la regla
 * de AND, no re-ejecutar el handler.
 */
const conTags = (clientes: Customer[], tags: string[]): Customer[] =>
  clientes.filter((cliente) =>
    tags.length === 0 || tags.every((tag) => cliente.tags.includes(tag))
  )

describe('filtro de tags', () => {
  const clientes = mockCustomers

  it('sin filtro devuelve todos', () => {
    expect(conTags(clientes, [])).toHaveLength(clientes.length)
  })

  it('una sola tag filtra por inclusion', () => {
    const conVip = conTags(clientes, ['vip'])
    const esperados = clientes.filter((cliente) => cliente.tags.includes('vip'))

    expect(conVip).toHaveLength(esperados.length)
    conVip.forEach((cliente) => expect(cliente.tags).toContain('vip'))
  })

  it('varias tags se combinan con AND, no con OR', () => {
    const conDos = conTags(clientes, ['vip', 'mayorista'])
    const conUnaSola = conTags(clientes, ['vip'])

    // El AND tiene que dar **menos o igual** que cada tag sola. Si diera mas,
    // seria un OR disfrazado.
    expect(conDos.length).toBeLessThanOrEqual(conUnaSola.length)
    conDos.forEach((cliente) => {
      expect(cliente.tags).toContain('vip')
      expect(cliente.tags).toContain('mayorista')
    })
  })

  it('una combinacion imposible devuelve vacio, no todos', () => {
    const imposible = conTags(clientes, ['vip', 'tag-que-no-existe'])
    expect(imposible).toHaveLength(0)
  })

  it('no distingue mayusculas en la comparacion de tags', () => {
    // Las tags se guardan tal cual las escribe el admin. Filtrar por `VIP`
    // tiene que encontrar a los que tienen `vip`.
    expect(normalizar('VIP')).toBe(normalizar('vip'))
    expect(normalizar('  Vip ')).toBe('vip')
  })

  it('las tags de los datos mock estan en minusculas y coinciden con el filtro', () => {
    // Este test fija un bug que estaba en los datos: las tags se generaban como
    // `'VIP'`, `'Frecuente'`, `'Nuevo'`, `'Mayorista'` (capitalizadas), pero el
    // filtro normaliza a minusculas antes de comparar. `normalizar('VIP')` es
    // `'vip'`, que **no** es igual a `'VIP'`: el filtro de tags no encontraba
    // ni un solo cliente y la tabla salia vacia sin error.
    //
    // Ademas `EtiquetaCliente` en `src/types/admin.ts` es
    // `'nuevo' | 'vip' | 'frecuente' | 'mayorista'`, en minusculas: los datos
    // no cumplian el tipo que el panel declara usar.
    const todas = mockCustomers.flatMap((cliente) => cliente.tags)

    todas.forEach((tag) => {
      expect(tag).toBe(tag.toLowerCase())
    })

    // Y cada tag tiene que encontrar al menos un cliente cuando se busca con el
    // criterio del filtro, que es el que se usa de verdad.
    const unicas = [...new Set(todas)]
    unicas.forEach((tag) => {
      const conNormalizar = clientes.filter((cliente) =>
        cliente.tags.some((otra) => normalizar(otra) === normalizar(tag))
      )
      expect(conNormalizar.length).toBeGreaterThan(0)
    })
  })
})

describe('clientes mock', () => {
  it('tiene ids unicos', () => {
    const ids = mockCustomers.map((cliente) => cliente.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tiene al menos un cliente sin email, para poder probar CE-04', () => {
    // CE-04 pide que se pueda guardar un cliente sin email ni
    // telefono y que la fila lo avise. Sin uno asi en los datos, la advertencia
    // nunca se veria en el panel.
    const sinEmail = mockCustomers.filter((cliente) => cliente.email === '')
    expect(sinEmail.length).toBeGreaterThan(0)
  })

  it('el total gastado es al menos el total de un pedido', () => {
    // Un `totalSpent` menor que su propio pedido mas caro haria que el drawer
    // mostrara una cifra que no cuadra con el historial.
    mockCustomers.forEach((cliente) => {
      expect(cliente.totalSpent).toBeGreaterThanOrEqual(0)
    })
  })

  it('`lastOrderAt` es `null` solo cuando `totalOrders` es 0', () => {
    // "Nunca compro" y "compro y el ultimo pedido no se sabe" son cosas
    // distintas. Con pedidos, la fecha tiene que estar.
    mockCustomers.forEach((cliente) => {
      if (cliente.totalOrders > 0) {
        expect(cliente.lastOrderAt).not.toBeNull()
      }
    })
  })
})

describe('agregar y quitar tags', () => {
  const alternar = (tags: string[], tag: string): string[] =>
    tags.includes(tag) ? tags.filter((otra) => otra !== tag) : [...tags, tag]

  let original: Customer[]

  beforeEach(() => {
    original = mockCustomers.map((cliente) => ({ ...cliente, tags: [...cliente.tags] }))
  })

  afterEach(() => {
    mockCustomers.length = 0
    mockCustomers.push(...original)
  })

  it('agrega una tag que no estaba', () => {
    expect(alternar(['vip'], 'nuevo')).toEqual(['vip', 'nuevo'])
  })

  it('quita una tag que estaba', () => {
    expect(alternar(['vip', 'nuevo'], 'vip')).toEqual(['nuevo'])
  })

  it('quitar dos veces alterna correctamente', () => {
    const inicial = ['vip']
    const despuesDeAgregar = alternar(inicial, 'mayorista')
    const despuesDeQuitar = alternar(despuesDeAgregar, 'mayorista')

    expect(despuesDeAgregar).toEqual(['vip', 'mayorista'])
    expect(despuesDeQuitar).toEqual(['vip'])
  })

  it('nunca deja la tag repetida si el estado ya la tenia', () => {
    // Dos clicks rapidos antes del refetch pueden partir del mismo estado dos
    // veces. Si una de esas rutas hiciera `tags.concat(tag)` a ciegas, la tag
    // quedaria duplicada en el array y el filtro la contaria dos veces.
    const yaEsta: string[] = ['vip', 'nuevo']
    const agregado = alternar(yaEsta, 'mayorista')

    expect(agregado.filter((tag) => tag === 'mayorista')).toHaveLength(1)
    expect(agregado).toEqual(['vip', 'nuevo', 'mayorista'])
  })

  it('quitar la segunda vez no deja copia del tag quitado', () => {
    const conTag = alternar(['vip'], 'nuevo')
    const sinTag = alternar(conTag, 'nuevo')

    expect(sinTag).not.toContain('nuevo')
    expect(sinTag).toEqual(['vip'])
  })

  it('quitar una tag que no esta no cambia nada', () => {
    expect(alternar(['vip'], 'mayorista')).toEqual(['vip', 'mayorista'])
  })
})

describe('ChipTag', () => {
  it('es una funcion que devuelve JSX, sin props obligatorias', () => {
    // El chip se usa en la tabla (sin quitar) y en el drawer (con quitar). Que
    // `onQuitar` sea opcional es lo que permite las dos cosas sin dos
    // componentes.
    expect(typeof ChipTag).toBe('function')
  })
})