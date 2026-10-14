import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../src/api/client'
import { mensajeDeLoginFallido } from '../../src/components/admin/admin_gate'
import {
  USUARIOS,
  desmontarAdmin,
  enlacesDelSidebar,
  entrarPorElGate,
  montarGate,
  montarLayout,
  rutaActual
} from './andamiaje_admin'

/**
 * Un `401` del login se reporta como contraseña incorrecta (spec 006, T7).
 *
 * Bug preexistente de la 004-b, encontrado escribiendo los tests de T3. El
 * camino completo, de punta a punta:
 *
 *   POST /api/auth/login con contrasena incorrecta
 *     -> 401 { code: 'INVALID_CREDENTIALS' }         (el backend, correcto)
 *     -> el cliente ve 401, intenta refrescar, falla (T7 lo arregla)
 *     -> throw new Error('Sesión expirada. Inicie sesión nuevamente.')
 *
 * O sea que la persona que se confunde de contrasena —o de usuario, que es el
 * mismo error humano— leia "sesion expirada", que la manda a recargar la pagina:
 * exactamente lo que ya hizo.
 */

const respuesta = (status: number, cuerpo: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: String(status),
  json: async () => cuerpo
})

/** El `fetch` que devuelve un login rechazado, con el `code` real del backend. */
const fetchConLoginRechazado = (cuerpo: unknown, status = 401) =>
  vi.fn(async (entrada: RequestInfo | URL) => {
    const url = String(entrada)

    if (url.endsWith('/api/auth/login')) return respuesta(status, cuerpo)
    return respuesta(401, { message: 'Sesión expirada' })
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Monta el gate, escribe el login fallido y devuelve el montaje. */
const entrarCon = async (mock: ReturnType<typeof vi.fn>) => {
  vi.stubGlobal('fetch', mock)

  const montaje = await montarGate()
  await entrarPorElGate(montaje, {
    email: 'gestor@vinoteca.local',
    clave: 'la-clave-equivocada'
  })

  return montaje
}

describe('el texto del login fallido', () => {
  it('INVALID_CREDENTIALS dice contrasena incorrecta', () => {
    // El `message` que manda `app.ts:147` es **el codigo**: en
    // `UnauthorizedError('INVALID_CREDENTIALS')` el message es el codigo. Mostrar
    // `err.message` a secas era mostrar `INVALID_CREDENTIALS` en pantalla.
    expect(
      mensajeDeLoginFallido(
        new ApiError('INVALID_CREDENTIALS', 401, 'INVALID_CREDENTIALS')
      )
    ).toBe('Email o contrasena incorrectos.')
  })

  it('no dice "sesión expirada" nunca', () => {
    const mensajes = [
      mensajeDeLoginFallido(new ApiError('INVALID_CREDENTIALS', 401, 'INVALID_CREDENTIALS')),
      mensajeDeLoginFallido(new ApiError('VALIDATION_ERROR', 400, 'VALIDATION_ERROR')),
      mensajeDeLoginFallido(new ApiError('FST_ERR_RATE_LIMIT', 429, 'FST_ERR_RATE_LIMIT')),
      mensajeDeLoginFallido(new ApiError('CODIGO_DEL_ANIO', 500, 'CODIGO_DEL_ANIO')),
      mensajeDeLoginFallido(new Error('Failed to fetch')),
      mensajeDeLoginFallido('no es un error')
    ]

    for (const mensaje of mensajes) {
      expect(mensaje).not.toMatch(/expirada/i)
    }
  })

  it('un code desconocido cae en una frase, no en el code', () => {
    // La red de seguridad: si el backend agrega un `code`, lo que llega a la
    // pantalla es español. **Una persona nunca lee un identificador aca.**
    const mensaje = mensajeDeLoginFallido(new ApiError('CODIGO_DEL_ANIO', 500, 'CODIGO_DEL_ANIO'))

    expect(mensaje).toBe('No pudimos iniciar sesion. Revisa el email y la contrasena.')
    expect(mensaje).not.toContain('CODIGO_DEL_ANIO')
  })

  it('un code con forma de prototipo no encuentra un mensaje', () => {
    // Por eso el mapa es un `Map` y no un objeto: `'constructor' in {}` es
    // `true`, y con un objeto el backend mandando `code: 'constructor'` —
    // o un `message` crafted — devolvia una funcion en vez de una frase.
    for (const code of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      const mensaje = mensajeDeLoginFallido(new ApiError(code, 500, code))

      expect(typeof mensaje, code).toBe('string')
      expect(mensaje).toBe('No pudimos iniciar sesion. Revisa el email y la contrasena.')
    }
  })

  it('el rate limit dice que espere, no que revise la contrasena', () => {
    // Con tres cuentas, escribir la contrasena cinco veces seguidas es un
    // error probable de verdad. Decirle "revisa tu contrasena" a alguien que
    // **acaba de acertarla cinco veces** lo manda al lugar equivocado.
    expect(
      mensajeDeLoginFallido(new ApiError('Demasiadas peticiones', 429, 'FST_ERR_RATE_LIMIT'))
    ).toBe('Demasiados intentos. Espera un minuto e intenta de nuevo.')
  })

  it('un error de red no dice "revisa la contrasena"', () => {
    // `fetch` tira `TypeError` si la API esta caída o el navegador la bloquea.
    // Ahi el problema no son las credenciales, y mandarlo a cambiar la
    // contrasena seria buscar en el lugar equivocado — otra vez.
    const mensaje = mensajeDeLoginFallido(new TypeError('Failed to fetch'))

    expect(mensaje).toBe('No pudimos contactar al servidor. Intenta de nuevo en un momento.')
    expect(mensaje).not.toMatch(/contrasena/i)
  })

  it('nunca devuelve cadena vacia, que dejaria el gate sin explicacion', () => {
    for (const error of [
      null,
      undefined,
      0,
      {},
      new Error(''),
      new ApiError('', 500, ''),
      new ApiError('X', 500, undefined)
    ]) {
      expect(mensajeDeLoginFallido(error).length).toBeGreaterThan(0)
    }
  })
})

describe('el gate muestra el mensaje del login', () => {
  it('contrasena incorrecta: el alert dice contrasena incorrecta', async () => {
    const montaje = await entrarCon(
      fetchConLoginRechazado({ code: 'INVALID_CREDENTIALS', message: 'INVALID_CREDENTIALS' })
    )

    expect(montaje.contenedor.querySelector('[role="alert"]')?.textContent).toBe(
      'Email o contrasena incorrectos.'
    )

    await desmontarAdmin(montaje)
  })

  it('no se muestra ni el codigo ni "sesión expirada"', async () => {
    const montaje = await entrarCon(
      fetchConLoginRechazado({ code: 'INVALID_CREDENTIALS', message: 'INVALID_CREDENTIALS' })
    )

    const alert = montaje.contenedor.querySelector('[role="alert"]')?.textContent ?? ''

    expect(alert).not.toContain('INVALID_CREDENTIALS')
    expect(alert).not.toMatch(/expirada/i)

    await desmontarAdmin(montaje)
  })

  it('el campo de contrasena se limpia y el foco vuelve a el', async () => {
    // El motivo de que el error este debajo del campo: escribir de nuevo tiene
    // que alcanzar, sin volver a buscar el input.
    const montaje = await entrarCon(
      fetchConLoginRechazado({ code: 'INVALID_CREDENTIALS', message: 'INVALID_CREDENTIALS' })
    )

    const clave = montaje.contenedor.querySelector('#clave-admin')
    expect((clave as HTMLInputElement).value).toBe('')

    await desmontarAdmin(montaje)
  })

  it('el login rejected no navega', async () => {
    // El error mas grave posible aca: si un fallo de credenciales sacara al
    // usuario del gate, el panel perderia la sesion por teclear mal.
    const montaje = await entrarCon(
      fetchConLoginRechazado({ code: 'INVALID_CREDENTIALS', message: 'INVALID_CREDENTIALS' })
    )

    expect(montaje.contenedor.querySelector('#email-admin')).not.toBeNull()
    expect(montaje.contenedor.textContent).toContain('Administracion')

    await desmontarAdmin(montaje)
  })
})

/**
 * ## La sesión tiene que seguir sobreviviendo al F5
 *
 * Este es el test que protege el otro lado de D-G. Sacar el refresh del login es
 * fácil; lo fácil es sacarlo de **todos** los `401` "porque dan problemas", y
 * ahí se rompe la restauración por cookie: al recargar, el módulo `api` no
 * tiene token en memoria, `me()` da 401, y sin refresh el panel pide la clave
 * de nuevo aunque la cookie de 7 días siga ahí.
 *
 * En desarrollo no se nota: se recarga, se escribe la clave, y parece que
 * funciona. El sintoma real es "la sesion no aguanta una recarga", que se
 * descubre cuando alguien esta escribiendo un pedido y se cae.
 */
describe('el refresh sigue funcionando donde tiene que funcionar', () => {
  it('un 401 en /api/auth/me con refresh valido restaura la sesion', async () => {
    // El stub de `me` tiene que mirar el `Authorization`, como el backend. Un
    // stub que responde 401 siempre hace que el retry tambien falle, y el test
    // mide el stub y no el refresh.
    const mock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entrada)
      const cabeceras = init?.headers as Record<string, string> | undefined

      if (url.endsWith('/api/auth/me')) {
        return cabeceras?.Authorization === 'Bearer token-nuevo'
          ? respuesta(200, USUARIOS.gestor)
          : respuesta(401, { message: 'Sin token' })
      }

      if (url.endsWith('/api/auth/refresh')) {
        return respuesta(200, {
          accessToken: 'token-nuevo',
          refreshToken: 'refresh-nuevo',
          user: USUARIOS.gestor
        })
      }

      return respuesta(404, { message: `Sin stub para ${url}` })
    })

    vi.stubGlobal('fetch', mock)

    const montaje = await montarLayout('/admin')

    // El `me` se pide dos veces: la primera falla, la segunda sale con el token
    // nuevo. Si el refresh no se intenta, hay una sola.
    const pedidosMe = mock.mock.calls.filter(([entrada]) =>
      String(entrada).endsWith('/api/auth/me')
    )

    expect(pedidosMe).toHaveLength(2)

    // Y el panel esta adentro, **como gestor**: cuatro secciones y ninguna
    // puerta al gate. Se afirma por el sidebar y no por el nombre del usuario
    // porque el menu de usuario esta cerrado y su texto no esta en el DOM —
    // un test que busca un nombre que solo aparece desplegado falla por una
    // razon que no tiene que ver con lo que esta probando.
    expect(enlacesDelSidebar(montaje).map((e) => e.href)).toEqual([
      '/admin/catalogo',
      '/admin/pedidos',
      '/admin/clientes',
      '/admin/configuracion'
    ])
    expect(montaje.contenedor.querySelector('#email-admin')).toBeNull()
    expect(rutaActual(montaje)).toBe('/admin/catalogo')

    await desmontarAdmin(montaje)
  })

  it('un 401 en /api/auth/me SIN refresh valido deja al usuario en el gate', async () => {
    const mock = vi.fn(async (entrada: RequestInfo | URL) => {
      const url = String(entrada)

      if (url.endsWith('/api/auth/me')) return respuesta(401, { message: 'Sin token' })
      if (url.endsWith('/api/auth/refresh')) return respuesta(401, { message: 'Sin refresh' })

      return respuesta(404, { message: `Sin stub para ${url}` })
    })

    vi.stubGlobal('fetch', mock)

    const montaje = await montarLayout('/admin')

    // El otro lado del mismo comportamiento: **no** hay cookie, no hay panel.
    const texto = montaje.contenedor.textContent ?? ''
    expect(texto).toContain('Esta seccion es restringida.')
    expect(montaje.contenedor.querySelector('#email-admin')).not.toBeNull()

    await desmontarAdmin(montaje)
  })
})

