/**
 * Lectura y escritura de CSV.
 *
 * No se usa `papa-parse`: la version aprovada por RNF-04 devuelve 404 en el
 * registry de este proyecto, asi que se usa la alternativa que el plan D-12 ya
 * preveia, escribir a mano con `Blob` y `URL.createObjectURL`.
 *
 * El parser es propio y no usa `split(',')`. Eso rompia con los valores que
 * llevan una coma dentro de comillas, que es exactamente el caso de una
 * descripcion de vino: `Vino tinto, con notas de frutos rojos` son dos columnas
 * para `split` y una para el parser.
 */

/** Una celda de CSV: el texto ya sin las comillas que lo envolvian. */
export type CeldaCsv = string

/** Una fila de CSV, ya separada en celdas. */
export type FilaCsv = CeldaCsv[]

/** Tabla completa: la primera fila son los encabezados. */
export interface TablaCsv {
  encabezados: FilaCsv
  filas: FilaCsv[]
}

/**
 * Escapa un valor para escribirlo en CSV.
 *
 * Envuelve entre comillas cuando el valor tiene coma, comilla doble, salto de
 * linea o espacios en los bordes, y duplica las comillas dobles del interior,
 * que es el escape que define RFC 4180.
 */
export const escaparCsv = (valor: unknown): string => {
  const texto = valor === null || valor === undefined ? '' : String(valor)

  const necesitaComillas =
    texto.includes(',') ||
    texto.includes('"') ||
    texto.includes('\n') ||
    texto.includes('\r') ||
    texto !== texto.trim()

  if (!necesitaComillas) return texto

  return `"${texto.replace(/"/g, '""')}"`
}

/**
 * Convierte filas en texto CSV, con encabezados.
 *
 * @param filas - Filas ya ordenadas, sin la de encabezados
 * @param encabezados - Los nombres de columna, en el mismo orden que las celdas de cada fila
 */
export const aTextoCsv = (filas: readonly FilaCsv[], encabezados: readonly string[]): string => {
  const lineas = [
    encabezados.map(escaparCsv).join(','),
    ...filas.map((fila) => fila.map(escaparCsv).join(','))
  ]
  // El BOM hace que Excel abra los acentos bien en Windows, que usa latin-1 por
  // defecto y si no convierte "Vino tinto" en "Vino tinto" con signos raros.
  return `\u{FEFF}${lineas.join('\r\n')}`
}

/**
 * Dispara la descarga de un CSV en el navegador.
 *
 * No hace nada en un entorno sin DOM. Los tests la invocan en jsdom, donde
 * `URL.createObjectURL` no existe, y ahi interesa el texto generado, no la
 * descarga.
 */
export const descargarCsv = (nombreArchivo: string, contenido: string): void => {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)

  URL.revokeObjectURL(url)
}

/**
 * Nombre de archivo con la fecha del dia, para que dos exportaciones del mismo
 * catalogo no se pisen.
 *
 * El dia se recibe por parametro y no se lee de `Date` adentro, para que el
 * nombre sea determinista en los tests. Es la misma regla que aplica la spec
 * 002 con `anioEnCurso`.
 */
export const nombreArchivoConFecha = (base: string, hoy: Date): string =>
  `${base}_${hoy.toISOString().slice(0, 10)}.csv`

/**
 * Parsea texto CSV en una tabla de encabezados y filas.
 *
 * Maneja lo que un export desde el panel produce: comillas dobles, comas
 * dentro de comillas, CRLF y LF, y la ultima linea sin salto final.
 *
 * Las filas que tienen menos celdas que los encabezados se rellenan con cadena
 * vacia, y las que tienen mas se les recortan las sobrantes. Sin eso, una fila
 * corta haria que `Object.fromEntries` devolviera `undefined` en vez de `''` y
 * un filtro compararia contra `undefined`.
 */
export const parsearCsv = (texto: string): TablaCsv => {
  const limpio = texto.replace(/^\uFEFF/, '')
  if (limpio.trim() === '') return { encabezados: [], filas: [] }

  const filas: FilaCsv[] = []
  let celda = ''
  let fila: FilaCsv = []
  let dentroDeComillas = false

  const cerrarCelda = (): void => {
    fila.push(celda)
    celda = ''
  }

  const cerrarFila = (): void => {
    cerrarCelda()
    // Se descarta la fila vacia del final, que aparece cuando el archivo
    // termina con un salto de linea.
    if (fila.length > 1 || fila[0] !== '') filas.push(fila)
    fila = []
  }

  for (let i = 0; i < limpio.length; i++) {
    const caracter = limpio[i]

    if (dentroDeComillas) {
      if (caracter === '"') {
        // Comilla doble escapada: "" dentro de una cadena acotada es un ".
        if (limpio[i + 1] === '"') {
          celda += '"'
          i++
        } else {
          dentroDeComillas = false
        }
      } else {
        celda += caracter
      }
      continue
    }

    if (caracter === '"') {
      dentroDeComillas = true
    } else if (caracter === ',') {
      cerrarCelda()
    } else if (caracter === '\r') {
      // El \r del CRLF se ignora: el \n siguiente cierra la fila.
    } else if (caracter === '\n') {
      cerrarFila()
    } else {
      celda += caracter
    }
  }

  // Lo que quede sin cerrar, para un archivo sin salto de linea final.
  if (celda !== '' || fila.length > 0) cerrarFila()

  const [encabezados = [], ...resto] = filas
  const columnas = encabezados.length

  const normalizadas = resto.map((valores) => {
    if (valores.length >= columnas) return valores.slice(0, columnas)
    return [...valores, ...Array<string>(columnas - valores.length).fill('')]
  })

  return { encabezados, filas: normalizadas }
}

/**
 * Parsea CSV a objetos, usando la primera fila como nombres de clave.
 *
 * Es la forma en que se consumen los datos: una fila por objeto, con una clave
 * por encabezado.
 */
export const parsearCsvComoObjetos = <T,>(texto: string): T[] => {
  const { encabezados, filas } = parsearCsv(texto)
  if (encabezados.length === 0) return []

  return filas.map((fila) => {
    const registro: Record<string, string> = {}
    encabezados.forEach((encabezado, indice) => {
      registro[encabezado.trim()] = fila[indice]
    })
    return registro as T
  })
}

/** Une filas y encabezados y dispara la descarga. Atajo de las tres operaciones. */
export const exportarCsv = (
  filas: readonly FilaCsv[],
  encabezados: readonly string[],
  nombreArchivo: string
): void => descargarCsv(nombreArchivo, aTextoCsv(filas, encabezados))
