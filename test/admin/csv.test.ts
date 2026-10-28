import { describe, it, expect } from 'vitest'
import {
  aTextoCsv,
  escaparCsv,
  nombreArchivoConFecha,
  parsearCsv,
  parsearCsvComoObjetos
} from '../../src/utils/csv'

describe('escaparCsv', () => {
  it('deja el valor sin tocar cuando no necesita comillas', () => {
    expect(escaparCsv('Malbec')).toBe('Malbec')
    expect(escaparCsv(2020)).toBe('2020')
    expect(escaparCsv(45000)).toBe('45000')
  })

  it('envuelve entre comillas cuando hay coma', () => {
    // Es el caso que hace inutil `split(',')`: una descripcion con coma.
    expect(escaparCsv('Vino tinto, con notas')).toBe('"Vino tinto, con notas"')
  })

  it('duplica las comillas dobles del interior', () => {
    expect(escaparCsv('Dice "hola"')).toBe('"Dice ""hola"""')
  })

  it('envuelve entre comillas cuando hay salto de linea', () => {
    expect(escaparCsv('primera\nsegunda')).toBe('"primera\nsegunda"')
  })

  it('envuelve entre comillas cuando hay espacios en los bordes', () => {
    expect(escaparCsv('  con espacios  ')).toBe('"  con espacios  "')
  })

  it('convierte null y undefined en cadena vacia, no en la palabra null', () => {
    expect(escaparCsv(null)).toBe('')
    expect(escaparCsv(undefined)).toBe('')
  })

  it('neutraliza formulas de planilla (CSV injection)', () => {
    // Una celda que empieza con = + - @ se ejecuta como formula en Excel.
    // Se prefija con una comilla simple para que se lea como texto.
    // Contiene comillas dobles, asi que ademas se entrecomilla (y se duplican
    // las comillas internas, como define RFC 4180).
    expect(escaparCsv('=HYPERLINK("http://evil","x")')).toBe("\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\"")
    expect(escaparCsv('+1+1')).toBe("'+1+1")
    expect(escaparCsv('-1+1')).toBe("'-1+1")
    expect(escaparCsv('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)")
  })
})

describe('aTextoCsv', () => {
  it('escribe encabezados y filas', () => {
    const texto = aTextoCsv(
      [
        ['Gran Reserva', 'Catena Zapata'],
        ['Chardonnay', 'El Enemigo']
      ],
      ['Nombre', 'Bodega']
    )

    expect(texto).toContain('Nombre,Bodega')
    expect(texto).toContain('Gran Reserva,Catena Zapata')
    expect(texto).toContain('Chardonnay,El Enemigo')
  })

  it('antepone BOM para que Excel respete los acentos', () => {
    expect(aTextoCsv([['producto']], ['a']).charAt(0)).toBe('﻿')
  })
})

describe('parsearCsv', () => {
  it('separa encabezados de filas', () => {
    const { encabezados, filas } = parsearCsv('Nombre,Bodega\nMalbec,Catena')

    expect(encabezados).toEqual(['Nombre', 'Bodega'])
    expect(filas).toEqual([['Malbec', 'Catena']])
  })

  it('devuelve tabla vacia para texto en blanco', () => {
    expect(parsearCsv('')).toEqual({ encabezados: [], filas: [] })
    expect(parsearCsv('   \n  ')).toEqual({ encabezados: [], filas: [] })
  })

  it('respeta las comas dentro de comillas', () => {
    // El caso que rompe `split(',')`.
    const { filas } = parsearCsv('Nombre,Descripcion\nVino,"Tinto, con cuerpo"')

    expect(filas[0]).toEqual(['Vino', 'Tinto, con cuerpo'])
  })

  it('interpreta "" dentro de comillas como una comilla', () => {
    const { filas } = parsearCsv('a\n"Dice ""hola"""')

    expect(filas[0][0]).toBe('Dice "hola"')
  })

  it('acepta CRLF y LF por igual', () => {
    const conCrlf = parsearCsv('a,b\r\n1,2\r\n3,4')
    const conLf = parsearCsv('a,b\n1,2\n3,4')

    expect(conCrlf.filas).toEqual(conLf.filas)
    expect(conCrlf.filas).toHaveLength(2)
  })

  it('rellena con vacio las filas que tienen menos celdas', () => {
    // Sin esto, `Object.fromEntries` devolveria `undefined` y un filtro
    // compararia contra `undefined` en vez de contra cadena vacia.
    const { filas } = parsearCsv('a,b,c\n1\n')

    expect(filas[0]).toEqual(['1', '', ''])
  })

  it('descarta la fila vacia del final', () => {
    const { filas } = parsearCsv('a,b\n1,2\n')

    expect(filas).toHaveLength(1)
  })

  it('hace ida y vuelta con valores que llevan coma y comillas', () => {
    const original = [
      ['Vino tinto, con cuerpo', 'Dice "hola"']
    ]
    const texto = aTextoCsv(original, ['Descripcion', 'Nota'])
    const { filas } = parsearCsv(texto)

    expect(filas).toEqual(original)
  })
})

describe('parsearCsvComoObjetos', () => {
  it('arma un objeto por fila, con una clave por encabezado', () => {
    const objetos = parsearCsvComoObjetos<{ Nombre: string; Precio: string }>(
      'Nombre,Precio\nMalbec,45000'
    )

    expect(objetos).toEqual([{ Nombre: 'Malbec', Precio: '45000' }])
  })

  it('devuelve arreglo vacio si no hay encabezados', () => {
    expect(parsearCsvComoObjetos('')).toEqual([])
  })

  it('normaliza los espacios del encabezado en la clave', () => {
    const objetos = parsearCsvComoObjetos<Record<string, string>>(' Nombre \nMalbec')

    expect(objetos[0]).toHaveProperty('Nombre', 'Malbec')
  })
})

describe('nombreArchivoConFecha', () => {
  it('une la base con la fecha del dia', () => {
    // La fecha entra por parametro y no se lee de `Date` adentro, para que el
    // nombre sea determinista en los tests.
    expect(nombreArchivoConFecha('catalogo', new Date('2026-10-09T12:00:00Z'))).toBe(
      'catalogo_2026-10-09.csv'
    )
  })
})
