import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import {
  CLAVE_CARRITO,
  CLAVE_PRODUCTOS,
  abrirCarrito,
  desmontar,
  escribir,
  hay,
  montarApp,
  nodo,
  pulsarPorTexto,
  textoDe,
  type Montaje
} from './andamiaje'
import { type PedidoPublico } from '../src/types/checkout'
import { INTERVALO_DE_POLLING_MS } from '../src/pages/pedido'
import type { Producto } from '../src/types/producto'

/**
 * El checkout y la pagina del pedido, **montados** (spec 009 y spec 012).
 *
 * `checkout_reglas.test.ts` prueba las reglas puras. Aca va lo que **solo se ve
 * con el componente en pantalla**: que se llame a la API con lo que tiene que
 * ser, que despues de crear el pedido el comprador caiga en `/pedido/:token`, y
 * que esa pagina muestre el estado **real** del pago.
 *
 * ## Por que se intercepta `fetch` y no el modulo `api`
 *
 * Igual que en `test/admin/`: el cliente HTTP real corre y solo se responde lo
 * que el test quiere. Un `vi.mock` de `api` pasaria igual y dejaria en verde un
 * `crearPedido` roto.
 *
 * Cualquier ruta que el test no conozca responde **404**: si la pagina
 * preguntara algo inesperado, el test lo ve como un error en pantalla en vez de
 * tomar una pantalla vacia por una pantalla correcta.
 */

const VINO: Producto = {
  id: 'clx111111111',
  name: 'Gran Reserva Malbec',
  winery: 'Bodega Andes',
  varietal: 'Malbec',
  category: 'Vinos',
  departamento: 'Bebidas',
  grupo: 'Con alcohol',
  tipoVino: 'Tinto',
  vintage: 2020,
  price: 7500,
  description: 'Un Malbec de altura.',
  imageUrl: 'https://ejemplo.test/vino.webp'
}

const CARRITO = [{ product: VINO, quantity: 2 }]

/** Token publico que devuelve el checkout y que va en la URL del pedido. */
const TOKEN = '11111111-2222-3333-4444-555555555555'

const PEDIDO_BASE: PedidoPublico = {
  orderToken: TOKEN,
  referencia: '11111111',
  modo: 'nave',
  estado: 'pendiente',
  pagoEstado: 'pendiente',
  total: 15000,
  creadoEn: '2026-10-28T12:00:00.000Z',
  items: [{ nombre: 'Gran Reserva Malbec', cantidad: 2, precio: 7500 }],
  pago: {
    estado: 'pendiente',
    link: 'https://nave.test/pagar/abc',
    qr: {
      imagenUrl: 'https://nave.test/pagar/abc/qr.svg',
      payload: 'NAVE-SIMULADO:abc:15000'
    },
    expiraEn: '2026-10-28T13:00:00.000Z'
  },
  instrucciones: null
}

const pedidoPublico = (cambios: Partial<PedidoPublico> = {}): PedidoPublico => ({
  ...PEDIDO_BASE,
  ...cambios
})

let montaje: Montaje | null = null

/** Lo que se mando a `POST /api/orders`, o `null` si no se llamo. */
let llamado: { url: string; cuerpo: unknown } | null = null

/** Lo que devuelve `POST /api/orders`. Puede ser una promesa (test de espera). */
let devolver: (url: string) => unknown = () => ({})

/** El status con el que responde el checkout. Cambiarlo es como se prueba el fallo. */
let statusRespuesta = 201

/** Lo que devuelve `GET /api/track/:token` y con que status. */
let pedidoEnLaApi: PedidoPublico = pedidoPublico()
let statusDelPedido = 200
let cuerpoDelPedido: unknown = pedidoEnLaApi

/** Cuantas veces se pidio un link nuevo (`POST /api/track/:token/pay`). */
let reintentos = 0
/** Se ejecuta antes de responder el reintento, para simular el cambio de estado. */
let alReintentar: (() => void) | null = null

/**
 * Se guarda la referencia al doble.
 *
 * `vi.stubGlobal` instala la funcion pero **`vi.mocked(fetch)` no la ve**: el
 * espia del modulo global no cambia cuando se reemplaza la funcion. Guardar el
 * `vi.fn` aqui es lo que permite afirmar "no se consulto nada".
 */
