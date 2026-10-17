import { PrismaClient } from '@prisma/client'

/**
 * Catalogo de demonstracion.
 *
 * Sin esto la base de produccion arranca con cero vinos: el seed original solo
 * creaba usuarios, asi que el panel abria vacio y la tienda no tenia nada que
 * mostrar. Para una demo eso no sirve.
 *
 * Los datos vienen de `scripts/generar-mocks.mjs` (`CATALOGO_BASE`), que quedo
 * muerto cuando se elimino MSW en 004-c: escribia a `src/mocks/data.ts`, un
 * archivo que ya no existe. Aqui viven como **fuente de verdad del catalogo**.
 *
 * **Idempotente.** El `id` es un slug estable, no un `cuid`, para poder hacer
 * `upsert` por el: correrlo de nuevo actualiza en vez de duplicar. Sin esto,
 * cargar el catalogo dos veces deja 24 vinos y el filtro por categoria muestra
 * duplicados.
 *
 * `stock: 0` y `activo: false` a proposito: el filtro por estado del panel
 * (RF de 004-a) necesita algo que filtrar, y un "`Sin stock`" que nunca
 * aparece no se puede demostrar.
 */

const p = new PrismaClient()

interface VinoSeed {
  id: string
  name: string
  winery: string
  varietal: string
  category: 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante'
  vintage: number
  price: number
  description: string
  tastingNotes: string
  foodPairing: string
  imageUrl: string
  stock: number
  activo: boolean
}

