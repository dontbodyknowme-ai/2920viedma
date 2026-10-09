import { useRef, useState } from 'react'
import { AlertTriangle, Download, FolderTree, Lock, Store, Upload, Workflow } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { csvCatalogo, csvClientes, csvPedidos, descargarComo } from '../../utils/csv_export'
import { TIENDA, zonaHorariaLocal } from '../../utils/tienda'
import type { AdminWine, Customer, ImportResult, Order, Paginated } from '../../types/admin'

/**
 * Configuracion.
 *
 * **Las tres secciones de arriba son de solo lectura y no se van a volver
 * editables sin backend.** No hay endpoint de configuracion y la 004-a no
 * define ninguno. Poner inputs guardando en un `useState` seria un formulario
 * que dice "Guardar" y no guarda nada: peor que mostrar el dato, porque el
 * usuario cree que lo cambio.
 *
 * La unica seccion que hace algo de verdad es la de datos, que reutiliza los
 * mismos generadores que los botones de cada tabla (`src/utils/csv_export.ts`).
 * Que el archivo sea identico al del catalogo es el punto: si la logica estuviera
 * duplicada, las dos copias divergen en el primer cambio.
 */

/** Contenedor de seccion. */
const Seccion = ({
  icono: Icono,
  titulo,
  descripcion,
  children
}: {
  icono: typeof Store
  titulo: string
  descripcion: string
  children: React.ReactNode
}) => (
  <section className='rounded-2xl border border-neutral-800 bg-charcoal-900/60 p-5'>
    <div className='mb-4 flex items-start gap-3'>
      <span
        aria-hidden='true'
        className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400'
      >
        <Icono className='h-4 w-4' />
      </span>
      <div>
        <h2 className='font-serif text-lg font-bold text-cream-100'>{titulo}</h2>
        <p className='mt-0.5 text-sm text-neutral-500'>{descripcion}</p>
      </div>
    </div>
    {children}
  </section>
)

const Fila = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className='flex flex-wrap justify-between gap-2 border-b border-neutral-800/60 py-2 last:border-0'>
    <dt className='text-sm text-neutral-400'>{etiqueta}</dt>
    <dd className='text-sm text-cream-100'>{valor}</dd>
  </div>
)

const Lista = ({ items }: { items: string[] }) => (
  <div className='flex flex-wrap gap-1.5'>
    {items.map((item) => (
      <span
        key={item}
        className='rounded-lg border border-neutral-700 bg-charcoal-800 px-2.5 py-1 text-xs text-neutral-300'
      >
        {item}
      </span>
    ))}
  </div>
)

interface BotonExportarProps {
  etiqueta: string
  /** Cantidad de filas que va a salir, para que el boton no prometa a ciegas. */
  total: number | undefined
  onClick: () => void
  ocupado: boolean
}

const BotonExportar = ({ etiqueta, total, onClick, ocupado }: BotonExportarProps) => (
  <button
    type='button'
    onClick={onClick}
    disabled={ocupado}
    className='flex items-center gap-2 rounded-xl border border-neutral-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-gold-500 hover:text-cream-100 disabled:opacity-50'
  >
    <Download className='h-4 w-4' aria-hidden='true' />
    {etiqueta}
    {total !== undefined && (
      <span className='rounded-full bg-charcoal-800 px-1.5 text-[10px] text-neutral-500'>
        {total}
      </span>
    )}
  </button>
)

