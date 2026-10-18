import { describe, it, expect } from 'vitest'
import { INITIAL_WINES } from '../src/datos/vino'
import type { Wine } from '../src/types/vino'
import {
  CAMPOS_OPCIONALES,
  CAMPOS_REQUERIDOS,
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
    // `grupo` y `tipoVino` se suman a mano porque **no estan en ninguna de las
    // dos listas a proposito**: los dos admiten `null` de legitimo —un
    // energizante cuelga sin grupo y una cerveza no tiene color de vino— y son
    // justo el caso para el que ninguna de las dos listas sirve. Ver la nota de
    // `CAMPOS_REQUERIDOS` en `validadores.ts`.
    const permitidas = new Set<string>([
      ...CAMPOS_REQUERIDOS,
      ...CAMPOS_OPCIONALES,
      'grupo',
      'tipoVino'
    ])

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

  it('los campos de texto (name, description) son strings no vacios', () => {
    // Bodega y cepa se separaron en su propio test: son `string | null` desde que
    // la tienda vendio cosas que no tienen. Un producto sin bodega es valido.
    const camposDeTexto = ['name', 'description'] as const

    INITIAL_WINES.forEach((vino) => {
      camposDeTexto.forEach((campo) => {
        expect(typeof vino[campo]).toBe('string')
        expect(esTextoNoVacio(vino[campo])).toBe(true)
      })
    })
  })

  it('bodega y cepa, cuando estan, son strings no vacios', () => {
    const opcionalesDeTexto = ['winery', 'varietal'] as const

    INITIAL_WINES.forEach((producto) => {
      opcionalesDeTexto.forEach((campo) => {
        const valor = producto[campo]
        // `null` es "no tiene bodega". Lo que no se permite es el string vacio:
        // eso es "la bodega se guardo vacia", que es un error de carga.
        if (valor !== null) {
          expect(typeof valor).toBe('string')
          expect(esTextoNoVacio(valor)).toBe(true)
        }
      })
    })

    // Y tiene que haber productos **sin** bodega: si el catalogo entero la
    // tuviera, este test pasaria sin comprobar que `null` es valido.
    expect(INITIAL_WINES.some((producto) => producto.winery === null)).toBe(true)
  })

  it('el id es un string no vacio en cada vino', () => {
    INITIAL_WINES.forEach((vino) => {
      expect(typeof vino.id).toBe('string')
      expect(esTextoNoVacio(vino.id)).toBe(true)
    })
  })
})

describe('INITIAL_WINES: category', () => {
  it('todas las categorias del repo tienen forma valida', () => {
    // Lo que se verifica es la **forma**, no el valor: desde la spec 011 la
    // categoria es texto libre y el admin elige la que necesita. Lo que sigue
    // having que cumplirse es que no este vacia y empiece en mayuscula.
    INITIAL_WINES.forEach((vino) => {
      expect(esCategoriaValida(vino.category)).toBe(true)
    })
  })

  it('las categorias del repo no tienen typos de mayuscula', () => {
    // Si una quedara en minúscula, el filtro mostraria "tinto" y "Tinto" como dos
    // categorias distintas y el mismo vino apareceria dos veces al filtrar.
    INITIAL_WINES.forEach((vino) => {
      expect(vino.category).toBe(vino.category.trim())
      expect(vino.category[0]).toBe(vino.category[0]?.toUpperCase())
    })
  })
})

describe('esCategoriaValida: acepta cualquier categoria, rechaza las mal formadas', () => {
  it('acepta categorias que antes eran imposibles', () => {
    // Estas cuatro no existian: con el enum de Postgres cada una era una
    // migracion. Ahora son texto, y crear una categoria es agregar un producto
    // que la use.
    const nuevas = ['Cerveza', 'Espirituos', 'Fiambre', 'Quesos']
    nuevas.forEach((categoria) => {
      expect(esCategoriaValida(categoria)).toBe(true)
    })
  })

  it('sigue rechazando lo que estaba mal', () => {
    const invalidas = ['', '   ', 'tinto', 'espumante', 'a'.repeat(41), null, undefined, 42, {}]
    invalidas.forEach((valor) => {
      expect(esCategoriaValida(valor)).toBe(false)
    })
  })

  it('acepta justo 40 caracteres y rechaza 41', () => {
    expect(esCategoriaValida('A'.repeat(40))).toBe(true)
    expect(esCategoriaValida('A'.repeat(41))).toBe(false)
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
  it('es un numero entero dentro de un rango razonable cuando esta', () => {
    // **La vintage puede ser `null`.** Una gaseosa no tiene anada, y fue
    // justamente exigirla lo que hacia imposible vender cualquier cosa fuera del
    // vino. Un numero de anada pegado a una gaseosa seria informacion falsa.
    const anioActual = new Date().getFullYear()
    let conAnada = 0

    INITIAL_WINES.forEach((producto) => {
      if (producto.vintage === null) return
      conAnada++
      expect(typeof producto.vintage).toBe('number')
      expect(Number.isInteger(producto.vintage)).toBe(true)
      expect(esAnioRazonable(producto.vintage)).toBe(true)
      expect(producto.vintage).toBeGreaterThanOrEqual(1850)
      expect(producto.vintage).toBeLessThanOrEqual(anioActual + 1)
    })

    // Tiene que haber **de las dos clases**. Si el catalogo entero tuviera anada,
    // esto pasaria sin comprobar que `null` es un valor valido.
    expect(conAnada).toBeGreaterThan(0)
    expect(INITIAL_WINES.some((producto) => producto.vintage === null)).toBe(true)
  })

  it('las cosechas presentes son posteriores a 1900', () => {
    INITIAL_WINES.forEach((producto) => {
      if (producto.vintage === null) return
      expect(producto.vintage).toBeGreaterThan(1900)
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
  it('los de texto estan ausentes, en null, o son strings no vacios', () => {
    // `vintage` queda afuera del bucle a proposito: es el unico opcional que **no
    // es texto**, y mandarlo por `esCampoOpcionalValido` daria `false` siempre
    // (ni `undefined` ni `null` ni texto). Se verifica en su propio `describe`.
    const deTexto = CAMPOS_OPCIONALES.filter((campo) => campo !== 'vintage')

    INITIAL_WINES.forEach((producto) => {
      deTexto.forEach((campo) => {
        expect(esCampoOpcionalValido(producto[campo])).toBe(true)
      })
    })
  })

  it('rechaza opcionales presentes pero vacios, en blanco o de otro tipo', () => {
    // El `null` **ya no se rechaza**: paso a ser valido cuando la tienda dejo de
    // vender solo vinos. Una API que serializa `String?` de Prisma manda `null`
    // para la bodega de una gaseosa, y seguir rechazandolo marcaba el producto
    // entero como invalido.
    //
    // Lo que se sigue rechazando es el string vacio: `''` no es "no tiene
    // bodega", es "la bodega se guardo vacia", que es un error de carga.
    ;['', '   ', 0, false, {}].forEach((valor) => {
      expect(esCampoOpcionalValido(valor)).toBe(false)
    })
  })

  it('acepta null y undefined como "no tiene"', () => {
    // Los dos ausentes valen: `null` es lo que manda la API y `undefined` lo que
    // queda cuando el campo no se escribio. Confundirlos seria hacer que un
    // producto valido se descarte segun de donde vino el objeto.
    expect(esCampoOpcionalValido(null)).toBe(true)
    expect(esCampoOpcionalValido(undefined)).toBe(true)
  })
})