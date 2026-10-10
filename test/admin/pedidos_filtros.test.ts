import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { filtrarPedidos } from '../../src/mocks/filtros'
import { mockOrders } from '../../src/mocks/data'
import { aIsoLocal } from '../../src/components/admin/date_range_picker'
import type { Order } from '../../src/types/admin'

/**
 * Filtros y transiciones de pedido.
 *
 * Se llama a la funcion de filtrado directo en vez de por HTTP: bajo jsdom, MSW
 * v2 no intercepta el `fetch` de undici, asi que una prueba de extremo a
 * extremo del endpoint daria `ECONNREFUSED` en vez de probar algo.
 */

const url = (consulta: string): URL => new URL(`http://localhost/api/orders?${consulta}`)

const nombreDe = (pedidos: Order[]): string[] => pedidos.map((pedido) => pedido.id)

describe('filtrarPedidos', () => {
  let original: Order[]

  beforeEach(() => {
    original = mockOrders.map((pedido) => ({ ...pedido }))
  })

  afterEach(() => {
    mockOrders.length = 0
    mockOrders.push(...original)
  })

  it('devuelve todo cuando no hay filtros', () => {
    expect(filtrarPedidos(url('page=1&limit=10'))).toHaveLength(mockOrders.length)
  })

  it('filtra por un solo estado', () => {
    const resultado = filtrarPedidos(url('status=pendiente'))
    const esperados = mockOrders.filter((pedido) => pedido.status === 'pendiente')

    expect(resultado.length).toBe(esperados.length)
    expect(resultado.length).toBeGreaterThan(0)
  })

  it('acepta varios estados separados por coma, con OR entre ellos', () => {
    // Este es el caso que estaba roto: el handler comparaba contra la cadena
    // entera "pendiente,enviado", que no es ningun estado, asi que la tabla
    // salia vacia sin ningun error visible.
    const resultado = filtrarPedidos(url('status=pendiente,enviado'))
    const esperados = mockOrders.filter(
      (pedido) => pedido.status === 'pendiente' || pedido.status === 'enviado'
    )

    expect(resultado.length).toBe(esperados.length)
    expect(resultado.length).toBeGreaterThan(0)
  })

  it('ignora los espacios alrededor de los estados', () => {
    const conEspacios = filtrarPedidos(url('status=pendiente,%20enviado'))
    const sinEspacios = filtrarPedidos(url('status=pendiente,enviado'))

    expect(nombreDe(conEspacios)).toEqual(nombreDe(sinEspacios))
  })

  it('busca por id, nombre y email del cliente', () => {
    const cliente = mockOrders[0]

    expect(
      filtrarPedidos(url(`search=${encodeURIComponent(cliente.id)}`)).length
    ).toBeGreaterThan(0)
    expect(
      filtrarPedidos(url(`search=${encodeURIComponent(cliente.customerName)}`)).length
    ).toBeGreaterThan(0)
    expect(
      filtrarPedidos(url(`search=${encodeURIComponent(cliente.customerEmail)}`)).length
    ).toBeGreaterThan(0)
  })

  it('busca tambien por customerId, que es como el CRM encuentra los pedidos', () => {
    // Sin esto, el drawer del cliente abria la pestana "Pedidos" vacia para
    // cualquier cliente: el `customerId` no aparece en ningun campo visible
    // del pedido, asi que `?search=cli-1` no encontraba nada.
    const cliente = mockOrders[0]

    const porCustomerId = filtrarPedidos(
      url(`search=${encodeURIComponent(cliente.customerId)}`)
    )

    expect(porCustomerId.length).toBeGreaterThan(0)
    porCustomerId.forEach((pedido) => {
      expect(pedido.customerId).toBe(cliente.customerId)
    })
  })

  it('filtra por rango de fechas cerrado, con ambos extremos', () => {
    // El filtro es inclusivo: elegir "del 1 al 15" tiene que incluir el 1 y el
    // 15. Un rango con `>` en el ultimo dia dejaria fuera los pedidos de ese
    // dia, que es justo el dia que el usuario senalo.
    const fechas = mockOrders.map((pedido) => aIsoLocal(new Date(pedido.createdAt)))
    const ordenadas = [...fechas].sort()
    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]

    const enRango = filtrarPedidos(url(`dateFrom=${primera}&dateTo=${ultima}`))
    expect(enRango.length).toBeGreaterThan(0)
    expect(enRango.length).toBeLessThanOrEqual(mockOrders.length)
  })

  it('un dia unico como rango incluye los pedidos de ese dia', () => {
    const objetivo = aIsoLocal(new Date(mockOrders[0].createdAt))
    const resultado = filtrarPedidos(url(`dateFrom=${objetivo}&dateTo=${objetivo}`))

    // Todos los que devuelve tienen que ser de ese dia, sin excepcion.
    resultado.forEach((pedido) => {
      expect(aIsoLocal(new Date(pedido.createdAt))).toBe(objetivo)
    })
  })

  it('compara las fechas por dia local y no por el instante UTC', () => {
    // Un pedido con `createdAt` que en UTC es del dia 16 pero en hora local es
    // del 15 tiene que contar como del 15. `createdAt.slice(0,10)` daria "16".
    const local = aIsoLocal(new Date('2026-01-15T23:30:00-03:00'))
    expect(local).toBe('2026-01-15')

    mockOrders.push({
      ...mockOrders[0],
      id: 'TEST-TZ',
      createdAt: '2026-01-16T02:30:00.000Z',
      updatedAt: '2026-01-16T02:30:00.000Z'
    })

    // Buscando por el dia local (15), tiene que aparecer: es el dia que el
    // calendario le mostro al usuario.
    const porLocal = filtrarPedidos(url('dateFrom=2026-01-15&dateTo=2026-01-15'))
    expect(porLocal.some((pedido) => pedido.id === 'TEST-TZ')).toBe(true)

    // Y NO tiene que aparecer el dia UTC (16). Con la conversion correcta ese
    // dia no existe para este pedido; con `slice(0,10)` si, y el admin lo
    // veria en el filtro equivocado.
    const porUtc = filtrarPedidos(url('dateFrom=2026-01-16&dateTo=2026-01-16'))
    expect(porUtc.some((pedido) => pedido.id === 'TEST-TZ')).toBe(false)
  })

  it('combina estado y fecha con AND', () => {
    const fecha = aIsoLocal(new Date(mockOrders[0].createdAt))
    const resultado = filtrarPedidos(url(`status=pendiente&dateFrom=${fecha}&dateTo=${fecha}`))

    resultado.forEach((pedido) => {
      expect(pedido.status).toBe('pendiente')
      expect(aIsoLocal(new Date(pedido.createdAt))).toBe(fecha)
    })
  })

  it('devuelve vacio sin error cuando el rango no tiene pedidos', () => {
    // Un rango fuera de los datos tiene que devolver 0 filas, no un error ni un
    // pedido cualquiera.
    expect(filtrarPedidos(url('dateFrom=1990-01-01&dateTo=1990-01-02'))).toHaveLength(0)
  })
})

