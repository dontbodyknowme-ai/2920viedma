import { describe, it, expect } from 'vitest'
import { PRODUCTOS_INICIALES } from '../src/datos/productos'
import type { Producto } from '../src/types/producto'
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

// Asercion de tipo en tiempo de compilacion: si `PRODUCTOS_INICIALES` dejara de
// cumplir `Producto[]`, esta linea pasaria a ser un error de TypeScript.
const _conformidadDeTipos: Producto[] = PRODUCTOS_INICIALES
void _conformidadDeTipos

describe('PRODUCTOS_INICIALES: forma del catalogo', () => {
  it('es un array no vacio', () => {
    expect(Array.isArray(PRODUCTOS_INICIALES)).toBe(true)
    expect(PRODUCTOS_INICIALES.length).toBeGreaterThan(0)
  })

  it('contiene al menos los dos productos base de la tienda', () => {
    const ids = PRODUCTOS_INICIALES.map((producto) => producto.id)

    expect(ids).toContain('1')
    expect(ids).toContain('2')
  })

  it('tiene ids unicos', () => {
    const ids = PRODUCTOS_INICIALES.map((producto) => producto.id)
    const unicos = new Set(ids)

    expect(unicos.size).toBe(ids.length)
  })

  it('no expone propiedades fuera del contrato de Producto', () => {
    // `grupo` y `tipoVino` se suman a mano porque **no estan en ninguna de las
    // dos listas a proposito**: los dos admiten `null` de legitimo —un
    // energizante cuelga sin grupo y una cerveza no tiene color de producto— y son
    // justo el caso para el que ninguna de las dos listas sirve. Ver la nota de
    // `CAMPOS_REQUERIDOS` en `validadores.ts`.
    const permitidas = new Set<string>([
      ...CAMPOS_REQUERIDOS,
      ...CAMPOS_OPCIONALES,
      'grupo',
      'tipoVino'
    ])

    PRODUCTOS_INICIALES.forEach((producto) => {
      const extras = Object.keys(producto).filter((clave) => !permitidas.has(clave))

      expect(extras).toEqual([])
    })
  })
})

