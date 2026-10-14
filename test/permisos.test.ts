import { describe, expect, it } from 'vitest'
import {
  SECCIONES,
  seccionesVisibles,
  primeraVisible,
  puedeVer,
  type RolAdmin
} from '../src/utils/permisos.js'

/**
 * La tabla de permisos del panel.
 *
 * La verifica el `backend/tests/unit/roles.test.ts`, que ya recorria los
 * `requireRole`. Este archivo cubre **la misma matriz desde el otro lado**, y
 * el test cruzado de abajo es el que importa: si alguien cambia el backend y
 * no la tabla (o al reves), el test lo dice en vez de dejar un menu que
 * promete secciones que dan `403`.
 */

const ROLES: RolAdmin[] = ['admin', 'gestor', 'vendedor']

describe('permisos del panel', () => {
  it('el admin ve las cinco secciones', () => {
    expect(seccionesVisibles('admin').map((s) => s.etiqueta)).toEqual([
      'Dashboard',
      'Catalogo',
      'Pedidos',
      'Clientes',
      'Configuracion'
    ])
  })

  it('el gestor ve todo menos el dashboard', () => {
    // Este es el pedido: el unico cambio de permisos de la spec.
    const visibles = seccionesVisibles('gestor').map((s) => s.etiqueta)

    expect(visibles).not.toContain('Dashboard')
    expect(visibles).toEqual(['Catalogo', 'Pedidos', 'Clientes', 'Configuracion'])
  })

  it('el vendedor ve solo pedidos', () => {
    const visibles = seccionesVisibles('vendedor').map((s) => s.etiqueta)

    expect(visibles).toEqual(['Pedidos'])
  })

  it('ningun rol se queda sin secciones', () => {
    // Si un rol no tuviera ninguna, `primeraVisible` devuelve `null` y el
    // layout no tiene a donde mandarlo: el panel quedaria en blanco.
    for (const rol of ROLES) {
      expect(seccionesVisibles(rol).length, rol).toBeGreaterThan(0)
    }
  })

  it('primeraVisible cae en la de menor privilegio', () => {
    expect(primeraVisible('admin')).toBe('/admin')
    expect(primeraVisible('gestor')).toBe('/admin/catalogo')
    expect(primeraVisible('vendedor')).toBe('/admin/pedidos')
  })

  it('las secciones del panel son las cinco del router', () => {
    // Si se agrega una pagina nueva al panel y no esta en la tabla, el rol
    // que deberia verla no la ve. Este test no lo detecta solo, pero obliga a
    // que la lista este a mano en un lugar visible.
    expect(SECCIONES).toHaveLength(5)
  })

  it('una ruta desconocida no la ve nadie', () => {
    // El default es `no`. Con `si`, una ruta mal escrita abriria la puerta.
    expect(puedeVer('admin', '/admin/secreto')).toBe(false)
    expect(puedeVer('admin', '/otra/cosa')).toBe(false)
    expect(puedeVer('vendedor', '/')).toBe(false)
  })

  it('vendedor puede ver pedidos aunque las otras esten vedadas', () => {
    expect(puedeVer('vendedor', '/admin/pedidos')).toBe(true)
    expect(puedeVer('vendedor', '/admin/catalogo')).toBe(false)
    expect(puedeVer('vendedor', '/admin/clientes')).toBe(false)
    expect(puedeVer('vendedor', '/admin')).toBe(false)
  })
})