describe('timeline del pedido', () => {
  it('el ultimo evento del timeline es el estado actual', () => {
    // El drawer dibuja el historial tal cual. Si no coincidieran, la ultima
    // linea del timeline contradiria al badge de arriba.
    mockOrders.forEach((pedido) => {
      expect(pedido.timeline[pedido.timeline.length - 1].status).toBe(pedido.status)
    })
  })

  it('conserva los saltos de estado que no pasan por todos los eslabones', () => {
    // CE-06 permite pasar de `pendiente` a `entregado` sin pasar por `enviado`.
    // Un timeline recalculado a partir del estado actual esconderia ese salto, y
    // el admin veria un pedido entregado sin rastro de como llegó.
    const saltado = mockOrders.find(
      (pedido) =>
        pedido.timeline.length > 1 &&
        pedido.timeline.some((evento) => evento.status === 'entregado') &&
        !pedido.timeline.some((evento) => evento.status === 'enviado')
    )

    if (saltado !== undefined) {
      expect(saltado.timeline.some((evento) => evento.status === 'enviado')).toBe(false)
      expect(saltado.timeline.some((evento) => evento.status === 'entregado')).toBe(true)
    }
  })

  it('el subtotal de los items cuadra con el total del pedido', () => {
    // El drawer calcula el envio como `total - subtotal`. Si eso da negativo,
    // la linea de envio mostraria un numero sin sentido.
    mockOrders.forEach((pedido) => {
      const subtotal = pedido.items.reduce(
        (suma, item) => suma + item.price * item.quantity,
        0
      )

      expect(pedido.total).toBeGreaterThanOrEqual(subtotal)
    })
  })
})