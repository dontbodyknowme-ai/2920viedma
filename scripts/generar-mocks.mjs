// Generador de datos mock para la spec 004-a.
//
// Se separa del archivo de datos por dos razones: los datos mock son
// voluminosos y mecanicos, y generarlos con codigo evita que 25 pedidos y 15
// clientes escritos a mano se desincronicen entre si (un totalSpent que no
// coincide con la suma de sus pedidos, por ejemplo).
//
// Es `.mjs` y no `.ts` a proposito: corre con `node` pelado, sin tsx ni ningun
//步 ejecutor extra, y tsconfig solo incluye `src/` asi que no lo typechequea.
//
//   node scripts/generar-mocks.mjs
//
// La salida es deterministica: el azar viene de un PRNG con semilla fija, asi
// que dos corridas producen el mismo archivo.

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const SALIDA = resolve(AQUI, '..', 'src', 'mocks', 'data.ts')

// ---------------------------------------------------------------------------
// PRNG determinista (mulberry32).
// ---------------------------------------------------------------------------
const crearAzar = (semilla) => {
  let estado = semilla
  return () => {
    estado |= 0
    estado = (estado + 0x6d2b79f5) | 0
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const azar = crearAzar(20261008)

const enteroEntre = (min, max) => Math.floor(azar() * (max - min + 1)) + min

const elegir = (lista) => lista[Math.floor(azar() * lista.length)]

const HOY = new Date()

const restarDias = (base, dias) => {
  const copia = new Date(base)
  copia.setDate(copia.getDate() - dias)
  return copia
}

const iso = (fecha) => fecha.toISOString()

// ---------------------------------------------------------------------------
// VINOS: 12. Los dos primeros son los que ya venia la app, para que el
// catalogo publico no cambie de golpe al activar el modo admin. Los ultimos
// dos entran con activo: false para que el filtro por estado tenga algo que
// filtrar.
// ---------------------------------------------------------------------------
const CATALOGO_BASE = [
  {
    name: 'Gran Reserva Malbec',
    winery: 'Bodega Catena Zapata',
    varietal: 'Malbec',
    category: 'Tinto',
    vintage: 2020,
    price: 45000,
    description: 'Vino tinto de gran cuerpo con notas de frutos rojos maduros y roble frances.',
    tastingNotes: 'Ciruela, vainilla, chocolate negro y un final persistente.',
    foodPairing: 'Carnes rojas asadas, chivo a la estaca y quesos curados.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
    stock: 24
  },
  {
    name: 'Chardonnay White Bones',
    winery: 'El Enemigo',
    varietal: 'Chardonnay',
    category: 'Blanco',
    vintage: 2021,
    price: 38000,
    description: 'Elegente blanco con gran acidez, mineralidad y paso por barrica.',
    tastingNotes: 'Manzana verde, manteca, notas citricas y minerales.',
    foodPairing: 'Pescados grasos, mariscos y pastas con salsas blancas.',
    imageUrl: 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800',
    stock: 18
  },
  {
    name: 'Cabernet Sauvignon Reserva',
    winery: 'Catena Chadwick',
    varietal: 'Cabernet Sauvignon',
    category: 'Tinto',
    vintage: 2019,
    price: 62000,
    description: 'Cabernet de guarda con estructura firme y final largo de cedro.',
    tastingNotes: 'Grosella negra, grafito, cedro y un final mineral persistente.',
    foodPairing: 'Cordera al vino tinto, milanesas y semicurado de Parma.',
    imageUrl: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
    stock: 12
  },
  {
    name: 'Pinot Noir Seleccion',
    winery: 'Luigi Bosca',
    varietal: 'Pinot Noir',
    category: 'Tinto',
    vintage: 2021,
    price: 39500,
    description: 'Delicado, aromatico, con fruta roja brillante y taninos sedosos.',
    tastingNotes: 'Fresa, cereza, sotobosque y un sutil toque de tierra humeda.',
    foodPairing: 'Salmon, canard, setas y quesos de cabra.',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
    stock: 9
  },
  {
    name: 'Malbec Reserva Familia',
    winery: 'Bodega Norton',
    varietal: 'Malbec',
    category: 'Tinto',
    vintage: 2018,
    price: 28000,
    description: 'Malbec de acceso, maduro y facil de beber, con buena estructura.',
    tastingNotes: 'Ciruela madura, pimienta y un toque de cacao.',
    foodPairing: 'Hamburguesas, parrilla y itragnes.',
    imageUrl: 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
    stock: 40
  },
  {
    name: 'Cabernet Franc',
    winery: 'Pulenta Estate',
    varietal: 'Cabernet Franc',
    category: 'Tinto',
    vintage: 2020,
    price: 33500,
    description: 'Vermut taste en taza, herbaceo, con grafito y fruta roja.',
    tastingNotes: 'Frambuesa, menta, grafito y un final fresco.',
    foodPairing: 'Cordera, hamburguesas gourmet y escabeche.',
    imageUrl: 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
    stock: 15
  },
  {
    name: 'Sauvignon Blanc',
    winery: 'Trapiche',
    varietal: 'Sauvignon Blanc',
    category: 'Blanco',
    vintage: 2022,
    price: 24500,
    description: 'Blanco fresco y aromatico, de acidez vibrante.',
    tastingNotes: 'Limon, pomelo, hierba fresca y un toque mineral.',
    foodPairing: 'Mariscos, ceviche, ensaladas y tabla fria.',
    imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&q=80&w=800',
    stock: 33
  },
  {
    name: 'Riesling Trocken',
    winery: 'Los Cemillos',
    varietal: 'Riesling',
    category: 'Blanco',
    vintage: 2021,
    price: 31000,
    description: 'Blanco seco de moscatel con acidez brillante y un fondo mineral.',
    tastingNotes: 'Lima, miel de azahar, pizarra y un final largo.',
    foodPairing: 'Cocina asiatica, curry y marisco.',
    imageUrl: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
    stock: 7
  },
  {
    name: 'Rose Provence',
    winery: 'Chateau Peyrelongue',
    varietal: 'Grenache',
    category: 'Rosado',
    vintage: 2022,
    price: 22000,
    description: 'Rosado seco, fluido, de color palido y frescura vibrante.',
    tastingNotes: 'Frambuesa, sandia, jazmin y un final mineral.',
    foodPairing: 'Ensaladas, aperitivos y comidas ligeras.',
    imageUrl: 'https://images.unsplash.com/photo-1600091503597-6ddfe4cf94b2?auto=format&fit=crop&q=80&w=800',
    stock: 21
  },
  {
    name: 'Espumante Brut Nature',
    winery: 'Bodega Cono Sur',
    varietal: 'Chardonnay',
    category: 'Espumante',
    vintage: 2020,
    price: 19500,
    description: 'Espumante de Charmat, seco y fresco, con burbuja fina y persistente.',
    tastingNotes: 'Manzana verde, pan tostado y citrico.',
    foodPairing: 'Brindis, aperitivos, pizzas y postres.',
    imageUrl: 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
    stock: 45
  },
  {
    name: 'Espumante Rose',
    winery: 'Chandon',
    varietal: 'Pinot Noir',
    category: 'Espumante',
    vintage: 2021,
    price: 36000,
    description: 'Espumante rosado elegante, con fruta roja y burbuja sedosa.',
    tastingNotes: 'Fresa, frambuesa y brioche tostado.',
    foodPairing: 'Brindis, aperitivos y postres de fruta.',
    imageUrl: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&q=80&w=800',
    stock: 0,
    activo: false
  },
  {
    name: 'Merlot Vintage',
    winery: 'Valderramero',
    varietal: 'Merlot',
    category: 'Tinto',
    vintage: 2017,
    price: 21500,
    description: 'Merlot suave, con fruta madura y taninos pulidos.',
    tastingNotes: 'Ciruela, chocolate con leche y un final suave.',
    foodPairing: 'Pasta, hamburguesas y wardenales.',
    imageUrl: 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
    stock: 28,
    activo: false
  }
]

const mockWines = CATALOGO_BASE.map((vino, indice) => ({
  id: String(indice + 1),
  ...vino,
  activo: vino.activo ?? true
}))

// ---------------------------------------------------------------------------
// CLIENTES: 15.
// ---------------------------------------------------------------------------
const NOMBRES = [
  ['Maria Gomez', 'maria.gomez@correo.com', '+54 261 412-8890'],
  ['Juan Perez', 'juan.perez@correo.com', '+54 261 415-2231'],
  ['Lucia Fernandez', 'lucia.fernandez@correo.com', '+54 261 403-7712'],
  ['Carlos Diaz', 'carlos.diaz@correo.com', '+54 261 422-5567'],
  ['Ana Martinez', 'ana.martinez@correo.com', '+54 261 418-9903'],
  ['Diego Rojas', 'diego.rojas@correo.com', '+54 261 431-2244'],
  ['Sofia Castillo', 'sofia.castillo@correo.com', '+54 261 409-7781'],
  ['Miguel Torres', 'miguel.torres@correo.com', '+54 261 444-3320'],
  ['Valeria Romero', 'valeria.romero@correo.com', '+54 261 407-6655'],
  ['Federico Alvarez', 'federico.alvarez@correo.com', '+54 261 425-1188'],
  ['Camila Sosa', 'camila.sosa@correo.com', '+54 261 412-4439'],
  ['Nicolas Vega', 'nicolas.vega@correo.com', '+54 261 439-6672'],
  ['Florencia Paz', 'florencia.paz@correo.com', '+54 261 406-8815'],
  ['Gonzalo Mendez', 'gonzalo.mendez@correo.com', '+54 261 421-9036'],
  ['Silvia Rojas', 'silvia.rojas@correo.com', '+54 261 434-5527']
]

const TAGS = ['VIP', 'Frecuente', 'Nuevo', 'Mayorista']

const NOTAS_CLIENTE = [
  'Pidio envio express a Mendoza capital.',
  'Consulta por estaciones. Es VIP, atender con prioridad.',
  'Mostro interes en un vino con nombre propio.',
  'Paga con transferencia, confirmar antes de enviar.',
  'Compra para restaurante, suele pedir por volumen.'
]

const mockCustomers = NOMBRES.map(([name, email, phone], indice) => {
  const cantidadNotas = indice % 3 === 0 ? 2 : indice % 4 === 0 ? 1 : 0
  const notes = Array.from({ length: cantidadNotas }, (_, n) => ({
    id: `nota-${indice + 1}-${n + 1}`,
    text: NOTAS_CLIENTE[(indice + n) % NOTAS_CLIENTE.length],
    author: 'Admin',
    createdAt: iso(restarDias(HOY, enteroEntre(2, 40)))
  }))

  let tags = []
  if (indice % 4 === 0) {
    tags = [TAGS[indice % TAGS.length]]
  } else if (indice % 7 === 0) {
    tags = [TAGS[indice % TAGS.length], TAGS[(indice + 1) % TAGS.length]]
  }

  return {
    id: `cli-${indice + 1}`,
    name,
    email,
    phone,
    tags,
    notes,
    totalOrders: 0,
    totalSpent: 0,
    lastOrderAt: null,
    createdAt: iso(restarDias(HOY, enteroEntre(20, 180)))
  }
})

// ---------------------------------------------------------------------------
// PEDIDOS: 25 repartidos en 60 dias.
// ---------------------------------------------------------------------------
const ESTADOS_PESADOS = [
  ['entregado', 40],
  ['enviado', 14],
  ['preparando', 12],
  ['pendiente', 14],
  ['cancelado', 10],
  ['devuelto', 10]
]

const elegirEstado = () => {
  const total = ESTADOS_PESADOS.reduce((suma, [, peso]) => suma + peso, 0)
  let n = azar() * total
  for (const [estado, peso] of ESTADOS_PESADOS) {
    n -= peso
    if (n <= 0) return estado
  }
  return 'pendiente'
}

const DIRECCIONES = [
  { street: 'Av. del Puerto 1280', city: 'Mendoza', zip: 'M5500', phone: '+54 261 412-8890' },
  { street: 'Belgrano 445', city: 'Godoy Cruz', zip: 'M5502', phone: '+54 261 415-2231' },
  { street: 'San Martin 1580', city: 'Mendoza', zip: 'M5500', phone: '+54 261 403-7712' },
  { street: 'Rivadavia 720', city: 'Maipu', zip: 'M5519', phone: '+54 261 422-5567' },
  { street: 'Aristides Maillu 233', city: 'Mendoza', zip: 'M5500', phone: '+54 261 418-9903' },
  { street: 'Colon 981', city: 'Godoy Cruz', zip: 'M5502', phone: '+54 261 431-2244' }
]

const SECUENCIA = ['pendiente', 'preparando', 'enviado', 'entregado']

const indiceDeEstado = (estado) =>
  estado === 'cancelado' || estado === 'devuelto' ? 1 : SECUENCIA.indexOf(estado)

const construirTimeline = (estado, creado, numero) => {
  const destino = indiceDeEstado(estado)
  const eventos = [{ status: 'pendiente', timestamp: iso(creado), author: 'Admin' }]

  for (let paso = 1; paso <= destino; paso++) {
    const momento = new Date(creado)
    momento.setHours(creado.getHours() + paso * enteroEntre(3, 26))
    eventos.push({
      status: SECUENCIA[paso],
      timestamp: iso(momento > HOY ? HOY : momento),
      author: 'Admin'
    })
  }

  if (estado === 'cancelado' || estado === 'devuelto') {
    const momento = new Date(creado)
    momento.setHours(creado.getHours() + 8 + numero)
    eventos.push({
      status: estado,
      timestamp: iso(momento > HOY ? HOY : momento),
      author: 'Admin',
      note:
        estado === 'cancelado'
          ? 'Cancelado a pedido del cliente.'
          : 'Devolucion aceptada. Producto en buen estado.'
    })
  }

  return eventos
}

const mockOrders = []
for (let numero = 1; numero <= 25; numero++) {
  const cliente = mockCustomers[numero % mockCustomers.length]
  const usados = new Set()
  const items = []

  for (let i = 0; i < enteroEntre(1, 4); i++) {
    const vino = elegir(mockWines)
    if (usados.has(vino.id)) continue
    usados.add(vino.id)
    items.push({
      wineId: vino.id,
      wineName: vino.name,
      imageUrl: vino.imageUrl,
      quantity: enteroEntre(1, 3),
      price: vino.price
    })
  }

  const total = items.reduce((suma, item) => suma + item.price * item.quantity, 0)
  const creado = restarDias(HOY, enteroEntre(0, 59))
  const estado = elegirEstado()
  const timeline = construirTimeline(estado, creado, numero)

  mockOrders.push({
    id: `CAVA-${String(1000 + numero)}`,
    customerId: cliente.id,
    customerName: cliente.name,
    customerEmail: cliente.email,
    items,
    total,
    status: estado,
    shippingAddress: elegir(DIRECCIONES),
    timeline,
    createdAt: iso(creado),
    updatedAt: timeline[timeline.length - 1].timestamp
  })
}

// ---------------------------------------------------------------------------
// El historial de los clientes se deriva de los pedidos ya generados, asi que
// los numeros del CRM no pueden desincronizarse de los pedidos.
// ---------------------------------------------------------------------------
for (const cliente of mockCustomers) {
  const suyos = mockOrders.filter((pedido) => pedido.customerId === cliente.id)
  const validos = suyos.filter(
    (pedido) => pedido.status !== 'cancelado' && pedido.status !== 'devuelto'
  )
  cliente.totalOrders = suyos.length
  cliente.totalSpent = validos.reduce((suma, pedido) => suma + pedido.total, 0)
  cliente.lastOrderAt =
    suyos.length > 0
      ? suyos.map((pedido) => pedido.createdAt).sort((a, b) => b.localeCompare(a))[0]
      : null
}

// ---------------------------------------------------------------------------
// METRICAS: se calculan desde los pedidos mock, no se inventan numeros sueltos.
// ---------------------------------------------------------------------------
const DIAS_METRICAS = 30

const esVentaValida = (pedido) =>
  pedido.status !== 'cancelado' && pedido.status !== 'devuelto'

const ventasPorDia = (pedidos) => {
  const cuenta = new Map()

  for (let dia = DIAS_METRICAS - 1; dia >= 0; dia--) {
    cuenta.set(restarDias(HOY, dia).toISOString().slice(0, 10), { revenue: 0, orders: 0 })
  }

  for (const pedido of pedidos) {
    const fila = cuenta.get(pedido.createdAt.slice(0, 10))
    if (fila === undefined) continue
    fila.revenue += pedido.total
    fila.orders += 1
  }

  return [...cuenta.entries()].map(([date, valores]) => ({ date, ...valores }))
}

const topProductos = (pedidos) => {
  const acumulado = new Map()

  for (const pedido of pedidos) {
    if (!esVentaValida(pedido)) continue
    for (const item of pedido.items) {
      const previo = acumulado.get(item.wineId)
      if (previo === undefined) {
        acumulado.set(item.wineId, {
          name: item.wineName,
          imageUrl: item.imageUrl,
          units: item.quantity,
          revenue: item.price * item.quantity
        })
      } else {
        previo.units += item.quantity
        previo.revenue += item.price * item.quantity
      }
    }
  }

  return [...acumulado.entries()]
    .map(([wineId, datos]) => ({ wineId, ...datos }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
}

const actividadReciente = (pedidos) => {
  const desdePedidos = pedidos.map((pedido) => ({
    type: 'order',
    id: pedido.id,
    description: `Pedido ${pedido.id} - ${pedido.customerName}`,
    timestamp: pedido.createdAt
  }))

  const desdeClientes = mockCustomers.map((cliente) => ({
    type: 'customer',
    id: cliente.id,
    description: `Cliente nuevo: ${cliente.name}`,
    timestamp: cliente.createdAt
  }))

  return [...desdePedidos, ...desdeClientes]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5)
}

const sumarVentasDesde = (pedidos, desde) =>
  pedidos
    .filter((pedido) => pedido.createdAt >= iso(desde))
    .reduce((suma, pedido) => suma + pedido.total, 0)

const construirMetrics = (pedidos) => {
  const ventas = pedidos.filter(esVentaValida)

  const hoy = new Date(HOY)
  hoy.setHours(0, 0, 0, 0)
  const semana = new Date(hoy)
  semana.setDate(semana.getDate() - semana.getDay() + 1)
  const mes = new Date(HOY.getFullYear(), HOY.getMonth(), 1)

  return {
    salesToday: sumarVentasDesde(ventas, hoy),
    salesWeek: sumarVentasDesde(ventas, semana),
    salesMonth: sumarVentasDesde(ventas, mes),
    // Siempre 0: no hay tracking de carritos ni de sesiones. Ver RF-13 de la
    // spec 004-b y el punto 6 de la clarificacion.
    abandonedCarts: 0,
    avgTicket:
      ventas.length > 0
        ? Math.round(ventas.reduce((suma, pedido) => suma + pedido.total, 0) / ventas.length)
        : 0,
    conversion: 0,
    salesLast30Days: ventasPorDia(pedidos),
    topProducts: topProductos(pedidos),
    recentActivity: actividadReciente(pedidos)
  }
}

const mockMetrics = construirMetrics(mockOrders)

// ---------------------------------------------------------------------------
// Escritura del archivo generado.
// ---------------------------------------------------------------------------
const cabecera = `// ARCHIVO GENERADO. No editar a mano.
//
// Regenerar con:  node scripts/generar-mocks.mjs
//
// El generador usa un PRNG con semilla fija, asi que el archivo es estable entre
// corridas. El historial de cada cliente se calcula desde los pedidos, y las
// metricas tambien, asi que los tres conjuntos no pueden quedar desincronizados.

import type {
  AdminWine,
  Customer,
  Metrics,
  Order
} from '../types/admin'
`

// Convierte el JSON de `JSON.stringify` a comillas simples, que es la
// convencion del proyecto. Se hace sobre el texto ya serializado, y no sobre
// los objetos, para no perder el formato legible.
const aComillasSimples = (json) => json.replace(/"([^"\\]*)"/g, (_, contenido) => `'${contenido}'`)

const serializar = (valor) => aComillasSimples(JSON.stringify(valor, null, 2))

const cuerpo = [
  `export const mockWines: AdminWine[] = ${serializar(mockWines)}`,
  `export const mockCustomers: Customer[] = ${serializar(mockCustomers)}`,
  `export const mockOrders: Order[] = ${serializar(mockOrders)}`,
  `export const mockMetrics: Metrics = ${serializar(mockMetrics)}`,
  ''
].join('\n\n')

writeFileSync(SALIDA, cabecera + '\n' + cuerpo, 'utf8')

console.log(`Escrito ${SALIDA}`)
console.log(`  ${mockWines.length} vinos (${mockWines.filter((v) => v.activo).length} activos)`)
console.log(`  ${mockOrders.length} pedidos`)
console.log(`  ${mockCustomers.length} clientes`)
console.log(`  ${mockMetrics.salesLast30Days.length} dias de metricas`)
console.log(`  ${mockMetrics.topProducts.length} productos top`)
console.log(`  ${mockMetrics.recentActivity.length} actividades recientes`)
