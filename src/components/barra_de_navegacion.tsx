import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

const NAV_LINKS = [
  { href: '#hero', label: 'Inicio' },
  { href: '#catalogo', label: 'Productos' }
]

interface NavbarProps {
  cartCount: number
  onOpenCart: () => void
}

export const Navbar = ({ cartCount, onOpenCart }: NavbarProps) => {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    const target = document.querySelector(href)
    if (target) {
      const headerOffset = 80
      const elementPosition = target.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`sticky top-0 z-50 transition-all duration-300 bg-blanco/90 backdrop-blur-md border-b border-neutral-200 ${
          isScrolled ? 'shadow-lg py-3' : 'py-4'
        }`}
      >
        <div className='max-w-7xl mx-auto px-6 flex items-center justify-between'>
          <a href='#hero' className='flex flex-col leading-tight'>
            <span className='font-serif text-2xl font-bold text-verde-600'>2920</span>
            <span className='text-xs text-neutral-500'>Todo más cerca</span>
          </a>

          <nav className='flex-1 max-w-md mx-8 hidden md:block'>
            <ul className='flex items-center justify-center gap-8'>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className='text-neutral-600 hover:text-verde-600 text-xs uppercase tracking-widest font-semibold transition-colors relative py-2'
                  >
                    {link.label}
                    <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-verde-salvia transition-all duration-300' />
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className='flex items-center gap-4'>
            {/* Aca no hay ningun enlace al panel, y es a proposito (gotcha 6 de
                AGENTS.md): al panel se entra escribiendo `/admin` en la barra de
                direcciones. Un boton en la tienda publica es una promesa de que
                la sesion del panel existe; el que no la tiene recibe un `403` al
                llegar. Los tres botones que hubo aca —"Panel Admin", "+ Cargar
                Vino" de escritorio y "+ Cargar Vino" en el drawer de movil— se
                fueron, y con ellos el `hasRole` que este componente ya no usa. */}

            <button
              onClick={onOpenCart}
              className='relative p-2 text-carbon hover:text-verde-600 transition-colors'
              aria-label='Carrito de compras'
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
                />
              </svg>
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className='absolute -top-1 -right-1 bg-verde-500 text-blanco text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center'
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Auth: User menu only for authenticated users */}
            {isLoading ? (
              <div className='w-8 h-8 border-2 border-verde-salvia/30 border-t-verde-salvia rounded-full animate-spin' />
            ) : isAuthenticated ? (
              <div className='relative'>
                <button
                  className='flex items-center gap-2 p-2 text-carbon hover:text-verde-600 transition-colors'
                  aria-label='Menú de usuario'
                >
                  <div className='w-8 h-8 bg-verde-600 rounded-full flex items-center justify-center text-sm font-semibold text-blanco'>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className='hidden sm:block text-sm font-medium'>{user?.name}</span>
                </button>
              </div>
            ) : (
              <span className='hidden sm:block' />
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className='md:hidden p-2 text-carbon hover:text-verde-600 transition-colors'
              aria-label='Abrir menú de navegación'
              aria-expanded={mobileMenuOpen}
            >
              <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 12h16M4 18h16' />
              </svg>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden'
              aria-hidden='true'
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='fixed top-0 right-0 bottom-0 w-full max-w-sm bg-blanco border-l border-verde-800/50 text-carbon z-50 flex flex-col shadow-2xl md:hidden'
              role='dialog'
              aria-label='Menú de navegación'
            >
              <div className='p-6 border-b border-neutral-200 flex items-center justify-between'>
                <h2 className='text-xl font-serif font-bold text-carbon'>
                  Navegación
                </h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className='text-neutral-600 hover:text-carbon p-2 rounded-lg hover:bg-neutral-200 transition-colors'
                  aria-label='Cerrar menú'
                >
                  ✕
                </button>
              </div>

              <nav className='flex-1 p-6'>
                <ul className='flex flex-col gap-4'>
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <button
                        onClick={() => handleNavClick(link.href)}
                        className='text-neutral-600 hover:text-verde-600 text-lg font-semibold py-3 text-left border-b border-neutral-200 transition-colors'
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className='p-6 border-t border-neutral-200 bg-marfil/80 space-y-3'>
                {/* El "+ Cargar Vino" que estuvo aqui se fue con los de escritorio:
                    el panel se entra escribiendo `/admin`. Este bloque queda con
                    "Cerrar sesion" y nada mas, y para quien no tiene sesion no
                    queda nada —por eso el `hidden` de abajo, que antes tapaba el
                    hueco que dejaba el boton. */}

                {isAuthenticated ? (
                  <>
                    <button
                      onClick={handleLogout}
                      className='w-full bg-blanco hover:bg-neutral-200 text-carbon py-3 rounded-xl font-semibold tracking-wider uppercase transition-all duration-300 border border-neutral-300'
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                    <span className='hidden' />
                  )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}