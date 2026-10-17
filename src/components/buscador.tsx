import { Search } from 'lucide-react'

interface BuscadorProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

/**
 * Buscador prominente de la home.
 *
 * Vive debajo del header y arriba del hero: es lo primero que ve el visitante
 * y el punto de entrada a la busqueda. Es de ancho completo y con un placeholder
 * que invita a escribir ("Que necesitas hoy?").
 */
export const Buscador = ({ searchQuery, onSearchChange }: BuscadorProps) => (
  <div className='mx-auto w-full max-w-3xl'>
    <div className='relative'>
      <Search
        className='pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400'
        aria-hidden='true'
      />
      <input
        type='text'
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder='¿Qué necesitás hoy?'
        aria-label='Buscar productos'
        className='w-full rounded-xl border border-neutral-200 bg-blanco py-4 pl-14 pr-5 text-carbon placeholder-neutral-400 shadow-sm transition-colors focus:border-verde-salvia focus:outline-none focus:ring-2 focus:ring-verde-salvia/20'
      />
    </div>
  </div>
)
