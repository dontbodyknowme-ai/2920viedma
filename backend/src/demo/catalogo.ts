/**
 * Catalogo de demostracion.
 *
 * ## Por que vive en `src/` y no en `scripts/`
 *
 * Antes era `scripts/seed-productos.ts` y se corria **a mano**. Ese es el
 * problema: `npm start` hace `prisma migrate deploy && node dist/main.js`, o
 * sea que un deploy deja la tabla de productos **vacia** y la tienda muestra
 * cero productos hasta que alguien se acuerde del seed.
 *
 * Para que el arranque lo pueda usar tiene que estar en `src/`: `scripts/` lo
 * compila `tsconfig.scripts.json` con `rootDir: ./scripts`, y un archivo de ahi
 * **no puede importar de `src/`** —es lo que fija `deploy.test.ts`—. Y al reves
 * tampoco, porque `tsconfig.json` tiene `rootDir: ./src`.
 *
 * O sea: el catalogo de demostracion no es un script, es parte de la aplicacion.
 *
 * ## Que se verifica de estos datos, y donde
 *
 * En `tests/unit/bootstrap_catalogo.test.ts`:
 *
 *   - ninguna categoria con productos tiene **menos de dos**, y ningun
 *     departamento ni grupo tampoco. Un filtro que lleva a un unico producto no
 *     se distingue de un fallo del seed, y una categoria de un solo producto hace
 *     que la busqueda no sirva: con esos datos, un `filtrarVinos` que devolviera
 *     el catalogo entero daria el mismo resultado y ningun test lo notaria.
 *   - los `id` son unicos y las fotos no se repiten
 *   - `tipoVino` solo existe en la categoria "Vinos", y todo lo que es vino
 *     tiene bodega, anada y color
 *
 * Y las **URLs de las fotos** se comprueban aparte, con `npm run
 * verificar:fotos`, porque necesitan red. Ese script existe porque este archivo
 * ya tuvo cuatro fotos que dan 404 y dos que mostraban otra cosa: una IPA con
 * foto de apicultor y un "Chocolate Amargo" con chocolate **blanco**. Las dos
 * cargaban perfecto, asi que ningun test de URLs las agarra —un 200 es un 200,
 * no importa lo que muestre— y por eso las fotos se miran.
 *
 * **Idempotente.** El `id` es un slug estable, no un `cuid`, para poder hacer
 * `upsert` por el: correrlo dos veces actualiza en vez de duplicar.
 */

import type { PrismaClient } from '@prisma/client'

