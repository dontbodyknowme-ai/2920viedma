import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DataTable, columnaConFiltro, columnaHelper } from '../../src/components/admin/data_table'

// Misma bandera que usa `test/andamiaje.ts`: sin ella React avisa que el
// entorno no soporta `act(...)` en cada llamada.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

interface Fila {
  id: string
  nombre: string
  precio: number
  categoria: string
}

const VINOS: Fila[] = [
  { id: '1', nombre: 'Gran Reserva Malbec', precio: 45000, categoria: 'Tinto' },
  { id: '2', nombre: 'Chardonnay White Bones', precio: 38000, categoria: 'Blanco' }
]

const columnas = [
  columnaHelper<Fila>().accessor('nombre', { header: 'Nombre' }),
  columnaHelper<Fila>().accessor('precio', { header: 'Precio' }),
  columnaConFiltro(columnaHelper<Fila>().accessor('categoria', { header: 'Categoria' }), [
    { valor: 'Tinto', etiqueta: 'Tinto' },
    { valor: 'Blanco', etiqueta: 'Blanco' }
  ])
]

let contenedor: HTMLDivElement
let root: Root

/** Eventos que la tabla emite hacia la pagina. Se acumulan para poder verificar. */
interface Eventos {
  paginas: number[]
  limites: number[]
  ordenes: Array<{ columna: string; direccion: 'asc' | 'desc' } | null>
  filtros: Array<Record<string, string>>
  busquedas: string[]
  exportaciones: number
}

let eventos: Eventos

const vaciar = (): Eventos => ({
  paginas: [],
  limites: [],
  ordenes: [],
  filtros: [],
  busquedas: [],
  exportaciones: 0
})

const montar = (
  sobrescritas: Partial<{
    data: Fila[]
    total: number
    page: number
    limit: number
    isLoading: boolean
    rowActions: () => null
  }> = {}
): void => {
  eventos = vaciar()

  act(() => {
    root.render(
      createElement(DataTable<Fila>, {
        columns: columnas,
        data: sobrescritas.data ?? VINOS,
        total: sobrescritas.total ?? VINOS.length,
        page: sobrescritas.page ?? 1,
        limit: sobrescritas.limit ?? 10,
        onPageChange: (pagina: number) => eventos.paginas.push(pagina),
        onLimitChange: (limite: number) => eventos.limites.push(limite),
        onSortChange: (orden: { columna: string; direccion: 'asc' | 'desc' } | null) =>
          eventos.ordenes.push(orden),
        onFilterChange: (filtros: Record<string, string>) => eventos.filtros.push(filtros),
        searchValue: '',
        onSearchChange: (valor: string) => eventos.busquedas.push(valor),
        onExport: () => {
          eventos.exportaciones += 1
        },
        isLoading: sobrescritas.isLoading ?? false,
        getRowId: (fila: Fila) => fila.id,
        ...(sobrescritas.rowActions !== undefined && { rowActions: sobrescritas.rowActions })
      })
    )
  })
}

const texto = (): string => contenedor.textContent ?? ''
const nodos = (selector: string): HTMLElement[] => [...contenedor.querySelectorAll<HTMLElement>(selector)]
const botonPorTexto = (textoBoton: string): HTMLElement | undefined =>
  nodos('button').find((boton) => boton.textContent?.trim() === textoBoton)

const pulsar = (elemento: HTMLElement): void => {
  act(() => {
    elemento.click()
  })
}

/**
 * React no lee `element.value` del evento: intercepta el setter del prototipo y
 * compara contra el valor que el render anterior guardo. Asignar `campo.value`
 * a mano deja ese registro desfasado y React descarta el evento como "sin
 * cambios". Por eso se llama al setter del prototipo y despues se dispara el
 * evento: asi React ve la diferencia y lo emite.
 */
const escribirEnCampo = (campo: HTMLInputElement, valor: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(campo, valor)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  contenedor.remove()
})

