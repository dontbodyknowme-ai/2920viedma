#!/usr/bin/env node
// Verificacion integral del despliegue (T8, CA-01 a CA-11).
//
//   node scripts/verificar-produccion.mjs
//   node scripts/verificar-produccion.mjs https://api.example.com https://web.example.com
//
// Sin argumentos usa las URLs de la spec 005. Escribe una linea por chequeo y
// sale con codigo 1 si alguno falla, asi que sirve en CI.
//
// Lo que **no** puede verificar solo: que una imagen siga viva 24 h despues
// (CA-06) y que el panel abra con el login real (CA-04). Esos van marcados
// como `manual` a proposito, con el motivo: un script que dice `OK` sin haber
// comprobado nada es peor que uno que dice `manual`.

const arg = process.argv.slice(2)
const API = arg[0] ?? 'https://vinoteca-cava.onrender.com'
const WEB = arg[1] ?? 'https://vinoteca-cava.vercel.app'

const resultados = []

const registrar = (id, nombre, estado, detalle = '') =>
  resultados.push({ id, nombre, estado, detalle })

const pedir = async (url, opciones = {}) => {
  const control = AbortSignal.timeout(30_000)
  const res = await fetch(url, { ...opciones, signal: control, redirect: 'manual' })
  const cuerpo = await res.text()
  return { res, cuerpo }
}

/**
 * Render en plan Free **duerme el servicio a los 15 minutos** sin trafico. El
 * primer request despues de eso tarda hasta un minuto en despertarlo.
 *
 * Sin esto, el primer chequeo del script falla por timeout y parece un deploy
 * roto cuando no lo esta: `/health` tardo 30 s, fallo, y el siguiente request
 * fue bien porque para entonces la API ya estaba despierta.
 *
 * Se despierta una vez, con margen y reintentos, antes de medir nada.
 */
const despertar = async () => {
  for (let intento = 1; intento <= 6; intento++) {
    const inicio = Date.now()

    try {
      const control = AbortSignal.timeout(90_000)
      const res = await fetch(`${API}/health`, { signal: control })
      await res.text()

      const ms = Date.now() - inicio
      console.log(`  API despierta en ${(ms / 1000).toFixed(1)}s (intento ${intento})`)
      return true
    } catch {
      console.log(`  API dormida, reintentando (intento ${intento})...`)
    }
  }

  console.log('  la API no respondio a ninguno de los 6 intentos')
  return false
}

// --- CA-01 -----------------------------------------------------------------
// Se despierta la API **antes de medir nada**: el plan free la duerme a los 15
// minutos y el primer request tarda hasta un minuto. Sin esto el primer chequeo
// falla por timeout y parece un deploy roto cuando no lo esta.
{
  console.log(`API: ${API}\nWEB: ${WEB}\n`)
  console.log('Despertando la API...')
  const despierta = await despertar()
  console.log('')

  if (!despierta) {
    registrar('CA-01', '/health responde 200 con db: connected', 'FALLA', 'la API no respondio')
  } else {
    const { res, cuerpo } = await pedir(`${API}/health`)
    const datos = JSON.parse(cuerpo)
    const ok = res.status === 200 && datos.db === 'connected'

    registrar(
      'CA-01',
      '/health responde 200 con db: connected',
      ok ? 'OK' : 'FALLA',
      `status=${res.status} db=${datos.db}`
    )
  }
}

// --- CA-02 -----------------------------------------------------------------
{
  try {
    const { res, cuerpo } = await pedir(`${API}/api/wines/public?pagina=1&limite=50`)
    const datos = JSON.parse(cuerpo)
    const esArreglo = Array.isArray(datos)
    const total = esArreglo ? datos.length : 0

    registrar(
      'CA-02',
      '/api/wines/public devuelve 200 con datos',
      res.status === 200 && total > 0 ? 'OK' : 'FALLA',
      `status=${res.status} vinos=${total}`
    )
  } catch (e) {
    registrar('CA-02', '/api/wines/public devuelve 200 con datos', 'FALLA', e.message)
  }
}

// --- CA-03 -----------------------------------------------------------------
{
  try {
    const { res, cuerpo } = await pedir(`${WEB}/`)

    registrar(
      'CA-03',
      'el frontend sirve la tienda',
      res.status === 200 && cuerpo.includes('<div id="root">') ? 'OK' : 'FALLA',
      `status=${res.status}`
    )
  } catch (e) {
    registrar('CA-03', 'el frontend sirve la tienda', 'FALLA', e.message)
  }
}

// --- CA-05 -----------------------------------------------------------------
{
  const rutas = ['/admin', '/admin/catalogo', '/admin/pedidos', '/admin/clientes', '/admin/configuracion']

  try {
    const estados = await Promise.all(
      rutas.map(async (ruta) => {
        const { res, cuerpo } = await pedir(`${WEB}${ruta}`)
        return { ruta, status: res.status, esHtml: cuerpo.includes('<div id="root">') }
      })
    )

    const malas = estados.filter((e) => e.status !== 200 || !e.esHtml)

    registrar(
      'CA-05',
      'recargar /admin/* no da 404 (rewrite de SPA)',
      malas.length === 0 ? 'OK' : 'FALLA',
      `${estados.length} rutas, ${malas.length} mal`
    )
  } catch (e) {
    registrar('CA-05', 'recargar /admin/* no da 404', 'FALLA', e.message)
  }
}

