import { Producto } from '../types/producto'

/**
 * Siete productos para el contrato de `Producto`, no para la tienda.
 *
 * ## Que es y que no es
 *
 * **Lo que el visitante ve NO sale de aca.** El catalogo publico lo pide a
 * `/api/products/public` (`components/carta_de_catalogo.tsx`), y el demo lo
 * siembra el backend al arrancar (`backend/src/demo/bootstrap.ts`).
 *
 * Esto es lo que queda:
 *
 *   1. la **semilla de `localStorage`** que usa `loadWines` en `App.tsx`. Ese
 *      estado ya no alimenta el catalogo publico —el componente tiene el
 *      suyo, alimentado por la API—, asi que hoy es una lista que se escribe
 *      y no se lee. Se conserva porque `ProductForm` (el editor que quedo de
 *      la epoca de MSW) la usa.
 *   2. el **fixture del contrato**: `test/integridad_datos_producto.test.ts`
 *      verifica aca que los campos requeridos y los opcionales se comportan
 *      como deben, y para eso necesita productos reales, no inventados.
 *
 * ## Por que son siete y no los del catalogo
 *
 * Copiar los 35 productos del backend aca seria crear una **segunda lista** que
 * hay que mantener en linea con la primera, y esta es justo la clase de
 * duplicacion que el repo vino desarmando: la primera vez que se separan, la
 * tienda muestra una cosa y el panel otra, sin ningun error que lo diga.
 *
 * Lo que hace falta es que el catalogo tenga productos de cada rama de la
 * taxonomia —un vino con bodega y anada, una cerveza sin ninguna de las dos
 * cosas, un producto de un departamento sin estructura— y siete alcanzan.
 *
 * La lista de verdad es `backend/src/demo/catalogo.ts`, y sus fotos se
 * comprueban con `npm run verificar:fotos` (desde `backend/`).
 */
export const PRODUCTOS_INICIALES: Producto[] = [
  {
    id: '1',
    name: 'Gran Reserva Malbec',
    winery: 'Bodega Catena Zapata',
    varietal: 'Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: 2020,
    price: 45000,
    description: 'Vino tinto de gran cuerpo con intensas notas de frutos rojos maduros y roble francés.',
    tastingNotes: 'Ciruela, vainilla, chocolate negro y un final persistente.',
    foodPairing: 'Carnes rojas asadas, chivo a la estaca y quesos curados.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    name: 'Chardonnay White Bones',
    winery: 'El Enemigo',
    varietal: 'Chardonnay',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Blanco',
    vintage: 2021,
    price: 38000,
    description: 'Elegante blanco con gran acidez, mineralidad y paso por barrica.',
    tastingNotes: 'Manzana verde, manteca, notas cítricas y minerales.',
    foodPairing: 'Pescados grasos, mariscos y pastas con salsas blancas.',
    imageUrl: 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    name: 'Cerveza Artesanal IPA 355ml',
    // Una cerveza **no tiene bodega, ni cepa, ni añada**: por eso los tres campos
    // son `string | null` y `number | null`. Antes eran obligatorios y este
    // producto no se podia cargar.
    winery: null,
    varietal: null,
    category: 'Cerveza',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: null,
    vintage: null,
    price: 4800,
    description: 'IPA rubia de fermentación alta, con lúpulo cítrico y amargor limpio.',
    imageUrl: 'https://images.unsplash.com/photo-1516458464372-eea4ab222b31?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
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
    imageUrl: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '5',
    name: 'Energizante 250ml',
    winery: null,
    varietal: null,
    category: 'Energizantes',
    departamento: 'Bebidas',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 3200,
    description: 'Energizante con cafeína y taurina, en lata de 250 ml.',
    imageUrl: 'https://images.unsplash.com/photo-1610873167013-2dd675d30ef4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '6',
    name: 'Set de Copas x2',
    winery: null,
    varietal: null,
    category: 'Vajilla',
    departamento: 'Regalos',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 28000,
    description: 'Set de dos copas de cristal, para regalar o para la mesa.',
    imageUrl: 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '7',
    name: 'Chocolate Amargo 70% 100g',
    // `grupo: null` a proposito: el departamento "Snack y dulce" todavia no
    // tiene estructura, asi que el producto cuelga directo de el.
    winery: null,
    varietal: null,
    category: 'Chocolates',
    departamento: 'Snack y dulce',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 5400,
    description: 'Tableta de chocolate negro 70%, con IBD de cacao.',
    imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&q=80&w=800'
  }
]
