import { useState, useCallback, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Producto, CartItem } from './types/producto'
import { Checkout } from './pages/checkout'
import { PRODUCTOS_INICIALES } from './datos/productos'
import { Navbar } from './components/barra_de_navegacion'
import { Hero } from './components/hero'
import { Categorias } from './components/categorias'
import { BannerPromo } from './components/banner_promo'

import { ProductCatalog } from './components/carta_de_catalogo'
import { CartDrawer } from './components/carrito_de_compras'
import { ProductForm } from './components/editor_formador_productos'
import { VistaRapidaProducto } from './components/vista_rapida_producto'
import { Footer } from './components/pie_de_pagina'
import { AnimatedSection } from './components/animated_section'

const STORAGE_KEY_PRODUCTOS = 'vinoteca_productos'
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
function loadWines(): Producto[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRODUCTOS)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return PRODUCTOS_INICIALES
}

function saveWines(productos: Producto[]) {
  localStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(productos))
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
  const [productos, setWines] = useState<Producto[]>(() => loadWines())
  const [cart, setCart] = useState<CartItem[]>(() => loadCart())
  const [searchQuery, setSearchQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [productoAEditar, setProductoAEditar] = useState<Producto | null>(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [departamento, setDepartamento] = useState('')
  const ubicacion = useLocation()
  // El estado `isAdmin` y su toggle se agregan en T9, junto con el boton del
  // navbar que los consume. Declararlos en T1 dejaba el setter sin uso y el
  // `noUnusedLocals` del proyecto lo rechaza: el flag queda persistido por las
  // funciones de arriba y el estado nace cuando hay algo que lo lea.

  /**
   * El cartel de "se agrego al carrito" (puntos 4 y 8 de la lista de pendientes).
   *
   * Son dos los que se fusionaron en uno: el 4 pide "un cartel para cuando se
   * agrega un producto al carrito" y el 8 lo precisa —"de 3 segundos, que diga
   * que se agrego"—. Antes de esto la unica confirmacion era el badge del
   * icono del carrito, que cambia de un numero a otro: si ya habia 2 y agregas
   * uno, el unico cambio es 2→3, y no dice si paso. Con esto el producto sale
   * por su nombre.
   *
   * **Es un objeto y no el nombre pelado, a proposito.** El `useEffect` de abajo
   * reinicia los 3 segundos cuando cambia el estado, y React compara las
   * dependencias con `Object.is`. Con el nombre solo —un `string`— agregar dos
   * veces el **mismo** producto deja un valor identico: el efecto no vuelve a
   * dispararse, el `setTimeout` no se renueva y el segundo cartel no dura 3
   * segundos sino lo que falte del primero. Un objeto nuevo en cada clic tiene
   * siempre referencia nueva, y eso reinicia el reloj solo.
   */
  const [agregado, setAgregado] = useState<{ nombre: string } | null>(null)
  const queryPrevio = useRef('')

  // Buscar desde el navbar y quedarse mirando el hero es como buscar y no
  // encontrar: la grilla filtrada esta dos pantallas abajo y el cambio no se
  // ve. El primer caracter del termino baja al catalogo; seguir escribiendo no
  // re-baja (sino cada tecla resetearia el scroll mientras se esta leyendo).
  useEffect(() => {
    if (queryPrevio.current === '' && searchQuery !== '') {
      document.getElementById('catalogo')?.scrollIntoView?.({ behavior: 'smooth' })
    }
    queryPrevio.current = searchQuery
  }, [searchQuery])


  useEffect(() => {
    saveWines(productos)
  }, [productos])

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  useEffect(() => {
    if (agregado === null) return
    const t = setTimeout(() => setAgregado(null), 3000)
    return () => clearTimeout(t)
  }, [agregado])

  const agregarAlCarrito = useCallback((producto: Producto) => {
    setAgregado({ nombre: producto.name })
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === producto.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === producto.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product: producto, quantity: 1 }]
    })
  }, [])

  const actualizarCantidad = useCallback((productoId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productoId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const eliminarDelCarrito = useCallback((productoId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productoId))
  }, [])

  // RF-27 → 009: la confirmacion ya no la dice `App` —la decia sin que hubiera
  // pasado nada—. "Finalizar Pedido" no vacia el carrito (D-D): se vacia solo
  // con el pago aprobado, y lo hace `Checkout` atraves de `alConfirmar`.
  const finalizarCompra = useCallback(() => {
    if (cart.length === 0) return
    window.location.assign('/checkout')
  }, [cart.length])


  const agregarWine = useCallback((producto: Producto) => {
    setWines((prev) => [...prev, producto])
  }, [])

  const actualizarWine = useCallback((producto: Producto) => {
    setWines((previo) =>
      previo.map((w) => (w.id === producto.id ? producto : w))
    )
  }, [])

  const editarWine = useCallback((producto: Producto) => {
    setProductoAEditar(producto)
    setAdminOpen(true)
  }, [])

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  // El checkout vive en `App` porque **el carrito esta aca**, en este estado y
  // en `localStorage`. Decide por la URL, no por una prop: la URL es la unica
  // fuente de verdad. Y el `if` va DESPUES de todos los hooks: una rama que se
  // los salta cambia la cantidad de hooks entre renders y React revienta
  // ("Rendered more hooks than during the previous render").
  if (ubicacion.pathname === '/checkout') {
    return (
      <Checkout
        items={cart}
        alConfirmar={() => {
          // El carrito se vacia **solo** con el pago aprobado (D-D).
          setCart([])
          setCartOpen(false)
        }}
      />
    )
  }

  return (
    <>
      {/* El buscador va adentro del Navbar (una sola barra, no dos), pero el
          estado sigue siendo de la app: es el mismo `searchQuery` que filtra
          el catalogo de mas abajo, asi que los dos inputs quedan sincronizados
          sin props duplicadas. */}
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* El hero no lleva `AnimatedSection`: es la primera pantalla y tiene su
          propia animacion de entrada. Envolverlo haria que el reveal por scroll
          lo mantuviera fuera de vista al cargar. */}
      <Hero />

      <Categorias
        onSelectDepartamento={(elegido) => {
          setDepartamento(elegido)
          // El filtro cambio dos mil pixeles mas abajo: sin esto, tocar la
          // tarjeta se ve igual que tocar una tarjeta rota.
          document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
      <BannerPromo />

      <AnimatedSection>
        <ProductCatalog
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddToCart={agregarAlCarrito}
          onSelectProducto={setProductoSeleccionado}
          onEditProducto={editarWine}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          departamento={departamento}
          onDepartamentoChange={setDepartamento}
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
          setProductoAEditar(null)
        }}
        onAddWine={agregarWine}
        onUpdateWine={actualizarWine}
        productoToEdit={productoAEditar}
      />
      <AnimatedSection>
        <Footer />
      </AnimatedSection>
      {/* RF-35 a RF-37: la vista rapida se monta SIEMPRE y es su `AnimatePresence`
          interno el que decide si hay algo que mostrar. Montarla con
          `productoSeleccionado !== null` la desmontaria de golpe al cerrar y la animacion
          de salida no correria. */}
      <VistaRapidaProducto
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
      />
      {/* El aviso de "se agrego al carrito". Va con `role='status'` y no con
          `alert` por el mismo motivo que el de "Pedido confirmado" (ver RF-27):
          `alert` bloquea la ejecucion. El nombre va en un `<span>` para que se
          pueda distinguir de la frase que lo acompana leyendo `textContent`. */}
      {agregado !== null && (
        <p
          role='status'
          className='pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-verde-600/30 bg-blanco/95 px-6 py-4 text-center text-sm font-semibold text-carbon shadow-2xl'
        >
          <Check className='h-5 w-5 shrink-0 text-verde-600' aria-hidden='true' />
          <span className='text-verde-600'>{agregado.nombre}</span>
          <span>se agregó al carrito</span>
        </p>
      )}
    </>
  )
}