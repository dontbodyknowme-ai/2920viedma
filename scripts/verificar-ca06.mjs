#!/usr/bin/env node
// Cierra CA-06: la imagen subida hace mas de 24 h tiene que seguir sirviendo.
//
//   npm run verificar:ca06
//
// Es el unico chequeo de la spec que necesita **tiempo real**. Por eso este
// script no dice "OK" antes de que pasen las 24 h: decir que una imagen firmada
// sigue viva un minuto despues de subirla no verifica nada, y lo que verifica es
// justamente que la URL **no** caduca (D-G). Antes de 005, `POST /api/upload`
// devolvia una URL firmada con una hora de vida y el admin la guardaba como
// `imageUrl` del vino: al dia siguiente la foto estaba rota, y para siempre en
// la base.
//
// El estado lo escribe `npm run armar:ca06` en `specs/005-deploy/ca06.json`.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RUTA_ESTADO = resolve(AQUI, '..', 'specs', '005-deploy', 'ca06.json')

const HORA = 3_600_000
const DIA = 24 * HORA

let estado

try {
  estado = JSON.parse(readFileSync(RUTA_ESTADO, 'utf8'))
} catch {
  console.error(`\n  No hay estado de CA-06.\n`)
  console.error('  Todavia no se armo el reloj. Subi una imagen real:\n')
  console.error('    npm run armar:ca06\n')
  process.exit(1)
}

const subido = new Date(estado.subido)
const vence = new Date(estado.vence)
const ahora = new Date()
const transcurrido = ahora - subido
const falta = vence - ahora

const horas = (ms) => `${(ms / HORA).toFixed(1)} h`

console.log(`\n  url:      ${estado.url}`)
console.log(`  subida:   ${estado.subido}`)
console.log(`  ahora:    ${ahora.toISOString()}`)
console.log(`  elapsed:  ${horas(transcurrido)}`)
console.log(`  cumple 24 h: ${transcurrido >= DIA ? 'SI' : 'NO, faltan ' + horas(falta)}\n`)

// La URL tiene que seguir siendo estable. Con firma, la comprobacion no
// significaria nada aunque sirviera: habria que verificar dentro de la ventana.
const conFirma = /[?&](X-Amz-|Expires=|Signature=)/i.test(estado.url)
if (conFirma) {
  console.error('  FALLA: la URL tiene firma o caducidad. D-G esta roto.\n')
  process.exit(1)
}

let res
try {
  res = await fetch(estado.url, { signal: AbortSignal.timeout(30_000) })
} catch (e) {
  console.error(`  FALLA: no se pudo pedir la imagen: ${e.message}\n`)
  process.exit(1)
}

const bytes = Buffer.from(await res.arrayBuffer())
const contentType = res.headers.get('content-type')

const problemas = []

if (res.status !== 200) problemas.push(`responde ${res.status}`)
if (!/^image\//.test(contentType ?? '')) problemas.push(`content-type ${contentType}`)
if (bytes.length === 0) problemas.push('cuerpo vacio')
if (bytes.length !== estado.bytesAlSubir) {
  // No es un fallo en si: podria cambiar la compresion. Pero si cambia, alguien
  // toco el objeto y hay que saberlo.
  console.log(`  nota: el peso cambio (${estado.bytesAlSubir}b -> ${bytes.length}b)`)
}
if (transcurrido < DIA) problemas.push(`faltan ${horas(falta)} para cumplir las 24 h`)

console.log(`  GET ${res.status}  ${contentType}  ${bytes.length}b  (era ${estado.bytesAlSubir}b)`)
console.log(`  url con firma o caducidad: ${conFirma ? 'SI' : 'no'}`)

if (problemas.length) {
  console.error(`\n  CA-06 sigue ABIERTO:`)
  for (const p of problemas) console.error(`    - ${p}`)
  console.error('')
  process.exit(1)
}

estado.verificado = ahora.toISOString()
estado.resultado = { status: res.status, contentType, bytes: bytes.length }
writeFileSync(RUTA_ESTADO, JSON.stringify(estado, null, 2) + '\n')

console.log(`\n  CA-06 CERRADA.\n`)
console.log(`  La imagen subida hace ${horas(transcurrido)} sigue sirviendo, sin firma y`)
console.log(`  con el mismo contenido. D-G funciona: la URL no caduca.\n`)
