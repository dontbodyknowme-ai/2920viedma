import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_LINKS = [
  { href: '#hero', label: 'Inicio' },
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#contacto', label: 'Contacto' }
]

interface NavbarProps {
  cartCount: number
  onOpenCart: () => void
  onOpenAdmin: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const Navbar = ({
  cartCount,
  onOpenCart,
  onOpenAdmin,
  searchQuery,
  onSearchChange
}: NavbarProps) => {
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

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-charcoal-900/90 backdrop-blur-md shadow-lg border-b border-wine-900/50 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className='max-w-7xl mx-auto px-6 flex items-center justify-between'>
          <a href='#' className='flex items-center gap-2'>
            <span className='text-gold-500 font-serif text-2xl font-bold tracking-wider'>
              CAVA & CO.
            </span>
          </a>

          <nav className='flex-1 max-w-md mx-8 hidden md:block'>
            <ul className='flex items-center justify-center gap-8'>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className='text-cream-200 hover:text-gold-500 text-xs uppercase tracking-widest font-semibold transition-colors relative py-2'
                  >
                    {link.label}
                    <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300' />
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className='flex-1 max-w-md mx-8 hidden md:block'>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Buscar por etiqueta, cepa o bodega...'
              className='w-full bg-charcoal-800/80 text-cream-100 placeholder-neutral-500 px-4 py-2 rounded-full border border-neutral-700/50 focus:outline-none focus:border-gold-500 text-sm transition-colors'
            />
          </div>

          <div className='flex items-center gap-4'>
            <button
              onClick={onOpenAdmin}
              className='text-xs uppercase tracking-widest text-cream-200 hover:text-gold-500 px-3 py-2 rounded-lg border border-neutral-700 hover:border-gold-500 transition-colors hidden sm:block'
            >
              + Cargar Vino
            </button>

            <button
              onClick={onOpenCart}
              className='relative p-2 text-cream-100 hover:text-gold-500 transition-colors'
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
                  className='absolute -top-1 -right-1 bg-wine-500 text-cream-100 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center'
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className='md:hidden p-2 text-cream-100 hover:text-gold-500 transition-colors'
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
              className='fixed top-0 right-0 bottom-0 w-full max-w-sm bg-charcoal-900 border-l border-wine-900/50 text-cream-100 z-50 flex flex-col shadow-2xl md:hidden'
              role='dialog'
              aria-label='Menú de navegación'
            >
              <div className='p-6 border-b border-neutral-800 flex items-center justify-between'>
                <h2 className='text-xl font-serif font-bold text-cream-100'>
                  Navegación
                </h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className='text-neutral-400 hover:text-cream-100 p-2 rounded-lg hover:bg-neutral-800 transition-colors'
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
                        className='text-cream-200 hover:text-gold-500 text-lg font-semibold py-3 text-left border-b border-neutral-800 transition-colors'
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className='p-6 border-t border-neutral-800 bg-charcoal-950/80'>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onOpenAdmin()
                  }}
                  className='w-full bg-wine-700 hover:bg-wine-500 text-cream-100 py-3 rounded-xl font-semibold tracking-wider uppercase transition-all duration-300 border border-wine-500/30'
                >
                  + Cargar Vino
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}