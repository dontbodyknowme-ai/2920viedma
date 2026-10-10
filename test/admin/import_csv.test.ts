import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { aTextoCsv, parsearCsv } from '../../src/utils/csv'
import { importarVinos } from '../../src/mocks/importar_vinos'
import { mockWines } from '../../src/mocks/data'
import type { AdminWine } from '../../src/types/admin'

/**
 * El ciclo exportar -> importar.
 *
 * Estos tests atacan bugs reales que estaban desde T1 y que ningun test
 * cubria: el importador exigia encabezados en ingles (`name`, `winery`, `price`)
 * mientras que el export escribe los suyos en espanol, y usaba un parser
 * propio con `split(',')` que rompia con cualquier descripcion que tuviera una
 * coma, que es justo lo que el export genera.
 *
 * Se llama a `importarVinos` directo y no por HTTP: bajo jsdom, MSW v2 no
 * intercepta el `fetch` de undici, asi que una prueba de extremo a extremo del
 * endpoint daria `ECONNREFUSED` en vez de probar algo.
 */

const ENCABEZADOS = [
  'Id',
  'Nombre',
  'Bodega',
  'Cepa',
  'Categoria',
  'Cosecha',
  'Precio',
  'Stock',
  'Activo',
  'Descripcion'
]

/** Reproduce exactamente lo que produce el boton Exportar. */
const csvComoElDelPanel = (vinos: AdminWine[]): string => {
  const filas = vinos.map((vino) => [
    vino.id,
    vino.name,
    vino.winery,
    vino.varietal,
    vino.category,
    String(vino.vintage),
    String(vino.price),
    String(vino.stock),
    vino.activo ? 'si' : 'no',
    vino.description
  ])
  return aTextoCsv(filas, ENCABEZADOS)
}

const buscar = (texto: string): AdminWine | undefined =>
  mockWines.find((vino) =>
    vino.name.toLowerCase().includes(texto.toLowerCase())
  )

