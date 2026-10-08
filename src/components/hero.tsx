import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { HeroCanvas3D } from './herocanvas3d'
import { Wine } from '../types/vino'

interface HeroProps {
  wines: Wine[]
  onSelectWine: (wine: Wine) => void
}

export const Hero = ({ wines, onSelectWine }: HeroProps) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3])

  const heroStyle = isMobile ? {} : { y, opacity }

  const destacados = [...wines].sort((a, b) => b.price - a.price).slice(0, 3)

  return (
    <section id='hero' className='relative min-h-screen flex items-center justify-center overflow-hidden'>
      <div className='absolute inset-0 z-0'>
        <HeroCanvas3D />
      </div>

      <motion.div
        style={heroStyle}
        className='relative z-10 max-w-7xl mx-auto px-6 py-32 text-center'
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <p className='text-gold-500 uppercase tracking-[0.3em] text-xs font-semibold mb-4'>
            Seleccion Exclusiva
          </p>
          <h1 className='font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-cream-100 leading-tight mb-6'>
            CAVA <span className='text-gold-500'>&</span> CO.
          </h1>
          <p className='text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed'>
            Descubre nuestra cava curada de vinos de alta gama.
            Etiquetas seleccionadas a mano para los paladares mas exigentes.
          </p>
          <motion.a
            href='#catalogo'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='inline-flex items-center gap-2 bg-wine-700 hover:bg-wine-500 text-cream-100 px-8 py-4 rounded-xl text-xs uppercase tracking-widest font-bold transition-all duration-300 shadow-lg shadow-wine-900/50 border border-wine-500/30'
          >
            Explorar Cava
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 8l4 4m0 0l-4 4m4-4H3' />
            </svg>
          </motion.a>
        </motion.div>
      </motion.div>

      {destacados.length > 0 && (
        <section className='absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-7xl px-6 z-10'>
          <h3 className='text-xl font-serif text-gold-400 mb-6 text-center'>
            Botellas Destacadas
          </h3>
          <div className='flex flex-wrap justify-center gap-6'>
            {destacados.map((wine) => (
              <motion.button
                key={wine.id}
                onClick={() => onSelectWine(wine)}
                whileHover={{ scale: 1.05 }}
                className='bg-charcoal-800/60 rounded-xl p-4 border border-neutral-800 hover:border-gold-500/50 transition-colors w-48'
              >
                <img
                  src={wine.imageUrl}
                  alt={wine.name}
                  className='w-full h-32 object-cover rounded-lg mb-3'
                />
                <p className='text-cream-100 font-serif text-sm font-bold truncate'>
                  {wine.name}
                </p>
                <p className='text-gold-500/90 text-xs truncate'>{wine.winery}</p>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
        className='absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce'
      >
        <svg className='w-6 h-6 text-neutral-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 14l-7 7m0 0l-7-7m7 7V3' />
        </svg>
      </motion.div>
    </section>
  )
}