export const ConfiguracionAdmin = () => {
  // Se piden con `limit=100` porque los tres generadores necesitan las filas
  // completas para armar el archivo, no solo un conteo.
  const vinos = useApi<Paginated<AdminWine>>('/api/wines?page=1&limit=100')
  const clientes = useApi<Paginated<Customer>>('/api/customers?page=1&limit=100')
  const pedidos = useApi<Paginated<Order>>('/api/orders?page=1&limit=100')

  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const inputCsv = useRef<HTMLInputElement>(null)

  /**
   * Envuelve cada export en el mismo manejo de error.
   *
   * `descargarCsv` no tira en jsdom ni en un navegador normal, pero el `fetch`
   * previo si puede fallar, y un fallo sin mostrar queda como si el boton no
   * hiciera nada.
   */
  const exportar = async (etiqueta: string, armar: () => string): Promise<void> => {
    setOcupado(etiqueta)
    try {
      descargarComo(
        etiqueta.toLowerCase().replace('exportar ', ''),
        armar()
      )
      setMensaje({ texto: `${etiqueta}: listo.`, ok: true })
    } catch (fallo) {
      setMensaje({
        texto: fallo instanceof Error ? fallo.message : 'No se pudo exportar',
        ok: false
      })
    } finally {
      setOcupado(null)
    }
  }

  const importarCatalogo = async (archivo: File): Promise<void> => {
    setOcupado('Importar catalogo')
    try {
      const res = await fetch('/api/wines/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        // El archivo va crudo. Parsearlo en el navegador para re-armarlo tiraria
        // los encabezados y las comas escapadas de las descripciones.
        body: await archivo.text()
      })

      if (!res.ok) throw new Error(`No se pudo importar (HTTP ${res.status})`)

      const resultado = (await res.json()) as ImportResult
      const partes = [`${resultado.created} creados`, `${resultado.updated} actualizados`]
      if (resultado.errors.length > 0) partes.push(`${resultado.errors.length} con error`)

      setMensaje({
        texto: `Importacion: ${partes.join(', ')}.`,
        ok: resultado.errors.length === 0
      })
      vinos.refetch()
    } catch (fallo) {
      setMensaje({
        texto: fallo instanceof Error ? fallo.message : 'No se pudo importar',
        ok: false
      })
    } finally {
      setOcupado(null)
      // Limpiar el `value` permite volver a elegir **el mismo archivo**: sin
      // esto, el segundo intento no dispara el `change`.
      if (inputCsv.current !== null) inputCsv.current.value = ''
    }
  }

  const cepas = [...new Set((vinos.data?.data ?? []).map((vino) => vino.varietal))].sort()
  const categorias = [...new Set((vinos.data?.data ?? []).map((vino) => vino.category))].sort()

  return (
    <div className='space-y-5'>
      <div>
        <h2 className='font-serif text-lg font-bold text-cream-100'>Configuracion</h2>
        <p className='text-sm text-neutral-500'>Datos de la tienda y herramientas de datos</p>
      </div>

      {mensaje !== null && (
        <p
          role='status'
          className={[
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm',
            mensaje.ok
              ? 'border border-gold-500/40 bg-gold-500/10'
              : 'border border-wine-500/50 bg-wine-900/40'
          ].join(' ')}
        >
          {!mensaje.ok && <AlertTriangle className='h-4 w-4 shrink-0' aria-hidden='true' />}
          {mensaje.texto}
        </p>
      )}

      {/* --- General --- */}
      <Seccion
        icono={Store}
        titulo='General'
        descripcion='Solo lectura. No hay backend de configuracion todavia, asi que editar estos campos no persistiria nada.'
      >
        <dl>
          <Fila etiqueta='Nombre' valor={TIENDA.nombre} />
          <Fila etiqueta='Email de contacto' valor={TIENDA.email} />
          <Fila etiqueta='Moneda' valor={`${TIENDA.moneda} (pesos argentinos)`} />
          <Fila etiqueta='Zona horaria de la tienda' valor={TIENDA.zonaHoraria} />
          {/* La zona del navegador va aparte porque es la que manda en los
              filtros de fechas: el panel calcula los dias con la hora local de
              quien mira, no con la de la tienda. */}
          <Fila etiqueta='Zona horaria de este navegador' valor={zonaHorariaLocal()} />
        </dl>
      </Seccion>

      {/* --- Estados --- */}
      <Seccion
        icono={Workflow}
        titulo='Estados de pedido'
        descripcion='Fijos por D-15 de la spec. No son configurables: el backend los valida y el timeline los usa como eslabones.'
      >
        <Lista
          items={[
            'pendiente',
            'preparando',
            'enviado',
            'entregado',
            'cancelado',
            'devuelto'
          ]}
        />
        <p className='mt-3 flex items-start gap-2 text-xs text-neutral-500'>
          <Lock className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          Hacerlos editables requiere que el backend acepte estados distintos. La spec 004-b no lo
          contempla.
        </p>
      </Seccion>

      {/* --- Categorias y cepas --- */}
      <Seccion
        icono={FolderTree}
        titulo='Categorias y cepas'
        descripcion='Se leen del catalogo actual. Agregar una es agregar un vino con esa cepa: no hay un catalogo maestro.'
      >
        {vinos.isLoading ? (
          <p className='text-sm text-neutral-500'>Cargando...</p>
        ) : (
          <>
            <div className='space-y-4'>
              <div>
                <h3 className='mb-2 text-[10px] uppercase tracking-widest text-neutral-500'>
                  Categorias ({categorias.length})
                </h3>
                <Lista items={categorias} />
              </div>
              <div>
                <h3 className='mb-2 text-[10px] uppercase tracking-widest text-neutral-500'>
                  Cepas ({cepas.length})
                </h3>
                <Lista items={cepas} />
              </div>
            </div>

            <dl className='mt-4 border-t border-neutral-800 pt-2'>
              <Fila etiqueta='Vinos en el catalogo' valor={String(vinos.data?.total ?? 0)} />
              <Fila etiqueta='Clientes' valor={String(clientes.data?.total ?? 0)} />
              <Fila etiqueta='Pedidos' valor={String(pedidos.data?.total ?? 0)} />
            </dl>
          </>
        )}
      </Seccion>

      {/* --- Datos / CSV --- */}
      <Seccion
        icono={Download}
        titulo='Datos'
        descripcion='Exportan todo, sin filtros. Para exportar con filtros, usa el boton de la tabla correspondiente.'
      >
        <div className='flex flex-wrap gap-2'>
          <BotonExportar
            etiqueta='Exportar catalogo'
            total={vinos.data?.total}
            onClick={() =>
              void exportar('Exportar catalogo', () => csvCatalogo(vinos.data?.data ?? []))
            }
            ocupado={ocupado === 'Exportar catalogo'}
          />
          <BotonExportar
            etiqueta='Exportar clientes'
            total={clientes.data?.total}
            onClick={() =>
              void exportar('Exportar clientes', () => csvClientes(clientes.data?.data ?? []))
            }
            ocupado={ocupado === 'Exportar clientes'}
          />
          <BotonExportar
            etiqueta='Exportar pedidos'
            total={pedidos.data?.total}
            onClick={() =>
              void exportar('Exportar pedidos', () => csvPedidos(pedidos.data?.data ?? []))
            }
            ocupado={ocupado === 'Exportar pedidos'}
          />

          <input
            ref={inputCsv}
            type='file'
            accept='.csv,text/csv'
            className='hidden'
            aria-label='Importar catalogo desde CSV'
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo !== undefined) void importarCatalogo(archivo)
            }}
          />
          <button
            type='button'
            onClick={() => inputCsv.current?.click()}
            disabled={ocupado === 'Importar catalogo'}
            className='flex items-center gap-2 rounded-xl border border-wine-500/40 bg-wine-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cream-100 transition-colors hover:bg-wine-500 disabled:opacity-50'
          >
            <Upload className='h-4 w-4' aria-hidden='true' />
            Importar catalogo
          </button>
        </div>

        <p className='mt-3 text-xs text-neutral-500'>
          El archivo que exporta &ldquo;Catalogo&rdquo; se puede volver a importar: lleva el{' '}
          <code className='mx-1 rounded bg-charcoal-800 px-1'>Id</code> de cada vino. Sin esa
          columna, la importacion crearia una copia nueva de cada uno en vez de actualizarlo.
        </p>
      </Seccion>
    </div>
  )
}