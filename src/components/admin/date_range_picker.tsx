import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { CalendarDays, X } from 'lucide-react'
import { aIsoLocal } from '../../utils/fechas'
import 'react-day-picker/style.css'

/**
 * Selector de rango de fechas para filtrar pedidos.
 *
 * `react-day-picker` v9 no usa `date-fns` para formatear: trabaja con objetos
 * `Date` nativos y usa `date-fns` solo para los nombres de mes y dia, que se
 * importan de `date-fns/locale`. Por eso la libreria se importa pero no se
 * pasa por props.
 *
 * **Los dias se comparan por su fecha local, no por su timestamp.** Con
 * `new Date(2026, 0, 15)` el objeto vale medianoche local, y `toISOString()`
 * de eso da `2026-01-15T03:00:00Z` en Argentina. Si se usara `toISOString()` sin
 * mas, el filtro "hasta el 15" cortaria el 14. La conversion a `YYYY-MM-DD` se
 * hace con los getters locales (`getFullYear`, `getMonth`, `getDate`), que es lo
 * unico que produce la fecha que el usuario realmente senalo.
 */

/** `Date` -> `YYYY-MM-DD` local. La implementacion vive en `utils/fechas.ts`. */
export { aIsoLocal }

/**
 * El rango invertido se corrige a si mismo.
 *
 * El calendario entrega `from` mayor que `to` cuando el usuario arranca por el
 * dia de la derecha. Mandarlo asi al backend daria `dateFrom > dateTo` y el
 * filtro no devolveria nada, sin error visible: pareceria que no hay pedidos.
 */
export interface RangoIso {
  dateFrom: string
  dateTo: string
}

export const normalizarRango = (rango: DateRange | undefined): RangoIso => {
  if (rango === undefined || rango.from === undefined) {
    return { dateFrom: '', dateTo: '' }
  }

  const desde = aIsoLocal(rango.from)

  if (rango.to === undefined) {
    return { dateFrom: desde, dateTo: '' }
  }

  const hastaCruda = aIsoLocal(rango.to)
  return { dateFrom: desde, dateTo: hastaCruda < desde ? desde : hastaCruda }
}

interface DateRangePickerProps {
  desde: string
  hasta: string
  onChange: (cambios: RangoIso) => void
}

