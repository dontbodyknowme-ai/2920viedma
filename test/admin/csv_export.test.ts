import { describe, expect, it } from 'vitest'
import { parsearCsv } from '../../src/utils/csv'
import { csvCatalogo, csvClientes, csvPedidos } from '../../src/utils/csv_export'
import { mockCustomers, mockOrders, mockWines } from '../../src/mocks/data'
import type { Customer } from '../../src/types/admin'

/**
 * Generadores de CSV del panel.
 *
 * Lo que se fija aca es el **contrato de columnas**, porque hay tres lugares que
 * dependen de el: los botones de export de cada pagina, los botones de la pagina
 * de Configuracion, y el importador que tiene que poder leer lo que se exporto.
 *
 * Si una columna cambia de nombre o de lugar, el archivo que baja el admin deja
 * de coincidir con lo que el importador entiende, y el ciclo exportar ->
 * reimportar se rompe sin error visible.
 */

const wineVacio = {
  name: 'Vino',
  winery: 'Bodega',
  varietal: 'Malbec',
  category: 'Tinto',
  vintage: 2020,
  price: 10000,
  description: '',
  imageUrl: '',
  tastingNotes: undefined,
  foodPairing: undefined
} as const

describe('csvCatalogo', () => {
  it('incluye el id en la primera columna', () => {
    // Sin `id`, reimportar el archivo crearia una copia de cada vino en vez de
    // actualizar el existente.
    const texto = csvCatalogo([{ ...wineVacio, id: 'v-1', stock: 3, activo: true }])
    const { encabezados, filas } = parsearCsv(texto)

    expect(encabezados[0]).toBe('Id')
    expect(filas[0][0]).toBe('v-1')
  })

  it('tiene el mismo encabezado que el importador entiende', () => {
    // El importador busca estas columnas por alias en espanol e ingles. Si
    // aparece una que no, la fila entra con el valor vacio en silencio.
    const { encabezados } = parsearCsv(csvCatalogo([]))

    expect(encabezados).toEqual([
      'Id',
      'Nombre',
      'Bodega',
      'Cepa',
      'Categoria',
      'Cosecha',
      'Precio',
      'Stock',
      'Activo',
      'Descripcion'
    ])
  })

  it('escribe activo como si/no, no como booleano', () => {
    // `Boolean("no")` da `true`: si escribiera `true`/`false`, el reimportador
    // tendria que interpretarlos, y un `false` en CSV es texto, no booleano.
    const texto = csvCatalogo([
      { ...wineVacio, id: 'a', stock: 0, activo: true },
      { ...wineVacio, id: 'b', stock: 0, activo: false }
    ])
    const { filas } = parsearCsv(texto)

    expect(filas[0][8]).toBe('si')
    expect(filas[1][8]).toBe('no')
  })

  it('cero vinos produce solo el encabezado', () => {
    // Un archivo con encabezado y cero filas es un export vacio legitimo: el
    // filtro dio cero resultados. Sin encabezado, el importador lo tomaria
    // como archivo sin columnas obligatorias y reportaria un error.
    const { encabezados, filas } = parsearCsv(csvCatalogo([]))

    expect(encabezados).toHaveLength(10)
    expect(filas).toHaveLength(0)
  })
})