let dobleFetch: ReturnType<typeof vi.fn>

/**
 * jsdom **no** navega: `location.assign` avisa por consola virtual y sigue. Sin
 * este espia, el redirect de la tienda al checkout seria un error rojo en cada
 * test.
 */
let asignar: ReturnType<typeof vi.fn>

const json = (cuerpo: unknown, status = 200): Response =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify([VINO]))
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(CARRITO))

  llamado = null
  devolver = () => ({
    modo: 'nave',
    orderId: 'ord_1',
    orderToken: TOKEN,
    preferenceId: 'pref-1',
    initPoint: 'https://nave.test/pagar/abc',
    qr: { imagenUrl: 'https://nave.test/pagar/abc/qr.svg', payload: 'NAVE-SIMULADO:abc:15000' },
    expiraEn: '2026-10-28T13:00:00.000Z',
    total: 15000
  })
  statusRespuesta = 201

  pedidoEnLaApi = pedidoPublico()
  statusDelPedido = 200
  cuerpoDelPedido = pedidoEnLaApi
  reintentos = 0
  alReintentar = null

  dobleFetch = vi.fn(async (url: string, init?: RequestInit) => {
    const ruta = String(url)
    const metodo = init?.method ?? 'GET'

    // --- Reintento del cobro desde la pagina del pedido.
    if (ruta.includes('/api/track/') && ruta.endsWith('/pay') && metodo === 'POST') {
      reintentos += 1
      alReintentar?.()
      return json(
        {
          modo: 'nave',
          orderId: 'ord_1',
          orderToken: TOKEN,
          preferenceId: 'pref-2',
          initPoint: 'https://nave.test/pagar/nuevo',
          total: 15000
        },
        201
      )
    }

    // --- La pagina del pedido consulta su estado.
    if (ruta.includes('/api/track/') && metodo === 'GET') {
      return json(cuerpoDelPedido, statusDelPedido)
    }

    if (!ruta.endsWith('/api/orders') || metodo !== 'POST') {
      // Cualquier otra consulta es un fallo del test, no un 404 tolerado.
      return json({ code: 'NOT_FOUND', message: ruta }, 404)
    }

    llamado = { url: ruta, cuerpo: JSON.parse(String(init?.body)) }
    const respuesta = await Promise.resolve(devolver(ruta))

    return json(respuesta, statusRespuesta)
  })

  vi.stubGlobal('fetch', dobleFetch)

  asignar = vi.fn()

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      assign: asignar,
      href: 'http://localhost:5173/checkout',
      origin: 'http://localhost:5173',
      pathname: '/checkout',
      search: '',
      toString: () => 'http://localhost:5173/checkout'
    }
  })
})

afterEach(() => {
  if (montaje !== null) desmontar(montaje)
  montaje = null

  vi.useRealTimers()

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: window.location
  })

  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const montar = (ruta: string): Montaje => {
  montaje = montarApp(ruta)
  return montaje
}

/** Espera a que el `fetch`, el `json()` y los efectos se resuelvan. */
const resolver = async (): Promise<void> => {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve()
  })
}

const llenar = (m: Montaje): void => {
  escribir(m, '#checkout-nombre', 'María')
  escribir(m, '#checkout-apellido', 'González')
  escribir(m, '#checkout-telefono', '11 1234-5678')
  escribir(m, '#checkout-email', 'maria@example.com')
  escribir(m, '#checkout-direccion', 'Av. Corrientes 1234')
}

const boton = (m: Montaje): HTMLButtonElement => {
  const encontrado = m.contenedor.querySelector('button[type="submit"]')
  if (!(encontrado instanceof HTMLButtonElement)) throw new Error('No hay boton de envio')
  return encontrado
}

const buscarBoton = (m: Montaje, texto: string): HTMLButtonElement | null => {
  const encontrado = [...m.contenedor.querySelectorAll('button')].find(
    (candidato) => candidato.textContent?.includes(texto) ?? false
  )
  return encontrado instanceof HTMLButtonElement ? encontrado : null
}

const buscarEnlace = (m: Montaje, texto: string): HTMLAnchorElement | null => {
  const encontrado = [...m.contenedor.querySelectorAll('a')].find(
    (candidato) => candidato.textContent?.includes(texto) ?? false
  )
  return encontrado instanceof HTMLAnchorElement ? encontrado : null
}