export interface ProductoDemo {
  id: string
  name: string
  /** `null` para lo que no viene de una bodega. */
  winery: string | null
  /** `null` para lo que no tiene cepa. */
  varietal: string | null
  /** `null` para lo que no es producto: una gaseosa no tiene anada. */
  vintage: number | null
  /** La hoja de la taxonomia: Vinos, Cerveza, Gaseosas, Jugos. */
  category: string
  departamento: string
  /** Nivel medio. `null` si cuelga directo del departamento. */
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

const U = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=800`

/**
 * Una foto de **Wikimedia Commons**, no de Unsplash.
 *
 * ## Por que esta fuente aparte
 *
 * Las fotos de arriba alcanzan para un vino, una cerveza o un queso: con que
 * la imagen sea "de algo de esa clase" ya esta. Las marcas de energizante no
 * admiten ese margen: el pedido fue **el Monster original, verde con negro**,
 * y un banco de imagenes generico no tiene la lata **negra con el logo verde**
 * —tiene la de sabor, la de zero, la de pipeline, y una que muestra un商标
 * inventado. Poner la lata equivocada es el mismo bug que el de la IPA con
 * foto de apicultor: carga perfecto y no es el producto.
 *
 * En Commons estan las tres, con la lata entera y de frente.
 *
 * ## `ruta` es la parte de la URL del thumbnail
 *
 * Es `<hash>/<archivo>/<ancho>px-<archivo>`. El ancho tiene que ser uno de los
 * que Wikimedia **ya tiene generado**: uno inventado responde **400**, no 404,
 * y el error dice "Bad Request" sin mencionar el ancho.
 *
 * `thumb.wikimedia.org` es el alias oficial de thumbnails; `upload.wikimedia.org`
 * es el mismo CDN con el nombre canonico y tambien sirve.
 *
 * ## Licencia: hay que atribuir
 *
 * Las tres son **CC BY-SA 4.0**. Para una tienda real eso significa
 * "credito visible a la persona que tomo la foto". Es un catalogo de
 * demostracion, asi que la atribucion esta en el comentario de este bloque,
 * que es donde la va a buscar quien la necesite. Si estas fotos pasan a
 * produccion, hay que publicar el credito en la pagina del producto.
 */
const W = (ruta: string): string =>
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/${ruta}`

/**
 * Creditos de las fotos de Wikimedia, para no perderlos de vista.
 *
 *   Monster  -> File:Monster Energy drink (cropped).jpg
 *   Speed    -> File:Speed Can Energy Drink 250ml.jpg
 *   Red Bull -> File:Red Bull ice.jpg
 *
 * Los tres con licencia CC BY-SA 4.0.
 */
export const CREDITOS_FOTOS_WIKIMEDIA: Record<string, string> = {
  'bebida-monster-energy-473ml':
    'File:Monster Energy drink (cropped).jpg — Wikimedia Commons, CC BY-SA 4.0',
  'bebida-speed-250ml':
    'File:Speed Can Energy Drink 250ml.jpg — Wikimedia Commons, CC BY-SA 4.0',
  'bebida-red-bull-250ml':
    'File:Red Bull ice.jpg — Wikimedia Commons, CC BY-SA 4.0'
}

export const CATALOGO: ProductoDemo[] = [
  // --- Vinos --------------------------------------------------------------
  // El unico departamento con **tres** niveles. Los espumantes van en la
  // categoria "Vinos" y se distinguen por `tipoVino`, no por una categoria
  // propia: el color es una propiedad del producto, y una categoria "Espumante"
  // seria el mismo dato en dos lugares (ver `TIPOS_DE_VINO`).
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
    imageUrl: U('1506377247377-2a5b3b417ebb'),
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
    imageUrl: U('1510812431401-41d2bd2722f3'),
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
    price: 42000,
    description: 'Cabernet de guarda, criado en barrica con tostado de oak y especias.',
    tastingNotes: 'Grosella negra, cedro, grafito y un fondo de guarda largo.',
    foodPairing: 'Embutidos, carnes al vino y guisos de carne.',
    imageUrl: U('1599113656124-b96bf21e30d3'),
    stock: 21,
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
    price: 29000,
    description: 'Malbec de fermentacion en acero, suave y facil de tomar.',
    tastingNotes: 'Fresa, mora y un fondo dulce que limpia el paladar.',
    foodPairing: 'Hamburguesas, milanesas y empanadas de carne.',
    imageUrl: U('1474722883778-792e7990302f'),
    stock: 36,
    activo: true
  },
  {
    id: 'producto-syrah-valleys',
    name: 'Syrah Valleys',
    winery: 'Bodega Trigales',
    varietal: 'Syrah',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: 2020,
    price: 26500,
    // Inactivo a proposito: el filtro por estado del panel (RF de 004-a) necesita
    // algo que filtrar. Un "desactivado" que nunca aparece no se puede demostrar.
    description: 'Syrah de clima templado, con especias y un fondo de carne asada.',
    tastingNotes: 'Ciruela negra, pimienta y un final de ahumado.',
    foodPairing: 'Carnes grasosas, pastas y quesos semicuros.',
    imageUrl: U('1569919659476-f0852f6834b7'),
    stock: 40,
    activo: false
  },
  {
    id: 'producto-pinot-noir-selection',
    name: 'Pinot Noir Selection',
    winery: 'Bodega Chakana',
    varietal: 'Pinot Noir',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: 2021,
    price: 31000,
    description: 'Pinot de clima frio, fragil y aromatico, de fermentacion corta.',
    tastingNotes: 'Cereza roja, hoja de tomate y un fondo terroso.',
    foodPairing: 'Pescados salvajes, embutidos y verduras asadas.',
    imageUrl: U('1584916201218-f4242ceb4809'),
    // Stock 0 a proposito, por lo mismo que el inactivo de arriba: el filtro por
    // stock del panel necesita una fila que No se pueda comprar.
    stock: 0,
    activo: true
  },
  {
    id: 'producto-blanc-de-blancs',
    name: 'Blanc de Blancs',
    winery: 'Bodega Mumm',
    varietal: 'Chardonnay',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Blanco',
    vintage: 2022,
    price: 24000,
    description: 'Blanco de elaboracion tradicional, fresco y con buena acidez.',
    tastingNotes: 'Lima, manzana blanca y un final mineral limpio.',
    foodPairing: 'Aperitivos, entradas y pescado.',
    imageUrl: U('1626897505254-e0f811aa9bf7'),
    stock: 28,
    activo: true
  },
  {
    id: 'producto-espumante-brut-nature',
    name: 'Espumante Brut Nature',
    winery: 'Bodega Norton',
    varietal: 'Chardonnay',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Espumante',
    vintage: 2021,
    price: 19500,
    description: 'Espumante de Charmat, seco y fresco, con burbuja fina y persistente.',
    tastingNotes: 'Manzana, brioche y un fondo citrico limpio.',
    foodPairing: 'Brindis y entrada de mariscos. Es el primero que se descorcha.',
    imageUrl: U('1516594915697-87eb3b1c14ea'),
    stock: 32,
    activo: true
  },
  {
    id: 'producto-espumante-rose',
    name: 'Espumante Rosé',
    winery: 'Bodega Graffigna',
    varietal: 'Pinot Noir',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Espumante',
    vintage: 2022,
    price: 21000,
    description: 'Espumante rosado elegante, con fruta roja y burbuja sedosa.',
    tastingNotes: 'Fresa, frambuesa y un final florido.',
    foodPairing: 'Entradas, embutidos y pizzas.',
    imageUrl: U('1547595628-c61a29f496f0'),
    stock: 26,
    activo: true
  },
  {
    id: 'producto-rose-provence',
    name: 'Rosé Provence',
    winery: 'Domaine Ott',
    varietal: 'Grenache',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Rosado',
    vintage: 2022,
    price: 17500,
    description: 'Rosado seco de Provence, con cuerpo justo para el verano.',
    tastingNotes: 'Melocoton, sandia y un final fresco y seco.',
    foodPairing: 'Mariscos a la parrilla, ensaladas y comida mexicana.',
    imageUrl: U('1513558161293-cdaf765ed2fd'),
    stock: 45,
    activo: true
  },

