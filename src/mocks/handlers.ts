import { http, HttpResponse, delay } from 'msw'
import type {
  AdminWine,
  Customer,
  Metrics,
  Order,
  OrderStatus,
  Paginated
} from '../types/admin'
import { importarVinos } from './importar_vinos'
import { vinoDesdeCuerpo } from './vino_schema'
import { mockCustomers, mockMetrics, mockOrders, mockWines } from './data'

// Latencia aleatoria entre 300 y 800 ms. Existe para que los estados de carga
// y los skeletons de la UI se vean de verdad, no como un parpadeo.
const esperar = (min: number, max: number): Promise<void> =>
  delay(min + Math.random() * (max - min))

const ERRORES = {
  noAutorizado: () => HttpResponse.json({ code: 'UNAUTHORIZED', message: 'No autenticado' }, { status: 401 }),
  noEncontrado: (recurso: string) =>
    HttpResponse.json({ code: 'NOT_FOUND', message: `${recurso} no encontrado` }, { status: 404 }),
  conflicto: (code: string, details: unknown) =>
    HttpResponse.json({ code, message: 'Conflicto', details }, { status: 409 }),
  validacion: (message: string) =>
    HttpResponse.json({ code: 'VALIDATION_ERROR', message }, { status: 400 })
}

// ---------------------------------------------------------------------------
// Lectura de parametros de consulta, con los mismos defaults que la spec.
// ---------------------------------------------------------------------------
interface ParamsPaginacion {
  page: number
  limit: number
}

const leerPaginacion = (url: URL): ParamsPaginacion => {
  const page = Number(url.searchParams.get('page') ?? '1')
  const limit = Number(url.searchParams.get('limit') ?? '10')
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10
  }
}

/** Aplica la paginacion a un arreglo ya filtrado. */
const paginar = <T,>(lista: T[], { page, limit }: ParamsPaginacion): Paginated<T> => ({
  data: lista.slice((page - 1) * limit, page * limit),
  total: lista.length,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(lista.length / limit))
})

const normalizar = (texto: string | null): string => (texto ?? '').trim().toLowerCase()

// ---------------------------------------------------------------------------
// VINOS
// ---------------------------------------------------------------------------
const filtrarVinos = (url: URL): AdminWine[] => {
  const busqueda = normalizar(url.searchParams.get('search'))
  const categoria = normalizar(url.searchParams.get('category'))
  const varietal = normalizar(url.searchParams.get('varietal'))
  const estado = normalizar(url.searchParams.get('status'))

  return mockWines.filter((vino) => {
    const coincideBusqueda =
      busqueda === '' ||
      vino.name.toLowerCase().includes(busqueda) ||
      vino.winery.toLowerCase().includes(busqueda) ||
      vino.varietal.toLowerCase().includes(busqueda)
    const coincideCategoria = categoria === '' || vino.category.toLowerCase() === categoria
    const coincideVarietal = varietal === '' || vino.varietal.toLowerCase() === varietal
    const coincideEstado =
      estado === '' || (estado === 'activo' ? vino.activo : !vino.activo)
    return coincideBusqueda && coincideCategoria && coincideVarietal && coincideEstado
  })
}

// ---------------------------------------------------------------------------
// PEDIDOS
// ---------------------------------------------------------------------------
const filtrarPedidos = (url: URL): Order[] => {
  const estado = normalizar(url.searchParams.get('status'))
  const busqueda = normalizar(url.searchParams.get('search'))
  const desde = url.searchParams.get('dateFrom')
  const hasta = url.searchParams.get('dateTo')

  return mockOrders.filter((pedido) => {
    const coincideEstado = estado === '' || pedido.status === estado
    const coincideBusqueda =
      busqueda === '' ||
      pedido.id.toLowerCase().includes(busqueda) ||
      pedido.customerName.toLowerCase().includes(busqueda) ||
      pedido.customerEmail.toLowerCase().includes(busqueda)
    const coincideDesde = desde === null || pedido.createdAt >= desde
    const coincideHasta = hasta === null || pedido.createdAt <= `${hasta}T23:59:59.999Z`
    return coincideEstado && coincideBusqueda && coincideDesde && coincideHasta
  })
}

