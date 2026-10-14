import { readFileSync } from 'node:fs'

/**
 * Los chequeos de la spec 006 que se pueden verificar **contra produccion**
 * desde la linea de comandos.
 *
 * Los de la interfaz (V-01, V-02, V-04, V-05) no entran: la redireccion y el
 * filtro del sidebar pasan por React Router y no se ven en un `fetch`. Esos van
 * en navegador.
 *
 * Las contrasenas se leen de `backend/.env` con un parser propio y **no** con
 * `dotenv`: la dependencia vive en `backend/node_modules`, no en la raiz, y
 * traerla aca seria agregar un modulo al paquete del solo para leer tres lineas.
 * El parser es tambien el que no imprime nada.
 *
 * Acumula las cookies a mano porque el caso interesante es justo el de la
 * cookie: el `Set-Cookie` del refresh es `SameSite=None; Secure` en
 * `vinoteca-cava.onrender.com`, y sin cookie la sesion "no sobrevive al F5"
 * sin que se vea por que.
 */

const API = process.env.PUBLIC_API_URL ?? 'https://vinoteca-cava.onrender.com'

const leerClave = (variable) => {
  // El `.env` del backend, no el del front: las contrasenas viven ahi.
  const crudo = readFileSync('backend/.env', 'utf8')
  const linea = crudo.split(/\r?\n/).find((l) => l.startsWith(`${variable}=`))
  if (linea === undefined) throw new Error(`falta ${variable} en backend/.env`)
  return linea.slice(variable.length + 1).trim().replace(/^["']|["']$/g, '')
}

let jar = new Map()

const guardarCookies = (res) => {
  const crudos = res.headers.getSetCookie?.() ?? []
  for (const crudo of crudos) {
    const [par] = crudo.split(';')
    const [nombre, valor] = par.split('=')
    if (nombre.trim() === '') continue
    jar.set(nombre.trim(), valor ?? '')
  }
}

const pedir = async (path, { metodo = 'GET', token = null, cuerpo = null, usarJar = true } = {}) => {
  const cabeceras = {}
  if (cuerpo !== null) cabeceras['Content-Type'] = 'application/json'
  if (token !== null) cabeceras.Authorization = `Bearer ${token}`
  if (usarJar && jar.size > 0) {
    cabeceras.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  const res = await fetch(`${API}${path}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === null ? undefined : JSON.stringify(cuerpo),
    redirect: 'manual'
  })

  guardarCookies(res)
  return res
}

const resultados = []
const anotar = (id, texto, ok, detalle = '') => {
  resultados.push({ id, texto, ok, detalle })
}

const despertar = async () => {
  process.stdout.write('  despertando la API')
  const limite = Date.now() + 150_000
  while (Date.now() < limite) {
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(20_000) })
      if (res.ok) {
        const cuerpo = await res.json()
        console.log(` — lista (db: ${cuerpo.db})`)
        return cuerpo
      }
    } catch {
      process.stdout.write('.')
    }
    await new Promise((r) => setTimeout(r, 4000))
  }
  throw new Error('la API no desperto en 150 s')
}

const entrar = async (email, clave) => {
  jar = new Map()
  const res = await pedir('/api/auth/login', {
    metodo: 'POST',
    cuerpo: { email, password: clave }
  })
  if (!res.ok) throw new Error(`${email} -> ${res.status}`)
  const datos = await res.json()
  return { token: datos.accessToken, rol: datos.user.role, nombre: datos.user.name }
}

console.log(`\n  API: ${API}\n`)

const salud = await despertar()

// ---------------------------------------------------------------- V-03, V-06, V-07
const vendedor = await entrar('vendedor@vinoteca.local', leerClave('SEED_VENDEDOR_PASSWORD'))
const gestor = await entrar('gestor@vinoteca.local', leerClave('SEED_GESTOR_PASSWORD'))
const admin = await entrar('admin@vinoteca.local', leerClave('SEED_ADMIN_PASSWORD'))

console.log(`  las tres entradas dieron 200 (${vendedor.rol}, ${gestor.rol}, ${admin.rol})\n`)

const CATALOGO = '/api/wines'
const METRICS = '/api/metrics'
const ORDERS = '/api/orders'
const CUSTOMERS = '/api/customers'

// V-03: vendedor no entra al catalogo
const v03 = await pedir(CATALOGO, { token: vendedor.token })
anotar('V-03', `vendedor -> ${CATALOGO} da 403`, v03.status === 403, `dio ${v03.status}`)

// V-06: gestor no entra a las metricas  <-- el cambio de T4
const v06 = await pedir(METRICS, { token: gestor.token })
anotar('V-06', `gestor -> ${METRICS} da 403`, v06.status === 403, `dio ${v06.status} ${v06.status === 403 ? v06.headers.get('content-type') ?? '' : ''}`)

// V-07: admin entra a las metricas
const v07 = await pedir(METRICS, { token: admin.token })
let detalleV07 = `dio ${v07.status}`
if (v07.ok) {
  const cuerpo = await v07.json()
  detalleV07 = `${v07.status}, salesMonth=${cuerpo.salesMonth}`
  // El bug 11 de AGENTS.md: un `{ type: 'object' }` en el `response.schema`
  // devuelve `{}` con 200. Mirar la forma, no el status.
  if (Object.keys(cuerpo).length === 0) {
    detalleV07 += ' — VACIO: el schema esta cortando los datos'
  }
}
anotar('V-07', `admin -> ${METRICS} da 200 con datos`, v07.ok && v07.status === 200, detalleV07)

// Lo que la spec NO toca: el vendedor puede con los pedidos, y no con los clientes.
const pedOk = await pedir(ORDERS, { token: vendedor.token })
anotar('—', `vendedor -> ${ORDERS} da 200 (su trabajo)`, pedOk.status === 200, `dio ${pedOk.status}`)

const cli403 = await pedir(CUSTOMERS, { token: vendedor.token })
anotar('—', `vendedor -> ${CUSTOMERS} da 403`, cli403.status === 403, `dio ${cli403.status}`)

const catOk = await pedir(CATALOGO, { token: gestor.token })
anotar('—', `gestor -> ${CATALOGO} da 200 (sigue operando)`, catOk.status === 200, `dio ${catOk.status}`)

// ---------------------------------------------------------------- V-12 (lado API)
console.log('\n  --- V-12: contrasena incorrecta ---')
const malaClave = await pedir('/api/auth/login', {
  metodo: 'POST',
  cuerpo: { email: 'gestor@vinoteca.local', password: 'no-es-la-clave' }
})
const cuerpoMala = await malaClave.json()
anotar(
  'V-12',
  'login incorrecto -> 401 INVALID_CREDENTIALS',
  malaClave.status === 401 && cuerpoMala.code === 'INVALID_CREDENTIALS',
  `${malaClave.status} ${cuerpoMala.code ?? 'sin code'}`
)
console.log(`    status ${malaClave.status}, code "${cuerpoMala.code}", message "${cuerpoMala.message}"`)

// ---------------------------------------------------------------- V-13
console.log('\n  --- V-13: la sesion sobrevive al F5 (refresh por cookie) ---')

/**
 * Esto es lo que pasa al apretar F5, y **no** es "GET /api/auth/me con
 * cookie": el backend solo mira el header `Authorization`, asi que sin token
 * da 401 siempre. Lo que restaura la sesion es que el **cliente**, al recibir
 * ese 401, llame a `/api/auth/refresh` con la cookie. Si uno se saltea ese paso
 * y prueba `/api/auth/me` directo, esta midiendo el equivocado.
 */
const refresh = await pedir('/api/auth/refresh', { metodo: 'POST', usarJar: true })
let v13Ok = refresh.status === 200
let detalleV13 = `refresh dio ${refresh.status}`

let tokenRenovado = null
if (refresh.ok) {
  const datos = await refresh.json()
  tokenRenovado = datos.accessToken
  detalleV13 = `refresh 200, accessToken Renovado`

  const me = await pedir('/api/auth/me', { token: tokenRenovado, usarJar: false })
  if (me.status === 200) {
    const yo = await me.json()
    detalleV13 = `refresh 200 -> ${yo.email} (${yo.role})`
  } else {
    v13Ok = false
    detalleV13 = `refresh 200 pero /api/auth/me dio ${me.status}`
  }
} else {
  const cuerpo = await refresh.json().catch(() => ({}))
  detalleV13 = `refresh dio ${refresh.status} ${cuerpo.code ?? ''}`
}

anotar('V-13', 'el refresh por cookie restaura la sesion tras un F5', v13Ok, detalleV13)

// Sin cookie: tiene que ser 401, no un panel abierto.
jar = new Map()
const refreshSinCookie = await pedir('/api/auth/refresh', { metodo: 'POST', usarJar: false })
anotar(
  '—',
  'el refresh sin cookie da 401 (no hay sesion que renovar)',
  refreshSinCookie.status === 401,
  `dio ${refreshSinCookie.status}`
)

const meSinNada = await pedir('/api/auth/me', { token: null, usarJar: false })
anotar('—', 'GET /api/auth/me sin token ni cookie da 401', meSinNada.status === 401, `dio ${meSinNada.status}`)

// ---------------------------------------------------------------- salida
console.log('\n  ' + '-'.repeat(74))
let fallos = 0
for (const r of resultados) {
  if (!r.ok) fallos += 1
  console.log(`  ${r.ok ? 'OK  ' : 'FALLA'} ${r.id.padEnd(6)} ${r.texto}`)
  if (r.detalle) console.log(`       ${r.detalle}`)
}
console.log('  ' + '-'.repeat(74))

console.log(`\n  ${resultados.length - fallos}/${resultados.length} chequeos de API en verde`)
console.log(`  /health: ${salud.status}, db ${salud.db}\n`)

process.exit(fallos === 0 ? 0 : 1)