  // --- Cerveza ------------------------------------------------------------
  {
    id: 'bebida-cerveza-artesanal-ipa',
    name: 'Cerveza Artesanal IPA 355ml',
    winery: null,
    varietal: null,
    category: 'Cerveza',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 4800,
    description: 'IPA de fermentacion alta, con lúpulo recién agregado y mucha hopping.',
    tastingNotes: 'Mango, lupulo resinoso y un amargor limpio que seca la boca.',
    foodPairing: 'Quesos curados, hamburguesas y comida picante.',
    imageUrl: U('1571613316887-6f8d5cbf7ef7'),
    stock: 54,
    activo: true
  },
  {
    id: 'bebida-cerveza-artesanal-stout',
    name: 'Cerveza Artesanal Stout 355ml',
    winery: null,
    varietal: null,
    category: 'Cerveza',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 4500,
    description: 'Stout negra de cuerpo denso, tostada, con espuma persistente.',
    tastingNotes: 'Cafe tostado, cacao amargo y un fondo dulce de malta.',
    foodPairing: 'Quesos azules, milanesas y postres de chocolate.',
    imageUrl: U('1608270586620-248524c67de9'),
    stock: 42,
    activo: true
  },
  {
    id: 'bebida-cerveza-pilsener',
    name: 'Cerveza Pilsener 473ml',
    winery: null,
    varietal: null,
    category: 'Cerveza',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 3800,
    description: 'Pilsener rubia, equilibrada y bien carbonatada, de fermentacion lenta.',
    tastingNotes: 'Pan fresco, lúpulo floral y un final ligeramente amargo.',
    foodPairing: 'Empanadas, guasquetes y tabla de fiambre.',
    imageUrl: U('1566633806327-68e152aaf26d'),
    stock: 60,
    activo: true
  },