describe('PRODUCTOS_INICIALES: campos requeridos', () => {
  it('todos los productos tienen todos los campos requeridos con tipo correcto', () => {
    const invalidos = PRODUCTOS_INICIALES.map((producto) => ({
      id: producto.id,
      campos: camposRequeridosInvalidos(producto)
    })).filter(({ campos }) => campos.length > 0)

    expect(invalidos).toEqual([])
  })

  it('cada producto declara exactamente los campos requeridos que espera la interface', () => {
    PRODUCTOS_INICIALES.forEach((producto) => {
      CAMPOS_REQUERIDOS.forEach((campo) => {
        expect(Object.prototype.hasOwnProperty.call(producto, campo)).toBe(true)
      })
    })
  })

  it('los campos de texto (name, description) son strings no vacios', () => {
    // Bodega y cepa se separaron en su propio test: son `string | null` desde que
    // la tienda vendio cosas que no tienen. Un producto sin bodega es valido.
    const camposDeTexto = ['name', 'description'] as const

    PRODUCTOS_INICIALES.forEach((producto) => {
      camposDeTexto.forEach((campo) => {
        expect(typeof producto[campo]).toBe('string')
        expect(esTextoNoVacio(producto[campo])).toBe(true)
      })
    })
  })

  it('bodega y cepa, cuando estan, son strings no vacios', () => {
    const opcionalesDeTexto = ['winery', 'varietal'] as const

    PRODUCTOS_INICIALES.forEach((producto) => {
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
    expect(PRODUCTOS_INICIALES.some((producto) => producto.winery === null)).toBe(true)
  })

  it('el id es un string no vacio en cada producto', () => {
    PRODUCTOS_INICIALES.forEach((producto) => {
      expect(typeof producto.id).toBe('string')
      expect(esTextoNoVacio(producto.id)).toBe(true)
    })
  })
})

describe('PRODUCTOS_INICIALES: category', () => {
  it('todas las categorias del repo tienen forma valida', () => {
    // Lo que se verifica es la **forma**, no el valor: desde la spec 011 la
    // categoria es texto libre y el admin elige la que necesita. Lo que sigue
    // having que cumplirse es que no este vacia y empiece en mayuscula.
    PRODUCTOS_INICIALES.forEach((producto) => {
      expect(esCategoriaValida(producto.category)).toBe(true)
    })
  })

  it('las categorias del repo no tienen typos de mayuscula', () => {
    // Si una quedara en minúscula, el filtro mostraria "tinto" y "Tinto" como dos
    // categorias distintas y el mismo producto apareceria dos veces al filtrar.
    PRODUCTOS_INICIALES.forEach((producto) => {
      expect(producto.category).toBe(producto.category.trim())
      expect(producto.category[0]).toBe(producto.category[0]?.toUpperCase())
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

describe('PRODUCTOS_INICIALES: price', () => {
  it('es un numero mayor que cero en todos los productos', () => {
    PRODUCTOS_INICIALES.forEach((producto) => {
      expect(typeof producto.price).toBe('number')
      expect(esPrecioValido(producto.price)).toBe(true)
    })
  })

  it('es un entero, porque la UI lo formatea con maximumFractionDigits: 0', () => {
    PRODUCTOS_INICIALES.forEach((producto) => {
      expect(Number.isInteger(producto.price)).toBe(true)
    })
  })

  it('rechaza precios cero, negativos o no numericos', () => {
    ;[0, -1, -45000, NaN, Infinity, '45000', null, undefined].forEach((precio) => {
      expect(esPrecioValido(precio)).toBe(false)
    })
  })
})

describe('PRODUCTOS_INICIALES: vintage', () => {
  it('es un numero entero dentro de un rango razonable cuando esta', () => {
    // **La vintage puede ser `null`.** Una gaseosa no tiene anada, y fue
    // justamente exigirla lo que hacia imposible vender cualquier cosa fuera del
    // producto. Un numero de anada pegado a una gaseosa seria informacion falsa.
    const anioActual = new Date().getFullYear()
    let conAnada = 0

    PRODUCTOS_INICIALES.forEach((producto) => {
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
    expect(PRODUCTOS_INICIALES.some((producto) => producto.vintage === null)).toBe(true)
  })

  it('las cosechas presentes son posteriores a 1900', () => {
    PRODUCTOS_INICIALES.forEach((producto) => {
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

describe('PRODUCTOS_INICIALES: imageUrl', () => {
  it('es una URL http/https parseable en todos los productos', () => {
    PRODUCTOS_INICIALES.forEach((producto) => {
      expect(typeof producto.imageUrl).toBe('string')
      expect(esUrlHttpValida(producto.imageUrl)).toBe(true)

      const url = new URL(producto.imageUrl)

      expect(url.protocol === 'http:' || url.protocol === 'https:').toBe(true)
      expect(url.hostname).not.toBe('')
    })
  })

  it('rechaza rutas relativas, data URIs, ftp y basura', () => {
    const invalidas = [
      '',
      '   ',
      '/productos/malbec.jpg',
      'malbec.jpg',
      'data:image/png;base64,iVBORw0KGgo=',
      'ftp://ejemplo.com/producto.jpg',
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

describe('PRODUCTOS_INICIALES: campos opcionales', () => {
  it('los de texto estan ausentes, en null, o son strings no vacios', () => {
    // `vintage` queda afuera del bucle a proposito: es el unico opcional que **no
    // es texto**, y mandarlo por `esCampoOpcionalValido` daria `false` siempre
    // (ni `undefined` ni `null` ni texto). Se verifica en su propio `describe`.
    const deTexto = CAMPOS_OPCIONALES.filter((campo) => campo !== 'vintage')

    PRODUCTOS_INICIALES.forEach((producto) => {
      deTexto.forEach((campo) => {
        expect(esCampoOpcionalValido(producto[campo])).toBe(true)
      })
    })
  })

  it('rechaza opcionales presentes pero vacios, en blanco o de otro tipo', () => {
    // El `null` **ya no se rechaza**: paso a ser valido cuando la tienda dejo de
    // vender solo productos. Una API que serializa `String?` de Prisma manda `null`
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
    // producto valido se descarte segun de donde producto el objeto.
    expect(esCampoOpcionalValido(null)).toBe(true)
    expect(esCampoOpcionalValido(undefined)).toBe(true)
  })
})