import { Clock, Facebook, Instagram, MapPin, Twitter } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// RF-14 y D-O: texto estatico, sin props ni estado, en un `footer` semantico.
// No lleva `AnimatePresence` porque no es panel ni modal.
//
// Los horarios, la direccion y las cuentas son contenido de ejemplo, igual que
// los dos vinos de `src/datos/vino.ts`. No son datos de contacto reales: si el
// usuario quiere datos reales, es una tarea aparte.
interface Horario {
  dia: string
  horas: string
}

const HORARIOS: Horario[] = [
  { dia: 'Lunes a viernes', horas: '10:00 a 20:00' },
  { dia: 'Sábados', horas: '10:00 a 21:00' },
  { dia: 'Domingos y feriados', horas: 'Cerrado' }
]

interface RedSocial {
  nombre: string
  usuario: string
  href: string
  Icono: LucideIcon
}

const REDES: RedSocial[] = [
  { nombre: 'Instagram', usuario: '@cavayco', href: 'https://instagram.com/cavayco', Icono: Instagram },
  { nombre: 'Facebook', usuario: '/cavayco', href: 'https://facebook.com/cavayco', Icono: Facebook },
  { nombre: 'Twitter', usuario: '@cavayco', href: 'https://twitter.com/cavayco', Icono: Twitter }
]

export const PieDePagina = () => {
  return (
    <footer className='bg-charcoal-950 text-cream-100 border-t border-wine-900/50'>
      <div className='max-w-7xl mx-auto px-4 md:px-6 py-14'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10'>
          {/* Bloque 1: horarios de atención. */}
          <section aria-labelledby='pie-horarios'>
            <h2
              id='pie-horarios'
              className='flex items-center gap-2 font-serif text-lg font-bold text-gold-400'
            >
              <Clock className='w-5 h-5 shrink-0' aria-hidden='true' />
              Horarios
            </h2>
            <ul className='mt-4 flex flex-col gap-2 text-base text-cream-200'>
              {HORARIOS.map((horario) => (
                <li key={horario.dia} className='flex flex-wrap justify-between gap-x-4'>
                  <span>{horario.dia}</span>
                  <span className='text-gold-500/90'>{horario.horas}</span>
                </li>
              ))}
            </ul>
            <p className='mt-4 text-sm text-neutral-400'>
              Muestras y asesoría de cata con cita previa.
            </p>
          </section>

          {/* Bloque 2: ubicación. */}
          <section aria-labelledby='pie-ubicacion'>
            <h2
              id='pie-ubicacion'
              className='flex items-center gap-2 font-serif text-lg font-bold text-gold-400'
            >
              <MapPin className='w-5 h-5 shrink-0' aria-hidden='true' />
              Ubicación
            </h2>
            <address className='mt-4 not-italic text-base text-cream-200 leading-relaxed break-words'>
              Avenida del Puerto 1280, Bodega Norte
              <br />
              Barrio Histórico
              <br />
              Ciudad de Mendoza
            </address>
            <p className='mt-4 text-sm text-neutral-400'>
              Estacionamiento propio a dos cuadras.
            </p>
          </section>

          {/* Bloque 3: redes sociales, con íconos de `lucide-react` (D-O). */}
          <section aria-labelledby='pie-redes'>
            <h2
              id='pie-redes'
              className='flex items-center gap-2 font-serif text-lg font-bold text-gold-400'
            >
              <Instagram className='w-5 h-5 shrink-0' aria-hidden='true' />
              Redes
            </h2>
            <ul className='mt-4 flex flex-col gap-3'>
              {REDES.map((red) => (
                <li key={red.nombre}>
                  <a
                    href={red.href}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-3 text-base text-cream-200 hover:text-gold-400 transition-colors'
                  >
                    <red.Icono className='w-5 h-5 shrink-0 text-gold-500' aria-hidden='true' />
                    <span className='font-semibold'>{red.nombre}</span>
                    <span className='text-neutral-400'>{red.usuario}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Bloque 4: aviso legal de restricción de edad. */}
          <section aria-labelledby='pie-aviso'>
            <h2 id='pie-aviso' className='font-serif text-lg font-bold text-gold-400'>
              Aviso legal
            </h2>
            <p className='mt-4 text-base text-cream-200 leading-relaxed'>
              La venta de bebidas alcohólicas está prohibida para menores de 18 años.
            </p>
            <p className='mt-4 inline-block rounded-xl border border-gold-500/40 bg-wine-900/40 px-4 py-2 text-xl font-bold text-gold-400'>
              +18
            </p>
            <p className='mt-4 text-sm text-neutral-400'>
              La compra implica presentar documento de identidad al retirar.
            </p>
          </section>
        </div>

        <div className='mt-12 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-400'>
          <p className='font-serif text-base font-bold tracking-wider text-gold-500'>
            CAVA &amp; CO.
          </p>
          <p>Proyecto de demostración. Los datos de contacto son de ejemplo.</p>
        </div>
      </div>
    </footer>
  )
}