  // --- Aperitivos ---------------------------------------------------------
  {
    id: 'bebida-aperitivo-gin-tonic',
    name: 'Gin Tonic Premium 500ml',
    winery: null,
    varietal: null,
    category: 'Aperitivos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 6500,
    description: 'Gin botanico con tónica de quinina y hielo de pepino.',
    tastingNotes: 'Junipero, lima fresca y un final larguísimo.',
    foodPairing: 'Tabla de embutidos, olivas y comida de mesa.',
    imageUrl: U('1514362545857-3bc16c4c7d1b'),
    stock: 38,
    activo: true
  },
  {
    id: 'bebida-aperitivo-frutos-rojos',
    name: 'Cóctel de Frutos Rojos 500ml',
    winery: null,
    varietal: null,
    category: 'Aperitivos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 5800,
    description: 'Coctel de frutilla con un toque de romero.',
    tastingNotes: 'Frutilla, lima y un final herbal fresco.',
    foodPairing: 'Ensaladas, carnes asadas y pizzas.',
    imageUrl: U('1536935338788-846bb9981813'),
    stock: 30,
    activo: true
  },

  // --- Destilados ---------------------------------------------------------
  {
    id: 'bebida-destilado-whisky-bourbon',
    name: 'Whisky Bourbon 700ml',
    winery: null,
    varietal: null,
    category: 'Destilados',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 18900,
    description: 'Bourbon de tradicion estadounidense, tostado, dulce y facil de tomar solo.',
    tastingNotes: 'Vainilla, crema y un fondo de roble quemado.',
    foodPairing: 'Con hielo y un poco de agua.',
    imageUrl: U('1527281400683-1aae777175f8'),
    stock: 22,
    activo: true
  },
  {
    id: 'bebida-destilado-whisky-scotch',
    name: 'Whisky Scotch 700ml',
    winery: null,
    varietal: null,
    category: 'Destilados',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 21500,
    description: 'Scotch blend de doce anos, con turba suave y un cierre ahumado.',
    tastingNotes: 'Heno, un toque de turba y un final largo de cedro.',
    foodPairing: 'Solo, con hielo, al final de la comida.',
    imageUrl: U('1569529465841-dfecdab7503b'),
    stock: 19,
    activo: true
  },