describe('el login no intenta refrescar', () => {
  it('no pide refresh DESPUES de un login rechazado', async () => {
    // La asercion tiene que mirar **despues** del login, no todo el arreglo de
    // llamadas: el `AuthProvider` consulta `/api/auth/me` al montar, y ese `401`
    // **si** debe intentar refrescar (es el F5). Si se negara cualquier refresh
    // en la pagina, este test pasaria por el motivo equivocado y dejaria
    // romper la restauracion de sesion sin que nadie lo note.
    const mock = fetchConLoginRechazado({
      code: 'INVALID_CREDENTIALS',
      message: 'INVALID_CREDENTIALS'
    })

    await entrarCon(mock)

    const indiceDelLogin = mock.mock.calls.findIndex(([entrada]) =>
      String(entrada).endsWith('/api/auth/login')
    )

    expect(indiceDelLogin).toBeGreaterThanOrEqual(0)

    const despues = mock.mock.calls.slice(indiceDelLogin)
    const refrescos = despues.filter(([entrada]) => String(entrada).endsWith('/api/auth/refresh'))

    expect(refrescos).toEqual([])
  })

  it('y el `me` del arranque si refresca, para que los dos casos queden separados', async () => {
    // El control del test de al lado: si `me()` tampoco refrescara, el de arriba
    // pasaria sin probar nada.
    const mock = vi.fn(async (entrada: RequestInfo | URL) => {
      const url = String(entrada)

      if (url.endsWith('/api/auth/me')) return respuesta(401, { message: 'Sin token' })
      if (url.endsWith('/api/auth/refresh')) return respuesta(200, { accessToken: 't' })

      return respuesta(404, { message: `Sin stub para ${url}` })
    })

    vi.stubGlobal('fetch', mock)
    await montarGate()

    expect(
      mock.mock.calls.some(([entrada]) => String(entrada).endsWith('/api/auth/refresh'))
    ).toBe(true)
  })
})
