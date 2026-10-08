import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_WINES } from '../src/datos/vino'
import type { CartItem } from '../src/types/vino'
import {
  CLAVE_CARRITO,
  abrirCarrito,
  botonesConTexto,
  carritoGuardado,
  contador,
  desmontar,
  hay,
  montarApp,
  nombresDeLasLineas,
  pulsarPorTexto,
  textoDe,
  textoDelTotal,
  unidadesDelPanel,
  type Montaje
} from './andamiaje'

/**
 * Tests de la logica de carrito del orquestador: RF-41 a RF-45 y RF-49, con
 * CA-41 a CA-45 y CA-49.
 *
 * Lo que se verifica es estado, no presentacion: cuantas lineas hay, que cantidad
 * tiene cada una, el total y el contador. La salida animada de `AnimatePresence` y
 * el ancho de pantalla quedan fuera por `plan.md` §7.1.
 *
 * D-Q: `localStorage.clear()` va en `beforeEach` y no en `beforeAll`, y cada test
 * monta y desmonta su propia raiz. Un estado compartido entre tests es la via mas
 * corta a un falso verde.
 */

const [MALBEC, CHARDONNAY] = INITIAL_WINES

/** El mismo `Intl.NumberFormat` de `carrito_de_compras.tsx`, para comparar el total. */
const formatearMoneda = (valor: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(valor)

/** Cantidades de las lineas guardadas, en orden. */
const cantidades = (): number[] => carritoGuardado().map((linea: CartItem) => linea.quantity)

/** Agrega la tarjeta `indice` del catalogo las veces que indique `veces`. */
const agregar = (montaje: Montaje, indice: number, veces = 1): void => {
  for (let vuelta = 0; vuelta < veces; vuelta += 1) {
    pulsarPorTexto(montaje, 'Agregar', indice)
  }
}

describe('orquestador: logica de carrito', () => {
  let montaje: Montaje

  beforeEach(() => {
    localStorage.clear()
    montaje = montarApp()
  })

  afterEach(() => {
    desmontar(montaje)
  })

  describe('RF-41 / CA-41: agregar no duplica linea', () => {
    it('agregar dos veces el mismo vino deja una sola linea con cantidad 2', () => {
      agregar(montaje, 0, 2)

      expect(contador(montaje)).toBe('2')

      const guardado = carritoGuardado()
      expect(guardado).toHaveLength(1)
      expect(guardado[0]?.quantity).toBe(2)
      expect(guardado[0]?.product.id).toBe(MALBEC.id)

      abrirCarrito(montaje)
      expect(nombresDeLasLineas(montaje)).toEqual([MALBEC.name])
      expect(unidadesDelPanel(montaje)).toBe('2 items')
    })

    it('agregar dos vinos distintos deja dos lineas separadas', () => {
      agregar(montaje, 0)
      agregar(montaje, 1)

      const guardado = carritoGuardado()
      expect(guardado).toHaveLength(2)
      expect(guardado.map((linea: CartItem) => linea.product.id)).toEqual([
        MALBEC.id,
        CHARDONNAY.id
      ])
      expect(cantidades()).toEqual([1, 1])
    })
  })

  describe('RF-42 / CA-42: cantidades y total', () => {
    it('el total es la suma de precio por cantidad de cada linea', () => {
      agregar(montaje, 0, 2)
      agregar(montaje, 1, 3)
      abrirCarrito(montaje)

      const esperado = MALBEC.price * 2 + CHARDONNAY.price * 3
      expect(esperado).toBe(204000)
      expect(textoDelTotal(montaje)).toBe(formatearMoneda(esperado))
      // El total se comprueba tambien sin el formato de `Intl`, que en `es-AR` mete
      // un espacio duro entre el signo y la cifra.
      expect(textoDelTotal(montaje)).toContain('204.000')
      expect(cantidades()).toEqual([2, 3])
    })

    it('incrementar una linea sube su cantidad y el total', () => {
      agregar(montaje, 0)
      abrirCarrito(montaje)

      expect(textoDelTotal(montaje)).toBe(formatearMoneda(MALBEC.price))

      pulsarPorTexto(montaje, '+')

      expect(cantidades()).toEqual([2])
      expect(textoDelTotal(montaje)).toBe(formatearMoneda(MALBEC.price * 2))
      expect(unidadesDelPanel(montaje)).toBe('2 items')
      expect(contador(montaje)).toBe('2')
    })

    it('la linea muestra su precio multiplicado por su cantidad', () => {
      agregar(montaje, 1, 2)
      abrirCarrito(montaje)

      expect(textoDelTotal(montaje)).toBe(formatearMoneda(CHARDONNAY.price * 2))
      expect(textoDe(montaje, 'aside')).toContain((CHARDONNAY.price * 2).toLocaleString('es-AR'))
    })
  })

  describe('RF-43 / CA-43: decrementar en 1 elimina la linea', () => {
    it('decrementar una linea en 1 la elimina y no la deja en cero', () => {
      agregar(montaje, 0)
      abrirCarrito(montaje)

      expect(nombresDeLasLineas(montaje)).toEqual([MALBEC.name])

      pulsarPorTexto(montaje, '-')

      expect(nombresDeLasLineas(montaje)).toEqual([])
      expect(carritoGuardado()).toEqual([])
      expect(contador(montaje)).toBeNull()
      expect(textoDe(montaje, 'aside')).toContain('El carrito está vacío')
    })

    it('desde cantidad 2, dos pulsaciones de menos eliminan la linea', () => {
      agregar(montaje, 0, 2)
      abrirCarrito(montaje)

      pulsarPorTexto(montaje, '-')
      expect(cantidades()).toEqual([1])
      expect(nombresDeLasLineas(montaje)).toEqual([MALBEC.name])

      pulsarPorTexto(montaje, '-')
      expect(carritoGuardado()).toEqual([])
      expect(nombresDeLasLineas(montaje)).toEqual([])
      expect(contador(montaje)).toBeNull()
    })

    it('decrementar una linea no toca la otra y nunca deja cantidad cero', () => {
      agregar(montaje, 0, 2)
      agregar(montaje, 1)
      abrirCarrito(montaje)

      pulsarPorTexto(montaje, '-')

      expect(cantidades()).toEqual([1, 1])
      carritoGuardado().forEach((linea: CartItem) => {
        expect(linea.quantity).toBeGreaterThan(0)
      })

      pulsarPorTexto(montaje, '-', 1)

      expect(carritoGuardado().map((linea: CartItem) => linea.product.id)).toEqual([MALBEC.id])
      expect(contador(montaje)).toBe('1')
    })
  })

  describe('RF-44 / CA-44: eliminar una linea', () => {
    it('eliminar quita la linea y recalcula el total', () => {
      agregar(montaje, 0, 2)
      agregar(montaje, 1, 3)
      abrirCarrito(montaje)

      expect(nombresDeLasLineas(montaje)).toHaveLength(2)
      expect(textoDelTotal(montaje)).toBe(formatearMoneda(204000))

      pulsarPorTexto(montaje, 'Eliminar', 0)

      expect(nombresDeLasLineas(montaje)).toEqual([CHARDONNAY.name])
      expect(textoDelTotal(montaje)).toBe(formatearMoneda(CHARDONNAY.price * 3))
      expect(contador(montaje)).toBe('3')

      const guardado = carritoGuardado()
      expect(guardado).toHaveLength(1)
      expect(guardado[0]?.product.id).toBe(CHARDONNAY.id)
      expect(guardado[0]?.quantity).toBe(3)
    })
  })

  describe('RF-45 / CA-45: finalizar pedido', () => {
    it('confirma, vacia el carrito y deja vinoteca_cart como array vacio', () => {
      agregar(montaje, 0, 2)
      abrirCarrito(montaje)

      expect(contador(montaje)).toBe('2')

      pulsarPorTexto(montaje, 'Finalizar Pedido')

      expect(textoDe(montaje, '[role="status"]')).toBe('Pedido confirmado. Gracias por tu compra.')
      expect(contador(montaje)).toBeNull()
      expect(carritoGuardado()).toEqual([])
      expect(localStorage.getItem(CLAVE_CARRITO)).toBe('[]')
    })

    it('con el carrito vacio no hay mensaje ni boton de finalizar, y nada cambia', () => {
      abrirCarrito(montaje)

      expect(botonesConTexto(montaje, 'Finalizar Pedido')).toHaveLength(0)
      expect(hay(montaje, '[role="status"]')).toBe(false)
      expect(textoDe(montaje, 'aside')).toContain('El carrito está vacío')
      expect(nombresDeLasLineas(montaje)).toEqual([])
      expect(localStorage.getItem(CLAVE_CARRITO)).toBe('[]')
    })
  })

  describe('RF-49 / CA-49: contador de unidades', () => {
    it('muestra la suma de las cantidades de todas las lineas', () => {
      expect(contador(montaje)).toBeNull()

      agregar(montaje, 0, 2)
      expect(contador(montaje)).toBe('2')

      // Con dos lineas, el contador no puede ser el numero de lineas: si lo fuera
      // daria 2 en vez de 3. El caso de una linea por vino no distingue las dos
      // cosas, asi que hace falta que las cantidades divergan.
      agregar(montaje, 1)
      expect(contador(montaje)).toBe('3')

      // Y con el `+` del carrito tampoco: siguen siendo dos lineas, ahora en 2 y 2.
      // El contador tiene que dar 4; el numero de lineas daria 2.
      abrirCarrito(montaje)
      pulsarPorTexto(montaje, '+', 1)

      expect(cantidades()).toEqual([2, 2])
      expect(contador(montaje)).toBe('4')
      expect(unidadesDelPanel(montaje)).toBe('4 items')
    })

    it('desaparece del DOM cuando el carrito se vacia', () => {
      agregar(montaje, 0)
      expect(contador(montaje)).toBe('1')

      abrirCarrito(montaje)
      pulsarPorTexto(montaje, '-')

      // No es que muestre un cero: el nodo no esta.
      expect(contador(montaje)).toBeNull()
      expect(
        montaje.contenedor
          .querySelector('button[aria-label="Carrito de compras"]')
          ?.querySelectorAll('span')
      ).toHaveLength(0)
    })
  })
})
