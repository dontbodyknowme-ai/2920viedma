import { Producto } from '../types/producto'

// Los dos productos base del catalogo publico. No llevan `stock` ni `activo`: esos
// campos son del panel de administracion y viven en `ProductoAdmin`
// (`src/types/admin.ts`). El catalogo que ve un visitante no los necesita.
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
    // Sin grupo a proposito: un energizante no es ni con alcohol ni sin alcohol.
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
    departamento: 'Regalería',
    grupo: null,
    tipoVino: null,
    vintage: null,
    price: 28000,
    description: 'Set de dos copas de cristal, para regalar o para la mesa.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800'
  }
]
