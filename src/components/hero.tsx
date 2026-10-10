import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { HeroCanvas3D } from './herocanvas3d'

/**
 * Hero en disposicion partida: texto a la izquierda, botella 3D a la derecha.
 *
 * **No recibe props.** Las botellas destacadas se movieron a su propia seccion
 * (`botellas_destacadas.tsx`), que se renderiza desde `App.tsx` justo debajo.
 * Antes vivian aca en `absolute bottom-24` y competian con el titulo y con el
 * canvas por el mismo espacio.
 */
export const Hero = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { scrollY } = useScroll()
  // El parallax se aplica **solo al texto**, no a la botella. Antes el texto y
  // el canvas estaban en la misma columna superpuestos y los dos se movian
  // juntos; separados, el texto se aleja y la botella queda quieta.
  const y = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3])

  const heroStyle = isMobile ? {} : { y, opacity }

  return (
    <section id='hero' className='relative overflow-hidden'>
      {/*
        Disposicion partida: texto a la izquierda, botella 3D a la derecha.

        Antes el canvas estaba en `absolute inset-0`, o sea detras de todo, y el
        titulo centrado caia en el medio de la botella. Con dos columnas cada
        uno tiene su espacio y no hay nada que tapar.

        En movil se apila: primero el texto, porque es lo que el visitante
        busca, y la botella 3D debajo a menor altura.
      */}
      <div className='relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:min-h-screen lg:grid-cols-2 lg:gap-16 lg:py-28'>
        <motion.div style={heroStyle} className='max-w-xl lg:pl-4'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <p className='mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-500'>
              Seleccion Exclusiva
            </p>

            {/*
              El tamano baja de `text-8xl` a `text-6xl`. En una columna de la
              mitad del ancho, un `text-8lg` obliga a que "CAVA & CO." baje de
              linea y quede desbalanceado contra el espacio de la derecha.
            */}
            <h1 className='mb-6 font-serif text-5xl font-bold leading-[1.1] text-cream-100 md:text-6xl'>
              CAVA <span className='text-gold-500'>&</span> CO.
            </h1>

            <p className='mb-10 max-w-lg font-light leading-relaxed text-lg text-neutral-400 md:text-xl'>
              Descubre nuestra cava curada de vinos de alta gama.
              Etiquetas seleccionadas a mano para los paladares mas exigentes.
            </p>

            <motion.a
              href='#catalogo'
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='inline-flex items-center gap-2 rounded-xl border border-wine-500/30 bg-wine-700 px-8 py-4 text-xs font-bold uppercase tracking-widest text-cream-100 shadow-lg shadow-wine-900/50 transition-all duration-300 hover:bg-wine-500'
            >
              Explorar Cava
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 8l4 4m0 0l-4 4m4-4H3'
                />
              </svg>
            </motion.a>

            {/*
              La flecha de scroll baja de `absolute bottom-12` —donde estaba
              centrada en pantalla, justo encima de las botellas 3D— a colgar
              debajo del boton, en su propia columna.
            */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className='mt-10 animate-bounce'
            >
              <svg
                className='h-6 w-6 text-neutral-500'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 14l-7 7m0 0l-7-7m7 7V3'
                />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Columna de la botella 3D. `min-w-0` evita que el canvas empuje el
            grid en pantallas angostas, que es el sintoma clasico de un grid con
            un hijo que no quiere encogerse. */}
        <div className='relative min-w-0'>
          <HeroCanvas3D />
        </div>
      </div>
    </section>
  )
}