export const DateRangePicker = ({ desde, hasta, onChange }: DateRangePickerProps) => {
  const [abierto, setAbierto] = useState(false)

  // El rango se reconstruye al abrir, desde lo que el filtro ya tiene. El
  // calendario necesita un estado propio mientras esta abierto: si leyera del
  // filtro, tocar un dia no se veria hasta que seConfirmara, y "Aplicar"
  // aplicaria el rango viejo.
  const valorDelFiltro: DateRange | undefined =
    desde === ''
      ? undefined
      : // Se reconstruye con hora local al mediodia: con medianoche, un `to` en
        // UTC retrocede un dia y el rango se ve un dia mas corto del que es.
        hasta === ''
          ? { from: new Date(`${desde}T12:00:00`), to: undefined }
          : { from: new Date(`${desde}T12:00:00`), to: new Date(`${hasta}T12:00:00`) }

  const [rangoAbierto, setRangoAbierto] = useState<DateRange | undefined>(valorDelFiltro)

  /**
   * El mes visible se controla, en vez de dejarlo a `defaultMonth`.
   *
   * `defaultMonth` solo aplica en el primer montaje del componente, que ocurre
   * una vez cuando se carga la pagina. Como el calendario se abre y se cierra
   * varias veces, en la segunda apertura seguia mostrando el mes con el que
   * arranco la pagina, no el del filtro ni el de hoy. Controlar `month` hace
   * que cada apertura arranque donde tiene que arrancar.
   */
  const [mesVisible, setMesVisible] = useState<Date>(() => {
    const desdeFiltro = desde !== '' ? new Date(`${desde}T12:00:00`) : null
    return desdeFiltro ?? new Date()
  })

  const abrir = (): void => {
    // Cada apertura arranca en el filtro vigente, no en lo que quedo a medias en
    // la apertura anterior.
    setRangoAbierto(valorDelFiltro)
    const desdeFiltro = desde !== '' ? new Date(`${desde}T12:00:00`) : null
    setMesVisible(desdeFiltro ?? new Date())
    setAbierto(true)
  }

  const rango = abierto ? rangoAbierto : valorDelFiltro

  /**
 * El "hoy" del calendario se calcula una sola vez por montaje.
 *
 * `new Date()` dentro del render daria un valor nuevo en cada render, y
 * `disabled={{ after: ... }}` compararia contra un objeto distinto cada vez.
 * No rompe, pero hace que React vea una prop cambiante en cada render y el
 * calendario se re-dibuja sin motivo.
 */
const hoy = new Date()

const etiqueta = (): string => {
    if (desde === '' && hasta === '') return 'Todas las fechas'
    if (desde !== '' && hasta !== '') return `${desde} a ${hasta}`
    return desde !== '' ? `Desde ${desde}` : `Hasta ${hasta}`
  }

  const botonApertura = (
    <button
      type='button'
      onClick={() => (abierto ? setAbierto(false) : abrir())}
      aria-expanded={abierto}
      className='flex items-center gap-2 rounded-xl border border-neutral-300 bg-blanco px-3 py-2 text-xs text-carbon transition-colors hover:border-verde-salvia'
    >
      <CalendarDays className='h-4 w-4 shrink-0 text-neutral-600' aria-hidden='true' />
      <span className='whitespace-nowrap'>{etiqueta()}</span>
    </button>
  )

  return (
    <div className='relative'>
      {botonApertura}

      {abierto && (
        <>
          {/* El fondo cierra el panel. No es un boton con texto, asi que lleva
              `aria-hidden`: el cierre real es el boton "Limpiar" y el de
              afuera del calendario. */}
          <div
            aria-hidden='true'
            onClick={() => setAbierto(false)}
            className='fixed inset-0 z-30'
          />

          <div className='absolute right-0 z-40 mt-2 rounded-2xl border border-neutral-300 bg-blanco p-3 shadow-2xl'>
            <div className='flex items-center justify-between gap-4 pb-2'>
              <span className='text-[10px] uppercase tracking-widest text-neutral-600'>
                Rango de fechas
              </span>
              <button
                type='button'
                onClick={() => {
                  onChange({ dateFrom: '', dateTo: '' })
                  setAbierto(false)
                }}
                aria-label='Limpiar rango de fechas'
                className='rounded-lg p-1.5 text-neutral-600 transition-colors hover:bg-blanco hover:text-carbon'
              >
                <X className='h-4 w-4' aria-hidden='true' />
              </button>
            </div>

            <DayPicker
              mode='range'
              selected={rango}
              // El rango no se filtra mientras se elige: se aplica cuando el
              // usuario confirma. Filtrar en cada click haria desaparecer la
              // tabla bajo el calendario mientras se esta por, y recargar los
              // pedidos una vez por cada dia que el usuario toca.
              onSelect={setRangoAbierto}
              locale={es}
              numberOfMonths={2}
              month={mesVisible}
              onMonthChange={setMesVisible}
              disabled={{ after: hoy }}
              classNames={{
                root: 'rdp-root',
                months: 'flex flex-col gap-4 sm:flex-row sm:gap-6',
                month: 'space-y-2',
                caption_label: 'text-xs font-semibold capitalize text-carbon',
                nav: 'flex items-center gap-1',
                button_previous:
                  'rounded-lg p-1.5 text-neutral-600 hover:bg-blanco hover:text-verde-600',
                button_next:
                  'rounded-lg p-1.5 text-neutral-600 hover:bg-blanco hover:text-verde-600',
                weekdays: 'flex',
                weekday:
                  'w-8 text-[10px] font-medium uppercase text-neutral-500',
                week: 'flex w-full mt-0.5',
                day: 'relative w-8 h-8 p-0 text-center text-xs focus:outline-none',
                day_button:
                  'h-8 w-8 rounded-lg text-carbon hover:bg-neutral-200 transition-colors',
                selected: 'rounded-lg',
                range_start: 'rounded-l-lg bg-verde-600 text-carbon',
                range_end: 'rounded-r-lg bg-verde-600 text-carbon',
                range_middle: 'bg-verde-800/50 text-carbon',
                today: 'font-bold text-verde-salvia',
                outside: 'text-neutral-600',
                disabled: 'text-neutral-700 opacity-50'
              }}
            />

            <div className='flex gap-2 border-t border-neutral-200 pt-3'>
              <button
                type='button'
                onClick={() => setAbierto(false)}
                className='flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:bg-blanco'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={() => {
                  // Se manda el rango del calendario abierto, no el del filtro. Si se
                  // mandara el del filtro, tocar dias y cancelar no tendria
                  // efecto, y "Aplicar" sin elegir nada repondria el filtro que
                  // el admin todavia no limpio.
                  onChange(normalizarRango(rangoAbierto))
                  setAbierto(false)
                }}
                className='flex-1 rounded-xl border border-verde-500/40 bg-verde-600 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-carbon transition-colors hover:bg-verde-600'
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}