const CATALOGO: VinoSeed[] = [
  {
    id: 'vino-gran-reserva-malbec',
    name: 'Gran Reserva Malbec',
    winery: 'Bodega Catena Zapata',
    varietal: 'Malbec',
    category: 'Tinto',

    departamento: 'Bebidas',
    vintage: 2020,
    price: 45000,
    description: 'Vino tinto de gran cuerpo con notas de frutos rojos maduros y roble frances.',
    tastingNotes: 'Ciruela, vainilla, chocolate negro y un final persistente.',
    foodPairing: 'Carnes rojas asadas, chivo a la estaca y quesos curados.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
    stock: 24,
    activo: true
  },
  {
    id: 'vino-chardonnay-white-bones',
    name: 'Chardonnay White Bones',
    winery: 'El Enemigo',
    varietal: 'Chardonnay',
    category: 'Blanco',

    departamento: 'Bebidas',
    vintage: 2021,
    price: 38000,
    description: 'Elegente blanco con gran acidez, mineralidad y paso por barrica.',
    tastingNotes: 'Manzana verde, manteca, notas citricas y minerales.',
    foodPairing: 'Pescados grasos, mariscos y pastas con salsas blancas.',
    imageUrl: 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800',
    stock: 18,
    activo: true
  },
  {
    id: 'vino-cabernet-sauvignon-reserva',
    name: 'Cabernet Sauvignon Reserva',
    winery: 'Catena Chadwick',
    varietal: 'Cabernet Sauvignon',
    category: 'Tinto',

    departamento: 'Bebidas',
    vintage: 2019,
    price: 62000,
    description: 'Cabernet de guarda con estructura firme y final largo de cedro.',
    tastingNotes: 'Grosella negra, grafito, cedro y un final mineral persistente.',
    foodPairing: 'Cordera al vino tinto, milanesas y semicurado de Parma.',
    imageUrl: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
    stock: 12,
    activo: true
  },
  {
    id: 'vino-pinot-noir-seleccion',
    name: 'Pinot Noir Seleccion',
    winery: 'Luigi Bosca',
    varietal: 'Pinot Noir',
    category: 'Tinto',

    departamento: 'Bebidas',
    vintage: 2021,
    price: 39500,
    description: 'Delicado, aromatico, con fruta roja brillante y taninos sedosos.',
    tastingNotes: 'Fresa, cereza, sotobosque y un sutil toque de tierra humeda.',
    foodPairing: 'Salmon, canard, setas y quesos de cabra.',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
    stock: 9,
    activo: true
  },
  {
    id: 'vino-malbec-reserva-familia',
    name: 'Malbec Reserva Familia',
    winery: 'Bodega Norton',
    varietal: 'Malbec',
    category: 'Tinto',

    departamento: 'Bebidas',
    vintage: 2018,
    price: 28000,
    description: 'Malbec de acceso, maduro y facil de beber, con buena estructura.',
    tastingNotes: 'Ciruela madura, pimienta y un toque de cacao.',
    foodPairing: 'Hamburguesas, parrilla e itragnes.',
    imageUrl: 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
    stock: 40,
    activo: true
  },
  {
    id: 'vino-cabernet-franc',
    name: 'Cabernet Franc',
    winery: 'Pulenta Estate',
    varietal: 'Cabernet Franc',
    category: 'Tinto',

    departamento: 'Bebidas',
    vintage: 2020,
    price: 33500,
    description: 'Vermut taste en taza, herbaceo, con grafito y fruta roja.',
    tastingNotes: 'Frambuesa, menta, grafito y un final fresco.',
    foodPairing: 'Cordera, hamburguesas gourmet y escabeche.',
    imageUrl: 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
    stock: 15,
    activo: true
  },
  {
    id: 'vino-sauvignon-blanc',
    name: 'Sauvignon Blanc',
    winery: 'Trapiche',
    varietal: 'Sauvignon Blanc',
    category: 'Blanco',

    departamento: 'Bebidas',
    vintage: 2022,
    price: 24500,
    description: 'Blanco fresco y aromatico, de acidez vibrante.',
    tastingNotes: 'Limon, pomelo, hierba fresca y un toque mineral.',
    foodPairing: 'Mariscos, ceviche, ensaladas y tabla fria.',
    imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&q=80&w=800',
    stock: 33,
    activo: true
  },
  {
    id: 'vino-riesling-trocken',
    name: 'Riesling Trocken',
    winery: 'Los Cemillos',
    varietal: 'Riesling',
    category: 'Blanco',

    departamento: 'Bebidas',
    vintage: 2021,
    price: 31000,
    description: 'Blanco seco de moscatel con acidez brillante y un fondo mineral.',
    tastingNotes: 'Lima, miel de azahar, pizarra y un final largo.',
    foodPairing: 'Cocina asiatica, curry y marisco.',
    imageUrl: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
    stock: 7,
    activo: true
  },
  {
    id: 'vino-rose-provence',
    name: 'Rose Provence',
    winery: 'Chateau Peyrelongue',
    varietal: 'Grenache',
    category: 'Rosado',

    departamento: 'Bebidas',
    vintage: 2022,
    price: 22000,
    description: 'Rosado seco, fluido, de color palido y frescura vibrante.',
    tastingNotes: 'Frambuesa, sandia, jazmin y un final mineral.',
    foodPairing: 'Ensaladas, aperitivos y comidas ligeras.',
    imageUrl: 'https://images.unsplash.com/photo-1600091503597-6ddfe4cf94b2?auto=format&fit=crop&q=80&w=800',
    stock: 21,
    activo: true
  },
  {
    id: 'vino-espumante-brut-nature',
    name: 'Espumante Brut Nature',
    winery: 'Bodega Cono Sur',
    varietal: 'Chardonnay',
    category: 'Espumante',

    departamento: 'Bebidas',
    vintage: 2020,
    price: 19500,
    description: 'Espumante de Charmat, seco y fresco, con burbuja fina y persistente.',
    tastingNotes: 'Manzana verde, pan tostado y citrico.',
    foodPairing: 'Brindis, aperitivos, pizzas y postres.',
    imageUrl: 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
    stock: 45,
    activo: true
  },
  {
    id: 'vino-espumante-rose',
    name: 'Espumante Rose',
    winery: 'Chandon',
    varietal: 'Pinot Noir',
    category: 'Espumante',

    departamento: 'Bebidas',
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
    id: 'vino-merlot-vintage',
    name: 'Merlot Vintage',
    winery: 'Valderramero',
    varietal: 'Merlot',
    category: 'Tinto',

    departamento: 'Bebidas',
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

async function main() {
  for (const vino of CATALOGO) {
    const { id, ...datos } = vino

    await p.wine.upsert({
      where: { id },
      update: datos,
      create: { id, ...datos }
    })

    const marca = vino.activo ? '' : ' (inactivo)'
    console.log(`✓ ${vino.name} — ${vino.winery} ${vino.vintage}${marca}`)
  }

  const total = await p.wine.count()
  const activos = await p.wine.count({ where: { activo: true } })

  console.log(`\nCatalogo listo: ${total} vinos, ${activos} activos.`)
}

main()
  .catch((e) => {
    console.error('Error en el seed de vinos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await p.$disconnect()
  })
