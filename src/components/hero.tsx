import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { HeroCanvas3D } from './herocanvas3d'

// RNF-09 y D-16 acotan "movil" a un umbral numerico de 640 px, y CA-26 mide
// `window.innerWidth`. Por eso el degradado se decide con un numero y no con
// `matchMedia`.
const ANCHO_MINIMO_CANVAS = 640

const useAnchoVentana = (): number => {
  const [ancho, setAncho] = useState(() => window.innerWidth)
  useEffect(() => {
    const alCambiar = () => setAncho(window.innerWidth)
    window.addEventListener('resize', alCambiar)
    return () => window.removeEventListener('resize', alCambiar)
  }, [])
  return ancho
}

export const Hero = () => {
  const ancho = useAnchoVentana()
  const mostrarCanvas = ancho >= ANCHO_MINIMO_CANVAS

  return (
    <motion.section
      id='hero'
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className='relative overflow-hidden bg-charcoal-950 text-cream-100 px-6 pt-32 pb-20 md:pt-36 md:pb-24'
    >
      <div className='absolute inset-0 bg-gradient-to-b from-wine-900/30 via-charcoal-950 to-charcoal-950 pointer-events-none' />

      <div className='relative max-w-7xl mx-auto grid gap-12 lg:grid-cols-2 lg:items-center'>
        <div className='text-center lg:text-left'>
          <p className='text-base md:text-xs font-semibold uppercase tracking-[0.3em] text-gold-500 mb-4'>
            Selección Exclusiva
          </p>

          <h1 className='font-serif font-bold text-cream-100 text-4xl md:text-7xl leading-tight'>
            Vinos de Autor
          </h1>

          <p className='mt-6 text-base md:text-lg text-cream-200 max-w-xl mx-auto lg:mx-0'>
            Una colección curada de vinos de alta gama, elegida botella por botella y guardada
            en la temperatura ideal para que los sirvas como corresponde.
          </p>

          <a
            href='#catalogo'
            className='mt-10 inline-flex items-center justify-center px-8 py-4 rounded-xl bg-wine-700 text-cream-100 text-base md:text-lg font-semibold uppercase tracking-[0.2em] border border-gold-500/40 hover:bg-wine-500 hover:border-gold-400 focus-visible:ring-2 focus-visible:ring-gold-500 transition-colors duration-300 shadow-lg shadow-wine-900/50'
          >
            Explorar Cava
          </a>
        </div>

        {mostrarCanvas && (
          <div className='relative w-full'>
            <div
              aria-hidden='true'
              className='absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wine-700/40 blur-3xl pointer-events-none'
            />
            <div
              aria-hidden='true'
              className='absolute left-1/2 top-[40%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/25 blur-2xl pointer-events-none'
            />
            <HeroCanvas3D />
          </div>
        )}
      </div>
    </motion.section>
  )
}
