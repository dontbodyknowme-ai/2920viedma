import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApi } from '../../src/hooks/useApi'
import { estaOffline, guardarRespaldo, marcarOnline } from '../../src/utils/offline'
import type { Paginated } from '../../src/types/admin'

/**
 * El fallback de `useApi` (CE-05 / CA-37).
 *
 * Se prueba con el `fetch` simulado en vez de con el navegador: bajo jsdom, MSW
 * v2 no intercepta el `fetch` de undici, asi que una prueba de extremo a
 * extremo del panel daria `ECONNREFUSED` en vez de probar el comportamiento.
 *
 * Lo que importa verificar aca es el **contrato**:
 *
 * - Si el fetch falla y hay respaldo **de esa URL**, se sirven los datos y se
 *   marca offline.
 * - Si el fetch falla y NO hay respaldo, se muestra el error. No se inventan
 *   datos ni se sirve un snapshot de otra URL.
 * - Si el fetch funciona, se guarda el respaldo y se vuelve a online.
 */

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

interface Fila {
  id: string
}

const respuesta = (data: unknown): Response =>
  ({ ok: true, status: 200, json: async () => data }) as Response

const paginado = (ids: string[]): Paginated<Fila> => ({
  data: ids.map((id) => ({ id })),
  total: ids.length,
  page: 1,
  limit: 10,
  totalPages: 1
})

const URL_VINOS = '/api/wines?page=1&limit=10'

let contenedor: HTMLDivElement
let raiz: Root

/**
 * Ultimo estado renderizado por el hook.
 *
 * Vive fuera del componente a proposito: leerlo **despues** de `asentar()` es
 * lo unico que observa el resultado. Devolverlo desde `montar` daria el estado
 * del primer render, que es `{ data: undefined, isLoading: true }`, y los tests
 * compararian siempre contra vacio.
 */
let capturado: { data: unknown; error?: string } = {}

/** Monta el hook con la url y la opcion de respaldo indicadas. */
const montar = (url: string, conRespaldo: boolean): void => {
  const Probe = () => {
    const estado = useApi<Paginated<Fila>>(url, conRespaldo ? { respaldo: 'vinos' } : {})
    capturado = { data: estado.data, error: estado.error }
    return null
  }

  act(() => {
    raiz.render(createElement(Probe))
  })
}

/** Deja correr las promesas del efecto y devuelve el estado resultante. */
const asentar = async (): Promise<{ data: unknown; error?: string }> => {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 30))
  })

  return capturado
}

describe('useApi con fallback offline', () => {
  beforeEach(() => {
    localStorage.clear()
    marcarOnline()
    contenedor = document.createElement('div')
    document.body.appendChild(contenedor)
    raiz = createRoot(contenedor)
  })

  afterEach(() => {
    act(() => raiz.unmount())
    contenedor.remove()
    localStorage.clear()
    marcarOnline()
    vi.restoreAllMocks()
  })

  it('sirve el respaldo cuando el fetch falla', async () => {
    guardarRespaldo('vinos', URL_VINOS, paginado(['guardado-1', 'guardado-2']))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    montar(URL_VINOS, true)
    const estado = await asentar()

    expect((estado.data as Paginated<Fila>).data.map((f) => f.id)).toEqual([
      'guardado-1',
      'guardado-2'
    ])
    expect(estado.error).toBeUndefined()
  })

  it('marca offline cuando cae al respaldo', async () => {
    guardarRespaldo('vinos', URL_VINOS, paginado(['x']))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    montar(URL_VINOS, true)
    await asentar()

    expect(estaOffline()).toBe(true)
  })

  it('muestra el error cuando no hay respaldo de esa URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    montar(URL_VINOS, true)
    const estado = await asentar()

    // Un panel en blanco no le dice nada al admin. Mejor un error visible.
    expect(estado.data).toBeUndefined()
    expect(estado.error).toBeDefined()
    expect(estaOffline()).toBe(false)
  })

  it('limpia los datos viejos cuando el fetch falla sin respaldo', async () => {
    // El caso engañoso: el admin cambia el filtro, el fetch falla, y la tabla
    // queda mostrando las filas del filtro **anterior** debajo del mensaje de
    // error, como si fueran el resultado de la busqueda nueva.
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(paginado(['viejo']))))

    montar(URL_VINOS, true)
    const conDatos = await asentar()
    expect((conDatos.data as Paginated<Fila>).data[0].id).toBe('viejo')

    // Ahora el fetch pasa, pero para otra URL sin respaldo.
    const mock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', mock)
    montar('/api/wines?page=1&limit=10&category=Tinto', true)
    const trasError = await asentar()

    expect(trasError.data).toBeUndefined()
    expect(trasError.error).toBeDefined()
  })

  it('NO sirve el respaldo de otra URL', async () => {
    // El bug que evita el indexado por URL: la tabla "Tinto" no puede mostrar
    // la pagina 3 sin filtro.
    guardarRespaldo('vinos', '/api/wines?page=3&limit=10', paginado(['de-otra-pagina']))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    montar(URL_VINOS, true)
    const estado = await asentar()

    expect(estado.data).toBeUndefined()
    expect(estado.error).toBeDefined()
  })

  it('guarda la respuesta y queda online cuando el fetch funciona', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(paginado(['nuevo']))))

    montar(URL_VINOS, true)
    const estado = await asentar()

    expect((estado.data as Paginated<Fila>).data[0].id).toBe('nuevo')
    expect(estaOffline()).toBe(false)

    // El respaldo queda disponible para el proximo corte de conexion.
    const guardado = JSON.parse(
      localStorage.getItem('admin_respaldo_vinos') ?? '{}'
    ) as Record<string, { d: Paginated<Fila> }>
    expect(guardado[URL_VINOS].d.data[0].id).toBe('nuevo')
  })

  it('vuelve a online cuando la conexion vuelve, sin tocar el respaldo', async () => {
    guardarRespaldo('vinos', URL_VINOS, paginado(['viejo']))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    montar(URL_VINOS, true)
    await asentar()
    expect(estaOffline()).toBe(true)

    vi.stubGlobal('fetch', vi.fn(async () => respuesta(paginado(['fresco']))))
    montar(URL_VINOS, true)
    await asentar()

    expect(estaOffline()).toBe(false)
  })

  it('propaga un HTTP 404 al error cuando no hay respaldo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response)
    )

    montar(URL_VINOS, true)
    const estado = await asentar()

    expect(estado.error).toContain('404')
  })

  it('sin la opcion de respaldo, un fallo deja el error y no guarda nada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    montar(URL_VINOS, false)
    const estado = await asentar()

    expect(estado.error).toBeDefined()
    expect(localStorage.getItem('admin_respaldo_vinos')).toBeNull()
  })
})