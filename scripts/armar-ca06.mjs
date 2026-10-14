/**
 * Sube una imagen real a la API de produccion y deja el reloj anotado.
 *
 * Es el reloj de CA-06: la imagen tiene que seguir visible 24 h despues. Este
 * script solo puede **arrancar** el reloj; cerrarlo es `npm run verificar:ca06`,
 * que se niega a dar por buena una comprobacion hecha antes de las 24 h.
 *
 * El estado queda en `specs/005-deploy/ca06.json` para que el cierre no
 * dependa de que alguien recuerde una URL que nadie copio.
 *
 * No imprime el accessToken en ningun momento.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.argv[2] ?? 'https://vinoteca-cava.onrender.com'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RUTA_ESTADO = resolve(AQUI, '..', 'specs', '005-deploy', 'ca06.json')

const USUARIO = 'admin@vinoteca.local'
const CLAVE = 'admin123'

// PNG de 1x1. El backend lo convierte a WebP con sharp, asi que el formato de
// entrada no importa: lo que se verifica es que la URL devuelta sirva la
// imagen **ya convertida** y sin firma.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const pedir = async (url, opciones = {}) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000), ...opciones })
  const texto = await res.text()
  let json
  try {
    json = JSON.parse(texto)
  } catch {
    json = undefined
  }
  return { res, json, texto }
}

const { res: login, json: sesion } = await pedir(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: USUARIO, password: CLAVE })
})

if (login.status !== 200 || !sesion?.accessToken) {
  console.error(`login fallo: HTTP ${login.status}`)
  process.exit(1)
}

console.log(`login ok  (rol: ${sesion.user?.role ?? '?'})`)

const form = new FormData()
form.append('file', new Blob([PNG_1x1], { type: 'image/png' }), 'ca06-reloj.png')

const { res: subida, json: resultado } = await pedir(`${API}/api/upload`, {
  method: 'POST',
  headers: { authorization: `Bearer ${sesion.accessToken}` },
  body: form
})

if (subida.status !== 201 || !resultado?.url) {
  console.error(`upload fallo: HTTP ${subida.status} ${subida.texto.slice(0, 200)}`)
  process.exit(1)
}

const url = resultado.url
const ahora = new Date()
const vence = new Date(ahora.getTime() + 24 * 3600 * 1000)

console.log(`\n  upload ok`)
console.log(`  url:    ${url}`)
console.log(`  ahora:  ${ahora.toISOString()}`)
console.log(`  vence:  ${vence.toISOString()}`)

// Que sirva de verdad ahora: si la URL publica no abre, el reloj no sirve.
const imagen = await fetch(url, { signal: AbortSignal.timeout(30_000) })
const bytes = Buffer.from(await imagen.arrayBuffer())

console.log(`\n  GET ${imagen.status}  ${imagen.headers.get('content-type')}  ${bytes.length}b`)

// Firma o caducidad: un `X-Amz-` o un `Expires` en la query seria la URL
// firmada que D-G vino a eliminar.
const conFirma = /[?&](X-Amz-|Expires=|Signature=)/i.test(url)
console.log(`  url con firma o caducidad: ${conFirma ? 'SI  <-- D-G roto' : 'no'}`)

// El estado queda anotado para que `verificar:ca06` sepa qué revisar y cuándo.
// Sin esto, cerrar CA-06 depende de que alguien recuerde una URL que nadie
// copió: y un chequeo que depende de la memoria es un chequeo que no se hace.
const estado = {
  url,
  subido: ahora.toISOString(),
  vence: vence.toISOString(),
  contentTypeAlSubir: imagen.headers.get('content-type'),
  bytesAlSubir: bytes.length,
  conFirmaAlSubir: conFirma
}

mkdirSync(dirname(RUTA_ESTADO), { recursive: true })
writeFileSync(RUTA_ESTADO, JSON.stringify(estado, null, 2) + '\n')

console.log(`\n  estado guardado en ${RUTA_ESTADO}`)
console.log(`\nCA-06 queda armado. Para cerrarlo, despues de las 24 h:`)
console.log(`\n  npm run verificar:ca06\n`)