  // --- Gaseosas ------------------------------------------------------------
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
    price: 2800,
    description: 'Gaseosa de cola en botella de dos litros, para la mesa.',
    tastingNotes: 'Burbuja fina, dulce de caña y un final ácido leve.',
    foodPairing: 'Parrilla, pizzeria y comidas con salsas.',
    imageUrl: U('1581636625402-29b2a704ef13'),
    stock: 90,
    activo: true
  },
  {
    id: 'bebida-gaseosa-ginger-ale',
    name: 'Ginger Ale 500ml',
    winery: null,
    varietal: null,
    category: 'Gaseosas',
    departamento: 'Bebidas',
    grupo: 'Sin alcohol',
    tipoVino: null,
    vintage: null,
    price: 3200,
    description: 'Gaseosa de jengibre, picante y con mucho gas.',
    tastingNotes: 'Jengibre fresco, lima y burbuja intensa.',
    foodPairing: 'Comida asiática, curries y hamburguesas.',
    imageUrl: U('1581006852262-e4307cf6283a'),
    stock: 48,
    activo: true
  },

  // --- Agua saborizada ----------------------------------------------------
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
    description: 'Agua con gas y rodajas de limón, sin azúcar.',
    tastingNotes: 'Lima, gas fino y un final muy limpio.',
    foodPairing: 'Para la mesa o para levar.',
    imageUrl: U('1621263764928-df1444c5e859'),
    stock: 120,
    activo: true
  },
  {
    id: 'bebida-agua-saborizada-menta',
    name: 'Agua Saborizada Menta 500ml',
    winery: null,
    varietal: null,
    category: 'Agua saborizada',
    departamento: 'Bebidas',
    grupo: 'Sin alcohol',
    tipoVino: null,
    vintage: null,
    price: 1900,
    description: 'Agua con gas y hojas de menta, sin azúcar.',
    tastingNotes: 'Menta fresca, burbuja suave y un final herbal.',
    foodPairing: 'Para la mesa o para llevar.',
    imageUrl: U('1548839140-29a749e1cf4d'),
    stock: 110,
    activo: true
  },

  // --- Jugos --------------------------------------------------------------
  {
    id: 'bebida-jugo-naranja-botella',
    name: 'Jugo de Naranja Botella 1L',
    winery: null,
    varietal: null,
    category: 'Jugos',
    departamento: 'Bebidas',
    grupo: 'Sin alcohol',
    tipoVino: null,
    vintage: null,
    price: 3400,
    description: 'Jugo de naranja prensado, con pulpa y sin azúcar agregada.',
    tastingNotes: 'Naranja recién exprimida y un final ligeramente amargo.',
    foodPairing: 'Desayuno, brunch y algo salado.',
    imageUrl: U('1621506289937-a8e4df240d0b'),
    stock: 64,
    activo: true
  },
  {
    id: 'bebida-jugo-frutos-rojos',
    name: 'Jugo de Frutos Rojos 500ml',
    winery: null,
    varietal: null,
    category: 'Jugos',
    departamento: 'Bebidas',
    grupo: 'Sin alcohol',
    tipoVino: null,
    vintage: null,
    price: 3600,
    description: 'Mezcla de frutilla, frambuesa y arándano, sin azúcar agregada.',
    tastingNotes: 'Frutilla dominante, frambuesa ácida y final suave.',
    foodPairing: 'Para el desayuno o la merienda.',
    imageUrl: U('1587049352851-8d4e89133924'),
    stock: 58,
    activo: true
  },

  // --- Energizantes -------------------------------------------------------
  // El grupo "Energizantes" cuelga de Bebidas sin ser ni con alcohol ni sin
  // alcohol. Va en `grupo`, no en `null`: ver la nota de `departamentos.ts`.
  //
  // Son las **tres marcas de verdad**, con su foto de verdad. Antes habia dos
  // productos genericos ("Energizante 250ml" y "Energizante Sin Azucar 250ml")
  // que no existian en ningun kiosco: eran un placeholder con precio, y la
  // foto de uno era un grafico de pulgar arriba. Un catalogo que ofrece
  // "Energizante" en vez de "Monster" no es un catalogo: el kiosco de la
  // esquina no tiene un producto llamado "Energizante".
  //
  // De Monster va **solo la original**: la negra con el logo verde. Las otras
  // (Ultra, Zero, Pipeline, Mango Loco) son productos distintos, y meterlas
  // seria inventar un catalogo.
  {
    id: 'bebida-monster-energy-473ml',
    name: 'Monster Energy 473ml',
    winery: null,
    varietal: null,
    category: 'Energizantes',
    departamento: 'Bebidas',
    grupo: 'Energizantes',
    tipoVino: null,
    vintage: null,
    price: 6500,
    description:
      'La lata original de Monster: negra con el logo verde de las garras. Cafeina y taurina en 473 ml.',
    tastingNotes: 'Cítrico intenso y amargo, con un final largo de cafeína.',
    foodPairing: 'No es alimento: es una bebida de tono despierto.',
    imageUrl: W('0/06/Monster_Energy_drink_%28cropped%29.jpg/960px-Monster_Energy_drink_%28cropped%29.jpg'),
    stock: 60,
    activo: true
  },
  {
    id: 'bebida-speed-250ml',
    name: 'Speed 250ml',
    winery: null,
    varietal: null,
    category: 'Energizantes',
    departamento: 'Bebidas',
    grupo: 'Energizantes',
    tipoVino: null,
    vintage: null,
    price: 2800,
    description:
      'Energizante en botella de 250 ml, con cafeina, taurina y vitamina B. La del kiosco de la esquina.',
    tastingNotes: 'Dulce y cítrico, con un final herbal de cafeína.',
    foodPairing: 'No es alimento: es una bebida de tono despierto.',
    imageUrl: W('4/44/Speed_Can_Energy_Drink_250ml.jpg/960px-Speed_Can_Energy_Drink_250ml.jpg'),
    stock: 90,
    activo: true
  },
  {
    id: 'bebida-red-bull-250ml',
    name: 'Red Bull 250ml',
    winery: null,
    varietal: null,
    category: 'Energizantes',
    departamento: 'Bebidas',
    grupo: 'Energizantes',
    tipoVino: null,
    vintage: null,
    price: 3500,
    description:
      'La lata clásica de Red Bull, azul y plata, con cafeina y taurina en 250 ml.',
    tastingNotes: 'Ligera y fresca, con un final seco de cafeína.',
    foodPairing: 'No es alimento: es una bebida de tono despierto.',
    imageUrl: W('7/7a/Red_Bull_ice.jpg/960px-Red_Bull_ice.jpg'),
    stock: 75,
    activo: true
  },

  // --- Regalos -----------------------------------------------------------
  // Departamento **sin estructura**: `grupo` es `null` y la categoria es texto
  // libre. Ver la nota de `departamentos.ts` sobre por que no se inventan
  // subcategorias aca.
  {
    id: 'regaleria-set-copas',
    name: 'Set de Copas x2',
    winery: null,
    varietal: null,
    category: 'Regalos',
    departamento: 'Regalos',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 12500,
    description: 'Set de dos copas de cristal, para servir o para regalar.',
    tastingNotes: 'Vidrio fino y peso parejo. No aplica.',
    foodPairing: 'Regalo: lo envuelven y queda listo.',
    imageUrl: U('1566754436893-98224ee05be4'),
    stock: 16,
    activo: true
  },
  {
    id: 'regaleria-termo-acero',
    name: 'Termo de Acero 500ml',
    winery: null,
    varietal: null,
    category: 'Regalos',
    departamento: 'Regalos',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 18900,
    description: 'Termo de acero inoxidable, mantiene el frío 12 horas y el calor 6.',
    tastingNotes: 'No aplica: es un objeto.',
    foodPairing: 'Para llevar café, té o agua a cualquier lado.',
    imageUrl: U('1602143407151-7111542de6e8'),
    stock: 24,
    activo: true
  },

  // --- Listo para comer --------------------------------------------------------
  {
    id: 'gastronomia-queso-brie',
    name: 'Queso Brie',
    winery: null,
    varietal: null,
    category: 'Quesos',
    departamento: 'Listo para comer',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 9800,
    description: 'Brie de pasta suave y corteza blanca, madurado 60 días.',
    tastingNotes: 'Cebolla dulce, nata y un final salado.',
    foodPairing: 'Vino tinto, frutas secas y pan de campo.',
    imageUrl: U('1452195100486-9cc805987862'),
    stock: 30,
    activo: true
  },
  {
    id: 'gastronomia-queso-parmesano',
    name: 'Queso Parmesano Rallado 200g',
    winery: null,
    varietal: null,
    category: 'Quesos',
    departamento: 'Listo para comer',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 7400,
    description: 'Parmesano curado 18 meses, rallado fino, listo para usar.',
    tastingNotes: 'Muy curado, con cristales y un final largo y salado.',
    foodPairing: 'Pasta, risotto y milanesas.',
    imageUrl: U('1607923432780-7a9c30adcb72'),
    stock: 45,
    activo: true
  },
  {
    id: 'gastronomia-costillas-ahumadas',
    name: 'Costillas Ahumadas',
    winery: null,
    varietal: null,
    category: 'Comidas preparadas',
    departamento: 'Listo para comer',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 15900,
    description: 'Costillas de cerdo cocidas a la parrilla con madera de manzano.',
    tastingNotes: 'Ahumado suave, carne tierna y una salsa barbecue de la casa.',
    foodPairing: 'Papas fritas, ensalada de col y una cerveza.',
    imageUrl: U('1633436375795-12b3b339712f'),
    stock: 12,
    activo: true
  },
  {
    id: 'gastronomia-papas-cesar',
    name: 'Papas a la César con Pollo',
    winery: null,
    varietal: null,
    category: 'Comidas preparadas',
    departamento: 'Listo para comer',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 11900,
    description: 'Papas, pollo a la parrilla, pan rallado y salsa Cesar.',
    tastingNotes: 'Cebolla, anchoas y un fondo de pollo asado.',
    foodPairing: 'Para comer rápido, con una gaseosa grande.',
    imageUrl: U('1631515243349-e0cb75fb8d3a'),
    stock: 15,
    activo: true
  },

  // --- Snack y chocolates -------------------------------------------------
  {
    id: 'snacks-chocolate-amargo-70',
    name: 'Chocolate Amargo 70% 100g',
    winery: null,
    varietal: null,
    category: 'Chocolates',
    departamento: 'Snack y chocolates',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 5400,
    description: 'Tableta de chocolate negro 70%, con IBD de cacao.',
    tastingNotes: 'Amargo, con final largo y una acidez que limpia.',
    foodPairing: 'Cafe de filtro y quesos blandos.',
    // Antes esta foto era chocolate **blanco**: una imagen que carga perfecto y
    // muestra otra cosa. Por eso las fotos se miran, y no solo se piden.
    imageUrl: U('1511381939415-e44015466834'),
    stock: 80,
    activo: true
  },
  {
    id: 'snacks-chocolate-con-leche',
    name: 'Chocolate con Leche 100g',
    winery: null,
    varietal: null,
    category: 'Chocolates',
    departamento: 'Snack y chocolates',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 4900,
    description: 'Tableta de chocolate con leche, con trozos de chocolate amargo.',
    tastingNotes: 'Caramelo, leche entera y un final de cacao.',
    foodPairing: 'Café de olla y galletitas.',
    imageUrl: U('1575377427642-087cf684f29d'),
    stock: 95,
    activo: true
  },
  {
    id: 'snacks-papas-fritas',
    name: 'Papas Fritas 150g',
    winery: null,
    varietal: null,
    category: 'Snacks salados',
    departamento: 'Snack y chocolates',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 4200,
    description: 'Papas fritas de corte grueso, con sal marina.',
    tastingNotes: 'Crujientes por fuera y tiernas adentro.',
    foodPairing: 'Solas, o acompanadas con una cerveza.',
    imageUrl: U('1630384060421-cb20d0e0649d'),
    stock: 130,
    activo: true
  },
  {
    id: 'snacks-papas-cheddar',
    name: 'Papas con Cheddar y Bacon 180g',
    winery: null,
    varietal: null,
    category: 'Snacks salados',
    departamento: 'Snack y chocolates',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 5900,
    description: 'Papas con salsa de cheddar, bacon crocante y cebollita.',
    tastingNotes: 'Queso cremoso, bacon salado y un toque picante.',
    foodPairing: 'Con una gaseosa fría.',
    imageUrl: U('1573080496219-bb080dd4f877'),
    stock: 85,
    activo: true
  }
]

