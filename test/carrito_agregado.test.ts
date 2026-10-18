import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { ProductoPublico } from '../src/types/producto'
import {
  CLAVE_CARRITO,
  CLAVE_PRODUCTOS,
  contador,
  desmontar,
  montarApp,
  nombresDeLasTarjetas,
  pulsarPorTexto,
  type Montaje
} from './andamiaje'

/**
 * El aviso de "se agregó al carrito" (puntos 4 y 8 de la lista de pendientes).
 *
 * ## Que se verifica
 *
 * Que al agregar un producto aparezca un cartel **que diga el nombre**, y que a
 * los 3 segundos haya desaparecido solo. El nombre es la parte que no estaba:
 * antes el unico cambio visible era el badge del carrito, que pasa de 2 a 3, y
 * eso no dice si el producto entro o no.
 *
 * ## Por que se intercepta `fetch` y no `api`
 *
 * Igual que en `test/admin/andamiaje_admin.ts`: el `AuthProvider` y el cliente
 * HTTP reales corren, y solo la red se responde con lo que el test quiere. Un
 * `vi.mock` del modulo `api` dejaria en verde un `useAuth` roto.
 *
 * Lo que no sea `/api/auth/*` o `/api/products/public` responde **404 a proposito**:
 * si la pagina pide algo mas, el test falla con el error de la API en vez de
 * mostrar una pantalla vacia que el test tomaria por una pantalla correcta.
 */

/** El stub de `/api/auth/me`: sin sesion. `401` dispara el refresh, que tambien
 *  responde `401`, y el cliente termina en `user: null` igual que en el
 *  navegador. Sin esto el navbar queda en el estado de carga. */
interface RespuestaStub {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

const respuesta = (status: number, cuerpo: unknown): RespuestaStub => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: String(status),
  json: async () => cuerpo
})

/**
 * Dos productos en la categoria "Bebidas", que es la del filtro activo.
 *
 * La categoria importa: el filtro por defecto es "Todos los productos" y no
 * descarta nada, pero si estos dos vinieran en otra categoria y el filtro
 * llegara a filtrar, las tarjetas no se verian y `pulsarPorTexto` fallaria con
 * un error de "no se encontro el boton" que parece un problema de selector.
 */
const VINOS: ProductoPublico[] = [
  {
    id: 'v1',
    name: 'Malbec Reserva',
    winery: 'Bodega Norte',
    varietal: 'Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: 2021,
    price: 18500,
    description: 'Un tinto de cuerpo medio.',
    tastingNotes: null,
    foodPairing: null,
    imageUrl: '/producto-1.jpg'
  },
  {
    id: 'v2',
    name: 'Chardonnay',
    winery: 'Bodega Sur',
    varietal: 'Chardonnay',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: 2022,
    price: 21000,
    description: 'Blanco fresco.',
    tastingNotes: null,
    foodPairing: null,
    imageUrl: '/producto-2.jpg'
  }
]

const fetchConCatalogo = (): typeof fetch =>
  vi.fn(async (entrada: RequestInfo | URL) => {
    const url = String(entrada)

    if (url.endsWith('/api/auth/me')) {
      return respuesta(401, { message: 'Sesión expirada' })
    }
    if (url.endsWith('/api/auth/refresh')) {
      return respuesta(401, { message: 'Sin refresh' })
    }
    if (url.endsWith('/api/products/public')) {
      return respuesta(200, VINOS)
    }

    return respuesta(404, { message: `Sin stub para ${url}` })
  }) as unknown as typeof fetch

/**
 * Espera a que se cumpla `prueba`, dejando correr el reloj entre intento e
 * intento.
 *
 * Montar `App` no alcanza: el catalogo pide los productos por red y las
 * tarjetas aparecen **despues** del primer render. Sin esta espera, `App` esta
 * montado y el catalogo sigue en su estado de carga.
 */
