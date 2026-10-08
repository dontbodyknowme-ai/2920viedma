import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_WINES } from '../src/datos/vino'
import type { CartItem, Wine } from '../src/types/vino'
import {
  CLAVE_CARRITO,
  CLAVE_VINOS,
  abrirCarrito,
  cerrarPorElFondo,
  categoriaActiva,
  contador,
  crudoDe,
  desmontar,
  escribir,
  hay,
  montarApp,
  nombresDeLasLineas,
  nombresDeLasTarjetas,
  nodos,
  pulsar,
  pulsarPorTexto,
  valorDe,
  esperarSalidas,
  type Montaje
} from './andamiaje'

/**
 * Tests de persistencia, arranque con datos corruptos y conservacion del filtro
 * del orquestador: RF-46, RF-47 y RF-48, con CA-46 a CA-48.
 *
 * Van aparte de los de carrito (D-Q) porque necesitan **preparar** `localStorage`
 * antes de montar, con datos validos o deliberadamente corruptos, y en un archivo
 * de carrito eso no tendria sentido.
 */

const [MALBEC, CHARDONNAY] = INITIAL_WINES

const BUSCADOR = 'input[placeholder="Buscar por etiqueta, cepa o bodega..."]'

const vinoDePrueba: Wine = {
  id: 'vino-de-prueba',
  name: 'Reserva de Prueba',
  winery: 'Bodega de Prueba',
  varietal: 'Cabernet Sauvignon',
  category: 'Tinto',
  vintage: 2019,
  price: 30000,
  description: 'Vino de prueba para verificar la restauracion al remontar.',
  imageUrl: 'https://example.com/vino-de-prueba.jpg'
}

const guardarVinos = (valor: unknown): void => {
  localStorage.setItem(CLAVE_VINOS, JSON.stringify(valor))
}

const guardarCarrito = (valor: unknown): void => {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(valor))
}

const linea = (vino: Wine, quantity: number): CartItem => ({ product: vino, quantity })

/** Carga un tercer vino con el formulario de la barra y lo deja en el catalogo. */
const cargarUnVino = (montaje: Montaje): void => {
  pulsarPorTexto(montaje, '+ Cargar Vino')
  escribir(montaje, 'input[placeholder="Ej: Gran Reserva Malbec"]', 'Reserva Especial')
  escribir(montaje, 'input[placeholder="Ej: Catena Zapata"]', 'Bodega Nueva')
  escribir(montaje, 'input[placeholder="35000"]', '55000')
  pulsarPorTexto(montaje, 'Guardar Vino')
}

