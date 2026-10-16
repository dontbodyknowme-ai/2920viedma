import { describe, expect, it } from 'vitest'
import { construirUrl, type FiltrosPedidos } from '../src/hooks/usePedidos'

/**
 * Como viaja el filtro de estados del panel.
 *
 * ## Que estaba roto
 *
 * `?status=pendiente,enviado` —una cadena con comas— contra un backend que
 * declara **un** estado. El panel es multi-select desde el 004-a, asi que marcar
 * dos casillas daba **400**. Y no se veia: el filtro se cerraba solo y la tabla
 * seguia mostrando lo de antes, como si no hubiera pasado nada.
 *
 * ## Por que un archivo de texto y no el panel montado
 *
 * `construirUrl` esta **exportada** justamente para esto. Montar `PedidosAdmin`
 * para leer una query seria veinte lineas de andamiaje —proveer contexto,
 * interceptar la red, esperar el efecto— para afirmar un `append`.
 *
 * Y el otro lado, que el backend acepta la lista, lo verifica
 * `backend/tests/modules/filtro_pedidos.test.ts` **contra el `where` de Prisma**:
 * son dos capas y cada una necesita su propio lado.
 */

const filtros = (over: Partial<FiltrosPedidos> = {}): FiltrosPedidos => ({
  estados: [],
  dateFrom: '',
  dateTo: '',
  search: '',
  sortColumn: '',
  sortDirection: 'asc',
  ...over
})

const consulta = (url: string): URLSearchParams => new URL(url, 'http://x.test').searchParams

describe('el estado viaja REPETIDO, no joined', () => {
  it('un estado', () => {
    const params = consulta(construirUrl(filtros({ estados: ['pendiente'] }), 1, 10))

    expect(params.getAll('status')).toEqual(['pendiente'])
  })

  it('dos estados: el caso que rompia', () => {
    // La cadena con comas no es ningun miembro del enum del backend, y por eso
    // daba 400. Con el parametro repetido no hay ambiguedad.
    const params = consulta(construirUrl(filtros({ estados: ['pendiente', 'enviado'] }), 1, 10))

    expect(params.getAll('status')).toEqual(['pendiente', 'enviado'])
    // Y no queda ninguna cadena con comas que el backend pueda no entender.
    expect(params.get('status')).not.toContain(',')
  })

  it('los seis estados', () => {
    const todos = ['pendiente', 'preparando', 'enviado', 'entregado', 'cancelado', 'devuelto'] as const
    const params = consulta(construirUrl(filtros({ estados: [...todos] }), 1, 10))

    expect(params.getAll('status')).toEqual([...todos])
  })

  it('sin filtro no manda el parametro', () => {
    // Mandar `?status=` vacio haria que el backend recibiera `[""]` y un 400.
    const params = consulta(construirUrl(filtros(), 1, 10))

    expect(params.getAll('status')).toEqual([])
  })

  it('el orden de las casillas se respeta', () => {
    // El backend lo pasa tal cual a `in`, asi que da igual, pero fijarlo evita
    // que un `sort()` accidental Reine el orden de marcado y rompa una URL
    // guardada en un historial.
    const params = consulta(construirUrl(filtros({ estados: ['entregado', 'pendiente'] }), 1, 10))

    expect(params.getAll('status')).toEqual(['entregado', 'pendiente'])
  })
})

describe('lo demas de la query', () => {
  it('manda la busqueda, las fechas y el orden', () => {
    const params = consulta(
      construirUrl(
        filtros({
          search: '  Maria  ',
          dateFrom: '2026-10-01',
          dateTo: '2026-10-16',
          sortColumn: 'total',
          sortDirection: 'desc'
        }),
        2,
        25
      )
    )

    expect(params.get('search')).toBe('Maria')
    expect(params.get('dateFrom')).toBe('2026-10-01')
    expect(params.get('dateTo')).toBe('2026-10-16')
    expect(params.get('sortBy')).toBe('total')
    expect(params.get('sortDir')).toBe('desc')
    expect(params.get('page')).toBe('2')
    expect(params.get('limit')).toBe('25')
  })

  it('el filtro de estado convive con los otros', () => {
    // Antes, con busqueda o fechas puestas, marcar dos estados seguia dando 400:
    // el enum se evaluaba antes que todo lo demas.
    const params = consulta(
      construirUrl(
        filtros({ estados: ['pendiente', 'enviado'], search: 'Maria', dateFrom: '2026-10-01' }),
        1,
        10
      )
    )

    expect(params.getAll('status')).toEqual(['pendiente', 'enviado'])
    expect(params.get('search')).toBe('Maria')
    expect(params.get('dateFrom')).toBe('2026-10-01')
  })

  it('una busqueda solo de espacios no manda el parametro', () => {
    const params = consulta(construirUrl(filtros({ search: '   ' }), 1, 10))

    expect(params.get('search')).toBeNull()
  })
})
