import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { ProductoPublico } from '../src/types/producto'
import {
  desmontar,
  hay,
  montarApp,
  nombresDeLasTarjetas,
  nodos,
  pulsarNodo,
  type Montaje
} from './andamiaje'

/**
 * Las tarjetas de "¿Qué estás buscando?" **entran** al catálogo.
 *
 * ## Que se verifica, y por que importa
 *
 * Que tocar una tarjeta de la home **elige ese departamento** en el filtro del
 * catálogo. Estas tarjetas eran decorativas: el boceto decía que no tenían que
 * funcionar todavía, así que eran `<button>` sin `onClick`, con hover y nada
 * más. Con la tienda ya armada y para compartir, una tarjeta de "Bebidas" que al
 * tocarla no hace nada es un botón roto — y es lo primero que prueba un visitante.
 *
 * ## Por qué este test mira el filtro y no "que no falle"
 *
 * El componente ya era un `<button>`, ya tenía texto, ya tenía ícono: un test que
 * verificara "existe un botón con el texto Bebidas" pasaba desde antes de que esto
 * funcionara. La pregunta útil es **qué pasa después de tocarlo**, y la respuesta
 * observable es que el filtro de abajo cambia: aparece la fila "Grupo", que solo
 * se renderiza cuando hay un departamento elegido.
 *
 * Esa fila es el testigo, y es un hecho de renderizado, no un detalle de estilo:
 * no necesita estilos ni medidas. Y el segundo test va un paso más allá, porque
 * que la fila aparezca no dice que el filtro **filtre**: si el estado se moviera
 * sin pasar por `filtrarVinos`, aparecería "Grupo" y seguirían las tres tarjetas.
 *
 * ## Por qué `fetch` y no `vi.mock` del módulo `api`
 *
 * Igual que en `test/carrito_agregado.test.ts` y `test/admin/andamiaje_admin.ts`:
 * el `AuthProvider` y el cliente HTTP reales corren, y solo la red se responde
 * con lo que el test quiere. Un `vi.mock` del cliente pasaría igual y dejaría en
 * verde un `useAuth` roto.
 */

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

const producto = (over: Partial<ProductoPublico> & { id: string }): ProductoPublico => ({
  name: 'Producto',
  winery: null,
  varietal: null,
  category: 'Vinos',
  departamento: 'Bebidas',
  grupo: 'Con alcohol',
  tipoVino: null,
  vintage: null,
  price: 10000,
  description: 'Producto de prueba.',
  tastingNotes: null,
  foodPairing: null,
  imageUrl: '/producto.jpg',
  ...over
})

/**
 * Un producto por rama, para que el filtro tenga algo que descartar.
 *
 * Si todos fueran de "Bebidas", tocar "Regalos" vaciaría la grilla y el test
 * vería "no hay tarjetas" — que también es lo que se vería si el filtro anduviera
 * mal. Con productos en las tres ramas, la diferencia se lee: queda **solo** el
 * del departamento tocado.
 */
const CATALOGO: ProductoPublico[] = [
  producto({ id: 'v1', name: 'Malbec Reserva', departamento: 'Bebidas' }),
  producto({
    id: 'c1',
    name: 'Set de Copas',
    category: 'Vajilla',
    departamento: 'Regalos',
    grupo: null
  }),
  producto({
    id: 's1',
    name: 'Chocolate Amargo',
    category: 'Chocolates',
    departamento: 'Snacks y dulces',
    grupo: null
  })
]

const fetchConCatalogo = (): typeof fetch =>
  vi.fn(async (entrada: RequestInfo | URL) => {
    const url = String(entrada)

    if (url.endsWith('/api/auth/me')) return respuesta(401, { message: 'Sesion expirada' })
    if (url.endsWith('/api/auth/refresh')) return respuesta(401, { message: 'Sin refresh' })
    if (url.endsWith('/api/products/public')) return respuesta(200, CATALOGO)

    return respuesta(404, { message: `Sin stub para ${url}` })
  }) as unknown as typeof fetch

/** Espera a que se cumpla `prueba`, dejando correr el reloj entre intento e intento. */
const esperarA = async (prueba: () => boolean, intentos = 40): Promise<void> => {
  for (let i = 0; i < intentos; i++) {
    if (prueba()) return
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 10))
    })
  }
  throw new Error('La condicion no se cumplio dentro de los intentos dados')
}

