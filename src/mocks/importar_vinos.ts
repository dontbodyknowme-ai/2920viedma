import { parsearCsv, type FilaCsv } from '../utils/csv'
import type { ImportResult } from '../types/admin'
import { mockWines } from './data'
import { vinoDesdeCuerpo } from './vino_schema'

/**
 * Importacion de CSV sobre el catalogo mock.
 *
 * Vive en su propio modulo, y no dentro de `handlers.ts`, por dos razones: los
 * tests la pueden llamar directo sin levantar un servidor MSW (bajo jsdom,
 * `fetch` de undici no lo intercepta), y asi queda claro que es logica de
 * negocio y no un detalle del transporte HTTP.
 *
 * **Acepta encabezados en espanol y en ingles.** El boton Exportar del panel
 * escribe `Nombre,Bodega,Precio,...`, asi que aceptar solo `name,winery,price`
 * haria fallar el ciclo exportar -> reimportar con un error de encabezado que
 * no le diria al admin que el archivo lo genero el propio panel.
 */

/**
 * Importa el texto de un CSV al catalogo mock.
 *
 * Muta `mockWines` a proposito: el handler HTTP la llama y despues el GET
 * `/api/wines` tiene que devolver lo recien importado, que es como funciona de
 * verdad un backend con memoria.
 */
export const importarVinos = (texto: string): ImportResult => {
  const resultado: ImportResult = { created: 0, updated: 0, errors: [] }
  const { encabezados, filas } = parsearCsv(texto)

  if (encabezados.length === 0) {
    resultado.errors.push({ row: 0, field: 'archivo', message: 'El archivo esta vacio' })
    return resultado
  }

  // Cada columna se busca por una lista de alias, no por un nombre unico.
  const columna = (...alias: string[]): number =>
    encabezados.findIndex((h) => alias.includes(h.trim().toLowerCase()))

  // Un indice negativo significa columna ausente, y ahi se pasa `undefined` en
  // vez de `''`: una columna presente y vacia es un dato vacio; una columna
  // ausente es un dato que el archivo no trae.
  const leer = (fila: FilaCsv, indice: number): string | undefined =>
    indice < 0 ? undefined : fila[indice]

  const indiceNombre = columna('name', 'nombre')
  const indiceBodega = columna('winery', 'bodega')
  const indicePrecio = columna('price', 'precio')
  const indiceCepa = columna('varietal', 'cepa')
  const indiceCategoria = columna('category', 'categoria')
  const indiceCosecha = columna('vintage', 'cosecha')
  const indiceStock = columna('stock')
  const indiceActivo = columna('activo', 'active')
  const indiceDescripcion = columna('description', 'descripcion')
  const indiceImagen = columna('imageurl', 'imagen')
  const indiceId = columna('id')

  if (indiceNombre === -1 || indiceBodega === -1 || indicePrecio === -1) {
    resultado.errors.push({
      row: 1,
      field: 'encabezado',
      message:
        'Faltan las columnas obligatorias: nombre, bodega y precio (o name, winery, price)'
    })
    return resultado
  }

  filas.forEach((fila, indice) => {
    // +2 porque la fila 1 del archivo es el encabezado: sin el desfasaje, el
    // admin corregiria la fila equivocada del archivo.
    const numeroFila = indice + 2

    const id = leer(fila, indiceId)
    const varietal = leer(fila, indiceCepa)
    const categoria = leer(fila, indiceCategoria)
    const cosecha = leer(fila, indiceCosecha)
    const stock = leer(fila, indiceStock)
    const descripcion = leer(fila, indiceDescripcion)
    const imagen = leer(fila, indiceImagen)

    // El export escribe `activo` como "si"/"no". Sin esta conversion,
    // `Boolean("no")` da `true` y todo lo exportado como inactivo volveria
    // visible en la tienda.
    const textoActivo = leer(fila, indiceActivo)
    const activo =
      textoActivo === undefined
        ? undefined
        : ['si', 'sí', 'yes', 'true', '1'].includes(textoActivo.trim().toLowerCase())

    const candidato = vinoDesdeCuerpo({
      ...(id !== undefined && { id }),
      name: leer(fila, indiceNombre),
      winery: leer(fila, indiceBodega),
      price: leer(fila, indicePrecio),
      ...(varietal !== undefined && { varietal }),
      ...(categoria !== undefined && { category: categoria }),
      ...(cosecha !== undefined && { vintage: cosecha }),
      ...(stock !== undefined && { stock }),
      ...(descripcion !== undefined && { description: descripcion }),
      ...(imagen !== undefined && { imageUrl: imagen }),
      ...(activo !== undefined && { activo })
    })

    if (candidato === null) {
      resultado.errors.push({
        row: numeroFila,
        field: 'price',
        message: 'Nombre, bodega y precio mayor que cero son obligatorios'
      })
      return
    }

    const existente = mockWines.find((vino) => vino.id === candidato.id)
    if (existente !== undefined) {
      Object.assign(existente, candidato)
      resultado.updated += 1
    } else {
      mockWines.push(candidato)
      resultado.created += 1
    }
  })

  return resultado
}