describe('importacion de CSV', () => {
  // Los tests importan de verdad en `mockWines`, que es un array compartido. Sin
  // restaurarlo, cada test contaminaria al siguiente.
  let original: AdminWine[]

  beforeEach(() => {
    original = [...mockWines]
  })

  afterEach(() => {
    mockWines.length = 0
    mockWines.push(...original)
  })

  it('acepta los encabezados en espanol que produce el export', () => {
    const resultado = importarVinos(
      csvComoElDelPanel([
        {
          ...mockWines[0],
          id: 'csv-es-1',
          name: 'Vino Nuevo A',
          description: 'Uno nuevo'
        },
        {
          ...mockWines[0],
          id: 'csv-es-2',
          name: 'Vino Nuevo B',
          description: 'Otro mas'
        }
      ])
    )

    expect(resultado.errors).toHaveLength(0)
    expect(resultado.created).toBe(2)
  })

  it('sigue aceptando los encabezados en ingles', () => {
    const resultado = importarVinos(
      'name,winery,price,vintage\nEnglish Wine,English Cellar,50000,2021'
    )

    expect(resultado.errors).toHaveLength(0)
    expect(resultado.created).toBe(1)
  })

  it('no crea duplicados al reimportar un archivo con id', () => {
    // Sin id, el servidor genera uno nuevo en cada pasada y el mismo archivo
    // crearia otra copia. Con id, la segunda pasada actualiza.
    const csv = 'id,name,winery,price,vintage\nid-fijo,Persistente,Bodega X,40000,2020'

    const primera = importarVinos(csv)
    expect(primera.created).toBe(1)

    const segunda = importarVinos(
      'id,name,winery,price,vintage\nid-fijo,Persistente Editado,Bodega X,45000,2020'
    )

    expect(segunda.created).toBe(0)
    expect(segunda.updated).toBe(1)
    expect(buscar('Persistente Editado')?.price).toBe(45000)
  })

  it('convierte "no" en inactivo en vez de darlo por activo', () => {
    // `Boolean("no")` da `true`. Sin la conversion, todo lo exportado como
    // inactivo volveria visible en la tienda al reimportar.
    importarVinos(
      csvComoElDelPanel([
        { ...mockWines[0], id: 'csv-oculto', name: 'Debe Ser Oculto', activo: false, stock: 3 }
      ])
    )

    const vino = buscar('Debe Ser Oculto')
    expect(vino?.activo).toBe(false)
    expect(vino?.stock).toBe(3)
  })

  it('parte una descripcion con comas sin correr las columnas', () => {
    // El parser con `split(',')` corria el precio una columna a la izquierda y
    // la fila se rechazaba entera.
    const resultado = importarVinos(
      'Nombre,Bodega,Cepa,Categoria,Cosecha,Precio,Stock,Activo,Descripcion\n' +
        'Vino Complicado,Bodega Comas,Blend,Tinto,2022,55000,2,si,"Ciruela, taninos, Oak"\n'
    )

    expect(resultado.errors).toHaveLength(0)
    expect(resultado.created).toBe(1)

    const vino = buscar('Vino Complicado')
    expect(vino?.description).toBe('Ciruela, taninos, Oak')
    expect(vino?.price).toBe(55000)
    expect(vino?.stock).toBe(2)
  })

  it('rechaza un archivo sin las columnas obligatorias y lo explica', () => {
    const resultado = importarVinos('ColumnaInventada,Otra\n1,2')

    expect(resultado.created).toBe(0)
    expect(resultado.errors[0].field).toBe('encabezado')
    expect(resultado.errors[0].message).toContain('obligatorias')
  })

  it('reporta el numero de fila real de cada error', () => {
    // La primera fila de datos es la 2 del archivo, porque la 1 es el
    // encabezado. Sin el desfasaje, el admin corrige la fila equivocada.
    const resultado = importarVinos(
      'name,winery,price,vintage\n' +
        'Bueno,Bodega A,10000,2020\n' +
        'SinPrecio,Bodega B,,2020\n' +
        'SinBodega,,50000,2020'
    )

    expect(resultado.created).toBe(1)
    expect(resultado.errors).toHaveLength(2)
    expect(resultado.errors[0].row).toBe(3)
    expect(resultado.errors[1].row).toBe(4)
  })

  it('importa las filas buenas aunque otras fallen', () => {
    // Un archivo con 500 filas donde 30 estan malas tiene que entrar igual. Si
    // una sola fila mala aborta todo, el usuario pierde 470 filas que eran
    // perfectamente validas.
    const resultado = importarVinos(
      'name,winery,price,vintage\n' +
        'Bueno 1,Bodega A,10000,2020\n' +
        'Malo,Bodega B,no-es-un-numero,2020\n' +
        'Bueno 2,Bodega C,20000,2021'
    )

    expect(resultado.created).toBe(2)
    expect(resultado.errors).toHaveLength(1)
    expect(buscar('Bueno 2')).toBeDefined()
  })

  it('el archivo que exporta el panel se reimporta sin perder datos', () => {
    const origen = mockWines.slice(0, 3)
    const texto = csvComoElDelPanel(origen)

    // Ida y vuelta: lo que sale del panel vuelve a entrar sin romper el
    // encabezado ni las descripciones con coma.
    const { encabezados, filas } = parsearCsv(texto)
    expect(encabezados).toEqual(ENCABEZADOS)
    expect(filas).toHaveLength(3)

    const resultado = importarVinos(texto)
    expect(resultado.errors).toHaveLength(0)
    expect(resultado.updated).toBe(3)
  })

  it('el precio se lee como numero y no como texto', () => {
    // Si quedara como string, la columna Precio de la tabla admin lo sumaria
    // concatenando y daria "4500045000".
    const resultado = importarVinos(
      'Nombre,Bodega,Cepa,Categoria,Cosecha,Precio,Stock,Activo,Descripcion\n' +
        'Precio Numerico,Bodega P,Malbec,Tinto,2021,45000,4,si,Sin signo\n'
    )

    expect(resultado.created).toBe(1)
    const vino = buscar('Precio Numerico')
    expect(typeof vino?.price).toBe('number')
    expect(vino?.price).toBe(45000)
    expect(vino?.vintage).toBe(2021)
  })

  it('avisa cuando el archivo esta vacio', () => {
    const resultado = importarVinos('')

    expect(resultado.created).toBe(0)
    expect(resultado.errors[0].row).toBe(0)
    expect(resultado.errors[0].field).toBe('archivo')
  })
})