/** Monta la app y espera a que el catálogo muestre las tres tarjetas. */
const montarTienda = async (): Promise<Montaje> => {
  const montaje = montarApp()
  await esperarA(() => nombresDeLasTarjetas(montaje).length === CATALOGO.length)
  return montaje
}

/**
 * El departamento que quedó activo en el filtro, o `null` si quedó "Todos".
 *
 * ## Por qué el botón activo y no la fila "Grupo"
 *
 * La primera versión de este test usaba la fila "Grupo" como testigo —solo se
 * renderiza cuando hay un departamento elegido— y **falló en tres de los cuatro
 * departamentos**: la fila aparece si `gruposDe(departamento).length > 0`, y
 * Regalos, Listo para comer y Snacks no tienen grupos. O sea que el testigo solo
 * servía para Bebidas.
 *
 * El botón de la fila "Departamento" está siempre, y `aria-pressed` dice cuál.
 * Se lee por `aria-pressed` y no por la clase de Tailwind: el estado activo es
 * un hecho del markup, la clase es presentacion.
 */
const departamentoActivo = (montaje: Montaje): string | null => {
  const activo = nodos(montaje, '#catalogo button[aria-pressed="true"]').find(
    (b) => (b.textContent?.trim() ?? '') !== 'Todos'
  )

  return activo?.textContent?.trim() ?? null
}

/** Los botones del filtro que quedaron marcados como activos, en orden. */
const activosDelFiltro = (montaje: Montaje): string[] =>
  nodos(montaje, '#catalogo button[aria-pressed="true"]').map(
    (b) => b.textContent?.trim() ?? ''
  )

/**
 * La sección de "¿Qué estás buscando?".
 *
 * Se ubica por el `h2` y no por "`section button`": ese selector también agarra
 * los botones del filtro del catálogo, que están dentro de un `<section>` con el
 * mismo `id`. Con el `h2` la pregunta es "cuántas tarjetas tiene la home", que es
 * la que se quiere.
 */
const seccionDeTarjetas = (montaje: Montaje): Element | null => {
  const seccion = [...montaje.contenedor.querySelectorAll('section')].find((s) =>
    s.querySelector('h2')?.textContent?.includes('¿Qué estás buscando')
  )

  return seccion ?? null
}

/** La tarjeta de la home con ese nombre de departamento. */
const tarjeta = (montaje: Montaje, etiqueta: string): HTMLElement => {
  const seccion = seccionDeTarjetas(montaje)

  if (seccion === null) throw new Error('No se encontro la seccion de las tarjetas')

  const boton = [...seccion.querySelectorAll('button')].find(
    (b) => b.querySelector('h3')?.textContent?.trim() === etiqueta
  )

  if (!(boton instanceof HTMLElement)) {
    throw new Error(`No se encontro la tarjeta de "${etiqueta}"`)
  }

  return boton
}

/** Un boton del filtro del catálogo por su texto exacto. */
const botonDelFiltro = (montaje: Montaje, texto: string): HTMLElement => {
  const boton = nodos(montaje, '#catalogo button').find(
    (b) => b.textContent?.trim() === texto
  )

  if (!(boton instanceof HTMLElement)) {
    throw new Error(`No se encontro el boton "${texto}" del filtro`)
  }

  return boton
}

let montaje: Montaje | null = null

