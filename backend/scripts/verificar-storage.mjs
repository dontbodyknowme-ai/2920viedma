/**
 * Verifica el storage (T5 de la spec 005).
 *
 * Hay dos cosas que hay que comprobar y que fallan de formas distintas:
 *
 *   1. **Las credenciales sirven.** Si el par access/secret esta mal, el
 *      backend no falla al arrancar (solo valida que la variable exista) sino
 *      cuando el admin sube la primera imagen, en produccion.
 *
 *   2. **La URL publica se puede abrir desde el navegador.** Es lo que
 *      corresponde a CE-04: sin CORS configurado en el bucket, la imagen se
 *      guarda bien pero el `<img>` del navegador no la muestra. Y el upload
 *      "sale bien", asi que el fallo aparece tarde y parece otro.
 *
 * Uso:  node scripts/verificar-storage.mjs   (desde backend/)
 * Lee STORAGE_* de backend/.env. Sale con codigo 1 si algo falla, para poder
 * engancharlo en la guia o en un chequeo previo al deploy.
 *
 * Vive en `backend/scripts/` y no en `scripts/` de la raiz porque el SDK de S3
 * (`@aws-sdk/client-s3`) esta en `backend/node_modules`. Importado desde la
 * raiz, `import` lo resolveria y el script no arrancaria.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const AQUI = dirname(fileURLToPath(import.meta.url))

// ---- Config desde backend/.env ----
// El archivo puede venir con CRLF (asi lo deja PowerShell en Windows), asi que
// se saca el `\r` antes de comparar. Sin esto, el valor arrastra el CR y la
// comparacion falla.
const leerEnv = (ruta) => {
  const texto = readFileSync(ruta, 'utf8')
  const env = {}
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const m = limpia.match(/^([A-Z_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const env = leerEnv(join(AQUI, '..', '.env'))

const REQUERIDAS = [
  'STORAGE_ENDPOINT',
  'STORAGE_REGION',
  'STORAGE_BUCKET',
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'STORAGE_PUBLIC_URL'
]

// Origen del FRONTEND. Es el que va en `AllowedOrigins` del bucket, y el
// unico que sirve para probar el CORS: el backend (puerto 3000) no es un
// origen, y un dominio inventado no esta en la politica, asi que el CORS
// deniega correctamente y el chequeo daria un falso negativo.
const origenFrontend = env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

const faltan = REQUERIDAS.filter((v) => !env[v])
if (faltan.length > 0) {
  console.error(`Faltan variables en backend/.env: ${faltan.join(', ')}`)
  process.exit(1)
}

const s3 = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY
  }
})

/** PNG de 1x1: alcanza para probar el circuito completo. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const clave = `wines/_verificacion-${Date.now()}.png`
let fallos = 0

const ok = (titulo) => console.log(`OK    ${titulo}`)
const falla = (titulo, detalle) => {
  fallos++
  console.log(`FALLA ${titulo}${detalle ? `\n        ${detalle}` : ''}`)
}

console.log('--- 1. Credenciales: se puede escribir en el bucket ---')
try {
  await s3.send(new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: clave,
    Body: PNG,
    ContentType: 'image/png'
  }))
  ok(`se escribio ${clave} en ${env.STORAGE_BUCKET}`)
} catch (error) {
  // `AccessDenied` (403) y `SignatureDoesNotMatch` (403) son dos problemas
  // distintos y el mensaje de R2 es el mismo para los dos: "Access Denied".
  // La diferencia importa: la firma mal puesta se arregla recopiando la key,
  // y el permiso mal puesto cambiando el token.
  if (error.name === 'SignatureDoesNotMatch') {
    falla(
      'la firma no cuadra con las credenciales',
      'el Secret Access Key esta mal copiado o tiene espacios'
    )
    console.log('\nRevisar STORAGE_SECRET_KEY: un caracter de mas o de menos y falla esto.')
  } else if (error.name === 'AccessDenied') {
    // Se comprueba si al menos puede LEER. Si puede, el token es valido y lo
    // que falta es permiso de escritura, que es el caso mas comun.
    let puedeLeer = false
    try {
      await s3.send(new ListObjectsV2Command({ Bucket: env.STORAGE_BUCKET, MaxKeys: 1 }))
      puedeLeer = true
    } catch { /* tampoco puede leer: el token no aplica a este bucket */ }

    if (puedeLeer) {
      falla(
        'el token puede LEER pero no ESCRIBIR',
        'se creo con permisos "Object Read" en vez de "Object Read & Write"'
      )
      console.log('\nEn Cloudflare: Manage R2 API Tokens -> Editar o crear el token.')
      console.log('Permissions: Object Read & Write. Bucket: solo wine-images.')
    } else {
      falla('el token no aplica a este bucket', `Bucket: ${env.STORAGE_BUCKET}`)
      console.log('\nRevisar que el token tenga ese bucket en su alcance, o que el nombre este bien.')
    }
  } else {
    falla('no se pudo escribir en el bucket', String(error.message).split('\n').slice(0, 3).join(' '))
  }
  process.exit(1)
}

console.log('\n--- 2. La URL publica se abre desde el navegador ---')
const url = `${env.STORAGE_PUBLIC_URL.replace(/\/+$/, '')}/${clave}`

try {
  const r = await fetch(url)
  if (!r.ok) {
    falla(`la URL publica responde ${r.status}`, url)
    console.log(`\nRevisar que el bucket tenga lectura publica habilitada (paso 1.2 de DEPLOY.md)`)
  } else {
    ok(`responde ${r.status} ${r.headers.get('content-type') ?? ''}`)
  }

  const origen = origenFrontend
  const conCors = await fetch(url, { headers: { Origin: origen } })
  const allow = conCors.headers.get('access-control-allow-origin')
  if (allow) {
    ok(`CORS responde ${allow}`)
    if (allow !== '*' && allow !== origen) {
      falla(`CORS permite ${allow}, no ${origen}`, 'va a bloquear el <img> del frontend')
    }
  } else {
    falla('la URL publica no devuelve Access-Control-Allow-Origin', 'el <img> del navegador no va a cargar')
    console.log(`\nRevisar la politica CORS del bucket (paso 1.3 de DEPLOY.md).`)
    console.log(`El origen que tiene que estar permitido es: ${origen}`)
  }
} catch (error) {
  falla('no se pudo abrir la URL publica', String(error.message).split('\n')[0])
}

console.log('\n--- 3. Limpieza ---')
try {
  await s3.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: clave }))
  ok('objeto de prueba borrado')
} catch (error) {
  console.log(`AVISO no se pudo borrar ${clave}: ${String(error.message).split('\n')[0]}`)
}

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLAS`)
process.exit(fallos === 0 ? 0 : 1)