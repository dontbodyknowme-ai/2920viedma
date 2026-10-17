import { useEffect, useState } from 'react'
import { CloudOff, RotateCcw } from 'lucide-react'
import { estaOffline, limpiarRespaldos, marcarOnline, suscribirOffline } from '../../utils/offline'

/**
 * Aviso permanente de modo offline (CE-05).
 *
 * Va en el header del panel, arriba de todo, y no en cada pagina: el modo
 * offline es una condicion **del panel**, no de una pantalla. Ponerlo por
 * pagina haria que se Servant cinco veces.
 *
 * Es la parte que CE-05 no pide y que hace que el fallback no sea engañoso: los
 * datos que se muestran son los ultimos guardados en **este** navegador, que
 * pueden ser de hace horas. El `alert` de CE-05 aparece una vez y se va; este se
 * queda mientras dure la condicion.
 */

export const AvisoOffline = () => {
  const [offline, setOffline] = useState(estaOffline())

  useEffect(() => suscribirOffline(setOffline), [])

  if (!offline) return null

  const reintentar = (): void => {
    limpiarRespaldos()
    marcarOnline()
    // Un recargado limpio: los respaldos se borran para que, si la red sigue
    // caída, el panel muestre el error y no un snapshot viejo de nuevo. Si la
    // red volvio, se vuelve a pedir todo al servidor.
    window.location.reload()
  }

  return (
    <div
      role='status'
      className='flex flex-wrap items-center justify-between gap-3 border-b border-verde-salvia/40 bg-verde-salvia/10 px-4 py-2.5 text-sm text-carbon'
    >
      <span className='flex items-center gap-2'>
        <CloudOff className='h-4 w-4 shrink-0 text-verde-salvia' aria-hidden='true' />
        <span>
          <strong className='font-semibold'>Modo offline.</strong> Se muestran los ultimos datos
          guardados en este navegador, que pueden no ser los actuales. Los cambios no se guardan
          hasta que vuelva la conexion.
        </span>
      </span>

      <button
        type='button'
        onClick={reintentar}
        className='flex shrink-0 items-center gap-1.5 rounded-lg border border-verde-salvia/50 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-verde-600/20'
      >
        <RotateCcw className='h-3.5 w-3.5' aria-hidden='true' />
        Reintentar
      </button>
    </div>
  )
}