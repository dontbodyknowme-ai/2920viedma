import { describe, expect, it } from 'vitest'
import { tendenciaDe } from '../../src/utils/metricas'
import type { DailySale } from '../../src/types/admin'

const dia = (fecha: string, revenue: number, orders = 1): DailySale => ({
  date: fecha,
  revenue,
  orders
})

const serieDe = (valores: readonly number[]): DailySale[] =>
  valores.map((revenue, indice) =>
    dia(`2026-09-${String(indice + 1).padStart(2, '0')}`, revenue)
  )

describe('tendenciaDe', () => {
  it('da positiva cuando la segunda mitad vende mas que la primera', () => {
    // 100 + 100 en la primera mitad, 200 + 200 en la segunda: +100 %.
    const resultado = tendenciaDe(serieDe([100, 100, 200, 200]))

    expect(resultado).toBeCloseTo(100, 5)
  })

  it('da negativa cuando la segunda mitad vende menos', () => {
    const resultado = tendenciaDe(serieDe([200, 200, 100, 100]))

    expect(resultado).toBeCloseTo(-50, 5)
  })

  it('da cero cuando las dos mitades son iguales', () => {
    expect(tendenciaDe(serieDe([100, 100, 100, 100]))).toBeCloseTo(0, 5)
  })

  it('descarta los dias sin ventas antes de comparar', () => {
    // Quedan solo 3 dias con ventas, y son menos de los 4 que hacen falta para
    // comparar, asi que no hay tendencia. **Sin descartar los ceros**, la serie
    // seria de 5 elementos, la primera mitad sumaria 200 y la segunda 100, y
    // saldria un -50% alucinatorio. Un tramo en cero de la serie real (una
    // semana con el sistema caido, por ejemplo) no es una caida de ventas.
    expect(tendenciaDe(serieDe([100, 100, 0, 0, 100]))).toBeUndefined()
  })

  it('compara contra el total real cuando descarta dias sin ventas', () => {
    // 200 + 200 en la primera mitad, 400 + 400 en la segunda: +100 %.
    expect(tendenciaDe(serieDe([200, 200, 0, 0, 400, 400]))).toBeCloseTo(100, 5)
  })

  it('devuelve undefined si no alcanza para comparar, en vez de un 0 falso', () => {
    // Un 0% en la tarjeta seria una mentira: no dice "no cambio", dice
    // "no hay datos para saber si cambio".
    expect(tendenciaDe(serieDe([100, 100, 0, 0]))).toBeUndefined()
    expect(tendenciaDe(serieDe([0, 0, 0, 0]))).toBeUndefined()
    expect(tendenciaDe([])).toBeUndefined()
  })

  it('devuelve undefined cuando la primera mitad es cero', () => {
    // La division daria Infinity o NaN, y los dos se verian en pantalla como
    // si fueran una variacion real.
    expect(tendenciaDe(serieDe([0, 0, 100, 100]))).toBeUndefined()
  })
})
