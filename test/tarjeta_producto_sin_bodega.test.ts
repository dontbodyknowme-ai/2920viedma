import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ProductCard } from '../src/components/carta_de_productos'
import type { Producto } from '../src/types/producto'

/**
 * La tarjeta de un producto que **no es vino**.
 *
 * ## Que se verifica, y por que importa
 *
 * Que la tarjeta de un producto sin bodega —un Monster, una gaseosa, unas
 * papas— **no muestre el separador solo**.
 *
 * Antes la tarjeta escribia `{producto.winery} • {producto.varietal}` y para un
 * producto con los dos en `null` eso daba exactamente **" • "**: un renglon de
 * basura arriba del nombre. Con el badge de la foto igual: `{producto.vintage}`
 * en `null` dejaba un pastillo con la forma de un ano y nada adentro.
 *
 * Y **la mitad del catalogo no es vino**: gaseosas, jugos, aguas, cervezas,
 * energizantes, chocolates, papas. Todos se mostraban con la basura de arriba.
 *
 * ## Por que un test de render y no solo de la funcion
 *
 * `test/producto.test.ts` mide `subtituloProducto`, que es la funcion. Este
 * mide la **pantalla**, y es el que agarra la regresión de verdad: si alguien
 * vuelve a escribir `{producto.winery} • {producto.varietal}` en la tarjeta,
 * los tests de la funcion siguen en verde —miden algo que ya no se usa— y
 * este falla.
 *
 * Mismo criterio que el resto de los tests del repo: un test que afirma
 * cubrir algo que no cubre es peor que no tener test.
 */

const producto = (over: Partial<Producto> = {}): Producto => ({
  id: 'bebida-monster-energy-473ml',
  name: 'Monster Energy 473ml',
  winery: null,
  varietal: null,
  category: 'Energizantes',
  departamento: 'Bebidas',
  grupo: 'Energizantes',
  tipoVino: null,
  vintage: null,
  price: 6500,
  description: 'La lata original de Monster.',
  imageUrl: '/monster.jpg',
  ...over
})

interface Montaje {
  contenedor: HTMLDivElement
  root: Root
}

const montar = (producto: Producto): Montaje => {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const root = createRoot(contenedor)

  act(() => {
    root.render(
      createElement(ProductCard, {
        producto,
        onAddToCart: () => {},
        onSelectProducto: () => {}
      })
    )
  })

  return { contenedor, root }
}

/** Todo el texto de la tarjeta, con los espacios de mas normalizados. */
const textoDeLaTarjeta = (montaje: Montaje): string =>
  (montaje.contenedor.textContent ?? '').replace(/\s+/g, ' ').trim()

/**
 * El badge de la anada, en la esquina superior derecha de la foto.
 *
 * Se busca por `right-3` y no por una clase entera: el de la categoria esta en
 * `left-3`, y el criterio tiene que seguir funcionando si alguien cambia los
 * bordes de uno de los dos.
 *
 * Con `vintage: null` el badge existia y estaba **vacio**: un pastillo
 * redondeado con la forma de un ano y nada adentro. Por eso el test no mira
 * el texto —que en un elemento vacio es `''`, igual que si no existiera— sino
 * que **no este**.
 */
const badgeDeAnada = (montaje: Montaje): HTMLElement | null => {
  const encontrado = montaje.contenedor.querySelector('div[class*="right-3"]')
  return encontrado instanceof HTMLElement ? encontrado : null
}

let montaje: Montaje | null = null

afterEach(() => {
  if (montaje !== null) {
    act(() => {
      montaje?.root.unmount()
    })
    montaje.contenedor.remove()
    montaje = null
  }
})

describe('la tarjeta de un producto sin bodega', () => {
  it('no muestra el separador solo', () => {
    // El sintoma exacto del bug: " • " con los dos datos en `null`.
    montaje = montar(producto())

    expect(textoDeLaTarjeta(montaje)).not.toContain('•')
  })

  it('no muestra un badge de anada vacio', () => {
    montaje = montar(producto())

    expect(badgeDeAnada(montaje)).toBeNull()
  })

  it('sí muestra el nombre y el precio', () => {
    // El otro lado de la moneda: ocultar la linea de la bodega no puede
    // terminar borrando el nombre o el precio.
    montaje = montar(producto())

    const texto = textoDeLaTarjeta(montaje)
    expect(texto).toContain('Monster Energy 473ml')
    expect(texto).toContain('6.500')
  })
})

describe('la tarjeta de un producto con bodega', () => {
  it('muestra bodega y cepa, separados', () => {
    // El caso que ya funcionaba: no hay que romperlo al arreglar el otro.
    montaje = montar(
      producto({
        id: 'producto-gran-reserva-malbec',
        name: 'Gran Reserva Malbec',
        winery: 'Bodega Catena Zapata',
        varietal: 'Malbec',
        category: 'Vinos',
        grupo: 'Con alcohol',
        tipoVino: 'Tinto',
        vintage: 2020
      })
    )

    const texto = textoDeLaTarjeta(montaje)
    expect(texto).toContain('Bodega Catena Zapata • Malbec')
  })

  it('muestra el badge de la anada', () => {
    montaje = montar(
      producto({
        id: 'producto-gran-reserva-malbec',
        name: 'Gran Reserva Malbec',
        winery: 'Bodega Catena Zapata',
        varietal: 'Malbec',
        category: 'Vinos',
        grupo: 'Con alcohol',
        tipoVino: 'Tinto',
        vintage: 2020
      })
    )

    expect(badgeDeAnada(montaje)?.textContent).toContain('2020')
  })
})
