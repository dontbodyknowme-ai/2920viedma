#!/usr/bin/env node
// Verifica que los tres usuarios del panel entren con SUS contrasenas.
//
//   npm run verificar:logins
//
// Es la contraparte de `npm run seed`: el seed escribe, esto comprueba. Un
// cambio de credenciales que se aplica a medias —el seed corrió pero contra
// otra base, o la variable no llegó— se ve aca y en ningun otro lado.
//
// **No imprime ningun valor.** Solo si cada login sirvio o no, y con que rol.
// El mensaje de error de la API tampoco se imprime: devuelve lo mismo para
// "ese usuario no existe" y "la contrasena no es", asi que no dice nada util
// y en un log compartido seria un oracle de usuarios validos.
//
// No usa `dotenv` a proposito: este script vive en la raiz del repo y
// `dotenv` es dependencia del backend. Parsear el `.env` son doce lineas y
// evita depender de la ubicacion de `node_modules`.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.argv[2] ?? 'https://vinoteca-cava.onrender.com'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RUTA_ENV = resolve(AQUI, '..', 'backend', '.env')

/** Lee un `KEY=valor` de un `.env`. Con CRLF hay que quitar el `\r`. */
const leerEnv = (clave) => {
  try {
    const texto = readFileSync(RUTA_ENV, 'utf8')
    const linea = texto.split(/\r?\n/).find((l) => l.trim().startsWith(`${clave}=`))
    return linea ? linea.slice(clave.length + 1).trim() : ''
  } catch {
    return ''
  }
}

const USUARIOS = [
  ['admin@vinoteca.local', leerEnv('SEED_ADMIN_PASSWORD'), 'admin'],
  ['gestor@vinoteca.local', leerEnv('SEED_GESTOR_PASSWORD'), 'gestor'],
  ['vendedor@vinoteca.local', leerEnv('SEED_VENDEDOR_PASSWORD'), 'vendedor']
]

console.log(`\nAPI: ${API}\n`)

const inicio = Date.now()

// El plan free duerme la API: hasta un minuto en el primer request.
await fetch(`${API}/health`, { signal: AbortSignal.timeout(90_000) })
console.log(`API despierta en ${((Date.now() - inicio) / 1000).toFixed(1)}s\n`)

let fallos = 0

for (const [email, clave, rolEsperado] of USUARIOS) {
  if (!clave) {
    console.log(`  ${email.padEnd(26)} SIN CONTRASENA en backend/.env`)
    fallos++
    continue
  }

  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: clave }),
    signal: AbortSignal.timeout(30_000)
  })

  const cuerpo = await res.json().catch(() => ({}))

  if (res.status === 200 && cuerpo.accessToken) {
    const rol = String(cuerpo.user?.role ?? '?')

    if (rol === rolEsperado) {
      console.log(`  ${email.padEnd(26)} 200  rol=${rol.padEnd(9)} nombre=${cuerpo.user?.name}`)
    } else {
      // Entra, pero con el rol que no es: el seed y la base no coinciden.
      console.log(`  ${email.padEnd(26)} 200  rol=${rol}  <-- esperaba ${rolEsperado}`)
      fallos++
    }
  } else {
    console.log(`  ${email.padEnd(26)} ${res.status}  ${cuerpo.code ?? 'sin codigo'}`)
    fallos++
  }
}

// Que no haya quedado una contrasena escrita en el fuente del seed.
const semilla = readFileSync(resolve(AQUI, '..', 'backend', 'scripts', 'seed.ts'), 'utf8')

if (/password:\s*['"][^'"]+['"]/.test(semilla)) {
  console.log('\n  ALERTA: hay una contrasena escrita en `backend/scripts/seed.ts`')
  fallos++
}

console.log(
  fallos === 0
    ? '\nLos tres usuarios entran con su propia contrasena.\n'
    : `\n${fallos} con problema.\n`
)

process.exit(fallos === 0 ? 0 : 1)