/**
 * Productos del catalogo de demostracion que **se retiraron**.
 *
 * ## Por que hace falta una lista
 *
 * `sembrarCatalogo` hace `upsert` por `id`: crea lo que falta y actualiza lo
 * que ya esta. Eso resuelve los productos **nuevos** y deja los viejos
 * haciendo nada, porque no tienen id en el catalogo: no se crean, pero tampoco
 * se borran.
 *
 * El caso concreto: los dos energizantes genericos ("Energizante 250ml" y
 * "Energizante Sin Azucar 250ml") se reemplazaron por Monster, Speed y Red
 * Bull. En una base que ya estaba sembrada, los tres nuevos aparecen y los
 * dos viejos **siguen ahi**, y el filtro de "Energizantes" muestra cinco
 * productos, dos de los cuales no existen en ningun kiosco.
 *
 * ## La lista es explicita y corta
 *
 * Solo ids que **este** catalogo creo alguna vez. Nunca un producto que el
 * dueno cargo desde el panel: esa regla de "el seed no toca lo del negocio" es
 * la que hace que se pueda correr el seed a mano sin miedo.
 *
 * Y se borran con `deleteMany` sobre **esa lista**, no con "los que no estan
 * en el catalogo": esa segunda regla borraria los productos del negocio, que
 * es exactamente lo que el seed jamas debe hacer.
 */
