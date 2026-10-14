/**
 * Sube una imagen real a la API de produccion y deja la URL registrada.
 *
 * Es el reloj de CA-06: la imagen tiene que seguir visible 24 h despues. Hoy
 * solo se puede **arrancar** el reloj; el ticks final es de manana.
 *
 * No imprime el accessToken en ningun momento.
 */

const API = process.argv[2] ?? 'https://vinoteca-cava.onrender.com'

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

console.log(`\n  upload ok`)
console.log(`  url:    ${url}`)
console.log(`  ahora:  ${ahora.toISOString()}`)
console.log(`  vence:  ${new Date(ahora.getTime() + 24 * 3600 * 1000).toISOString()}`)

// Que sirva de verdad ahora: si la URL publica no abre, el reloj no sirve.
const imagen = await fetch(url, { signal: AbortSignal.timeout(30_000) })
const bytes = Buffer.from(await imagen.arrayBuffer())

console.log(`\n  GET ${imagen.status}  ${imagen.headers.get('content-type')}  ${bytes.length}b`)

// Firma o caducidad: un `X-Amz-` o un `Expires` en la query seria la URL
// firmada que D-G vino a eliminar.
const conFirma = /[?&](X-Amz-|Expires=|Signature=)/i.test(url)
console.log(`  url con firma o caducidad: ${conFirma ? 'SI  <-- D-G roto' : 'no'}`)

console.log(`\nCA-06 queda armed. Re-verificar despues de las 24 h.`)