describe('DataTable: renderizado', () => {
  it('muestra una fila por fila recibida', () => {
    montar()

    expect(nodos('tbody tr')).toHaveLength(2)
    expect(texto()).toContain('Gran Reserva Malbec')
    expect(texto()).toContain('Chardonnay White Bones')
  })

  it('renderiza los encabezados declarados', () => {
    montar()

    const encabezados = nodos('thead th').map((th) => th.textContent?.trim())
    expect(encabezados.some((h) => h?.includes('Nombre'))).toBe(true)
    expect(encabezados.some((h) => h?.includes('Precio'))).toBe(true)
  })

  it('calcula el rango mostrado con el total del servidor, no con el largo de la pagina', () => {
    // 240 filas en total, pagina de 25: el rango tiene que salir de esos 240 y
    // no de las 25 que trajo la pagina. Si usara data.length, el texto seria
    // "Mostrando 1-25 de 25" y el usuario creeria que no hay mas.
    montar({ total: 240, page: 2, limit: 25 })

    expect(texto()).toContain('Mostrando 26-50 de 240')
  })

  it('dice "Sin filas" cuando no hay ninguna', () => {
    montar({ data: [], total: 0 })

    expect(texto()).toContain('Sin filas')
  })
})

describe('DataTable: paginacion', () => {
  it('emite onPageChange al pulsar "Siguiente"', () => {
    montar({ total: 240, page: 1, limit: 25 })

    pulsar(nodos('[aria-label="Pagina siguiente"]')[0])

    expect(eventos.paginas).toEqual([2])
  })

  it('emite onPageChange con la primera y la ultima pagina', () => {
    montar({ total: 240, page: 5, limit: 25 })

    pulsar(botonPorTexto('Primera')!)
    pulsar(botonPorTexto('Ultima')!)

    expect(eventos.paginas).toEqual([1, 10])
  })

  it('deshabilita "Primera" y "Anterior" en la pagina 1', () => {
    montar({ total: 240, page: 1, limit: 25 })

    expect(botonPorTexto('Primera')?.disabled).toBe(true)
    expect(nodos('[aria-label="Pagina anterior"]')[0].disabled).toBe(true)
    expect(botonPorTexto('Ultima')?.disabled).toBe(false)
  })

  it('deshabilita "Ultima" y "Siguiente" en la ultima pagina', () => {
    montar({ total: 240, page: 10, limit: 25 })

    expect(botonPorTexto('Ultima')?.disabled).toBe(true)
    expect(nodos('[aria-label="Pagina siguiente"]')[0].disabled).toBe(true)
  })

  it('vuelve a la pagina 1 al cambiar la cantidad de filas por pagina', () => {
    montar({ total: 240, page: 4, limit: 10 })

    const select = nodos('[aria-label="Filas por pagina"]')[0] as HTMLSelectElement
    act(() => {
      select.value = '50'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Cambiar el limite sobre la pagina 4 dejaria al usuario en una pagina que
    // puede no existir: con limit 50 hay 5 paginas, y la 4 deja de ser la ultima
    // valida pero igual puede quedar vacia.
    expect(eventos.limites).toEqual([50])
    expect(eventos.paginas).toEqual([1])
  })

  it('muestra el total de paginas calculado sobre el total del servidor', () => {
    montar({ total: 240, page: 1, limit: 25 })

    expect(texto()).toContain('1 / 10')
  })
})

describe('DataTable: ordenamiento', () => {
  it('emite onSortChange ascendente al primer clic en una columna ordenable', () => {
    montar()

    const botonNombre = nodos('thead button').find((b) => b.textContent?.includes('Nombre'))
    pulsar(botonNombre!)

    expect(eventos.ordenes).toEqual([{ columna: 'nombre', direccion: 'asc' }])
  })

  it('alterna a descendente en el segundo clic', () => {
    montar()

    const botonNombre = nodos('thead button').find((b) => b.textContent?.includes('Nombre'))
    pulsar(botonNombre!)
    pulsar(botonNombre!)

    expect(eventos.ordenes).toEqual([
      { columna: 'nombre', direccion: 'asc' },
      { columna: 'nombre', direccion: 'desc' }
    ])
  })

  it('marca aria-sort segun el estado', () => {
    montar()

    const botonNombre = nodos('thead button').find((b) => b.textContent?.includes('Nombre'))
    pulsar(botonNombre!)

    const th = nodos('thead th').find((celda) => celda.textContent?.includes('Nombre'))
    expect(th?.getAttribute('aria-sort')).toBe('ascending')
  })
})

describe('DataTable: filtros de columna', () => {
  it('emite onFilterChange con la columna y el valor elegidos', () => {
    montar()

    const select = nodos('tbody')[0]?.closest('div') === null ? null : null
    void select
    const desplegables = nodos('select').filter((s) => s.getAttribute('aria-label') !== 'Filas por pagina')
    const desplegableCategoria = desplegables.find((s) =>
      [...s.options].some((o) => o.textContent === 'Tinto')
    )

    act(() => {
      const selectCategoria = desplegableCategoria as HTMLSelectElement
      selectCategoria.value = 'Tinto'
      selectCategoria.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(eventos.filtros).toEqual([{ categoria: 'Tinto' }])
  })

  it('quita la clave del filtro cuando se vuelve a "Todos"', () => {
    montar()

    const desplegable = nodos('select').find((s) =>
      [...s.options].some((o) => o.textContent === 'Tinto')
    ) as HTMLSelectElement

    act(() => {
      desplegable.value = 'Tinto'
      desplegable.dispatchEvent(new Event('change', { bubbles: true }))
    })
    act(() => {
      desplegable.value = ''
      desplegable.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(eventos.filtros).toEqual([{ categoria: 'Tinto' }, {}])
  })
})

describe('DataTable: busqueda y limpieza', () => {
  it('emite onSearchChange al escribir', () => {
    montar()

    escribirEnCampo(nodos('input[type="search"]')[0] as HTMLInputElement, 'malbec')

    expect(eventos.busquedas).toEqual(['malbec'])
  })

  it('el boton "Limpiar filtros" restablece busqueda, filtros y orden', () => {
    montar()

    const desplegable = nodos('select').find((s) =>
      [...s.options].some((o) => o.textContent === 'Tinto')
    ) as HTMLSelectElement
    act(() => {
      desplegable.value = 'Tinto'
      desplegable.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const limpiar = botonPorTexto('Limpiar filtros')
    expect(limpiar).toBeDefined()
    pulsar(limpiar!)

    expect(eventos.filtros.at(-1)).toEqual({})
    expect(eventos.ordenes.at(-1)).toBeNull()
    expect(eventos.busquedas).toEqual([''])
    expect(eventos.paginas).toEqual([1])
  })
})

describe('DataTable: estados de carga y vacio', () => {
  it('muestra esqueletos en vez de filas mientras carga', () => {
    montar({ data: [], total: 0, isLoading: true })

    expect(nodos('tbody tr')).toHaveLength(8)
    expect(nodos('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('no muestra el mensaje de vacio mientras carga', () => {
    montar({ data: [], total: 0, isLoading: true })

    expect(texto()).not.toContain('Sin resultados')
  })

  it('distingue "no hay registros" de "sin resultados"', () => {
    // Sin filtros no hay nada cargado todavia; con filtros hay datos pero
    // ninguno coincide. La palabra es distinta para no culpar al usuario de
    // una tabla que recien se abrio vacia.
    montar({ data: [], total: 0 })
    const sinNada = texto()

    montar({ data: [], total: 0, page: 1, limit: 10 })
    act(() => {
      const desplegable = nodos('select').find((s) =>
        [...s.options].some((o) => o.textContent === 'Tinto')
      ) as HTMLSelectElement
      desplegable.value = 'Tinto'
      desplegable.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(sinNada).toContain('No hay registros')
    expect(texto()).toContain('Sin resultados')
  })
})

describe('DataTable: exportacion', () => {
  it('el boton Exportar CSV llama a onExport', () => {
    montar()

    pulsar(botonPorTexto('Exportar CSV')!)

    expect(eventos.exportaciones).toBe(1)
  })

  it('deshabilita exportar cuando no hay nada', () => {
    montar({ data: [], total: 0 })

    expect(botonPorTexto('Exportar CSV')?.disabled).toBe(true)
  })
})