describe('el formulario', () => {
  it('se abre en /checkout, no en la tienda', () => {
    const m = montar('/checkout')

    // La tienda tiene su propio chrome; el checkout es una pantalla sola.
    expect(hay(m, 'form')).toBe(true)
    expect(textoDe(m, 'form') === '').toBe(false)
  })

  it('el boton arranca deshabilitado', () => {
    const m = montar('/checkout')

    expect(boton(m).disabled).toBe(true)
  })

  it('con cinco campos se habilita', () => {
    const m = montar('/checkout')

    llenar(m)

    expect(boton(m).disabled).toBe(false)
  })

  it('NO hay campo de contrasena ni de DNI', () => {
    const m = montar('/checkout')

    // RF-01: el comprador no tiene cuenta. Pedirla seria un formulario que
    // promete algo que no existe del lado del backend.
    const tipos = [...m.contenedor.querySelectorAll('input')].map((i) => i.type)

    expect(tipos).not.toContain('password')
    expect(m.contenedor.querySelector('input[name="dni"]')).toBeNull()
  })

  it('el email esta entre los campos y es obligatorio', () => {
    const m = montar('/checkout')

    const email = nodo(m, '#checkout-email') as HTMLInputElement

    expect(email).toBeDefined()
    // Sin el `required` del navegador el boton igual no se habilita, pero el
    // campo tiene que **decir** que es obligatorio.
    expect(textoDe(m, 'label[for="checkout-email"]')).toContain('Email')
  })

  it('un campo tocado y vacio muestra el error DEBAJO, no arriba', () => {
    const m = montar('/checkout')

    const campo = nodo(m, '#checkout-nombre')
    act(() => {
      // `focusout`, no `blur`. Desde React 17 los eventos se enganchan en la raiz
      // y `onBlur` esta mapeado al `focusout` nativo, que **burbujea**; el
      // `blur` clasico no llega nunca. Despachar `blur` aqui pasaria en verde
      // con un aserto que en el navegador no podria cumplirse.
      campo.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })

    const error = nodo(m, '#error-nombre')

    expect(error.textContent).toContain('obligatorio')
    // Esta vez si importa el orden: el mensaje tiene que estar despues del
    // input, porque arriba el usuario tendria que volver a buscar el campo.
    expect(campo.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('un formulario recien abierto no muestra errores', () => {
    const m = montar('/checkout')

    expect(m.contenedor.querySelectorAll('[id^="error-"]')).toHaveLength(0)
  })
})

describe('lo que se manda', () => {
  it('manda el cuerpo del comprador y los items', async () => {
    const m = montar('/checkout')

    llenar(m)
    pulsarPorTexto(m, 'Finalizar pedido')
    await resolver()

    expect(llamado).not.toBeNull()
    expect(llamado!.cuerpo).toMatchObject({
      nombre: 'María',
      apellido: 'González',
      email: 'maria@example.com',
      direccion: 'Av. Corrientes 1234'
    })
  })

  it('NO manda ningun precio', async () => {
    const m = montar('/checkout')

    llenar(m)
    pulsarPorTexto(m, 'Finalizar pedido')
    await resolver()

    // El carrito vive en el `localStorage` del navegador: quien quiera puede
    // mandar el pedido a $2. El frontend no lo manda **y** el backend lo rechaza
    // (schema `.strict()` de T2). Las dos capas.
    const cuerpo = JSON.stringify(llamado!.cuerpo)

    expect(cuerpo).not.toContain('precio')
    expect(cuerpo).not.toContain('price')
    expect(cuerpo).not.toContain('total')
  })

  it('los items son id y cantidad, nada mas', async () => {
    const m = montar('/checkout')

    llenar(m)
    pulsarPorTexto(m, 'Finalizar pedido')
    await resolver()

    const cuerpo = llamado!.cuerpo as { items: unknown }

    expect(cuerpo.items).toEqual([{ vinoId: 'clx111111111', cantidad: 2 }])
  })
})

describe('despues de crear el pedido', () => {
  it('navega a /pedido/:token, no a una URL del proveedor', async () => {
    const m = montar('/checkout')

    llenar(m)
    pulsarPorTexto(m, 'Finalizar pedido')
    await resolver()

    // La pagina del pedido es una ruta de la SPA: se puede recargar y no
    // depende de que el proveedor devuelva a la persona con un query param.
    const rutas = dobleFetch.mock.calls.map(([url]) => String(url))
    expect(rutas.some((ruta) => ruta.includes(`/api/track/${TOKEN}`))).toBe(true)

    // Y el checkout ya no manda a nadie fuera de la tienda.
    expect(asignar).not.toHaveBeenCalled()
  })

  it('el boton dice que esta creando mientras espera', async () => {
    let soltar: (() => void) | null = null

    devolver = () =>
      new Promise((resolverPeticion) => {
        soltar = () =>
          resolverPeticion({
            modo: 'nave',
            orderId: 'ord_1',
            orderToken: TOKEN,
            initPoint: 'https://nave.test/pagar/abc',
            total: 15000
          })
      })

    const m = montar('/checkout')

    llenar(m)
    pulsarPorTexto(m, 'Finalizar pedido')

    expect(textoDe(m, 'button[type="submit"]')).toContain('Creando')
    // Y el boton no se puede apretar dos veces: dos pedidos, dos cobros, y solo
    // uno se paga.
    expect(boton(m).disabled).toBe(true)

    await act(async () => {
      soltar?.()
      for (let i = 0; i < 10; i += 1) await Promise.resolve()
    })
  })

  it('si la API falla, muestra el error y NO navega', async () => {
    statusRespuesta = 400
    devolver = () => ({
      code: 'WINE_NOT_AVAILABLE',
      message: 'Estos vinos ya no estan disponibles: clx111111111'
    })

    const m = montar('/checkout')

    llenar(m)
    pulsarPorTexto(m, 'Finalizar pedido')
    await resolver()

    const alertas = m.contenedor.querySelectorAll('[role="alert"]')

    expect(alertas.length).toBeGreaterThan(0)
    expect(textoDe(m, '[role="alert"]')).toContain('ya no estan disponibles')
    // Y el boton vuelve a estar disponible para reintentar.
    expect(boton(m).disabled).toBe(false)
  })

  it('el boton sigue deshabilitado si falta un campo', async () => {
    const m = montar('/checkout')

    escribir(m, '#checkout-nombre', 'María')
    escribir(m, '#checkout-apellido', 'González')
    // faltan telefono, email y direccion

    pulsarPorTexto(m, 'Finalizar pedido')
    await resolver()

    expect(llamado).toBeNull()
  })
})

describe('la pagina del pedido', () => {
  it('muestra el estado real que devuelve la API', async () => {
    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    const texto = m.contenedor.textContent ?? ''

    expect(texto).toContain('Tu pedido')
    expect(texto).toContain('Esperando el pago')
    expect(texto).toContain('Gran Reserva Malbec')
    expect(texto).toContain('15.000')
    // La referencia corta, no el id interno (que ni siquiera viaja).
    expect(texto).toContain('11111111')
  })

  it('con el pago pendiente muestra el QR y el link', async () => {
    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    const qr = nodo(m, 'img[alt="Código QR para pagar"]') as HTMLImageElement
    expect(qr.src).toContain('/qr.svg')

    // El payload tambien, para quien paga pegando el codigo en el banco.
    expect(m.contenedor.textContent ?? '').toContain('NAVE-SIMULADO:abc:15000')

    const enlace = buscarEnlace(m, 'Abrir el link de pago')
    expect(enlace?.getAttribute('href')).toBe('https://nave.test/pagar/abc')
    expect(enlace?.getAttribute('target')).toBe('_blank')
  })

  it('un intento sin link no muestra una tarjeta de pago vacia', async () => {
    // El proveedor fallo antes de devolver el link: el intento existe pero no
    // tiene nada que pagar. Mostrar "Escanéalo" sin QR seria una pantalla que
    // promete algo que no esta; el camino es generar un link nuevo.
    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'no_iniciado',
      pago: { estado: 'expirado', link: null, qr: null, expiraEn: null }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    expect(m.contenedor.textContent ?? '').not.toContain('Pagá ahora')
    expect(m.contenedor.querySelector('img[alt="Código QR para pagar"]')).toBeNull()
    expect(buscarBoton(m, 'Generar link nuevo')).not.toBeNull()
  })

  it('un pago aprobado vacia el carrito', async () => {
    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'aprobado',
      pago: {
        estado: 'aprobado',
        link: null,
        qr: null,
        expiraEn: null
      }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    expect(m.contenedor.textContent ?? '').toContain('Pago aprobado')

    // D-D: el carrito se vacia **solo** con el pago aprobado. Si no, el
    // comprador paga y vuelve a la tienda con el carrito lleno.
    expect(JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? '[]')).toHaveLength(0)

    // No se ofrece pagar de nuevo algo que ya se pago.
    expect(buscarBoton(m, 'Generar link nuevo')).toBeNull()
    expect(m.contenedor.querySelector('img[alt="Código QR para pagar"]')).toBeNull()
  })

  it('un pago rechazado avisa y ofrece generar otro link', async () => {
    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'rechazado',
      pago: {
        estado: 'rechazado',
        link: 'https://nave.test/pagar/abc',
        qr: null,
        expiraEn: null
      }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    const texto = m.contenedor.textContent ?? ''
    expect(texto).toContain('El pago no se completó')
    expect(buscarBoton(m, 'Generar link nuevo')).not.toBeNull()
    // El carrito sobrevive: el comprador puede reintentar sin armar el pedido
    // de nuevo.
    expect(JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? '[]')).toHaveLength(1)
  })

  it('un link vencido avisa que vencio, no que fallo el pago', async () => {
    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'expirado',
      pago: {
        estado: 'expirado',
        link: 'https://nave.test/pagar/abc',
        qr: null,
        expiraEn: '2020-01-01T00:00:00.000Z'
      }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    const texto = m.contenedor.textContent ?? ''
    expect(texto).toContain('El link de pago venció')
    expect(texto).not.toContain('El pago no se completó')
    expect(buscarBoton(m, 'Generar link nuevo')).not.toBeNull()
  })

  it('un intento vencido no deja la pagina diciendo "esperando"', async () => {
    // El cron de expiracion marca el **intento**, no `Order.pagoEstado`: para el
    // pedido nadie pago. Si la pagina mirara solo el pedido, mostraria
    // "Esperando el pago" con un link que ya no sirve.
    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'pendiente',
      pago: {
        estado: 'expirado',
        link: 'https://nave.test/pagar/abc',
        qr: null,
        expiraEn: '2020-01-01T00:00:00.000Z'
      }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    const texto = m.contenedor.textContent ?? ''
    expect(texto).toContain('El link de pago venció')
    expect(texto).not.toContain('Esperando el pago')
    expect(buscarBoton(m, 'Generar link nuevo')).not.toBeNull()
    expect(buscarEnlace(m, 'Abrir el link de pago')).toBeNull()
  })

  it('el link sigue visible si el pedido expiro pero el link no vencio', async () => {
    // `expirarPedidosSinPagar` usa la ventana de 10 minutos de Mercado Pago; el
    // link de Nave vive 30. Entre el minuto 10 y el 30 el pedido esta
    // `expirado` en el panel pero el comprador todavia puede pagar: ocultarle el
    // link lo manda a generar otro (o a irse) con uno que funciona.
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'expirado',
      pago: {
        estado: 'pendiente',
        link: 'https://nave.test/pagar/vigente',
        qr: null,
        expiraEn: enUnaHora
      }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    const texto = m.contenedor.textContent ?? ''
    expect(texto).toContain('Esperando el pago')
    expect(texto).not.toContain('El link de pago venció')
    expect(buscarEnlace(m, 'Abrir el link de pago')?.getAttribute('href')).toBe(
      'https://nave.test/pagar/vigente'
    )
  })

  it('generar un link nuevo pide el cobro y refresca el estado', async () => {
    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'expirado',
      pago: {
        estado: 'expirado',
        link: 'https://nave.test/pagar/viejo',
        qr: null,
        expiraEn: null
      }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    alReintentar = () => {
      cuerpoDelPedido = pedidoPublico({
        pagoEstado: 'pendiente',
        pago: {
          estado: 'pendiente',
          link: 'https://nave.test/pagar/nuevo',
          qr: { imagenUrl: 'https://nave.test/pagar/nuevo/qr.svg' },
          expiraEn: '2026-10-28T14:00:00.000Z'
        }
      })
    }

    pulsarPorTexto(m, 'Generar link nuevo')
    await resolver()

    expect(reintentos).toBe(1)
    // El link nuevo sale de la **consulta**, no de la respuesta del reintento:
    // el estado lo manda la API.
    expect(buscarEnlace(m, 'Abrir el link de pago')?.getAttribute('href')).toBe(
      'https://nave.test/pagar/nuevo'
    )
    expect(m.contenedor.textContent ?? '').toContain('Esperando el pago')
  })

  it('un token desconocido no inventa un pedido', async () => {
    statusDelPedido = 404
    cuerpoDelPedido = { code: 'NOT_FOUND', message: 'No encontramos ese pedido' }

    const m = montar('/pedido/token-que-no-existe')
    await resolver()

    const texto = m.contenedor.textContent ?? ''

    expect(texto).toContain('No encontramos ese pedido')
    expect(texto).not.toContain('Pago aprobado')
    // Sin total inventado: no hay pedido que mostrar.
    expect(texto).not.toContain('15.000')
  })

  it('por transferencia muestra los datos y no ofrece link de pago', async () => {
    cuerpoDelPedido = pedidoPublico({
      modo: 'transferencia',
      pagoEstado: 'no_iniciado',
      pago: null,
      instrucciones: {
        titular: 'Vinoteca Cava & Co',
        alias: 'cava.vinos',
        cbu: '0000003100010000000001',
        banco: 'Banco de prueba',
        monto: 15000,
        referencia: 'PEDIDO 11111111'
      }
    })

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    const texto = m.contenedor.textContent ?? ''

    expect(texto).toContain('Pagá por transferencia')
    expect(texto).toContain('cava.vinos')
    expect(texto).toContain('0000003100010000000001')
    expect(texto).toContain('PEDIDO 11111111')
    // No hay cobro automatico que reintentar.
    expect(buscarBoton(m, 'Generar link nuevo')).toBeNull()
    expect(buscarEnlace(m, 'Abrir el link de pago')).toBeNull()
  })

  it('se actualiza sola cuando el pago se aprueba', async () => {
    vi.useFakeTimers()

    const m = montar(`/pedido/${TOKEN}`)
    await resolver()

    expect(m.contenedor.textContent ?? '').toContain('Esperando el pago')

    cuerpoDelPedido = pedidoPublico({
      pagoEstado: 'aprobado',
      pago: { estado: 'aprobado', link: null, qr: null, expiraEn: null }
    })

    await act(async () => {
      vi.advanceTimersByTime(INTERVALO_DE_POLLING_MS)
      for (let i = 0; i < 10; i += 1) await Promise.resolve()
    })

    expect(m.contenedor.textContent ?? '').toContain('Pago aprobado')
    // Y ya no sigue preguntando: el estado es terminal.
    const consultas = dobleFetch.mock.calls.filter(([url]) =>
      String(url).includes(`/api/track/${TOKEN}`)
    )
    expect(consultas).toHaveLength(2)
  })
})

describe('desde la tienda', () => {
  it('"Finalizar Pedido" NO vacia el carrito', () => {
    // D-D: el carrito se vacia con el pago **aprobado**. Si se vacia aca, el
    // comprador que cancela en la pasarela vuelve a la tienda sin nada y tiene
    // que armar el pedido de nuevo.
    const m = montar('/')

    abrirCarrito(m)
    pulsarPorTexto(m, 'Finalizar Pedido')

    expect(JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? '[]')).toHaveLength(1)
  })

  it('NO se vacia tampoco la copia en memoria del carrito', () => {
    // El `localStorage` podria no cambiar y el estado de React si: al re-render,
    // cualquier test que mire solo el storage estaria en verde con el carrito
    // perdido en pantalla.
    const m = montar('/')

    abrirCarrito(m)
    pulsarPorTexto(m, 'Finalizar Pedido')

    expect(m.contenedor.textContent ?? '').toContain('Gran Reserva Malbec')
  })

  it('no existe el cartel de "Pedido confirmado"', () => {
    // Antes de la 009, `finalizarCompra` vaciaba el carrito y mostraba un cartel
    // de gracias sin que hubiera pasado nada. Ese es el bug que toda la spec
    // vino a arreglar: una confirmacion que no confirma.
    const m = montar('/')

    abrirCarrito(m)
    pulsarPorTexto(m, 'Finalizar Pedido')

    expect(m.contenedor.textContent ?? '').not.toContain('Pedido confirmado')
  })
})
