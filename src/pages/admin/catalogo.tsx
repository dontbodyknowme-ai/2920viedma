import { useRef, useState } from 'react'
import { Copy, Pencil, Plus, Power, Trash2, Upload } from 'lucide-react'
import {
  DataTable,
  columnaConFiltro,
  columnaHelper
} from '../../components/admin/data_table'
import { StatusBadge } from '../../components/admin/status_badge'
import { ConfirmDialog } from '../../components/admin/confirm_dialog'
import { AdminProductoForm } from '../../components/admin/admin_producto_form'
import { ESTADOS, useCatalogo } from '../../hooks/useCatalogo'
import {
  DEPARTAMENTOS,
  PESTAÑA_TODOS,
  SIN_DEPARTAMENTO,
  etiquetaDeStock
} from '../../utils/departamentos'
import type { ProductoAdmin } from '../../types/admin'

/**
 * Gestion de catalogo: la primera de las tres tablas del panel.
 *
 * Todo lo que hace la tabla va al servidor: los filtros, el orden y la
 * paginacion son query params de `/api/products`, y cada mutacion es un verbo HTTP
 * seguido de una recarga. El estado local de la pagina es solo lo que el
 * usuario esta haciendo ahora: que producto esta en el formulario, cual esta
 * confirmado para eliminar.
 *
 * ## El stock esta separado por departamento
 *
 * Arriba de la tabla hay una barra de pestañas —"Todos", "Stock de bebidas",
 * "Stock de regaleria", "Stock de snacks y chocolates", "Stock de comidas"— y
 * cada una es la misma tabla con `?departamento=` puesto.
 *
 * No son cuatro tablas ni cuatro rutas: es un filtro, y por eso el trabajo lo
 * hace el servidor. La eleccion de por que van como pestañas y no como entradas
 * del menu esta en `router.tsx`/`permisos.ts`: cuatro rutas mas habria que
 * repetirlas en la tabla de permisos, que esta cruzada con el `requireRole` del
 * backend por un test que fija las 14 declaraciones a mano.
 *
 * **El departamento va en `departamento` y no en el filtro de "Categoria"**,
 * porque son dos ejes: `category` es el tipo de producto (Tinto, Blanco) y
 * `departamento` el grupo de la tienda (Bebidas, Regaleria). Un Malbec es las dos
 * a la vez. Meter el grupo en `category` habria hecho perder el tipo.
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
  columnaHelper<ProductoAdmin>().accessor('name', {
    header: 'Nombre',
    cell: (info) => (
      <div className='flex items-center gap-3'>
        <img
          src={info.getValue() === '' ? '' : (info.row.original.imageUrl ?? '')}
          alt=''
          className='h-9 w-9 shrink-0 rounded-lg object-cover'
        />
        <span className='min-w-0'>
          <span className='block truncate font-semibold text-carbon'>
            {info.getValue()}
          </span>
          <span className='block truncate text-xs text-neutral-500'>
            {info.row.original.winery}
          </span>
        </span>
      </div>
    )
  }),
  columnaHelper<ProductoAdmin>().accessor('varietal', { header: 'Cepa' }),
  /**
   * "Departamento" va **antes** de "Categoria" y no al lado de "Cepa": es el
   * campo por el que esta filtrada la tabla (la pestana de stock), asi que si
   * aparece al final queda fuera de pantalla en una laptop y parece que la
   * columna no existe.
   *
   * Y **no lleva filtro desplegable**, a diferencia de "Categoria" y "Estado".
   * La pestana de arriba ya escribe este mismo campo, y dos controles sobre un
   * solo estado se pisan: elegis una pestana y despues usas el desplegable, el
   * desplegable manda, la tabla cambia y **la pestana sigue marcada con el
   * valor viejo**. La pantalla dice una cosa y muestra otra. Un solo control
   * por estado: la pestana.
   */
  columnaHelper<ProductoAdmin>().accessor('departamento', { header: 'Departamento' }),
  columnaConFiltro(columnaHelper<ProductoAdmin>().accessor('category', { header: 'Categoria' }),
    categorias.map((categoria) => ({ valor: categoria, etiqueta: categoria }))
  ),
  columnaHelper<ProductoAdmin>().accessor('vintage', { header: 'Cosecha' }),
  columnaHelper<ProductoAdmin>().accessor('price', {
    header: 'Precio',
    cell: (info) => <span className='font-semibold text-carbon'>{dinero(info.getValue())}</span>
  }),
  columnaHelper<ProductoAdmin>().accessor('stock', {
    header: 'Stock',
    cell: (info) => {
      const valor = info.getValue()
      // El stock en cero se marca distinto: es el dato que hace que un producto
      //Needs reponer y no deberia pasar desapercibido en una columna de numeros.
      return (
        <span
          className={[
            'font-mono font-semibold',
            valor === 0 ? 'text-verde-500' : 'text-neutral-700'
          ].join(' ')}
        >
          {valor}
        </span>
      )
    }
  }),
  columnaConFiltro(
    columnaHelper<ProductoAdmin>().accessor('activo', {
      header: 'Estado',
      cell: (info) => <StatusBadge estado={info.getValue() ? 'activo' : 'inactivo'} size='sm' />
    }),
    ESTADOS.map((estado) => ({ valor: estado.valor, etiqueta: estado.etiqueta }))
  )
]