export const PRODUCTOS_RETIRADOS: string[] = [
  'bebida-energizante-250',
  'bebida-energizante-sin-azucar'
]

/**
 * Siembra el catalogo de demostracion.
 *
 * `upsert` por `id`, asi que es idempotente: correrla dos veces actualiza en
 * vez de duplicar. Devuelve cuantos creo, cuantos actualizo y cuantos retiro,
 * para que el bootstrap lo pueda loguear.
 *
 * **El `prisma` se recibe por parametro y no se crea aca.** Un modulo que
 * instancia su propio `PrismaClient` al importarse no se puede probar sin una
 * base: los tests mockean `@prisma/client` y por eso el cliente tiene que ser
 * inyectado desde afuera.
 */
export const sembrarCatalogo = async (
  prisma: PrismaClient
): Promise<{ creados: number; actualizados: number; retirados: number }> => {
  let creados = 0
  let actualizados = 0

  for (const producto of CATALOGO) {
    const { id, ...datos } = producto
    const existente = await prisma.product.findUnique({ where: { id } })

    if (existente === null) {
      await prisma.product.create({ data: { id, ...datos } })
      creados++
    } else {
      await prisma.product.update({ where: { id }, data: datos })
      actualizados++
    }
  }

  // Los retirados, y **solo** los retirados. Ver la nota de la lista de arriba.
  const { count: retirados } = await prisma.product.deleteMany({
    where: { id: { in: PRODUCTOS_RETIRADOS } }
  })

  return { creados, actualizados, retirados }
}
