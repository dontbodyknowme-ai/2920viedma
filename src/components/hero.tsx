import { motion } from 'framer-motion'

/**
 * Hero de la home: texto protagonista, sin imagen.
 *
 * El boceto de diseno marca esta jerarquia: un eyebrow que promete ("Una
 * solucion practica, a un clic"), un titular grande que nombra el beneficio
 * ("Eso que buscas, te lo llevamos."), un subtitulo que detalla y un CTA.
 *
 * **Sin botella 3D ni tarjetas de producto.** El canvas de Three.js se saco del
 * hero (pesaba ~376 kB de chunk y en movil no se veia por debajo de 640px) y las
 * destacadas pasaron a la seccion de categorias. El hero es texto, que es lo que
 * el boceto pide y lo que carga primero.
 *
 * **No recibe props.** Es texto fijo, igual que el boceto.
 */
export const Hero = () => {
  return (
    <section id='hero' className='relative overflow-hidden bg-marfil'>
      <div className='mx-auto max-w-7xl px-6 pb-14 pt-10 lg:pb-20 lg:pt-16'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='max-w-2xl'
        >
          <p className='mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-verde-salvia'>
            Una solución práctica, a un clic
          </p>

          <h1 className='mb-6 font-serif text-4xl font-bold leading-tight text-carbon md:text-5xl lg:text-6xl'>
            Eso que buscás, te lo llevamos.
          </h1>

          <p className='mb-10 max-w-xl text-lg leading-relaxed text-neutral-600'>
            Bebidas, regalos, snacks y comidas para disfrutar o compartir. Elegí lo
            que necesitás y recíbelo en tu casa.
          </p>

          <motion.a
            href='#catalogo'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='inline-flex items-center gap-3 rounded-lg bg-verde-600 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-blanco shadow-lg shadow-verde-900/30 transition-colors hover:bg-verde-700'
          >
            Explorar productos
            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M17 8l4 4m0 0l-4 4m4-4H3'
              />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
