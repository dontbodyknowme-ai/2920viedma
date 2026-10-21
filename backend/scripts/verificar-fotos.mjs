/**
 * Verifica que **todas** las fotos del catalogo se puedan abrir.
 *
 * ## Por que hace falta
 *
 * Las fotos del catalogo de demostracion son URLs de Unsplash escritas a mano.
 * Escribir una a mano y probarla en el navegador da para 20; para 35 hay que
 * probarlas todas, y probarlas todas **cargandolas**: un `200` con una foto de
 * un apicultor no es una foto de cerveza.
 *
 * Y asi se llego a tener lo que hay hoy:
 *
 *   - **3 rotas de verdad** (404): los dos espumantes y las papas chips. En la
 *     grilla se ve el icono de imagen rota.
 *   - **2 del producto equivocado**: la "Cerveza Artesanal IPA" tenia una foto
 *     de un apicultor con su colmena, y el "Energizante 250ml" un grafico de
 *     pulgar arriba. Las dos cargan perfecto, asi que **ningun test de URLs las
 *     agarra**: un 200 es un 200, no importa lo que muestre.
 *
 * El primero es un error visible. El segundo es peor: una tienda con una foto de
 * un apicultor en la tarjeta de cerveza se ve como una tienda seria que todavia
 * no tiene las fotos.
 *
 * ## Que verifica, y que no
 *
 * **Si:** que cada URL responda y devuelva una imagen.
 *
 * **No:** que la foto sea *del* producto. Eso no se puede automatizar sin mirar,
 * y por eso este script esta pensado para correr acompanado de una mirada: la
 * tabla imprime la URL al lado del producto para que sean comparables de un
 * vistazo. Un check automatico de "parece una cerveza" seria falso positivo en
 * la mitad de los casos.
 *
 * **Por que no es un test de `npm test`:** necesita red. En `npm test` eso es
 * un test que falla cuando se cae internet, que no es informacion sobre el
 * codigo. Vive como script, corre a mano antes de compartir la tienda, y se
 * puede enganchar a un job con red.
 *
 * Uso:  node scripts/verificar-fotos.mjs   (desde backend/)
 * Sale con codigo 1 si alguna foto no responde.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
const CATALOGO = join(AQUI, '..', 'src', 'demo', 'catalogo.ts')

/**
 * Saca los pares `id` / `imageUrl` del catalogo.
 *
 * Se parsea el texto y no el modulo importado: `catalogo.ts` es TypeScript, y
 * este script es `.mjs` a proposito —igual que `verificar-storage.mjs`— para no
 * depender de `tsx` ni de que el proyecto este compilado.
 *
 * El emparejamiento va por **bloques**, no por posicion: se parte el archivo
 * donde empieza cada producto y se saca la `imageUrl` **de ese bloque**. Es la
 * misma leccion del parser de `coherencia_permisos.test.ts` (gotcha 30): si en
 * vez de esto se tomara la `n`-esima `imageUrl` y la `n`-esima `id` por separado,
 * un producto nuevo insertado en el medio moveria la foto de un producto al
 * informe del otro, y el script informaria como rota una foto que esta bien.
 */

/**
 * Las dos formas de escribir una foto, y como se arma la URL de cada una.
 *
 * `U('1506377247377-...')` es Unsplash: se le antepone el host y el `?auto=format`.
 * `W('0/06/Archivo.jpg/960px-Archivo.jpg')` es Wikimedia Commons: la ruta ya
 * viene completa y solo hay que anteponer el host de thumbnails.
 *
 * Y una tercera forma, pegada: `imageUrl: 'https://...'`, que se usa tal cual.
 *
 * El helper se lee del texto porque **la forma de la URL dice de donde sale**:
 * si el `W` se pierde, la ruta de Wikimedia se reconstruiria con el prefijo de
 * Unsplash y daria una imagen de otra cosa —o un 404— sin que nadie entienda
 * por que.
 */
const URL_DE_UNSPLASH = 'https://images.unsplash.com/photo-'
const URL_DE_WIKIMEDIA = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/'

const productosDelCatalogo = (fuente) => {
  const bloques = fuente.split(/\n  \{/).slice(1)
  const productos = []

  for (const bloque of bloques) {
    const id = /id:\s*'([^']+)'/.exec(bloque)?.[1]
    const nombre = /name:\s*'([^']+)'/.exec(bloque)?.[1]
    // Acepta las tres formas: `imageUrl: 'https://...'`, `imageUrl: U('1506377')`
    // y `imageUrl: W('0/06/Archivo.jpg/960px-Archivo.jpg')`. El catalogo usa las
    // dos ultimas, y son las que conviene: obligan a que **todas** las fotos
    // compartan el mismo prefijo y el mismo `q`. Pegadas a mano, una queda
    // con otro `q` y no se nota, o con otro ancho y se descarga el doble.
    const encontrado = /imageUrl:\s*(?:(U|W)\(\s*)?'([^']+)'/.exec(bloque)
    const helper = encontrado?.[1]
    const crudo = encontrado?.[2]

    if (id !== undefined && crudo !== undefined) {
      const url =
        helper === 'U'
          ? `${URL_DE_UNSPLASH}${crudo}?auto=format&fit=crop&q=80&w=800`
          : helper === 'W'
            ? `${URL_DE_WIKIMEDIA}${crudo}`
            : crudo

      productos.push({ id, nombre: nombre ?? id, url })
    }
  }

  return productos
}

