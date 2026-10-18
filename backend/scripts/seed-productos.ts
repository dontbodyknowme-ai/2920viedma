import { PrismaClient } from '@prisma/client'

/**
 * Catalogo de demonstracion.
 *
 * Sin esto la base de produccion arranca con cero productos: el seed original solo
 * creaba usuarios, asi que el panel abria vacio y la tienda no tenia nada que
 * mostrar. Para una demo eso no sirve.
 *
 * Los datos vienen de `scripts/generar-mocks.mjs` (`CATALOGO_BASE`), que quedo
 * muerto cuando se elimino MSW en 004-c: escribia a `src/mocks/data.ts`, un
 * archivo que ya no existe. Aqui viven como **fuente de verdad del catalogo**.
 *
 * **Idempotente.** El `id` es un slug estable, no un `cuid`, para poder hacer
 * `upsert` por el: correrlo de nuevo actualiza en vez de duplicar. Sin esto,
 * cargar el catalogo dos veces deja 24 productos y el filtro por categoria muestra
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
  /** `null` para lo que no viene de una bodega. */
  winery: string | null
  /** `null` para lo que no tiene cepa. */
  varietal: string | null
  /** `null` para lo que no es producto: una gaseosa no tiene añada. */
  vintage: number | null
  /** La hoja de la taxonomia: Vinos, Cerveza, Gaseosas, Jugos. */
  category: string
  departamento: string
  /** Nivel medio. `null` si cuelga directo del departamento ("Energizantes"). */
  grupo: string | null
  /** Color del producto. `null` fuera de la categoria "Vinos". */
  tipoVino: string | null
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
    id: 'producto-gran-reserva-malbec',
    name: 'Gran Reserva Malbec',
    winery: 'Bodega Catena Zapata',
    varietal: 'Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
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
    id: 'producto-chardonnay-white-bones',
    name: 'Chardonnay White Bones',
    winery: 'El Enemigo',
    varietal: 'Chardonnay',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Blanco',
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
    id: 'producto-cabernet-sauvignon-reserva',
    name: 'Cabernet Sauvignon Reserva',
    winery: 'Catena Chadwick',
    varietal: 'Cabernet Sauvignon',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: 2019,
    price: 62000,
    description: 'Cabernet de guarda con estructura firme y final largo de cedro.',
    tastingNotes: 'Grosella negra, grafito, cedro y un final mineral persistente.',
    foodPairing: 'Cordera al producto tinto, milanesas y semicurado de Parma.',
    imageUrl: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
    stock: 12,
    activo: true
  },
  {
    id: 'producto-pinot-noir-seleccion',
    name: 'Pinot Noir Seleccion',
    winery: 'Luigi Bosca',
    varietal: 'Pinot Noir',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
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
    id: 'producto-malbec-reserva-familia',
    name: 'Malbec Reserva Familia',
    winery: 'Bodega Norton',
    varietal: 'Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
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
    id: 'producto-cabernet-franc',
    name: 'Cabernet Franc',
    winery: 'Pulenta Estate',
    varietal: 'Cabernet Franc',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
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
    id: 'producto-sauvignon-blanc',
    name: 'Sauvignon Blanc',
    winery: 'Trapiche',
    varietal: 'Sauvignon Blanc',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Blanco',
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
    id: 'producto-riesling-trocken',
    name: 'Riesling Trocken',
    winery: 'Los Cemillos',
    varietal: 'Riesling',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Blanco',
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
    id: 'producto-rose-provence',
    name: 'Rose Provence',
    winery: 'Chateau Peyrelongue',
    varietal: 'Grenache',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Rosado',
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
    id: 'producto-espumante-brut-nature',
    name: 'Espumante Brut Nature',
    winery: 'Bodega Cono Sur',
    varietal: 'Chardonnay',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Espumante',
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
    id: 'producto-espumante-rose',
    name: 'Espumante Rose',
    winery: 'Chandon',
    varietal: 'Pinot Noir',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Espumante',
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
    id: 'producto-merlot-vintage',
    name: 'Merlot Vintage',
    winery: 'Valderramero',
    varietal: 'Merlot',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: 2017,
    price: 21500,
    description: 'Merlot suave, con fruta madura y taninos pulidos.',
    tastingNotes: 'Ciruela, chocolate con leche y un final suave.',
    foodPairing: 'Pasta, hamburguesas y wardenales.',
    imageUrl: 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
    stock: 28,
    activo: false
  },

  /*
   * Productos que NO son producto.
   *
   * Estan porque el catalogo dejo de ser una vinateria, y un seed de doce
   * Malbec no demuestra eso: con todos los productos en "Bebidas / Con alcohol /
   * Vinos", los filtros de "Cerveza", "Gaseosas" y "Energizantes" salen vacios y
   * no hay forma de saber si es porque el filtro esta mal o porque no hay nada.
   *
   * Cada uno de estos exercita una parte distinta del modelo:
   *
   * - **Cerveza**: con `grupo`, como todo lo que tiene alcohol.
   * - **Gaseosa**: `grupo` "Sin alcohol", y `winery`/`varietal`/`vintage` en
   *   `null`. Antes esos tres campos eran obligatorios, asi que este producto
   *   **no se podia cargar**.
   * - **Energizante**: `grupo` en `null`. Cuelga directo de Bebidas porque no es
   *   ni con alcohol ni sin alcohol.
   * - **Regalería** y **Gastronomía**: los dos departamentos que todavia no
   *   tienen estructura. Dicen la verdad sobre el catalogo —estan vacios de
   *   subcategorias— en vez de fingir un arbol que el boceto no dibujo.
   */
  {
    id: 'bebida-cerveza-artesanal-ipa',
    name: 'Cerveza Artesanal IPA 355ml',
    winery: 'Cervecería del Puerto',
    varietal: null,
    category: 'Cerveza',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 4800,
    description: 'IPA rubia de fermentacion alta, con hopperscitrus y amargor limpio.',
    tastingNotes: 'Limon, maracuya, rescoldo de pan y un amargor que se seca.',
    foodPairing: 'Carniceria, hamburguesas y queso azul.',
    imageUrl: 'https://images.unsplash.com/photo-1516458464372-eea4ab222b31?auto=format&fit=crop&q=80&w=800',
    stock: 60,
    activo: true
  },
  {
    id: 'bebida-gaseosa-cola-2l',
    name: 'Gaseosa de Cola 2L',
    winery: null,
    varietal: null,
    category: 'Gaseosas',
    departamento: 'Bebidas',
    grupo: 'Sin alcohol',
    tipoVino: null,
    vintage: null,
    price: 3900,
    description: 'Gaseosa de cola en botella de 2 litros, para compartir.',
    tastingNotes: 'Azucarado, con burbuja fina y final largo.',
    foodPairing: 'Parrilla, hamburguesas y picnic.',
    imageUrl: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&q=80&w=800',
    stock: 120,
    activo: true
  },
  {
    id: 'bebida-agua-saborizada-limon',
    name: 'Agua Saborizada Limón 500ml',
    winery: null,
    varietal: null,
    category: 'Agua saborizada',
    departamento: 'Bebidas',
    grupo: 'Sin alcohol',
    tipoVino: null,
    vintage: null,
    price: 1900,
    description: 'Agua con infusion de limon, endulzada levemente y sin gas.',
    tastingNotes: 'Lima y un toque de menta al final.',
    foodPairing: 'Todo el dia: oficina, gimnasio o viaje.',
    imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&q=80&w=800',
    stock: 90,
    activo: true
  },
  {
    id: 'bebida-energizante-red-bull-250',
    name: 'Energizante 250ml',
    winery: null,
    varietal: null,
    category: 'Energizantes',
    departamento: 'Bebidas',
    // `grupo` en null a proposito: los energizantes no son ni con alcohol ni sin
    // alcohol, asi que colgarlos de un grupo seria mentir sobre el producto.
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 3200,
    description: 'Energizante con cafeina y taurina, en lata de 250 ml.',
    tastingNotes: 'Amarga, con un final largo de cafeina.',
    foodPairing: 'No es alimento: es una bebida de tono despierto.',
    imageUrl: 'https://images.unsplash.com/photo-1610873167013-2dd675d30ef4?auto=format&fit=crop&q=80&w=800',
    stock: 75,
    activo: true
  },
  {
    id: 'regaleria-set-copas',
    name: 'Set de Copas x2',
    winery: null,
    varietal: null,
    // `categoria` es NOT NULL en la base, asi que un producto de Regaleria igual
    // tiene que decir que es. Lo que **no** tiene es grupo: el boceto dibuja la
    // jerarquia solo de Bebidas, y regular un grupo aca seria inventar el arbol
    // de un negocio que todavia no existe.
    category: 'Vajilla',
    departamento: 'Regalería',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 28000,
    description: 'Set de dos copas de cristal, para regalar o para la mesa.',
    tastingNotes: 'Vidrio fino, base estable.',
    foodPairing: 'Vinos tintos y blancos.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
    stock: 15,
    activo: true
  },
  {
    id: 'gastronomia-queso-brie',
    name: 'Queso Brie',
    winery: null,
    varietal: null,
    category: 'Quesos',
    departamento: 'Gastronomía',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 12000,
    description: 'Queso brie de pasta suave, porcion de 250 g.',
    tastingNotes: 'Corteza telada, notas de champinones y final suave.',
    foodPairing: 'Vino blanco, pan de campagne y uvas.',
    imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&q=80&w=800',
    stock: 22,
    activo: true
  }
]

async function main() {
  for (const producto of CATALOGO) {
    const { id, ...datos } = producto

    await p.product.upsert({
      where: { id },
      update: datos,
      create: { id, ...datos }
    })

    const marca = producto.activo ? '' : ' (inactivo)'
    console.log(`✓ ${producto.name} — ${producto.winery} ${producto.vintage}${marca}`)
  }

  const total = await p.product.count()
  const activos = await p.product.count({ where: { activo: true } })

  console.log(`\nCatalogo listo: ${total} productos, ${activos} activos.`)
}

main()
  .catch((e) => {
    console.error('Error en el seed de productos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await p.$disconnect()
  })
