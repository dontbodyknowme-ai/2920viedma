import { describe, it, expect } from 'vitest'
import { INITIAL_WINES } from '../src/datos/vino'
import type { Wine } from '../src/types/vino'
import {
  CAMPOS_OPCIONALES,
  CAMPOS_REQUERIDOS,
  CATEGORIAS_VALIDAS,
  camposRequeridosInvalidos,
  esAnioRazonable,
  esCampoOpcionalValido,
  esCategoriaValida,
  esPrecioValido,
  esTextoNoVacio,
  esUrlHttpValida
} from '../src/utils/validadores'

// Asercion de tipo en tiempo de compilacion: si `INITIAL_WINES` dejara de
// cumplir `Wine[]`, esta linea pasaria a ser un error de TypeScript.
const _conformidadDeTipos: Wine[] = INITIAL_WINES
void _conformidadDeTipos

describe('INITIAL_WINES: forma del catalogo', () => {
  it('es un array no vacio', () => {
    expect(Array.isArray(INITIAL_WINES)).toBe(true)
    expect(INITIAL_WINES.length).toBeGreaterThan(0)
  })

  it('contiene al menos los dos vinos base de la tienda', () => {
    const ids = INITIAL_WINES.map((vino) => vino.id)

    expect(ids).toContain('1')
    expect(ids).toContain('2')
  })

  it('tiene ids unicos', () => {
    const ids = INITIAL_WINES.map((vino) => vino.id)
    const unicos = new Set(ids)

    expect(unicos.size).toBe(ids.length)
  })

  it('no expone propiedades fuera del contrato de Wine', () => {
    const permitidas = new Set<string>([...CAMPOS_REQUERIDOS, ...CAMPOS_OPCIONALES])

    INITIAL_WINES.forEach((vino) => {
      const extras = Object.keys(vino).filter((clave) => !permitidas.has(clave))

      expect(extras).toEqual([])
    })
  })
})

describe('INITIAL_WINES: campos requeridos', () => {
  it('todos los vinos tienen todos los campos requeridos con tipo correcto', () => {
    const invalidos = INITIAL_WINES.map((vino) => ({
      id: vino.id,
      campos: camposRequeridosInvalidos(vino)
    })).filter(({ campos }) => campos.length > 0)

    expect(invalidos).toEqual([])
  })

  it('cada vino declara exactamente los campos requeridos que espera la interface', () => {
    INITIAL_WINES.forEach((vino) => {
      CAMPOS_REQUERIDOS.forEach((campo) => {
        expect(Object.prototype.hasOwnProperty.call(vino, campo)).toBe(true)
      })
    })
  })

  it('los campos de texto (name, winery, varietal, description) son strings no vacios', () => {
    const camposDeTexto = ['name', 'winery', 'varietal', 'description'] as const

    INITIAL_WINES.forEach((vino) => {
      camposDeTexto.forEach((campo) => {
        expect(typeof vino[campo]).toBe('string')
        expect(esTextoNoVacio(vino[campo])).toBe(true)
      })
    })
  })

  it('el id es un string no vacio en cada vino', () => {
    INITIAL_WINES.forEach((vino) => {
      expect(typeof vino.id).toBe('string')
      expect(esTextoNoVacio(vino.id)).toBe(true)
    })
  })
})

describe('INITIAL_WINES: category', () => {
  it('todas las categorias pertenecen a WineCategory', () => {
    INITIAL_WINES.forEach((vino) => {
      expect(CATEGORIAS_VALIDAS).toContain(vino.category)
      expect(esCategoriaValida(vino.category)).toBe(true)
    })
  })

  it('rechaza categorias inventadas', () => {
    const categoriasInvalidas = ['Tinto', 'Rosado', 'Espumante', 'Blanco', 'Orange', 'Todos']

    categoriasInvalidas
      .filter((categoria) => !CATEGORIAS_VALIDAS.includes(categoria as never))
      .forEach((categoria) => {
        expect(esCategoriaValida(categoria)).toBe(false)
      })
  })
})

describe('INITIAL_WINES: price', () => {
  it('es un numero mayor que cero en todos los vinos', () => {
    INITIAL_WINES.forEach((vino) => {
      expect(typeof vino.price).toBe('number')
      expect(esPrecioValido(vino.price)).toBe(true)
    })
  })

  it('es un entero, porque la UI lo formatea con maximumFractionDigits: 0', () => {
    INITIAL_WINES.forEach((vino) => {
      expect(Number.isInteger(vino.price)).toBe(true)
    })
  })

  it('rechaza precios cero, negativos o no numericos', () => {
    ;[0, -1, -45000, NaN, Infinity, '45000', null, undefined].forEach((precio) => {
      expect(esPrecioValido(precio)).toBe(false)
    })
  })
})

describe('INITIAL_WINES: vintage', () => {
  it('es un numero entero dentro de un rango razonable', () => {
    const anioActual = new Date().getFullYear()

    INITIAL_WINES.forEach((vino) => {
      expect(typeof vino.vintage).toBe('number')
      expect(Number.isInteger(vino.vintage)).toBe(true)
      expect(esAnioRazonable(vino.vintage)).toBe(true)
      expect(vino.vintage).toBeGreaterThanOrEqual(1850)
      expect(vino.vintage).toBeLessThanOrEqual(anioActual + 1)
    })
  })

  it('las cosechas presentes son posteriores a 1900', () => {
    INITIAL_WINES.forEach((vino) => {
      expect(vino.vintage).toBeGreaterThan(1900)
    })
  })

  it('rechaza anios imposibles o no numericos', () => {
    const anioActual = new Date().getFullYear()

    ;[1200, 1850 - 1, anioActual + 50, 2020.5, '2020', null].forEach((anio) => {
      expect(esAnioRazonable(anio)).toBe(false)
    })
  })
})

describe('INITIAL_WINES: imageUrl', () => {
  it('es una URL http/https parseable en todos los vinos', () => {
    INITIAL_WINES.forEach((vino) => {
      expect(typeof vino.imageUrl).toBe('string')
      expect(esUrlHttpValida(vino.imageUrl)).toBe(true)

      const url = new URL(vino.imageUrl)

      expect(url.protocol === 'http:' || url.protocol === 'https:').toBe(true)
      expect(url.hostname).not.toBe('')
    })
  })

  it('rechaza rutas relativas, data URIs, ftp y basura', () => {
    const invalidas = [
      '',
      '   ',
      '/vinos/malbec.jpg',
      'malbec.jpg',
      'data:image/png;base64,iVBORw0KGgo=',
      'ftp://ejemplo.com/vino.jpg',
      'javascript:alert(1)',
      'https://',
      null,
      undefined,
      42
    ]

    invalidas.forEach((url) => {
      expect(esUrlHttpValida(url)).toBe(false)
    })
  })
})

describe('INITIAL_WINES: campos opcionales', () => {
  it('tastingNotes y foodPairing estan ausentes o son strings no vacios', () => {
    INITIAL_WINES.forEach((vino) => {
      CAMPOS_OPCIONALES.forEach((campo) => {
        expect(esCampoOpcionalValido(vino[campo])).toBe(true)
      })
    })
  })

  it('rechaza opcionales presentes pero vacios, en blanco o nulos', () => {
    ;['', '   ', null, 0, false, {}].forEach((valor) => {
      expect(esCampoOpcionalValido(valor)).toBe(false)
    })
  })
})