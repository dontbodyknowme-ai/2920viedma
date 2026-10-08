import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
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
            className='text-xs uppercase tracking-widest text-cream-200 hover:text-gold-500 px-3 py-2 rounded-lg border border-neutral-700 hover:border-gold-500 transition-colors'
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
        </div>
      </div>
    </motion.header>
  )
}