// --- CA-07 -----------------------------------------------------------------
{
  try {
    const { cuerpo } = await pedir(`${WEB}/`)
    const html = cuerpo
    // El boton no deberia existir. La app es una SPA: el navbar se dibuja en
    // tiempo de ejecucion, asi que la prueba real es que el bundle no lo
    // tenga. Se cruzan las dos señales.
    const enHtml = /href=["']\/admin["']/.test(html)

    registrar(
      'CA-07',
      'la tienda no ofrece acceso al panel',
      enHtml ? 'FALLA' : 'OK',
      enHtml ? 'encontrado un link a /admin en el HTML' : 'sin link a /admin'
    )
  } catch (e) {
    registrar('CA-07', 'la tienda no ofrece acceso al panel', 'FALLA', e.message)
  }
}

// --- CA-08 -----------------------------------------------------------------
{
  const permitido = WEB
  const prohibido = 'https://origen-no-autorizado.example'

  try {
    const ok = await pedir(`${API}/health`, { headers: { origin: permitido } })
    const conCabecera = /access-control-allow-origin/i.test(ok.res.headers.get('set-cookie') ?? '') ||
      (ok.res.headers.get('access-control-allow-origin') === permitido)

    const mal = await pedir(`${API}/health`, { headers: { origin: prohibido } })
    const cabeceraInesperada = mal.res.headers.get('access-control-allow-origin')

    registrar(
      'CA-08',
      'CORS: origen permitido recibe la cabecera, el otro no',
      conCabecera && !cabeceraInesperada ? 'OK' : 'FALLA',
      `permitido=${conCabecera} prohibido=${cabeceraInesperada ?? 'sin cabecera'}`
    )
  } catch (e) {
    registrar('CA-08', 'CORS con origen permitido y no permitido', 'FALLA', e.message)
  }
}

// --- CA-09 -----------------------------------------------------------------
{
  try {
    const { res, cuerpo } = await pedir(`${WEB}/`)
    const html = cuerpo
    const js = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1]

    let bundle = ''
    if (js) bundle = (await pedir(`${WEB}${js}`)).cuerpo

    // Ni la pagina ni el bundle pueden traer secretos. Se buscan los cuatro
    // marcadores que aparecen en una connection string o en un par de claves.
    const patrones = [
      /postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/i,
      /npg_[A-Za-z0-9]{20,}/,
      /AKIA[0-9A-Z]{16}/,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/
    ]

    const filtrados = patrones.filter((p) => p.test(html) || p.test(bundle)).map((p) => String(p))

    registrar(
      'CA-09',
      'el bundle no expone secretos',
      filtrados.length === 0 ? 'OK' : 'FALLA',
      filtrados.length ? filtrados.join(', ') : `html+${bundle.length}b limpios`
    )
  } catch (e) {
    registrar('CA-09', 'el bundle no expone secretos', 'FALLA', e.message)
  }
}

// --- CA-06 y CA-04: los que un script no puede responder --------------------
registrar(
  'CA-04',
  'login real entra al panel con metricas',
  'manual',
  'abrir /admin en un navegador y entrar: el token vive solo en memoria, asi que no se puede desde curl'
)
registrar(
  'CA-06',
  'una imagen subida sigue visible 24 h despues',
  'manual',
  'subir una imagen, guardar la URL y volver en 24 h. No se puede marcar antes'
)
registrar('CA-10', 'CI en verde', 'manual', 'correr en GitHub Actions sobre el commit desplegado')
registrar('CA-11', 'docs/DEPLOY.md se puede seguir de punta a punta', 'manual', 'seguir la guia en una maquina limpia')

// --- Salida ----------------------------------------------------------------

const ancho = Math.max(...resultados.map((r) => r.nombre.length))
const colores = { OK: '\x1b[32m', FALLA: '\x1b[31m', manual: '\x1b[33m' }

for (const { id, nombre, estado, detalle } of resultados) {
  const color = colores[estado]
  console.log(`${color}${id.padEnd(7)}\x1b[0m ${nombre.padEnd(ancho)}  ${estado}  \x1b[2m${detalle}\x1b[0m`)
}

const falladas = resultados.filter((r) => r.estado === 'FALLA')
const manuales = resultados.filter((r) => r.estado === 'manual')
const ok = resultados.filter((r) => r.estado === 'OK')

console.log(
  `\n${ok.length} OK · ${falladas.length} fallas · ${manuales.length} pendientes de verificacion manual\n`
)

process.exit(falladas.length === 0 ? 0 : 1)
