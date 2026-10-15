import { useState, useCallback, useEffect } from 'react'
import { Wine, CartItem } from './types/vino'
import { INITIAL_WINES } from './datos/vino'
import { Navbar } from './components/barra_de_navegacion'
import { Hero } from './components/hero'

import { ProductCatalog } from './components/carta_de_catalogo'
import { CartDrawer } from './components/carrito_de_compras'
import { ProductForm } from './components/editor_formador_productos'
import { VistaRapidaProducto } from './components/vista_rapida_producto'
import { Footer } from './components/pie_de_pagina'
import { AnimatedSection } from './components/animated_section'

const STORAGE_KEY_WINES = 'vinoteca_wines'
const STORAGE_KEY_CART = 'vinoteca_cart'

// El acceso al panel ya no vive aca. T1 dejo un flag `isAdmin` en
// `localStorage` que cualquier visitante activaba con un boton en la navbar, y
// que ademas se podia poner en `true` desde la consola. Se reemplazo por una
// clave en `src/utils/admin_acceso.ts`, que ademas no es ningun boton: al panel
// se entra escribiendo `/admin`.

// RF-34 y CE-01: si lo guardado no es un array con contenido, se arranca con
// el catalogo inicial. Sin estas dos guardas, un `localStorage` con `"{}"` o con
// `"[]"` deja el catalogo vacio y la pagina muestra un estado de "no hay
// etiquetas" en lugar del catalogo de la tienda.
function loadWines(): Wine[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WINES)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return INITIAL_WINES
}

function saveWines(wines: Wine[]) {
  localStorage.setItem(STORAGE_KEY_WINES, JSON.stringify(wines))
}

// Misma guarda que `loadWines`, por el mismo motivo (RF-34, CE-02): lo guardado
// tiene que ser un array, o se arranca con el carrito vacio.
function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CART)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
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
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null)
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [selectedVarietals, setSelectedVarietals] = useState<string[]>([])
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)
  // El estado `isAdmin` y su toggle se agregan en T9, junto con el boton del
  // navbar que los consume. Declararlos en T1 dejaba el setter sin uso y el
  // `noUnusedLocals` del proyecto lo rechaza: el flag queda persistido por las
  // funciones de arriba y el estado nace cuando hay algo que lo lea.

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

  // RF-27: mensaje de pedido confirmado y carrito vacio, sin recargar la
  // pagina. Se renderiza en el JSX de mas abajo como <p role='status'>, no con
  // `alert`: `alert` bloquea la ejecucion, y el test de RF-45 lee el DOM para
  // encontrar el mensaje.
  const finalizarCompra = useCallback(() => {
    if (cart.length === 0) return
    setCart([])
    setCartOpen(false)
    setPedidoConfirmado(true)
  }, [cart.length])

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {/* El hero no lleva `AnimatedSection`: es la primera pantalla y tiene su
          propia animacion de entrada. Envolverlo haria que el reveal por scroll
          lo mantuviera fuera de vista al cargar. */}
      <Hero wines={wines} onSelectWine={setSelectedWine} />

      <AnimatedSection>
        <ProductCatalog
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
      {/* RF-35 a RF-37: la vista rapida se monta SIEMPRE y es su `AnimatePresence`
          interno el que decide si hay algo que mostrar. Montarla con
          `selectedWine !== null` la desmontaria de golpe al cerrar y la animacion
          de salida no correria. */}
      <VistaRapidaProducto
        wine={selectedWine}
        onClose={() => setSelectedWine(null)}
      />
      {pedidoConfirmado && (
        <p
          role='status'
          className='pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-gold-500/40 bg-charcoal-900/95 px-6 py-4 text-center text-sm font-semibold tracking-wider text-gold-400 shadow-2xl'
        >
          Pedido confirmado. Gracias por tu compra.
        </p>
      )}
    </>
  )
}