export const CatalogoAdmin = () => {
  const catalogo = useCatalogo()
  const columnasCatalogo = columnas(catalogo.categorias)

  /**
   * Que pestana de stock esta activa. El valor guardado es el **departamento**,
   * no un indice ni un id de pestaña: asi el filtro se manda al servidor tal
   * cual y recargar la pagina no depende de que las pestañas sigan en el mismo
   * orden.
   */
  const [departamento, setDepartamento] = useState<string>(SIN_DEPARTAMENTO)

  const [formAbierto, setFormAbierto] = useState(false)
  const [vinoEnEdicion, setVinoEnEdicion] = useState<ProductoAdmin | null>(null)
  const [porEliminar, setPorEliminar] = useState<ProductoAdmin | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [aviso, setAviso] = useState('')
  const inputCsv = useRef<HTMLInputElement>(null)

  const abrirNuevo = (): void => {
    setVinoEnEdicion(null)
    setFormAbierto(true)
  }

  /**
   * Cambiar de pestana.
   *
   * El filtro va por `aplicarFiltros` y no por un `useState` propio: asi el
   * `departamento` queda en el mismo lugar que los demas filtros y la tabla se
   * recarga sola. Ademas `aplicarFiltros` vuelve a la pagina 1, que es lo que
   * hay que hacer: la pagina 3 de "Stock de bebidas" no existe si el filtro
   * recargado tiene 1 sola pagina, y quedarse ahi muestra una tabla vacia con
   * paginacion que no cuadra.
   *
   * **No manda `category: ''`**: la columna "Categoria" tiene su propio
   * desplegable, y esa eleccion se tiene que conservar al cambiar de pestana de
   * stock. Filtrar por departamento y por tipo de producto son cosas distintas.
   */
  const cambiarDepartamento = (valor: string): void => {
    setDepartamento(valor)
    catalogo.aplicarFiltros({ departamento: valor })
  }

  const abrirEdicion = (producto: ProductoAdmin): void => {
    setVinoEnEdicion(producto)
    setFormAbierto(true)
  }

  const guardar = async (
    producto: Omit<ProductoAdmin, 'id'> & { id?: string }
  ): Promise<void> => {
    if (producto.id === undefined) {
      // El id lo asigna el servidor. Mandarlo en el POST seria mandarlo o
      // `undefined`, que el backend podria tomar como un id explicito.
      const { id, ...resto } = producto
      void id
      await catalogo.crear(resto)
      setAviso(`"${producto.name}" creado.`)
    } else {
      await catalogo.actualizar({ ...producto, id: producto.id })
      setAviso(`"${producto.name}" actualizado.`)
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
      // CE-01: el backend responde 409 si el producto tiene pedidos. El mensaje
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

  const alternarEstado = async (producto: ProductoAdmin): Promise<void> => {
    try {
      await catalogo.alternarEstado(producto)
      setAviso(`"${producto.name}" ahora esta ${producto.activo ? 'oculto' : 'visible'}.`)
    } catch (fallo) {
      setAviso(fallo instanceof Error ? fallo.message : 'No se pudo cambiar el estado')
    }
  }

  const duplicar = async (producto: ProductoAdmin): Promise<void> => {
    try {
      await catalogo.duplicar(producto)
      setAviso(`Se duplico "${producto.name}".`)
    } catch (fallo) {
      setAviso(fallo instanceof Error ? fallo.message : 'No se pudo duplicar')
    }
  }

  const pestanaActual = DEPARTAMENTOS.find((d) => d.valor === departamento)

  return (
    <div className='space-y-4'>
      {/* El titulo cambia con la pestana. Decir "Catalogo de productos" arriba de la
          tabla de "Stock de regaleria" obliga a leer las dos lineas para saber
          que se esta viendo; el nombre de la pestana ya lo dice. */}
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='font-serif text-lg font-bold text-carbon'>
            {pestanaActual === undefined
              ? 'Catalogo de productos'
              : etiquetaDeStock(pestanaActual.valor)}
          </h2>
          <p className='text-sm text-neutral-500'>
            {catalogo.total} {catalogo.total === 1 ? 'producto' : 'productos'} en esta seccion
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
            className='flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:border-verde-salvia hover:text-carbon'
          >
            <Upload className='h-4 w-4' aria-hidden='true' />
            Importar CSV
          </button>
          <button
            type='button'
            onClick={abrirNuevo}
            className='flex items-center gap-2 rounded-xl border border-verde-500/40 bg-verde-600 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-blanco transition-colors hover:bg-verde-600'
          >
            <Plus className='h-4 w-4' aria-hidden='true' />
            Nuevo producto
          </button>
        </div>
      </div>

      {/*
        La barra de stock.

        Va **arriba del todo y no pegada a la tabla**: es el filtro principal,
        y un filtro que esta abajo de 20 filas es un filtro que nadie usa. Es
        tambien lo que hace obvio que las dos cosas de arriba —el titulo y el
        contador— son de la seccion activa.

        El ancho es `flex-wrap` y no una grilla de 5 columnas: "Stock de snacks y
        chocolates" no entra en una quinta de una pantalla de panel sin partirse
        en tres lineas de dos palabras, que se lee peor que la lista de dos.
      */}
      <nav aria-label='Secciones de stock' className='flex flex-wrap gap-2'>
        {[{ valor: SIN_DEPARTAMENTO, etiqueta: PESTAÑA_TODOS }, ...DEPARTAMENTOS].map(
          (pestana) => {
            const activa = departamento === pestana.valor
            return (
              <button
                key={pestana.valor === SIN_DEPARTAMENTO ? 'todos' : pestana.valor}
                type='button'
                onClick={() => cambiarDepartamento(pestana.valor)}
                aria-current={activa ? 'page' : undefined}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activa
                    ? 'border-verde-600 bg-verde-600 text-blanco'
                    : 'border-neutral-300 bg-blanco/40 text-neutral-600 hover:border-verde-salvia hover:text-carbon'
                }`}
              >
                {pestana.valor === SIN_DEPARTAMENTO
                  ? PESTAÑA_TODOS
                  : etiquetaDeStock(pestana.valor)}
              </button>
            )
          }
        )}
      </nav>

      {aviso !== '' && (
        <p role='status' className='rounded-xl border border-verde-salvia/40 bg-verde-salvia/10 px-4 py-2.5 text-sm text-blanco'>
          {aviso}
        </p>
      )}

      {catalogo.error !== undefined && (
        <p role='alert' className='rounded-xl border border-verde-500/50 bg-verde-800/40 px-4 py-2.5 text-sm text-blanco'>
          {catalogo.error}
        </p>
      )}

      <DataTable<ProductoAdmin>
        columns={columnasCatalogo}
        data={catalogo.productos}
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
        getRowId={(producto) => producto.id}
        emptySingular='producto'
        emptyPlural='productos'
        rowActions={(producto) => (
          <div className='flex justify-end gap-1'>
            <button
              type='button'
              onClick={() => abrirEdicion(producto)}
              aria-label={`Editar ${producto.name}`}
              title='Editar'
              className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-verde-600'
            >
              <Pencil className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              type='button'
              onClick={() => void duplicar(producto)}
              aria-label={`Duplicar ${producto.name}`}
              title='Duplicar'
              className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-verde-600'
            >
              <Copy className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              type='button'
              onClick={() => void alternarEstado(producto)}
              aria-label={`${producto.activo ? 'Ocultar' : 'Mostrar'} ${producto.name}`}
              title={producto.activo ? 'Ocultar del catalogo' : 'Mostrar en el catalogo'}
              className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-verde-600'
            >
              <Power className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              type='button'
              onClick={() => setPorEliminar(producto)}
              aria-label={`Eliminar ${producto.name}`}
              title='Eliminar'
              className='rounded-lg p-2 text-neutral-600 transition-colors hover:bg-verde-800 hover:text-verde-600'
            >
              <Trash2 className='h-4 w-4' aria-hidden='true' />
            </button>
          </div>
        )}
      />

      <AdminProductoForm
        isOpen={formAbierto}
        producto={vinoEnEdicion}
        categoriasExistentes={catalogo.categorias}
        onClose={() => setFormAbierto(false)}
        onGuardar={guardar}
      />

      <ConfirmDialog
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => void confirmarEliminar()}
        title='Eliminar producto'
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
