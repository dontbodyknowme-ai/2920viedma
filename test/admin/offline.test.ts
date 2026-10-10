import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  estaOffline,
  exigirConexion,
  guardarRespaldo,
  leerRespaldo,
  limpiarRespaldos,
  marcarOffline,
  marcarOnline,
  reiniciarAviso,
  RESPALDOS,
  suscribirOffline
} from '../../src/utils/offline'

/**
 * Modo offline (CE-05 / CA-37).
 *
 * El caso que mas importa es el ultimo del primer bloque: **el respaldo esta
 * indexado por URL**. Con una sola clave por recurso, el fallback miente: si el
 * admin filtra por "Tinto" y se queda sin red, se le muestra la ultima
 * respuesta guardada, que puede ser la pagina 3 sin filtro, y la tabla muestra
 * "Tinto" con datos que no son de Tinto. Sin error, sin aviso.
 */

interface Paginado {
  data: Array<{ id: string }>
  total: number
}

const pagina = (ids: string[], total = ids.length): Paginado => ({
  data: ids.map((id) => ({ id })),
  total
})

const URL_PAGINA_1 = '/api/wines?page=1&limit=10'
const URL_PAGINA_3 = '/api/wines?page=3&limit=10'
const URL_FILTRADA = '/api/wines?page=1&limit=10&category=Tinto'

describe('respaldo offline', () => {
  beforeEach(() => {
    localStorage.clear()
    limpiarRespaldos()
    marcarOnline()
    reiniciarAviso()
  })

  afterEach(() => {
    localStorage.clear()
    limpiarRespaldos()
    marcarOnline()
    reiniciarAviso()
  })

  it('guarda y lee lo ultimo recibido del servidor', () => {
    guardarRespaldo('vinos', URL_PAGINA_1, pagina(['a', 'b']))

    expect(leerRespaldo<Paginado>('vinos', URL_PAGINA_1)).toEqual(pagina(['a', 'b']))
  })

  it('devuelve undefined si nunca se guardo esa URL', () => {
    expect(leerRespaldo('vinos', URL_PAGINA_1)).toBeUndefined()
  })

  it('devuelve undefined si lo guardado esta corrupto, en vez de romper', () => {
    localStorage.setItem('admin_respaldo_vinos', '{no es json')
    expect(leerRespaldo('vinos', URL_PAGINA_1)).toBeUndefined()
  })

  it('devuelve undefined si lo guardado no es un mapa', () => {
    // Un respaldo escrito por otra version del panel no debe romper el render.
    localStorage.setItem('admin_respaldo_vinos', '"un string"')
    expect(leerRespaldo('vinos', URL_PAGINA_1)).toBeUndefined()
  })

  it('NO mezcla respuestas de URLs distintas', () => {
    // Este es el bug que evita el indexado por URL.
    guardarRespaldo('vinos', URL_PAGINA_1, pagina(['vino-1', 'vino-2']))
    guardarRespaldo('vinos', URL_PAGINA_3, pagina(['vino-21']))
    guardarRespaldo('vinos', URL_FILTRADA, pagina(['malbec-1']))

    expect(leerRespaldo<Paginado>('vinos', URL_PAGINA_1)?.data.map((v) => v.id)).toEqual([
      'vino-1',
      'vino-2'
    ])
    expect(leerRespaldo<Paginado>('vinos', URL_PAGINA_3)?.data.map((v) => v.id)).toEqual([
      'vino-21'
    ])
    expect(leerRespaldo<Paginado>('vinos', URL_FILTRADA)?.data.map((v) => v.id)).toEqual([
      'malbec-1'
    ])
  })

  it('la URL filtrada no devuelve la de la pagina 1 sin filtro', () => {
    guardarRespaldo('vinos', URL_PAGINA_1, pagina(['vino-1']))
    guardarRespaldo('vinos', URL_FILTRADA, pagina(['malbec-1']))

    // Si se confundieran, el filtro "Tinto" mostraria el vino que no es Tinto.
    expect(leerRespaldo<Paginado>('vinos', URL_FILTRADA)?.total).toBe(1)
    expect(leerRespaldo<Paginado>('vinos', URL_PAGINA_1)?.total).toBe(1)
  })

  it('no mezcla recursos distintos', () => {
    guardarRespaldo('vinos', '/api/wines', pagina(['v']))
    guardarRespaldo('pedidos', '/api/orders', pagina(['p']))

    expect(leerRespaldo<Paginado>('vinos', '/api/wines')?.data[0].id).toBe('v')
    expect(leerRespaldo<Paginado>('pedidos', '/api/orders')?.data[0].id).toBe('p')
    expect(leerRespaldo('pedidos', '/api/wines')).toBeUndefined()
  })

  it('descarta las entradas viejas cuando se superan el maximo', () => {
    // Sin tope, un admin que recorre filtros y paginas llenaria el storage.
    for (let indice = 0; indice < 60; indice += 1) {
      guardarRespaldo('vinos', `/api/wines?page=${indice}`, pagina([`v${indice}`]))
    }

    const crudo = localStorage.getItem('admin_respaldo_vinos') as string
    const mapa = JSON.parse(crudo) as Record<string, unknown>

    expect(Object.keys(mapa).length).toBeLessThanOrEqual(40)
    // La mas reciente tiene que sobrevivir: es la que se esta mostrando.
    expect(leerRespaldo<Paginado>('vinos', '/api/wines?page=59')).toBeDefined()
  })

  it('limpiarRespaldos borra todos los recursos', () => {
    RESPALDOS.forEach((recurso) => {
      guardarRespaldo(recurso, '/api/x', { dato: 1 })
    })

    limpiarRespaldos()

    RESPALDOS.forEach((recurso) => {
      expect(leerRespaldo(recurso, '/api/x')).toBeUndefined()
    })
  })
})

describe('estado offline', () => {
  beforeEach(() => {
    marcarOnline()
    reiniciarAviso()
  })

  afterEach(() => {
    marcarOnline()
    reiniciarAviso()
  })

  it('arranca online', () => {
    expect(estaOffline()).toBe(false)
  })

  it('marcarOffline cambia el estado y avisarOnline lo vuelve', () => {
    marcarOffline()
    expect(estaOffline()).toBe(true)

    marcarOnline()
    expect(estaOffline()).toBe(false)
  })

  it('avisa a los suscriptores cuando cambia', () => {
    const vistos: boolean[] = []
    const cancelar = suscribirOffline((valor) => vistos.push(valor))

    marcarOffline()
    marcarOnline()

    // Al suscribirse se emite el valor actual, y despues uno por cambio.
    expect(vistos).toEqual([false, true, false])
    cancelar()
  })

  it('deja de avisar a un suscriptor dado de baja', () => {
    const vistos: boolean[] = []
    const cancelar = suscribirOffline((valor) => vistos.push(valor))
    cancelar()

    marcarOffline()

    expect(vistos).toEqual([false])
  })
})

describe('escrituras offline', () => {
  beforeEach(() => {
    marcarOnline()
  })

  afterEach(() => {
    marcarOnline()
  })

  it('permite escribir con conexion', () => {
    expect(() => exigirConexion()).not.toThrow()
  })

  it('rechaza escribir sin conexion, con un mensaje que lo dice', () => {
    marcarOffline()

    // Fallar es preferible a encolar: entre que se guarda y que se manda, el
    // servidor pudo cambiar, y resolver ese conflicto no esta decidido.
    expect(() => exigirConexion()).toThrow(/Sin conexion/)
    expect(() => exigirConexion()).toThrow(/no se pueden guardar/)
  })
})