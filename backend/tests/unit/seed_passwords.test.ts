import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Las contrasenas del seed no pueden estar en el repo.
 *
 * `scripts/seed.ts` esta commiteado. Una contrasena escrita ahi queda en texto
 * plano **y en el historial de git para siempre**, aunque despues la borres:
 * `git log -p` la devuelve siempre. Por eso se leen de `SEED_*_PASSWORD`, el
 * mismo patron que ya usan `DATABASE_URL` y `JWT_SECRET`.
 *
 * Estos tests miran **el repo entero**, no solo el seed. Un solo archivo con la
 * clave adentro, o una constante con otro nombre, o un `.env.example` con el
 * valor de verdad puesto, los agarra igual.
 */

const RAIZ = join(__dirname, '..', '..', '..')

const leer = (ruta: string): string => readFileSync(join(RAIZ, ruta), 'utf8')

const RUTAS_DE_CODIGO = [
  'backend/scripts/seed.ts',
  'backend/scripts/seed-productos.ts',
  'backend/src/config/env.ts',
  'backend/tests/unit/deploy.test.ts'
]

describe('contrasenas del seed', () => {
  it('el seed las lee del entorno, no de constantes', () => {
    const fuente = leer('backend/scripts/seed.ts')

    for (const variable of [
      'SEED_ADMIN_PASSWORD',
      'SEED_GESTOR_PASSWORD',
      'SEED_VENDEDOR_PASSWORD'
    ]) {
      expect(fuente, variable).toContain(variable)
    }
  })

  it('las tres claves salen de leerClave(), y solo de ahi', () => {
    // Este es el test que de verdad importa, y el primero que escribi **no
    // cubria**: buscaba `password: 'algo'` y el fallo real se cuela como
    // `clave: { valor: 'algo', esDev: false }`. Un test que dice cubrir algo
    // que no cubre es peor que no tener test, porque manda a revisar lo que ya
    // esta bien.
    //
    // La forma correcta es **estructural**: cada entrada de `users` tiene que
    // leer su clave *exactamente* con `leerClave('SEED_..._PASSWORD')`. Cualquier
    // otra forma —una constante, un literal, un valor pegado a mano— no matchea.
    const fuente = leer('backend/scripts/seed.ts')
    const claves = [...fuente.matchAll(/clave:\s*([^\n]+?),?\s*$/gm)].map((m) =>
      (m[1] ?? '').trim()
    )

    expect(claves).toHaveLength(3)

    for (const expresion of claves) {
      expect(expresion, `no lee del entorno: ${expresion}`).toMatch(
        /^leerClave\('SEED_(ADMIN|GESTOR|VENDEDOR)_PASSWORD'\)$/
      )
    }
  })

  it('no hay hashes pegados a mano en el seed', () => {
    // Un `$2b$10$...` pegado en el fuente es una contrasena en texto plano con
    // pasos extra para adivinarla. Aqui si se puede buscar un patron exacto,
    // porque no hay falsos positivos posibles.
    expect(leer('backend/scripts/seed.ts')).not.toMatch(/\$2[aby]\$[0-9]{2}\$/)
  })

  it('el seed no imprime contrasenas', () => {
    // Antes imprimia las tres al terminar. Con tres distintas, ese log es un
    // volcado de credenciales en la consola de quien lo corre, y esa consola
    // queda en el historial de quien ejecuto el comando.
    const fuente = leer('backend/scripts/seed.ts')

    expect(fuente).not.toMatch(/console\.log\([^)]*clave\.valor/)
    expect(fuente).toContain('No se imprimen las contrasenas')
  })

  it('.env.example las documenta vacias', () => {
    // Documentadas y secretas. Con el valor de verdad puesto, el ejemplo
    // deja de ser un ejemplo y pasa a ser la contrasena de produccion.
    //
    // El `replace(/\r\n/g)` no es cosmetico: el archivo tiene CRLF y
    // `split('\n')` deja un `\r` colgando en cada linea, lo que hace fallar el
    // `toBe` contra un archivo perfectamente correcto.
    const ejemplo = leer('backend/.env.example').replace(/\r\n/g, '\n')

    for (const variable of [
      'SEED_ADMIN_PASSWORD',
      'SEED_GESTOR_PASSWORD',
      'SEED_VENDEDOR_PASSWORD'
    ]) {
      const linea = ejemplo.split('\n').find((l) => l.trim() === `${variable}=`)

      expect(linea, `${variable} deberia estar en .env.example`).toBeDefined()
    }
  })

  it('la clave de desarrollo solo aparece en el seed y aca', () => {
    // Si `admin123` aparece en otro lado del codigo, es que alguien la copio.
    // El unico otro lugar admisible es este test, que la necesita para probar
    // que el fallback avisa.
    for (const ruta of RUTAS_DE_CODIGO) {
      if (ruta === 'backend/scripts/seed.ts') continue

      expect(leer(ruta), `admin123 aparecio en ${ruta}`).not.toContain('admin123')
    }
  })

  it('el seed avisa cuando cae en la clave de desarrollo', () => {
    // Sin el aviso, seedear por error contra una base real crea tres usuarios
    // con `admin123` y no dice nada. El fallo es silencioso por construccion.
    const fuente = leer('backend/scripts/seed.ts')

    expect(fuente).toContain('esDev')
    expect(fuente).toContain('CLAVE_DEV')
  })

  it('el seed carga el .env explicitamente', () => {
    // Antes no hacia falta: `@prisma/client` cargaba el `.env` de su cuenta
    // al inicializarse y las variables aparecian en `process.env` por el
    // camino largo. Ese accidente se rompe el dia que el seed deje de usar
    // Prisma, y las contrasenas desaparecen sin avisar.
    expect(leer('backend/scripts/seed.ts')).toContain("import 'dotenv/config'")
  })

  it('el seed no cambia la contrasena de un usuario existente', () => {
    // Volver a correr el seed no es una decision de cambiar credenciales.
    // Cambiar el hash a mano borra el acceso de quien se creo la cuenta.
    const fuente = leer('backend/scripts/seed.ts')

    const update = /update:\s*\{([^}]*)\}/.exec(fuente)?.[1] ?? ''

    expect(update).not.toContain('passwordHash')
  })
})
