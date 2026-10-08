import { useState, useCallback, useEffect } from 'react'
import { Wine, CartItem } from './types/vino'
import { INITIAL_WINES } from './datos/vino'
import { Navbar } from './components/barra_de_navegacion'
import { Hero } from './components/hero'
import { ProductCatalog } from './components/carta_de_catalogo'
import { CartDrawer } from './components/carrito_de_compras'
import { ProductForm } from './components/editor_formador_productos'
import { Footer } from './components/pie_de_pagina'
import { AnimatedSection } from './components/animated_section'

const STORAGE_KEY_WINES = 'vinoteca_wines'
const STORAGE_KEY_CART = 'vinoteca_cart'

function loadWines(): Wine[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WINES)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return INITIAL_WINES
}

function saveWines(wines: Wine[]) {
  localStorage.setItem(STORAGE_KEY_WINES, JSON.stringify(wines))
}

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CART)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return []
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart))
}

export default function App() {
  const [wines, setWines] = useState<Wine[]>(() => loadWines())
  const [cart, setCart] = useState<CartItem[]>(() => loadCart())
  const [searchQuery, setSearchQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [vinoAEditar, setVinoAEditar] = useState<Wine | null>(null)
  const [_selectedWine, setSelectedWine] = useState<Wine | null>(null)
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [selectedVarietals, setSelectedVarietals] = useState<string[]>([])

  useEffect(() => {
    saveWines(wines)
  }, [wines])

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  const agregarAlCarrito = useCallback((wine: Wine) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === wine.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === wine.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product: wine, quantity: 1 }]
    })
  }, [])

  const actualizarCantidad = useCallback((wineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === wineId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const eliminarDelCarrito = useCallback((wineId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== wineId))
  }, [])

  const finalizarCompra = useCallback(() => {
    setCart([])
    setCartOpen(false)
    alert('¡Gracias por tu compra!')
  }, [])

  const agregarWine = useCallback((wine: Wine) => {
    setWines((prev) => [...prev, wine])
  }, [])

  const actualizarWine = useCallback((wine: Wine) => {
    setWines((previo) =>
      previo.map((w) => (w.id === wine.id ? wine : w))
    )
  }, [])

  const editarWine = useCallback((wine: Wine) => {
    setVinoAEditar(wine)
    setAdminOpen(true)
  }, [])

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <>
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <AnimatedSection>
        <Hero
          wines={wines}
          onSelectWine={setSelectedWine}
        />
      </AnimatedSection>
      <AnimatedSection>
        <ProductCatalog
          wines={wines}
          searchQuery={searchQuery}
          onAddToCart={agregarAlCarrito}
          onSelectWine={setSelectedWine}
          onEditWine={editarWine}
          minPrice={minPrice}
          maxPrice={maxPrice}
          selectedVarietals={selectedVarietals}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onVarietalsChange={setSelectedVarietals}
        />
      </AnimatedSection>
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQuantity={actualizarCantidad}
        onRemoveItem={eliminarDelCarrito}
        onCheckout={finalizarCompra}
      />
      <ProductForm
        isOpen={adminOpen}
        onClose={() => {
          setAdminOpen(false)
          setVinoAEditar(null)
        }}
        onAddWine={agregarWine}
        onUpdateWine={actualizarWine}
        wineToEdit={vinoAEditar}
      />
      <AnimatedSection>
        <Footer />
      </AnimatedSection>
    </>
  )
}