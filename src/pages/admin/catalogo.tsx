import { useRef, useState } from 'react'
import { Copy, Pencil, Plus, Power, Trash2, Upload } from 'lucide-react'
import {
  DataTable,
  columnaConFiltro,
  columnaHelper
} from '../../components/admin/data_table'
import { StatusBadge } from '../../components/admin/status_badge'
import { ConfirmDialog } from '../../components/admin/confirm_dialog'
import { AdminWineForm } from '../../components/admin/admin_wine_form'
import { ESTADOS, useCatalogo } from '../../hooks/useCatalogo'
import type { AdminWine } from '../../types/admin'

/**
 * Gestion de catalogo: la primera de las tres tablas del panel.
 *
 * Todo lo que hace la tabla va al servidor: los filtros, el orden y la
 * paginacion son query params de `/api/wines`, y cada mutacion es un verbo HTTP
 * seguido de una recarga. El estado local de la pagina es solo lo que el
 * usuario esta haciendo ahora: que vino esta en el formulario, cual esta
 * confirmado para eliminar.
 */

const dinero = (valor: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(valor)

/**
 * Las columnas dependen de las categorias en uso, asi que son una funcion y no
 * una constante: antes el filtro de la columna "Categoria" salia de la lista fija
 * `CATEGORIAS`, y una categoria nueva no aparecia en el desplegable del filtro
 * hasta que alguien editara el codigo.
 */
const columnas = (categorias: readonly string[]) => [
  columnaHelper<AdminWine>().accessor('name', {
    header: 'Nombre',
    cell: (info) => (
      <div className='flex items-center gap-3'>
        <img
          src={info.getValue() === '' ? '' : (info.row.original.imageUrl ?? '')}
          alt=''
          className='h-9 w-9 shrink-0 rounded-lg object-cover'
        />
        <span className='min-w-0'>
          <span className='block truncate font-semibold text-cream-100'>
            {info.getValue()}
          </span>
          <span className='block truncate text-xs text-neutral-500'>
            {info.row.original.winery}
          </span>
        </span>
      </div>
    )
  }),
  columnaHelper<AdminWine>().accessor('varietal', { header: 'Cepa' }),
  columnaConFiltro(columnaHelper<AdminWine>().accessor('category', { header: 'Categoria' }),
    categorias.map((categoria) => ({ valor: categoria, etiqueta: categoria }))
  ),
  columnaHelper<AdminWine>().accessor('vintage', { header: 'Cosecha' }),
  columnaHelper<AdminWine>().accessor('price', {
    header: 'Precio',
    cell: (info) => <span className='font-semibold text-cream-100'>{dinero(info.getValue())}</span>
  }),
  columnaHelper<AdminWine>().accessor('stock', {
    header: 'Stock',
    cell: (info) => {
      const valor = info.getValue()
      // El stock en cero se marca distinto: es el dato que hace que un vino
      //Needs reponer y no deberia pasar desapercibido en una columna de numeros.
      return (
        <span
          className={[
            'font-mono font-semibold',
            valor === 0 ? 'text-wine-400' : 'text-neutral-200'
          ].join(' ')}
        >
          {valor}
        </span>
      )
    }
  }),
  columnaConFiltro(
    columnaHelper<AdminWine>().accessor('activo', {
      header: 'Estado',
      cell: (info) => <StatusBadge estado={info.getValue() ? 'activo' : 'inactivo'} size='sm' />
    }),
    ESTADOS.map((estado) => ({ valor: estado.valor, etiqueta: estado.etiqueta }))
  )
]

export const CatalogoAdmin = () => {
  const catalogo = useCatalogo()
  const columnasCatalogo = columnas(catalogo.categorias)

  const [formAbierto, setFormAbierto] = useState(false)
  const [vinoEnEdicion, setVinoEnEdicion] = useState<AdminWine | null>(null)
  const [porEliminar, setPorEliminar] = useState<AdminWine | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [aviso, setAviso] = useState('')
  const inputCsv = useRef<HTMLInputElement>(null)

  const abrirNuevo = (): void => {
    setVinoEnEdicion(null)
    setFormAbierto(true)
  }

  const abrirEdicion = (vino: AdminWine): void => {
    setVinoEnEdicion(vino)
    setFormAbierto(true)
  }

  const guardar = async (
    vino: Omit<AdminWine, 'id'> & { id?: string }
  ): Promise<void> => {
    if (vino.id === undefined) {
      // El id lo asigna el servidor. Mandarlo en el POST seria mandarlo o
      // `undefined`, que el backend podria tomar como un id explicito.
      const { id, ...resto } = vino
      void id
      await catalogo.crear(resto)
      setAviso(`"${vino.name}" creado.`)
    } else {
      await catalogo.actualizar({ ...vino, id: vino.id })
      setAviso(`"${vino.name}" actualizado.`)
    }
  }

  const confirmarEliminar = async (): Promise<void> => {
    if (porEliminar === null) return
    setEliminando(true)
    try {
      await catalogo.eliminar(porEliminar.id)
      setAviso(`Se elimino "${porEliminar.name}".`)
      setPorEliminar(null)
    } catch (fallo) {
      // CE-01: el backend responde 409 si el vino tiene pedidos. El mensaje
      // explica la causa en vez de mostrar un error generico.
      setAviso(fallo instanceof Error ? fallo.message : 'No se pudo eliminar')
    } finally {
      setEliminando(false)
    }
  }

  /**
   * Manda el archivo tal cual, sin re-armarlo.
   *
   * Parsear el CSV en el navegador para volverlo a serializar tiraria la
   * informacion de los encabezados y cualquier coma dentro de una descripcion
   * ya viene escapada. El servidor valida fila por fila y devuelve el detalle
   * de lo que rechazo, que es la unica fuente confiable de que paso.
   */
  const alElegirCsv = async (archivo: File): Promise<void> => {
    try {
      const respuesta = await catalogo.importarCsv(await archivo.text())

      const partes = [`${respuesta.created} creados`, `${respuesta.updated} actualizados`]
      if (respuesta.errors.length > 0) {
        partes.push(`${respuesta.errors.length} con error`)
      }
      setAviso(`Importacion: ${partes.join(', ')}.`)
    } catch (fallo) {
      setAviso(fallo instanceof Error ? fallo.message : 'No se pudo importar')
    } finally {
      // Limpiar el value permite volver a elegir **el mismo archivo** y disparar
      // el `change` de nuevo: sin esto, el segundo intento no hace nada.
      if (inputCsv.current !== null) inputCsv.current.value = ''
    }
  }

  const alternarEstado = async (vino: AdminWine): Promise<void> => {
    try {
      await catalogo.alternarEstado(vino)
      setAviso(`"${vino.name}" ahora esta ${vino.activo ? 'oculto' : 'visible'}.`)
    } catch (fallo) {
      setAviso(fallo instanceof Error ? fallo.message : 'No se pudo cambiar el estado')
    }
  }

  const duplicar = async (vino: AdminWine): Promise<void> => {
    try {
      await catalogo.duplicar(vino)
      setAviso(`Se duplico "${vino.name}".`)
    } catch (fallo) {
      setAviso(fallo instanceof Error ? fallo.message : 'No se pudo duplicar')
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='font-serif text-lg font-bold text-cream-100'>Catalogo de vinos</h2>
          <p className='text-sm text-neutral-500'>
            {catalogo.total} {catalogo.total === 1 ? 'vino' : 'vinos'} en el catalogo
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <input
            ref={inputCsv}
            type='file'
            accept='.csv,text/csv'
            className='hidden'
            aria-label='Importar CSV'
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo !== undefined) void alElegirCsv(archivo)
            }}
          />
          <button
            type='button'
            onClick={() => inputCsv.current?.click()}
            className='flex items-center gap-2 rounded-xl border border-neutral-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-gold-500 hover:text-cream-100'
          >
            <Upload className='h-4 w-4' aria-hidden='true' />
            Importar CSV
          </button>
          <button
            type='button'
            onClick={abrirNuevo}
            className='flex items-center gap-2 rounded-xl border border-wine-500/40 bg-wine-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cream-100 transition-colors hover:bg-wine-500'
          >
            <Plus className='h-4 w-4' aria-hidden='true' />
            Nuevo vino
          </button>
        </div>
      </div>

      {aviso !== '' && (
        <p role='status' className='rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-2.5 text-sm text-cream-100'>
          {aviso}
        </p>
      )}

      {catalogo.error !== undefined && (
        <p role='alert' className='rounded-xl border border-wine-500/50 bg-wine-900/40 px-4 py-2.5 text-sm text-cream-100'>
          {catalogo.error}
        </p>
      )}

      <DataTable<AdminWine>
        columns={columnasCatalogo}
        data={catalogo.vinos}
        total={catalogo.total}
        page={catalogo.page}
        limit={catalogo.limit}
        onPageChange={catalogo.setPage}
        onLimitChange={catalogo.setLimit}
        onSortChange={(orden) => {
          catalogo.aplicarFiltros({
            sortColumn: orden?.columna ?? '',
            sortDirection: orden?.direccion ?? 'asc'
          })
        }}
        onFilterChange={(filtros) => {
          catalogo.aplicarFiltros({
            category: filtros.category ?? '',
            status: filtros.activo ?? ''
          })
        }}
        searchValue={catalogo.filtros.search}
        onSearchChange={catalogo.setSearch}
        onExport={() => {
          void catalogo.exportarCsv()
        }}
        isLoading={catalogo.isLoading}
        getRowId={(vino) => vino.id}
        emptySingular='vino'
        emptyPlural='vinos'
        rowActions={(vino) => (
          <div className='flex justify-end gap-1'>
            <button
              type='button'
              onClick={() => abrirEdicion(vino)}
              aria-label={`Editar ${vino.name}`}
              title='Editar'
              className='rounded-lg p-2 text-neutral-400 transition-colors hover:bg-charcoal-700 hover:text-gold-400'
            >
              <Pencil className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              type='button'
              onClick={() => void duplicar(vino)}
              aria-label={`Duplicar ${vino.name}`}
              title='Duplicar'
              className='rounded-lg p-2 text-neutral-400 transition-colors hover:bg-charcoal-700 hover:text-gold-400'
            >
              <Copy className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              type='button'
              onClick={() => void alternarEstado(vino)}
              aria-label={`${vino.activo ? 'Ocultar' : 'Mostrar'} ${vino.name}`}
              title={vino.activo ? 'Ocultar del catalogo' : 'Mostrar en el catalogo'}
              className='rounded-lg p-2 text-neutral-400 transition-colors hover:bg-charcoal-700 hover:text-gold-400'
            >
              <Power className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              type='button'
              onClick={() => setPorEliminar(vino)}
              aria-label={`Eliminar ${vino.name}`}
              title='Eliminar'
              className='rounded-lg p-2 text-neutral-400 transition-colors hover:bg-wine-900 hover:text-wine-400'
            >
              <Trash2 className='h-4 w-4' aria-hidden='true' />
            </button>
          </div>
        )}
      />

      <AdminWineForm
        isOpen={formAbierto}
        vino={vinoEnEdicion}
        categoriasExistentes={catalogo.categorias}
        onClose={() => setFormAbierto(false)}
        onGuardar={guardar}
      />

      <ConfirmDialog
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => void confirmarEliminar()}
        title='Eliminar vino'
        message={
          porEliminar === null
            ? ''
            : `Se eliminara "${porEliminar.name}" del catalogo. Si tiene pedidos asociados, el servidor no va a permitirlo.`
        }
        confirmText='Eliminar'
        loading={eliminando}
      />
    </div>
  )
}
