import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navbar } from './components/barra_de_navegacion'
import { Hero } from './components/hero'
import { ProductCatalog } from './components/carta_de_catalogo'
import { CartDrawer } from './components/carrito_de_compras'
import { ProductForm } from './components/editor_formador_productos'
import { VistaRapidaProducto } from './components/vista_rapida_producto'
import { PieDePagina } from './components/pie_de_pagina'
import { INITIAL_WINES } from './datos/vino'
import type { CartItem, Wine } from './types/vino'

const CLAVE_VINOS = 'vinoteca_wines'
const CLAVE_CARRITO = 'vinoteca_cart'

const leer = <T,>(clave: string): T | null => {
  try {
    const crudo = window.localStorage.getItem(clave)
    return crudo === null ? null : (JSON.parse(crudo) as T)
  } catch {
    return null
  }
}

const guardar = <T,>(clave: string, valor: T): void => {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // RF-34: si el almacenamiento falla, la app sigue usable en memoria.
  }
}

export default function App() {
  const [wines, setWines] = useState<Wine[]>(() => {
    const guardados = leer<Wine[]>(CLAVE_VINOS)
    return Array.isArray(guardados) && guardados.length > 0 ? guardados : INITIAL_WINES
  })
  const [carrito, setCarrito] = useState<CartItem[]>(() => {
    const guardados = leer<CartItem[]>(CLAVE_CARRITO)
    return Array.isArray(guardados) ? guardados : []
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [adminAbierto, setAdminAbierto] = useState(false)
  const [vinoSeleccionado, setVinoSeleccionado] = useState<Wine | null>(null)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)

  useEffect(() => guardar(CLAVE_VINOS, wines), [wines])
  useEffect(() => guardar(CLAVE_CARRITO, carrito), [carrito])

  const unidades = useMemo(
    () => carrito.reduce((total, item) => total + item.quantity, 0),
    [carrito]
  )

  const agregarAlCarrito = useCallback((wine: Wine) => {
    setCarrito((previo) => {
      const existente = previo.find((item) => item.product.id === wine.id)
      if (existente) {
        return previo.map((item) =>
          item.product.id === wine.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...previo, { product: wine, quantity: 1 }]
    })
  }, [])

  const actualizarCantidad = useCallback((wineId: string, delta: number) => {
    setCarrito((previo) =>
      previo
        .map((item) =>
          item.product.id === wineId ? { ...item, quantity: item.quantity + delta } : item
        )
        // RF-23: decrementar en 1 elimina la línea en vez de dejarla en 0.
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const eliminarItem = useCallback((wineId: string) => {
    setCarrito((previo) => previo.filter((item) => item.product.id !== wineId))
  }, [])

  const finalizarPedido = useCallback(() => {
    if (carrito.length === 0) return
    setPedidoConfirmado(true)
    setCarrito([])
    setCarritoAbierto(false)
  }, [carrito.length])

  const agregarWine = useCallback((wine: Wine) => {
    setWines((previo) => [...previo, wine])
  }, [])

  return (
    <>
      <Navbar
        cartCount={unidades}
        onOpenCart={() => setCarritoAbierto(true)}
        onOpenAdmin={() => setAdminAbierto(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main>
        <Hero />
        <ProductCatalog
          wines={wines}
          searchQuery={searchQuery}
          onAddToCart={agregarAlCarrito}
          onSelectWine={setVinoSeleccionado}
        />
      </main>
      <PieDePagina />
      <CartDrawer
        isOpen={carritoAbierto}
        onClose={() => setCarritoAbierto(false)}
        items={carrito}
        onUpdateQuantity={actualizarCantidad}
        onRemoveItem={eliminarItem}
        onCheckout={finalizarPedido}
      />
      <ProductForm
        isOpen={adminAbierto}
        onClose={() => setAdminAbierto(false)}
        onAddWine={agregarWine}
      />
      {/* Se monta siempre, sin condicionar por `vinoSeleccionado !== null`: el
          `AnimatePresence` interno de `VistaRapidaProducto` necesita seguir
          montado en el render siguiente al del cierre para animar la salida.
          Montarlo condicionalmente lo desmontaria de golpe. */}
      <VistaRapidaProducto
        wine={vinoSeleccionado}
        onClose={() => setVinoSeleccionado(null)}
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