describe('orquestador: persistencia, arranque y filtro', () => {
  let montaje: Montaje

  beforeEach(() => {
    localStorage.clear()
    montaje = montarApp()
  })

  afterEach(() => {
    desmontar(montaje)
  })

  describe('RF-46 / CA-46: guardado en las dos claves y restauracion', () => {
    it('agregar un vino y un articulo deja las dos claves con lo esperado', () => {
      cargarUnVino(montaje)
      pulsarPorTexto(montaje, 'Agregar', 0)

      const vinos = JSON.parse(crudoDe(CLAVE_VINOS) ?? 'null') as Wine[]
      expect(vinos).toHaveLength(3)
      expect(vinos.map((vino: Wine) => vino.name)).toEqual([
        MALBEC.name,
        CHARDONNAY.name,
        'Reserva Especial'
      ])
      expect(vinos[2]?.price).toBe(55000)

      const carrito = JSON.parse(crudoDe(CLAVE_CARRITO) ?? 'null') as CartItem[]
      expect(carrito).toHaveLength(1)
      expect(carrito[0]?.product.id).toBe(MALBEC.id)
      expect(carrito[0]?.quantity).toBe(1)
    })

    it('desmontar y volver a montar deja el vino y la linea en el DOM', () => {
      cargarUnVino(montaje)
      pulsarPorTexto(montaje, 'Agregar', 0)
      expect(nombresDeLasTarjetas(montaje)).toHaveLength(3)

      desmontar(montaje)
      montaje = montarApp()

      expect(nombresDeLasTarjetas(montaje)).toContain('Reserva Especial')
      expect(contador(montaje)).toBe('1')

      abrirCarrito(montaje)
      expect(nombresDeLasLineas(montaje)).toEqual([MALBEC.name])
    })

    it('datos validos en las dos claves se restauran al montar', () => {
      desmontar(montaje)
      guardarVinos([vinoDePrueba])
      guardarCarrito([linea(vinoDePrueba, 2), linea(MALBEC, 1)])
      montaje = montarApp()

      expect(nombresDeLasTarjetas(montaje)).toEqual([vinoDePrueba.name])
      expect(contador(montaje)).toBe('3')

      abrirCarrito(montaje)
      expect(nombresDeLasLineas(montaje)).toEqual([vinoDePrueba.name, MALBEC.name])
    })
  })

  describe('RF-47 / CA-47: arranque limpio con datos no interpretables', () => {
    it('texto que no es JSON en las dos claves arranca con el catalogo inicial', () => {
      desmontar(montaje)
      localStorage.setItem(CLAVE_VINOS, 'esto no es json {{{')
      localStorage.setItem(CLAVE_CARRITO, '<<< tampoco soy json')

      montaje = montarApp()

      expect(nombresDeLasTarjetas(montaje)).toEqual([MALBEC.name, CHARDONNAY.name])
      expect(contador(montaje)).toBeNull()

      abrirCarrito(montaje)
      expect(nombresDeLasLineas(montaje)).toEqual([])
    })

    it('JSON valido que no es un array arranca con el catalogo inicial y el carrito vacio', () => {
      desmontar(montaje)
      guardarVinos({ esto: 'no es un array' })
      guardarCarrito('tampoco soy un array')

      montaje = montarApp()

      expect(nombresDeLasTarjetas(montaje)).toEqual([MALBEC.name, CHARDONNAY.name])
      expect(contador(montaje)).toBeNull()
    })

    it('un array de vinos vacio arranca con el catalogo inicial', () => {
      desmontar(montaje)
      guardarVinos([])
      guardarCarrito([])

      montaje = montarApp()

      expect(nombresDeLasTarjetas(montaje)).toEqual([MALBEC.name, CHARDONNAY.name])
      expect(contador(montaje)).toBeNull()
    })

    it('la basura se reemplaza sola por el estado limpio al arrancar', () => {
      desmontar(montaje)
      localStorage.setItem(CLAVE_VINOS, 'basura')
      localStorage.setItem(CLAVE_CARRITO, 'basura')
      montaje = montarApp()

      const vinos = JSON.parse(crudoDe(CLAVE_VINOS) ?? 'null') as Wine[]
      expect(vinos.map((vino: Wine) => vino.name)).toEqual([MALBEC.name, CHARDONNAY.name])
      expect(crudoDe(CLAVE_CARRITO)).toBe('[]')
    })
  })

  describe('RF-48 / CA-48: el filtro sobrevive a la vista rapida', () => {
    // `carta_de_catalogo.tsx` envuelve las tarjetas en un `AnimatePresence`, asi
    // que la tarjeta que se va del filtro sigue en el DOM hasta que termina su
    // animacion de salida. Por eso se espera antes de contar: no se verifica la
    // animacion (que `plan.md` §7.1 saca de alcance), solo se espera a que el DOM
    // refleje el filtro. Es lo mismo que anotaron las notas de T7.
    it('la busqueda y la categoria siguen intactas al cerrar con el control de cierre', async () => {
      escribir(montaje, BUSCADOR, 'chardonnay')
      pulsarPorTexto(montaje, 'Blanco')
      await esperarSalidas()

      expect(nombresDeLasTarjetas(montaje)).toEqual([CHARDONNAY.name])
      expect(valorDe(montaje, BUSCADOR)).toBe('chardonnay')
      expect(categoriaActiva(montaje)).toBe('Blanco')

      pulsar(montaje, 'section#catalogo h3')
      expect(hay(montaje, '[role="dialog"]')).toBe(true)
      pulsar(montaje, 'button[aria-label="Cerrar detalle"]')
      await esperarSalidas()

      expect(hay(montaje, '[role="dialog"]')).toBe(false)
      expect(valorDe(montaje, BUSCADOR)).toBe('chardonnay')
      expect(categoriaActiva(montaje)).toBe('Blanco')
      expect(nombresDeLasTarjetas(montaje)).toEqual([CHARDONNAY.name])
    })

    it('la busqueda y la categoria siguen intactas al cerrar con el fondo', async () => {
      escribir(montaje, BUSCADOR, 'gran reserva')
      pulsarPorTexto(montaje, 'Tinto')
      await esperarSalidas()

      expect(nombresDeLasTarjetas(montaje)).toEqual([MALBEC.name])
      expect(categoriaActiva(montaje)).toBe('Tinto')

      pulsar(montaje, 'section#catalogo h3')
      expect(hay(montaje, '[role="dialog"]')).toBe(true)
      cerrarPorElFondo(montaje)
      await esperarSalidas()

      expect(hay(montaje, '[role="dialog"]')).toBe(false)
      expect(valorDe(montaje, BUSCADOR)).toBe('gran reserva')
      expect(categoriaActiva(montaje)).toBe('Tinto')
      expect(nodos(montaje, 'section#catalogo h3')).toHaveLength(1)
    })
  })
})
