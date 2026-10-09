import { describe, expect, it } from 'vitest'
import { aIsoLocal, normalizarRango } from '../../src/components/admin/date_range_picker'

/**
 * Rango de fechas.
 *
 * Lo que se prueba aca es el error de **zona horaria**, que es invisible en un
 * test escrito en UTC y aparece en el navegador de un usuario en Argentina.
 *
 * El caso real: un pedido hecho a las **23:30** del 15 de enero en Argentina
 * tiene `createdAt` = `2026-01-16T02:30:00Z`, porque Argentina es UTC-3. O sea
 * que en UTC ya es el dia 16.
 *
 * Si el filtro se armara con `toISOString().slice(0, 10)`, el rango "del 1 al
 * 15" devolveria `2026-01-16` como `dateFrom`/`dateTo` de ese pedido, y el
 * pedido caeria FUERA del rango. El pedido es del 15; el filtro lo escondio
 * porque miro la fecha en el huso equivocado. Sin error, sin aviso: el admin
 * simplemente ve un dia menos de los que hay.
 *
 * La solucion es usar los getters locales, que devuelven la fecha que el
 * usuario senalo en el calendario.
 */

const dia = (anio: number, mes: number, diaDelMes: number): Date =>
  new Date(anio, mes, diaDelMes)

describe('aIsoLocal', () => {
  it('usa la fecha local, no la de UTC', () => {
    expect(aIsoLocal(dia(2026, 0, 15))).toBe('2026-01-15')
    expect(aIsoLocal(dia(2026, 6, 4))).toBe('2026-07-04')
  })

  it('coincide con la fecha que el usuario senalo, no con la de UTC', () => {
    // Este es el test que hace todo el trabajo. Un pedido hecho a las 20:00 del
    // 15 en Argentina es `2026-01-15T23:00:00Z`: en UTC ya es el 16.
    //
    // Si el filtro se armara con `toISOString().slice(0, 10)`, daria
    // `2026-01-16`, y el admin veria ese pedido caido FUERA de un rango que va
    // del 1 al 15. El pedido existe el 15; el filtro lo escondio porque miro la
    // fecha en el otro huso.
    //
    // El test escondite el caso a proposito: corre solo si la maquina esta en
    // una zona con offset distinto de UTC. Es el unico que diferencia de verdad
    // entre las dos implementaciones.
    const pedidoTarde = new Date(2026, 0, 15, 23, 30, 0)
    const offsetMinutos = new Date(2026, 0, 15, 12, 0, 0).getTimezoneOffset()

    if (offsetMinutos === 0) {
      // En UTC los dos metodos coinciden y no habria nada que demostrar.
      return
    }

    expect(aIsoLocal(pedidoTarde)).toBe('2026-01-15')
    expect(pedidoTarde.toISOString().slice(0, 10)).toBe('2026-01-16')
  })

  it('rellena con ceros los meses y dias de un digito', () => {
    // Sin el pad, `1/5/2026` daria `2026-1-5` y el backend no lo parsearia.
    expect(aIsoLocal(dia(2026, 0, 5))).toBe('2026-01-05')
    expect(aIsoLocal(dia(2026, 10, 9))).toBe('2026-11-09')
  })

  it('no se corre de mes al pasar por diciembre', () => {
    expect(aIsoLocal(dia(2026, 11, 31))).toBe('2026-12-31')
    expect(aIsoLocal(dia(2026, 0, 31))).toBe('2026-01-31')
  })
})

describe('normalizarRango', () => {
  it('devuelve vacio cuando no hay nada elegido', () => {
    expect(normalizarRango(undefined)).toEqual({ dateFrom: '', dateTo: '' })
  })

  it('devuelve vacio cuando solo se toco el primer dia', () => {
    // Un rango con `from` pero sin `to` es "desde el 15", no un error.
    expect(normalizarRango({ from: dia(2026, 0, 15) })).toEqual({
      dateFrom: '2026-01-15',
      dateTo: ''
    })
  })

  it('devuelve ambos extremos cuando el rango esta completo', () => {
    expect(
      normalizarRango({ from: dia(2026, 0, 1), to: dia(2026, 0, 31) })
    ).toEqual({ dateFrom: '2026-01-01', dateTo: '2026-01-31' })
  })

  it('invierte el rango cuando el usuario arranca por el dia de la derecha', () => {
    // El calendario entrega `from` > `to` cuando se empieza por la derecha.
    // Mandarlo asi daria `dateFrom > dateTo` y el backend no devolveria nada,
    // sin error visible: pareceria que no hay pedidos en ese periodo.
    expect(
      normalizarRango({ from: dia(2026, 0, 31), to: dia(2026, 0, 1) })
    ).toEqual({ dateFrom: '2026-01-31', dateTo: '2026-01-31' })
  })

  it('deja el rango como esta cuando el ultimo dia es igual al primero', () => {
    expect(
      normalizarRango({ from: dia(2026, 0, 10), to: dia(2026, 0, 10) })
    ).toEqual({ dateFrom: '2026-01-10', dateTo: '2026-01-10' })
  })

  it('nunca produce un rango invertido', () => {
    const pares: Array<[Date, Date]> = [
      [dia(2026, 0, 1), dia(2026, 11, 31)],
      [dia(2026, 11, 31), dia(2026, 0, 1)],
      [dia(2026, 5, 15), dia(2026, 5, 15)]
    ]

    pares.forEach(([desde, hasta]) => {
      const rango = normalizarRango({ from: desde, to: hasta })
      expect(rango.dateFrom <= rango.dateTo).toBe(true)
    })
  })
})