const esperarA = async (prueba: () => boolean, intentos = 40): Promise<void> => {
  for (let i = 0; i < intentos; i++) {
    if (prueba()) return
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 10))
    })
  }
  throw new Error('La condicion no se cumplio dentro de los intentos dados')
}

/** Monta la app y espera a que el catalogo muestre las dos tarjetas. */
const montarTienda = async (): Promise<Montaje> => {
  const montaje = montarApp()
  await esperarA(() => nombresDeLasTarjetas(montaje).length === VINOS.length)
  return montaje
}

/** El texto del aviso, o `null` si no hay ninguno montado. */
const aviso = (montaje: Montaje): string | null =>
  montaje.contenedor.querySelector('[role="status"]')?.textContent ?? null

/**
 * Espera `milisegundos` reales.
 *
 * Se usa el reloj real y no `vi.useFakeTimers()` a proposito: el aviso se borra
 * con un `setTimeout` de 3 segundos dentro de un `useEffect`, y con relojes
 * falsos hay que acordarse de limpiar el `act` pendiente o el `unmount` deja el
 * temporizador vivo. Son 3 segundos de suite, que es lo que cuesta afirmar que
 * dura 3 segundos y no "un rato".
 */
const esperar = async (milisegundos: number): Promise<void> => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, milisegundos))
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchConCatalogo())
  localStorage.removeItem(CLAVE_PRODUCTOS)
  localStorage.removeItem(CLAVE_CARRITO)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('al agregar un producto al carrito', () => {
  it('no hay ningun aviso antes de agregar nada', async () => {
    // Guarda contra un falso verde: si el `<p role='status'>` se renderizara
    // siempre, las dos aserciones de abajo darian verde sin que el aviso
    // dependiera del clic.
    const montaje = await montarTienda()

    expect(aviso(montaje)).toBeNull()

    desmontar(montaje)
  })

  it('aparece un cartel que dice que se agrego y el nombre del producto', async () => {
    const montaje = await montarTienda()

    pulsarPorTexto(montaje, 'Agregar')

    const texto = aviso(montaje)
    expect(texto).not.toBeNull()
    expect(texto).toContain('se agregó al carrito')
    expect(texto).toContain('Malbec Reserva')

    desmontar(montaje)
  })

  it('el carrito recibi el producto tambien, no solo el aviso', async () => {
    // El aviso puede estar bien y el carrito mal: son dos estados distintos. Un
    // cartel que anuncia algo que no paso es peor que ningun cartel.
    const montaje = await montarTienda()

    expect(contador(montaje)).toBeNull()
    pulsarPorTexto(montaje, 'Agregar')

    expect(contador(montaje)).toBe('1')

    desmontar(montaje)
  })

  it('el cartel sigue ahí a los 2,5 segundos', async () => {
    const montaje = await montarTienda()

    pulsarPorTexto(montaje, 'Agregar')
    await esperar(2500)

    expect(aviso(montaje)).not.toBeNull()

    desmontar(montaje)
  })

  it('el cartel desaparece solo a los 3 segundos', async () => {
    const montaje = await montarTienda()

    pulsarPorTexto(montaje, 'Agregar')
    await esperar(3200)

    expect(aviso(montaje)).toBeNull()

    desmontar(montaje)
  })

  it('agregar dos veces el mismo producto lo deja anunciado de nuevo', async () => {
    // El aviso tiene que **volver a 3 segundos** con cada clic, no seguir con lo
    // que le falte al primero. Es lo que falla si el estado que dispara el
    // temporizador se guarda como el nombre pelado: dos clics sobre el mismo
    // producto dejan un valor identico, React no ve cambio, el `setTimeout` no se
    // renueva y a los 3 segundos del primer clic el aviso desaparece mientras el
    // segundo todavia deberia estar en pantalla.
    const montaje = await montarTienda()

    pulsarPorTexto(montaje, 'Agregar')
    await esperar(2000)
    pulsarPorTexto(montaje, 'Agregar')
    await esperar(2000)

    expect(aviso(montaje)).not.toBeNull()

    desmontar(montaje)
  })
})
