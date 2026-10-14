import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  USUARIOS,
  desmontarAdmin,
  entrarPorElGate,
  fetchConLogin,
  fetchDeSesion,
  montarGate,
  montarLayout,
  montarLayoutReal,
  paginaMontada,
  rutaActual,
  urlsPeticionadas,
  type Rol
} from './andamiaje_admin'

/**
 * La URL escrita a mano redirige a donde el rol puede estar (spec 006, T3).
 *
 * El menu filtrado (T2) no alcanza para esto: al panel se llega escribiendo la
 * URL, no clickeando. `/admin` con sesion de `gestor` montaba el Dashboard, el
 * dashboard pedia `/api/metrics` y lo que se veia era un error de 403.
 *
 * Todos los tests entran **por URL**, con `montarLayout('/admin')`. Ninguno
 * hace click: el punto de la tarea es justamente el camino que no pasa por el
 * menu.
 */

/** El `fetch` stub, para poder preguntarle despues que pidio. */
let peticiones: unknown

const conSesion = (rol: Rol) => {
  peticiones = fetchDeSesion(USUARIOS[rol])
  vi.stubGlobal('fetch', peticiones)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('con sesion de admin', () => {
  it('puede quedarse en el dashboard', async () => {
    conSesion('admin')
    const montaje = await montarLayout('/admin')

    expect(rutaActual(montaje)).toBe('/admin')
    expect(paginaMontada(montaje)).toBe('pagina dashboard')

    await desmontarAdmin(montaje)
  })

  it('no lo expulsa de ninguna seccion', async () => {
    conSesion('admin')
    const montaje = await montarLayout('/admin/configuracion')

    expect(rutaActual(montaje)).toBe('/admin/configuracion')

    await desmontarAdmin(montaje)
  })
})

describe('con sesion de gestor', () => {
  it('/admin lo manda al catalogo', async () => {
    conSesion('gestor')
    const montaje = await montarLayout('/admin')

    expect(rutaActual(montaje)).toBe('/admin/catalogo')

    await desmontarAdmin(montaje)
  })

  it('las otras cuatro secciones las puede abrir', async () => {
    for (const ruta of ['/admin/catalogo', '/admin/pedidos', '/admin/clientes', '/admin/configuracion']) {
      conSesion('gestor')
      const montaje = await montarLayout(ruta)

      expect(rutaActual(montaje), ruta).toBe(ruta)

      await desmontarAdmin(montaje)
    }
  })
})

describe('con sesion de vendedor', () => {
  it('/admin lo manda a pedidos', async () => {
    conSesion('vendedor')
    const montaje = await montarLayout('/admin')

    expect(rutaActual(montaje)).toBe('/admin/pedidos')

    await desmontarAdmin(montaje)
  })

  it('/admin/catalogo lo manda a pedidos', async () => {
    conSesion('vendedor')
    const montaje = await montarLayout('/admin/catalogo')

    expect(rutaActual(montaje)).toBe('/admin/pedidos')
    expect(paginaMontada(montaje)).toBe('pagina pedidos')

    await desmontarAdmin(montaje)
  })

  it('las otras dos secciones vedadas lo mandan a pedidos', async () => {
    for (const ruta of ['/admin/clientes', '/admin/configuracion']) {
      conSesion('vendedor')
      const montaje = await montarLayout(ruta)

      expect(rutaActual(montaje), ruta).toBe('/admin/pedidos')

      await desmontarAdmin(montaje)
    }
  })

  it('una ruta que no existe le daba el dashboard; ahora no', async () => {
    // El `catchAll` de `router.tsx` sigue montando el Dashboard para `/admin/*`.
    // Es decir que `/admin/secreto` le daba el dashboard a un vendedor: una
    // seccion vedada, servida por un atajo.
    conSesion('vendedor')
    const montaje = await montarLayout('/admin/secreto')

    expect(rutaActual(montaje)).toBe('/admin/pedidos')
    expect(paginaMontada(montaje)).not.toBe('pagina dashboard')

    await desmontarAdmin(montaje)
  })
})

/**
 * ## La seccion vedada no llega a pedir nada
 *
 * "No se monta" suena a una afirmacion sobre el frame intermedio, y el frame
 * intermedio ya paso cuando el test mira el DOM. Con una pagina de mentira no
 * hay forma de afirmarlo.
 *
 * Con la pagina **real** si: si el Dashboard llego a montarse, pidio
 * `/api/metrics`. La pregunta es por la API, no por la pantalla, y ahi no hay
 * frame que se haya pasado.
 */
describe('la seccion vedada no se pide nunca', () => {
  it('con gestor, entrar a /admin no pide /api/metrics', async () => {
    conSesion('gestor')
    const montaje = await montarLayoutReal('/admin')

    expect(rutaActual(montaje)).toBe('/admin/catalogo')
    expect(urlsPeticionadas(peticiones).filter((u) => u.endsWith('/api/metrics'))).toEqual([])

    await desmontarAdmin(montaje)
  })

  it('con vendedor, entrar a /admin no pide /api/metrics', async () => {
    conSesion('vendedor')
    const montaje = await montarLayoutReal('/admin')

    expect(rutaActual(montaje)).toBe('/admin/pedidos')
    expect(urlsPeticionadas(peticiones).filter((u) => u.endsWith('/api/metrics'))).toEqual([])

    await desmontarAdmin(montaje)
  })

  it('con admin si se pide —el control que prueba que el test mira—', async () => {
    // Sin esta linea, los dos tests de arriba pasarian tambien si el stub
    // estuviera roto y no registrara nada. El control se pide lo mismo y tiene
    // que aparecer.
    conSesion('admin')
    const montaje = await montarLayoutReal('/admin')

    expect(rutaActual(montaje)).toBe('/admin')
    expect(
      urlsPeticionadas(peticiones).filter((u) => u.endsWith('/api/metrics')).length
    ).toBeGreaterThan(0)

    await desmontarAdmin(montaje)
  })
})

describe('sin sesion', () => {
  it('no redirige: muestra la pantalla de clave', async () => {
    // Sin sesion el destino del redirect no existe —no hay rol—, asi que la
    // unica respuesta posible es la que ya habia: pedir la clave.
    peticiones = fetchDeSesion(null)
    vi.stubGlobal('fetch', peticiones)

    const montaje = await montarLayout('/admin')

    expect(montaje.contenedor.textContent).toContain('Administracion')
    expect(montaje.contenedor.querySelector('#email-admin')).not.toBeNull()

    await desmontarAdmin(montaje)
  })
})

/**
 * ## El login manda al destino permitido
 *
 * Estos tests entran por el formulario, no por la URL: es el otro camino de
 * entrada al panel.
 */
describe('el login manda a donde el rol puede estar', () => {
  const entrar = async (rol: Rol) => {
    peticiones = fetchConLogin(USUARIOS[rol])
    vi.stubGlobal('fetch', peticiones)

    const montaje = await montarLayout('/admin')
    await entrarPorElGate(montaje, {
      email: USUARIOS[rol].email,
      clave: 'la-clave-de-prueba'
    })

    return montaje
  }

  it('el admin entra al dashboard', async () => {
    const montaje = await entrar('admin')

    expect(rutaActual(montaje)).toBe('/admin')
    expect(paginaMontada(montaje)).toBe('pagina dashboard')

    await desmontarAdmin(montaje)
  })

  it('el gestor entra al catalogo', async () => {
    const montaje = await entrar('gestor')

    expect(rutaActual(montaje)).toBe('/admin/catalogo')
    expect(paginaMontada(montaje)).toBe('pagina catalogo')

    await desmontarAdmin(montaje)
  })

  it('el vendedor entra a pedidos', async () => {
    const montaje = await entrar('vendedor')

    expect(rutaActual(montaje)).toBe('/admin/pedidos')
    expect(paginaMontada(montaje)).toBe('pagina pedidos')

    await desmontarAdmin(montaje)
  })

  it('el gate no sobrevive al login correcto', async () => {
    // El bug del login infinito: si `isAuthenticated` no queda en `true`, el
    // layout vuelve a pintar `<AdminGate />` y el formulario se limpia.
    const montaje = await entrar('gestor')

    expect(montaje.contenedor.querySelector('#email-admin')).toBeNull()

    await desmontarAdmin(montaje)
  })
})

/**
 * ## El gate, sin el layout que lo tapa
 *
 * Los tests de arriba pasan igual si el gate manda siempre a `/admin`: el
 * layout redirige y el usuario termina en el mismo lugar. Se comprobo en contra.
 *
 * Montando el gate solo, el unico que decide el destino es el gate, y la
 * pregunta tiene respuesta.
 */
describe('el gate elige el destino', () => {
  const entrarAlGate = async (rol: Rol) => {
    vi.stubGlobal('fetch', fetchConLogin(USUARIOS[rol]))

    const montaje = await montarGate()
    await entrarPorElGate(montaje, {
      email: USUARIOS[rol].email,
      clave: 'la-clave-de-prueba'
    })

    return montaje
  }

  it('el admin: /admin', async () => {
    const montaje = await entrarAlGate('admin')

    expect(rutaActual(montaje)).toBe('/admin')

    await desmontarAdmin(montaje)
  })

  it('el gestor: /admin/catalogo, sin pasar por /admin', async () => {
    const montaje = await entrarAlGate('gestor')

    expect(rutaActual(montaje)).toBe('/admin/catalogo')

    await desmontarAdmin(montaje)
  })

  it('el vendedor: /admin/pedidos, sin pasar por /admin', async () => {
    const montaje = await entrarAlGate('vendedor')

    expect(rutaActual(montaje)).toBe('/admin/pedidos')

    await desmontarAdmin(montaje)
  })

  it('con contrasena incorrecta se queda en el gate', async () => {
    // Solo se afirma lo que T3 es dueno: que el fallo **no** navega. El texto
    // del error es de otra cosa —ver el bug reportado en `MEMORY.md`— y
    // afirmar el mensaje actual lo dejaria como comportamiento deseado.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: RequestInfo | URL) => {
        const url = String(entrada)
        const responder = (status: number, cuerpo: unknown) => ({
          ok: status >= 200 && status < 300,
          status,
          statusText: String(status),
          json: async () => cuerpo
        })

        if (url.endsWith('/api/auth/login')) {
          return responder(401, { code: 'INVALID_CREDENTIALS', message: 'INVALID_CREDENTIALS' })
        }
        return responder(401, { message: 'Sesión expirada' })
      })
    )

    const montaje = await montarGate()
    await entrarPorElGate(montaje, {
      email: 'gestor@vinoteca.local',
      clave: 'la-clave-equivocada'
    })

    expect(rutaActual(montaje)).toBe('/admin')
    expect(montaje.contenedor.querySelector('#email-admin')).not.toBeNull()
    expect(montaje.contenedor.querySelector('[role="alert"]')).not.toBeNull()

    await desmontarAdmin(montaje)
  })
})