describe('csvClientes', () => {
  it('incluye el id y el total gastado', () => {
    const cliente = mockCustomers[0]
    const { encabezados, filas } = parsearCsv(csvClientes([cliente]))

    expect(encabezados).toEqual([
      'Id',
      'Nombre',
      'Email',
      'Telefono',
      'Pedidos',
      'Total gastado',
      'Ultimo pedido',
      'Tags'
    ])
    expect(filas[0][0]).toBe(cliente.id)
    expect(filas[0][5]).toBe(String(cliente.totalSpent))
  })

  it('deja vacio el ultimo pedido de quien nunca compro', () => {
    // "Nunca" en la celda seria ambiguo: es un dato, no una ausencia. Vacio se
    // distingue de cualquier fecha.
    //
    // Se arma el cliente a mano en vez de buscarlo en los mocks: con 25 pedidos
    // sobre 15 clientes, ninguno quedo sin comprar, asi que el caso no aparece
    // en los datos. El comportamiento hay que probarlo igual, porque un cliente
    // recien registrado lo va a tener.
    const sinPedidos: Customer = {
      ...mockCustomers[0],
      id: 'sin-pedidos',
      name: 'Cliente Nuevo',
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null
    }

    const { filas } = parsearCsv(csvClientes([sinPedidos]))

    expect(filas[0][6]).toBe('')
    expect(filas[0][4]).toBe('0')
  })

  it('separa las tags con espacio y no con coma', () => {
    // La coma separa columnas. Un cliente con dos tags escrito como
    // `vip, nuevo` partiria la fila en dos y el archivo quedaria corrupto.
    const conDosTags = mockCustomers.find((c) => c.tags.length >= 2)
    expect(conDosTags).toBeDefined()

    const { encabezados, filas } = parsearCsv(
      csvClientes(conDosTags === undefined ? [] : [conDosTags])
    )

    // Si la fila se hubiera partido, Habria mas columnas de las que dice el
    // encabezado.
    expect(filas[0]).toHaveLength(encabezados.length)
    expect(filas[0][7]).toContain(' ')
    expect(filas[0][7]).not.toContain(',')
  })

  it('el cliente sin email no rompe la fila', () => {
    // CE-04: hay clientes sin email ni telefono. Con celda vacia en el medio,
    // un parser ingenuo con `split(',')` correria todas las columnas.
    const sinContacto = mockCustomers.find((c) => c.email === '')
    expect(sinContacto).toBeDefined()

    const { encabezados, filas } = parsearCsv(
      csvClientes(sinContacto === undefined ? [] : [sinContacto])
    )

    expect(filas[0]).toHaveLength(encabezados.length)
    expect(filas[0][1]).toBe(sinContacto?.name)
  })
})

describe('csvPedidos', () => {
  it('tiene las ocho columnas del enunciado', () => {
    const { encabezados, filas } = parsearCsv(csvPedidos(mockOrders.slice(0, 1)))

    expect(encabezados).toEqual([
      'Id',
      'Cliente',
      'Email',
      'Fecha',
      'Total',
      'Estado',
      'Unidades',
      'Ciudad'
    ])
    expect(filas[0]).toHaveLength(8)
  })

  it('la fecha sale como YYYY-MM-DD, no como ISO completo', () => {
    // `createdAt` es `2026-09-05T15:07:26.488Z`. En una celda de Excel esa
    // cadena no se reconoce como fecha.
    const { filas } = parsearCsv(csvPedidos(mockOrders.slice(0, 1)))

    expect(filas[0][3]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('suma las unidades de todos los items del pedido', () => {
    const pedido = mockOrders[0]
    const esperado = pedido.items.reduce((suma, item) => suma + item.quantity, 0)
    const { filas } = parsearCsv(csvPedidos([pedido]))

    expect(filas[0][6]).toBe(String(esperado))
  })
})

describe('los tres generadores juntos', () => {
  it('ninguno rompe con una lista vacia', () => {
    ;[csvCatalogo, csvClientes, csvPedidos].forEach((generador) => {
      const { encabezados } = parsearCsv(generador([]))
      expect(encabezados.length).toBeGreaterThan(0)
    })
  })

  it('cada archivo exportado se puede volver a parsear con el mismo ancho', () => {
    // La propiedad que importa: si el generador escribe algo con una coma
    // adentro sin escapar, el archivo se desalinea y toda columna despues de
    // esa queda corrida una posicion.
    const casos: Array<[string, string]> = [
      ['catalogo', csvCatalogo(mockWines)],
      ['clientes', csvClientes(mockCustomers)],
      ['pedidos', csvPedidos(mockOrders)]
    ]

    casos.forEach(([nombre, texto]) => {
      const { encabezados, filas } = parsearCsv(texto)

      filas.forEach((fila) => {
        expect(`${nombre}: ${fila.length}`).toBe(`${nombre}: ${encabezados.length}`)
      })
    })
  })
})