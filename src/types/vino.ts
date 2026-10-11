export type WineCategory = 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante'

export interface Wine {
  id: string
  name: string
  winery: string
  varietal: string
  category: WineCategory
  vintage: number
  price: number
  description: string
  tastingNotes?: string
  foodPairing?: string
  imageUrl: string
}

export interface PublicWine {
  id: string
  name: string
  winery: string
  varietal: string
  category: WineCategory
  vintage: number
  price: number
  description: string | null
  tastingNotes: string | null
  foodPairing: string | null
  imageUrl: string
}

export interface CartItem {
  product: Wine
  quantity: number
}

export interface WineFilterState {
  category: WineCategory | 'Todos'
  maxPrice: number | ''
  searchQuery: string
  minPrice: number | ''
  selectedVarietals: string[]
}