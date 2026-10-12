/**
 * Verifica el rewrite de SPA de `vercel.json` contra el `dist/` real.
 *
 * Vercel NO es un servidor cualquiera: aplica **filesystem antes de
 * rewrites**. Si un archivo existe en `dist/` se sirve, y el rewrite a
 * `index.html` solo entra cuando no hay archivo. Por eso un catch-all no se
 * come los assets.
 *
 * Este script replica ese orden contra el build real para comprobar que:
 *   - `/admin` y sus subrutas devuelven el index (si no, recargar el panel da
 *     404: el bug de CE-05)
 *   - los assets se sirven como archivo, no como HTML
 *
 * No reemplaza al deploy real (eso es T7 de la spec 005), pero caza un rewrite
 * mal escrito sin esperar a tener una cuenta de Vercel.
 *
 * Uso: npm run build && node scripts/verificar-rewrite-spa.mjs
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = join(process.cwd(), 'dist')

const TIPOS = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
}

const existe = async (ruta) => {
  try {
    return (await stat(join(DIST, ruta))).isFile()
  } catch {
    return false
  }
}

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0]

  // 1. Filesystem primero: asi funciona Vercel.
  const relativo = url === '/' ? 'index.html' : url.slice(1)
  if (await existe(relativo)) {
    res.writeHead(200, { 'content-type': TIPOS[extname(relativo)] ?? 'application/octet-stream' })
    res.end(await readFile(join(DIST, relativo)))
    return
  }

  // 2. Despues entra el rewrite a index.html.
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end(await readFile(join(DIST, 'index.html')))
})

await new Promise((listo) => server.listen(4599, listo))

const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8')

/** El index de Vite es chico (~440 bytes); el umbral se calcula contra el real. */
const MIN_INDEX = Math.floor(indexHtml.length * 0.5)

const pedir = async (ruta) => {
  const r = await fetch(`http://localhost:4599${ruta}`)
  return { tipo: r.headers.get('content-type') ?? '', largo: (await r.text()).length }
}

const RUTAS_PANEL = [
  '/admin',
  '/admin/catalogo',
  '/admin/pedidos',
  '/admin/clientes',
  '/admin/configuracion'
]

let fallos = 0

console.log('--- rutas del panel: tienen que devolver el index, no 404 ---')
for (const ruta of RUTAS_PANEL) {
  const { tipo, largo } = await pedir(ruta)
  const ok = tipo.includes('text/html') && largo >= MIN_INDEX
  if (!ok) fallos++
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${ruta}  (${tipo}, ${largo} bytes)`)
}

console.log('\n--- assets: se sirven como archivo, no como HTML ---')
const assets = [...new Set([...indexHtml.matchAll(/\/assets\/[^"']+/g)].map((m) => m[0]))]
if (assets.length === 0) {
  console.log('FALLA  no hay assets referenciados en el index.html')
  fallos++
}
for (const asset of assets) {
  const { tipo, largo } = await pedir(asset)
  const ok = !tipo.includes('text/html') && largo > 0
  if (!ok) fallos++
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${asset}  (${tipo}, ${largo} bytes)`)
}

console.log('\n--- tienda ---')
for (const ruta of ['/', '/catalogo', '/contacto']) {
  const { tipo, largo } = await pedir(ruta)
  const ok = tipo.includes('text/html') && largo >= MIN_INDEX
  if (!ok) fallos++
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${ruta}  (${tipo}, ${largo} bytes)`)
}

server.close()

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLAS`)
process.exit(fallos === 0 ? 0 : 1)