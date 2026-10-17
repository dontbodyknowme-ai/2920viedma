import { Truck } from 'lucide-react'

/**
 * Banner promocional de la home: "Tu pedido, en la puerta de tu casa".
 *
 * Bloque de color arena (fondo alternativo) que refuerza la promesa de entrega.
 * Va despues de las categorias y antes del catalogo.
 */
export const BannerPromo = () => (
  <section className='mx-auto max-w-7xl px-6 pb-12'>
    <div className='flex items-center gap-4 rounded-2xl bg-arena p-6 md:p-8'>
      <div className='shrink-0 rounded-full bg-blanco p-3 text-verde-600'>
        <Truck className='h-6 w-6' aria-hidden='true' />
      </div>
      <div>
        <h3 className='font-serif text-lg font-bold text-carbon md:text-xl'>
          Tu pedido, en la puerta de tu casa
        </h3>
        <p className='text-sm text-neutral-600'>
          Información de entrega disponible antes de finalizar la compra.
        </p>
      </div>
    </div>
  </section>
)
