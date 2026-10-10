import type { AdminWine, Customer, Order } from '../types/admin'
import { aIsoLocal } from '../utils/fechas'
import { mockCustomers, mockOrders, mockWines } from './data'

/**
 * Filtrado del lado del servidor, como query params.
 *
 * Vive en su propio modulo porque es **logica de negocio, no transporte**: los
 * tests la llaman directo en vez de levantar MSW (bajo jsdom, MSW v2 no
 * intercepta el `fetch` de undici, asi que una prueba de extremo a extremo del
 * endpoint daria `ECONNREFUSED` en vez de probar algo).
 */

export const normalizar = (valor: string | null): string =>
  (valor ?? '').trim().toLowerCase()

export const filtrarVinos = (url: URL): AdminWine[] => {
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

export const filtrarPedidos = (url: URL): Order[] => {
  const busqueda = normalizar(url.searchParams.get('search'))
  const desde = url.searchParams.get('dateFrom')
  const hasta = url.searchParams.get('dateTo')

  // `status` acepta **varios estados separados por coma**, porque el filtro del
  // panel es multi-select. Antes comparaba contra la cadena entera, asi que
  // pedir `pendiente,enviado` no matcheaba con nada y la tabla salia vacia sin
  // error: el admin veia que no habia pedidos cuando si los habia.
  const estados = (url.searchParams.get('status') ?? '')
    .split(',')
    .map(normalizar)
    .filter((estado) => estado !== '')

  // `createdAt` es un ISO completo **en UTC** (`2026-01-16T02:30:00.000Z`), y el
  // filtro manda fechas peladas en `YYYY-MM-DD`, que son **fechas locales** del
  // usuario (ver `aIsoLocal`).
  //
  // Por eso el dia no se saca con `slice(0, 10)`: eso da `2026-01-16`, y un
  // pedido hecho el 15 a las 23:30 en Buenos Aires caeria fuera de un rango
  // "del 1 al 15" que el usuario acaba de elegir. Se convierte a la fecha local
  // primero, que es la misma regla que aplica el cliente.
  const diaDe = (iso: string): string => aIsoLocal(new Date(iso))

  return mockOrders.filter((pedido) => {
    const coincideEstado = estados.length === 0 || estados.includes(pedido.status)
    const coincideBusqueda =
      busqueda === '' ||
      pedido.id.toLowerCase().includes(busqueda) ||
      // El `customerId` se busca tambien: es como el drawer del CRM encuentra
      // los pedidos de un cliente. Sin esto, `?search=cli-1` no devuelve nada
      // porque el id del cliente no aparece en ningun campo visible del pedido.
      pedido.customerId.toLowerCase().includes(busqueda) ||
      pedido.customerName.toLowerCase().includes(busqueda) ||
      pedido.customerEmail.toLowerCase().includes(busqueda)
    const coincideDesde = desde === null || diaDe(pedido.createdAt) >= desde
    const coincideHasta = hasta === null || diaDe(pedido.createdAt) <= hasta
    return coincideEstado && coincideBusqueda && coincideDesde && coincideHasta
  })
}

export const filtrarClientes = (url: URL): Customer[] => {
  const busqueda = normalizar(url.searchParams.get('search'))
  const tags = (url.searchParams.get('tags') ?? '')
    .split(',')
    .map(normalizar)
    .filter((tag) => tag !== '')

  return mockCustomers.filter((cliente) => {
    const coincideBusqueda =
      busqueda === '' ||
      cliente.name.toLowerCase().includes(busqueda) ||
      cliente.email.toLowerCase().includes(busqueda) ||
      cliente.phone.toLowerCase().includes(busqueda)
    // Las tags son AND: buscar `vip,nuevo` es "que tenga las dos", no "una de
    // las dos". Es el filtro que el admin espera de un multiselect de etiquetas.
    const coincideTags = tags.length === 0 || tags.every((tag) => cliente.tags.includes(tag))
    return coincideBusqueda && coincideTags
  })
}