beforeEach(() => {
  vi.stubGlobal('fetch', fetchConCatalogo())
  // jsdom no implementa `scrollIntoView`: sin esto, tocar una tarjeta revienta con
  // "is not a function" y el test falla por el stub, no por lo que verifica.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  if (montaje !== null) {
    desmontar(montaje)
    montaje = null
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('las tarjetas de la home llevan al catalogo', () => {
  it('tocar "Bebidas" deja ese departamento activo en el filtro', async () => {
    montaje = await montarTienda()

    pulsarNodo(tarjeta(montaje, 'Bebidas'))

    expect(departamentoActivo(montaje)).toBe('Bebidas')
    expect(activosDelFiltro(montaje)).toContain('Bebidas')
  })

  it('tocar "Regalos" deja solo los productos de Regalos', async () => {
    // Esta es la que de verdad importa: que el botón quede marcado no dice que el
    // filtro **filtre**. Si el estado se moviera sin pasar por `filtrarVinos`, el
    // botón se marcaría igual y seguirían las tres tarjetas en pantalla.
    montaje = await montarTienda()

    pulsarNodo(tarjeta(montaje, 'Regalos'))

    expect(departamentoActivo(montaje)).toBe('Regalos')
    expect(nombresDeLasTarjetas(montaje)).toEqual(['Set de Copas'])
  })

  it('cada tarjeta filtra por su departamento', async () => {
    // Los cuatro, y no solo uno: un `onClick` cableado al valor equivocado
    // —siempre "Bebidas", siempre el primero— pasa el test anterior si el primero
    // de la lista es el que se toca.
    montaje = await montarTienda()

    pulsarNodo(tarjeta(montaje, 'Snacks y dulces'))
    expect(nombresDeLasTarjetas(montaje)).toEqual(['Chocolate Amargo'])

    pulsarNodo(tarjeta(montaje, 'Bebidas'))
    expect(nombresDeLasTarjetas(montaje)).toEqual(['Malbec Reserva'])
  })

  it('el grupo y la categoria se limpian al cambiar de departamento desde la home', async () => {
    // El bug que se evita: se elige "Bebidas" + "Con alcohol" + "Vinos", después
    // se toca "Regalos" arriba, y el filtro queda diciendo "Tipo de producto:
    // Vinos" sobre productos de regalería. Grilla vacía y un filtro que dice una
    // cosa y muestra otra: el filtro más confuso que se puede construir.
    montaje = await montarTienda()

    pulsarNodo(botonDelFiltro(montaje, 'Bebidas'))
    pulsarNodo(botonDelFiltro(montaje, 'Con alcohol'))
    pulsarNodo(botonDelFiltro(montaje, 'Vinos'))

    // Ahora se llega desde la home, que es el camino que **no** pasa por el
    // manejador del catálogo: por eso el reset está en un `useEffect` sobre
    // `departamento` y no dentro de `elegirDepartamento`.
    pulsarNodo(tarjeta(montaje, 'Regalos'))

    expect(nombresDeLasTarjetas(montaje)).toEqual(['Set de Copas'])
    expect(activosDelFiltro(montaje).filter((t) => t === 'Con alcohol' || t === 'Vinos')).toEqual(
      []
    )
  })

  it('baja al catalogo al tocar una tarjeta', async () => {
    // Sin el scroll, en una página larga el usuario toca "Bebidas" y no ve nada
    // cambiar: el filtro cambió dos mil píxeles más abajo. El síntoma es
    // **idéntico** al de una tarjeta sin `onClick`, y por eso un botón que sí
    // funciona se ve roto.
    montaje = await montarTienda()
    const scrollear = vi.spyOn(Element.prototype, 'scrollIntoView')

    pulsarNodo(tarjeta(montaje, 'Bebidas'))

    expect(scrollear).toHaveBeenCalled()
  })

  it('cada departamento tiene su tarjeta, con un aria-label que nombra la accion', async () => {
    // Un `<button>` sin nombre accesible no lo encuentra el lector de pantalla ni
    // se puede seleccionar por su etiqueta. El texto visible ("Bebidas") es el
    // nombre de la **tarjeta**; lo que hay que anunciar es la **acción**.
    montaje = await montarTienda()

    for (const etiqueta of ['Bebidas', 'Regalos', 'Listo para comer', 'Snacks y dulces']) {
      const boton = tarjeta(montaje, etiqueta)

      expect(boton.getAttribute('aria-label')).toBe(`Ver productos de ${etiqueta}`)
    }

    // Y que no haya una quinta tarjeta fantasma.
    expect(seccionDeTarjetas(montaje)?.querySelectorAll('button')).toHaveLength(4)
  })

  it('sin tocar ninguna tarjeta el catalogo arranca sin filtro y con todo', async () => {
    // El otro lado: que el estado nuevo no haya cambiado el punto de partida. Sin
    // esto, un `departamento` que arranque en algo distinto de `''` dejaría la
    // tienda filtrada de entrada sin que nadie lo haya pedido.
    montaje = await montarTienda()

    expect(departamentoActivo(montaje)).toBeNull()
    expect(nombresDeLasTarjetas(montaje)).toEqual([
      'Malbec Reserva',
      'Set de Copas',
      'Chocolate Amargo'
    ])
    expect(hay(montaje, '#catalogo')).toBe(true)
  })
})
