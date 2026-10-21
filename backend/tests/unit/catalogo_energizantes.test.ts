import { describe, expect, it } from 'vitest'
import { CATALOGO, CREDITOS_FOTOS_WIKIMEDIA } from '../../src/demo/catalogo.js'

/**
 * Los energizantes de marca: Monster, Speed y Red Bull.
 *
 * ## Que se verifica y por que importa
 *
 * Que el grupo "Energizantes" son **las tres marcas de verdad**, y que cada una
 * tiene **su propia foto de marca**.
 *
 * La segunda parte es la importante. Un banco de imagenes generico no tiene la
 * lata **negra con el logo verde** del Monster original: tiene la de sabor, la
 * de zero, la de pipeline, y una IPA con foto de apicultor. Poner la lata
 * equivocada es el mismo bug que el de la "Cerveza Artesanal IPA" con una
 * colmena: **carga perfecto y no es el producto**. Y ningun test de URLs lo
 * agarra, porque un 200 es un 200.
 *
 * Por eso el catalogo saca estas tres fotos de **Wikimedia Commons** y no de
 * Unsplash, y por eso este test exige que las tres esten ahi: si alguien
 * cambia una por una foto generica, el test falla.
 *
 * Lo que **no** verifica: que la foto muestre la lata correcta. Eso no se
 * puede automatizar sin falsos positivos, y por eso existe
 * `npm run verificar:fotos`, que ademas imprime el nombre al lado de la
 * miniatura para poder compararlas a ojo.
 */

const energizantes = CATALOGO.filter((p) => p.grupo === 'Energizantes')

describe('los energizantes de marca', () => {
  it('son Monster, Speed y Red Bull', () => {
    // Los nombres van ordenados para que el fallo se lea como lo que es:
    // una lista desordenada no dice que falta una marca.
    expect(energizantes.map((p) => p.name).sort()).toEqual([
      'Monster Energy 473ml',
      'Red Bull 250ml',
      'Speed 250ml'
    ])
  })

  it('tienen foto de marca, no una foto generica de bebida', () => {
    // La regla: en el grupo de las marcas, la foto viene de Wikimedia. Un
    // banco generico no puede servir la lata original, y una foto de otra
    // cosa es peor que no tener foto.
    const genericas = energizantes
      .filter((p) => p.imageUrl.includes('images.unsplash.com'))
      .map((p) => p.id)

    expect(genericas).toEqual([])
  })

  it('cada foto de marca es de Wikimedia y tiene su credito anotado', () => {
    // La licencia CC BY-SA 4.0 **obliga a atribuir**. El credito esta en
    // `CREDITOS_FOTOS_WIKIMEDIA`, y este test dice que no se puede agregar una
    // foto de marca sin su credito: sin el, la atribucion se pierde en el
    // camino.
    for (const producto of energizantes) {
      expect(producto.imageUrl).toContain('wikimedia.org')
      expect(CREDITOS_FOTOS_WIKIMEDIA[producto.id]).toBeTruthy()
    }
  })

  it('no quedan los energizantes genericos de antes', () => {
    // Habia dos: "Energizante 250ml" y "Energizante Sin Azucar 250ml". No
    // existen en ningun kiosco: eran un placeholder con precio. Y el nombre
    // "Energizante" en una grilla se lee como que el catalogo no sabe que
    // marcas vende.
    const genericos = CATALOGO.filter((p) => p.name.startsWith('Energizante')).map((p) => p.id)

    expect(genericos).toEqual([])
  })

  it('ninguno tiene bodega ni anada', () => {
    // Un energizante no viene de una bodega y no tiene anada. Ponerles una
    // seria escribir informacion falsa en la base, y el `null` es lo que le
    // dice a la pantalla "no pongas una bodega aca" (ver `utils/producto.ts`).
    const conBodega = energizantes
      .filter((p) => p.winery !== null || p.varietal !== null || p.vintage !== null)
      .map((p) => p.id)

    expect(conBodega).toEqual([])
  })
})