/**
 * Una foto, en miniatura. Es para poder mirarla al lado del nombre.
 *
 * Para Unsplash achica el ancho con el `w=`. Para Wikimedia hay que cambiar el
 * prefijo del thumbnail: la URL es `.../960px-Archivo.jpg` y la miniatura es
 * `.../250px-Archivo.jpg`. Ojo: el ancho tiene que ser uno de los que
 * Wikimedia **ya tiene generado** — uno inventado responde **400**, no 404.
 */
const miniaturaDe = (url) => {
  if (url.includes('/wikipedia/commons/thumb/')) {
    return url.replace(/\/\d+px-/, '/250px-')
  }
  return url.replace(/&?w=\d+/, '&w=120').replace(/&?h=\d+/, '')
}

const comprobar = async (producto) => {
  // `w=64`: alcanza para que la plataforma responda y pesa nada. Poner `w=800`
  // descarga 34 imagenes completas para descubrir que una da 404.
  //
  // En Wikimedia el ancho va en la ruta (`/960px-`), asi que se cambia ahi. El
  // ancho chico que se usa es el **120px**, que existe para los tres archivos:
  // uno que Wikimedia todavia no genero responde 400 y parece un archivo roto.
  const probe = producto.url.includes('/wikipedia/commons/thumb/')
    ? producto.url.replace(/\/\d+px-/, '/120px-')
    : producto.url.replace(/&?w=\d+/, '&w=64')

  try {
    const respuesta = await fetch(probe, { redirect: 'follow' })

    if (!respuesta.ok) return { ...producto, estado: `HTTP ${respuesta.status}` }

    const tipo = respuesta.headers.get('content-type') ?? ''

    // Unsplash responde 200 con HTML en algunos casos de borde. Sin este chequeo
    // el script diria que la foto esta bien y el navegador mostraria un error.
    if (!tipo.startsWith('image/')) return { ...producto, estado: `no es imagen (${tipo})` }

    return { ...producto, estado: 'ok' }
  } catch (error) {
    return { ...producto, estado: `sin red (${error.name})` }
  }
}

const main = async () => {
  const fuente = readFileSync(CATALOGO, 'utf8')
  const productos = productosDelCatalogo(fuente)

  if (productos.length === 0) {
    console.error('No se encontro ningun producto en catalogo.ts. El parser se rompio.')
    process.exit(1)
  }

  console.log(`Comprobando ${productos.length} fotos del catalogo de demostracion\n`)

  const resultados = []

  // De a cinco: en paralelo son 35 requests de una y contra el mismo host eso es
  // pedir que te tiren la conexion.
  for (let i = 0; i < productos.length; i += 5) {
    const tanda = productos.slice(i, i + 5)
    resultados.push(...(await Promise.all(tanda.map(comprobar))))

    for (const resultado of resultados.slice(-tanda.length)) {
      const marca = resultado.estado === 'ok' ? ' ' : 'X'
      console.log(`${marca} ${resultado.id.padEnd(40)} ${resultado.estado}`)
      console.log(`    ${resultado.nombre}`)
      if (resultado.estado !== 'ok') console.log(`    ${resultado.url}`)
    }
  }

  const rotas = resultados.filter((r) => r.estado !== 'ok')
  const repetidas = resultados.filter(
    (r, i) => resultados.findIndex((otro) => otro.url === r.url) !== i
  )

  console.log('')

  if (repetidas.length > 0) {
    console.log(`ATENCION: ${repetidas.length} producto(s) comparten foto:`)
    for (const repetido of repetidas) console.log(`  ${repetido.id} -> ${repetido.url}`)
    console.log('')
  }

  if (rotas.length > 0) {
    console.log(`${rotas.length} foto(s) no cargan. En la tienda se ve el icono de imagen rota.`)
    console.log('Reemplazarlas por URLs de https://images.unsplash.com que devuelvan 200.')
    process.exit(1)
  }

  console.log(`Las ${resultados.length} fotos cargan.`)

  if (repetidas.length > 0) {
    console.log('')
    console.log('Falta revisarlas a ojo: una URL puede responder 200 y mostrar otra cosa.')
    for (const producto of productos) {
      console.log(`  ${producto.nombre.padEnd(40)} ${miniaturaDe(producto.url)}`)
    }
  }
}

main().catch((error) => {
  console.error('Error inesperado:', error)
  process.exit(1)
})
