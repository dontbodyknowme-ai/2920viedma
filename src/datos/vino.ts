import { Wine } from '../types/vino'

// Los dos vinos base del catalogo publico. No llevan `stock` ni `activo`: esos
// campos son del panel de administracion y viven en `AdminWine`
// (`src/types/admin.ts`). El catalogo que ve un visitante no los necesita.
export const INITIAL_WINES: Wine[] = [
  {
    id: '1',
    name: 'Gran Reserva Malbec',
    winery: 'Bodega Catena Zapata',
    varietal: 'Malbec',
    category: 'Tinto',
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
    category: 'Blanco',
    vintage: 2021,
    price: 38000,
    description: 'Elegante blanco con gran acidez, mineralidad y paso por barrica.',
    tastingNotes: 'Manzana verde, manteca, notas cítricas y minerales.',
    foodPairing: 'Pescados grasos, mariscos y pastas con salsas blancas.',
    imageUrl: 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800'
  }
]