// ---------------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------------
const filtrarClientes = (url: URL): Customer[] => {
  const busqueda = normalizar(url.searchParams.get('search'))
  const tags = (url.searchParams.get('tags') ?? '')
    .split(',')
    .map((tag) => normalizar(tag))
    .filter((tag) => tag !== '')

  return mockCustomers.filter((cliente) => {
    const coincideBusqueda =
      busqueda === '' ||
      cliente.name.toLowerCase().includes(busqueda) ||
      cliente.email.toLowerCase().includes(busqueda) ||
      cliente.phone.toLowerCase().includes(busqueda)
    const coincideTags = tags.length === 0 || tags.every((tag) => cliente.tags.includes(tag))
    return coincideBusqueda && coincideTags
  })
}
// ---------------------------------------------------------------------------
// Importacion de CSV. La logica vive en su propio modulo: es negocio, no transporte.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// HANDLERS
// ---------------------------------------------------------------------------
export const handlers = [
  // --- VINOS: listar -------------------------------------------------------
  http.get('/api/wines', async ({ request }) => {
    await esperar(300, 800)
    const url = new URL(request.url)
    return HttpResponse.json(paginar(filtrarVinos(url), leerPaginacion(url)))
  }),

  // --- VINOS: crear -------------------------------------------------------
  http.post('/api/wines', async ({ request }) => {
    await esperar(300, 800)
    const cuerpo = (await request.json()) as Record<string, unknown>
    const vino = vinoDesdeCuerpo(cuerpo)
    if (vino === null) {
      return ERRORES.validacion('Nombre, bodega, precio mayor que cero y cosecha valida son obligatorios')
    }
    mockWines.push(vino)
    return HttpResponse.json(vino, { status: 201 })
  }),

  // --- VINOS: actualizar --------------------------------------------------
  http.patch('/api/wines/:id', async ({ params, request }) => {
    await esperar(300, 800)
    const vino = mockWines.find((v) => v.id === params.id)
    if (vino === undefined) return ERRORES.noEncontrado('Vino')

    const cuerpo = (await request.json()) as Partial<AdminWine>
    const combinado = vinoDesdeCuerpo({ ...vino, ...cuerpo })
    if (combinado === null) return ERRORES.validacion('Los datos actualizados no son validos')

    Object.assign(vino, combinado, { id: vino.id })
    return HttpResponse.json(vino)
  }),

  // --- VINOS: eliminar ----------------------------------------------------
  // No se puede borrar un vino que aparece en un pedido: el historial de esos
  // pedidos dejaria de ser reproducible. Ver CE-01 de la spec.
  http.delete('/api/wines/:id', async ({ params }) => {
    await esperar(300, 800)
    const indice = mockWines.findIndex((vino) => vino.id === params.id)
    if (indice === -1) return ERRORES.noEncontrado('Vino')

    const pedidosAfectados = mockOrders.filter((pedido) =>
      pedido.items.some((item) => item.wineId === params.id)
    )
    if (pedidosAfectados.length > 0) {
      return ERRORES.conflicto('HAS_ORDERS', { count: pedidosAfectados.length })
    }

    mockWines.splice(indice, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // --- VINOS: importar CSV ------------------------------------------------
  http.post('/api/wines/import', async ({ request }) => {
    await esperar(300, 800)
    const texto = await request.text()
    const resultado = importarVinos(texto)
    // 201 cuando todo entro limpio, 207 cuando alguna fila quedo afuera.
    return HttpResponse.json(resultado, { status: resultado.errors.length === 0 ? 201 : 207 })
  }),

  // --- PEDIDOS: listar ----------------------------------------------------
  http.get('/api/orders', async ({ request }) => {
    await esperar(300, 800)
    const url = new URL(request.url)
    return HttpResponse.json(paginar(filtrarPedidos(url), leerPaginacion(url)))
  }),

  // --- PEDIDOS: detalle ---------------------------------------------------
  http.get('/api/orders/:id', async ({ params }) => {
    await esperar(300, 800)
    const pedido = mockOrders.find((o) => o.id === params.id)
    if (pedido === undefined) return ERRORES.noEncontrado('Pedido')
    return HttpResponse.json(pedido)
  }),

  // --- PEDIDOS: cambiar estado -------------------------------------------
  // Solo se agrega una entrada al timeline si el estado cambia de verdad.
  // Un PATCH con el estado actual no duplica historial.
  http.patch('/api/orders/:id', async ({ params, request }) => {
    await esperar(300, 800)
    const pedido = mockOrders.find((o) => o.id === params.id)
    if (pedido === undefined) return ERRORES.noEncontrado('Pedido')

    const cuerpo = (await request.json()) as { status?: OrderStatus }
    const nuevoEstado = cuerpo.status
    if (nuevoEstado === undefined) return ERRORES.validacion('Falta el campo status')

    if (pedido.status !== nuevoEstado) {
      pedido.timeline.push({
        status: nuevoEstado,
        timestamp: new Date().toISOString(),
        author: 'Admin'
      })
      pedido.status = nuevoEstado
      pedido.updatedAt = new Date().toISOString()
    }

    return HttpResponse.json(pedido)
  }),

  // --- CLIENTES: listar ---------------------------------------------------
  http.get('/api/customers', async ({ request }) => {
    await esperar(300, 800)
    const url = new URL(request.url)
    return HttpResponse.json(paginar(filtrarClientes(url), leerPaginacion(url)))
  }),

  // --- CLIENTES: detalle --------------------------------------------------
  http.get('/api/customers/:id', async ({ params }) => {
    await esperar(300, 800)
    const cliente = mockCustomers.find((c) => c.id === params.id)
    if (cliente === undefined) return ERRORES.noEncontrado('Cliente')
    return HttpResponse.json(cliente)
  }),

  // --- CLIENTES: actualizar ----------------------------------------------
  // Las notas se agregan (nunca se borran las previas) y los tags se reemplazan
  // por completo, que son las dos semanticas distintas que pide RF-11.
  http.patch('/api/customers/:id', async ({ params, request }) => {
    await esperar(300, 800)
    const cliente = mockCustomers.find((c) => c.id === params.id)
    if (cliente === undefined) return ERRORES.noEncontrado('Cliente')

    const cuerpo = (await request.json()) as {
      notes?: Array<{ text: string }>
      tags?: string[]
    }

    if (Array.isArray(cuerpo.notes)) {
      for (const nota of cuerpo.notes) {
        if (typeof nota.text !== 'string' || nota.text.trim() === '') continue
        cliente.notes.push({
          id: `nota-${cliente.id}-${cliente.notes.length + 1}`,
          text: nota.text.trim(),
          author: 'Admin',
          createdAt: new Date().toISOString()
        })
      }
    }

    if (Array.isArray(cuerpo.tags)) {
      cliente.tags = cuerpo.tags.filter((tag) => typeof tag === 'string')
    }

    return HttpResponse.json(cliente)
  }),

  // --- METRICAS ----------------------------------------------------------
  http.get('/api/metrics', async () => {
    await esperar(300, 800)
    return HttpResponse.json(mockMetrics satisfies Metrics)
  })
]

// `ERRORES` se exporta para que T2 (proteccion de rutas) pueda reusar las
// respuestas de error sin volver a definirlas.
export { ERRORES }
