import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * La configuracion de deploy tiene que ser coherente.
 *
 * Cada test de aca tapa un modo de fallo que **no aparece en desarrollo** y
 * que en produccion se descubre tarde, cuando el deploy quedo a medio hacer:
 *
 *   - el healthcheck apuntando a `/api/health`, que no existe (devuelve 404 y
 *     Railway da el deploy por fallido aunque la app este perfecta)
 *   - las migraciones con `prisma migrate dev`, que abre un prompt y cuelga el
 *     deploy, o `db push`, que deja de versionar el esquema
 *   - `prisma migrate deploy` sin la CLI `prisma` en la imagen: la etapa
 *     runner instala con `--omit=dev`, asi que el comando no existe ahi y el
 *     predeploy falla sin aviso claro
 *   - una variable nueva en `env.ts` que nadie agrego a `.env.example`: el
 *     deploy falla en el arranque por un archivo que nadie abrio
 */

const RAIZ = join(__dirname, '..', '..', '..')

const leer = (ruta: string): string => readFileSync(join(RAIZ, ruta), 'utf8')
const leerJson = <T,>(ruta: string): T => JSON.parse(leer(ruta)) as T

interface RailwayConfig {
  build: { builder: string; dockerfilePath: string }
  deploy: {
    predeployCommand?: string
    startCommand?: string
    healthcheckPath?: string
    restartPolicyType?: string
  }
}

const packageJson = leerJson<{ dependencies: Record<string, string>; devDependencies: Record<string, string>; scripts: Record<string, string> }>('backend/package.json')
const packageLock = leerJson<{ packages: Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }> }>('backend/package-lock.json')
const railway = leerJson<RailwayConfig>('railway.json')
const dockerfile = leer('backend/Dockerfile')
const envSchema = leer('backend/src/config/env.ts')
const envExample = leer('backend/.env.example')
const gitignore = leer('.gitignore')

describe('configuracion de deploy en Railway', () => {
  it('construye desde el Dockerfile del backend', () => {
    expect(railway.build.builder).toBe('DOCKERFILE')
    expect(railway.build.dockerfilePath).toBe('backend/Dockerfile')
  })

  it('el healthcheck apunta a /health y no a /api/health', () => {
    // CE-02: `/api/health` no existe. El prefijo `/api` es solo de los
    // endpoints de negocio; el de salud esta en la raiz.
    expect(railway.deploy.healthcheckPath).toBe('/health')
  })

  it('aplica las migraciones antes de arrancar', () => {
    expect(railway.deploy.predeployCommand).toBe('npm run db:deploy')
    expect(railway.deploy.startCommand).toBe('npm run start')
  })

  it('las migraciones usan `migrate deploy`, nunca `migrate dev`', () => {
    // D-B: `migrate dev` abre un prompt interactivo. En un deploy eso es un
    // deploy que se queda esperando una respuesta que nunca llega.
    expect(packageJson.scripts['db:deploy']).toBe('prisma migrate deploy')
  })

  it('la CLI de prisma esta en dependencies para que el predeploy exista', () => {
    // La etapa runner instala con `--omit=dev`. Con la CLI en devDependencies,
    // `npm run db:deploy` dentro del contenedor es "prisma: not found".
    expect(packageJson.dependencies.prisma).toBeDefined()
    expect(packageJson.devDependencies.prisma).toBeUndefined()
  })

  it('package.json y package-lock.json coinciden', () => {
    // Este test SI existed y no lo agarro: `package.json` ya tenia la CLI en
    // `dependencies`, pero el lockfile la seguia listando en
    // `devDependencies`. Localmente `npm install` lo acomodaba solo; en CI
    // corre `npm ci`, que se niega a instalar si no coinciden:
    //
    //   npm ci can only install packages when your package.json and
    //   package-lock.json are in sync
    //
    // y el job muere en 36 segundos, antes de compilar nada. Un `npm install`
    // de rutina en la maquina de uno tapa el problema y lo descubre el CI.
    const raizLock = packageLock.packages['']

    expect(raizLock.dependencies?.prisma).toBe(packageJson.dependencies.prisma)
    expect(raizLock.devDependencies?.prisma ?? undefined).toBe(
      packageJson.devDependencies?.prisma ?? undefined
    )
  })

  it('las dependencias del lock son las mismas que las de package.json', () => {
    const raizLock = packageLock.packages['']
    const iguales =
      JSON.stringify(Object.keys(raizLock.dependencies ?? {}).sort()) ===
      JSON.stringify(Object.keys(packageJson.dependencies).sort())

    expect(iguales).toBe(true)
  })

  it('el Dockerfile no corre migraciones por su cuenta', () => {
    // Si el build las corre, una migracion falla el build y no se puede
    // desplegar aunque el codigo este bien. Las migraciones son del predeploy.
    expect(dockerfile).not.toContain('migrate dev')
    expect(dockerfile).not.toContain('migrate deploy')
    expect(dockerfile).not.toContain('db push')
  })

  it('la etapa de runtime no instala devDependencies', () => {
    // Salvo `--include=optional`: `sharp` baja sus binarios en paquetes
    // opcionales y sin esto el contenedor no arranca (ver AGENTS.md).
    expect(dockerfile).toContain('npm ci --omit=dev --include=optional')
  })
})

describe('comandos que se ejecutan dentro del contenedor', () => {
  // La etapa runner instala con `npm ci --omit=dev`. Cualquier comando que
  // corra ahi tiene que arrancar con `node` o con una CLI de `dependencies`.
  // Estas son las ordenes que Railway ejecuta dentro de la imagen:
  //   predeploy  -> db:deploy
  //   arranque   -> start
  //   una vez    -> seed  (Settings -> Custom Command)
  const ORDENES = ['db:deploy', 'start', 'seed']

  /** Devuelve el binario con el que arranca un script, resolviendo `npm run`. */
  const binario = (comando: string, profundidad = 0): string => {
    if (profundidad > 5) return comando

    const partes = comando.trim().split(/\s+/)

    if (partes[0] === 'npm' && partes[1] === 'run' && partes[2]) {
      return binario(packageJson.scripts[partes[2]] ?? '', profundidad + 1)
    }

    return partes[0] === 'node' ? 'node' : partes[0]
  }

  it('ninguno arranca con una herramienta de devDependencies', () => {
    // Este bug ya costo dos deploys. Con la CLI de prisma en devDependencies,
    // el predeploy era "prisma: not found". Con `tsx` en devDependencies, el
    // seed era "tsx: not found": el comando manual que se usa una sola vez
    // para crear los usuarios admin es justamente el que nadie prueba, y por
    // eso es el que se descubre tarde.
    const desarrollo = Object.keys(packageJson.devDependencies)

    const culpables = ORDENES
      .map((nombre) => ({ nombre, binario: binario(packageJson.scripts[nombre]) }))
      .filter(({ binario: b }) => desarrollo.includes(b))

    expect(culpables).toEqual([])
  })

  it('el seed se compila, no se interpreta con tsx', () => {
    // Compilado a `dist/scripts/seed.js`, el Dockerfile lo copia sin tocar
    // nada mas: `COPY --from=builder /app/dist ./dist`.
    expect(packageJson.scripts.seed).toBe('node dist/scripts/seed.js')
    expect(packageJson.scripts.build).toContain('tsconfig.scripts.json')
  })

  it('el seed compilado no importa codigo que solo exista en el repo', () => {
    // El contenedor tiene `dist/`, no `src/`. Un import de `../src/...` en el
    // seed compila bien en local (tsx resuelve el fuente) y revienta en el
    // contenedor con "Cannot find module". Por eso el import de `env` en
    // seed.ts, que ademas estaba sin usar, rompia el seed en produccion.
    const fuente = leer('backend/scripts/seed.ts')

    expect(fuente).not.toMatch(/from '\.\.\/src\//)
  })

  it('tsconfig.scripts.json existe y compila solo scripts', () => {
    const tsconfigScripts = leerJson<{
      include: string[]
      compilerOptions: { rootDir: string; outDir: string }
    }>('backend/tsconfig.scripts.json')

    expect(tsconfigScripts.include).toContain('scripts/seed.ts')
    expect(tsconfigScripts.compilerOptions.outDir).toBe('./dist/scripts')
  })
})

describe('lo que el Dockerfile copia', () => {
  /** `tsconfig*.json` -> regex que matchea `tsconfig.scripts.json`. */
  const coincideConGlob = (patron: string, archivo: string): boolean => {
    const rx = new RegExp(
      `^${patron.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
    )
    return rx.test(archivo)
  }

  const fuentes = [...dockerfile.matchAll(/^COPY\s+(\S+)/gm)].map((m) => m[1] ?? '')

  it('copia todos los tsconfig del proyecto, no solo tsconfig.json', () => {
    // `COPY tsconfig.json ./` se lleva un archivo y deja afuera al resto. Con
    // `COPY tsconfig*.json ./` el patron cubre los que se agreguen despues.
    //
    // El sintoma de este bug fue el mas confuso del deploy: el build falla,
    // Railway no levanta la imagen nueva y sigue sirviendo la anterior "con
    // exito". Todo parece andar bien y lo unico raro es que un cambio del
    // repo no aplica. Por eso el test compara contra los archivos que existen,
    // y no contra una lista escrita a mano que se actualiza sola.
    const configs = readdirSync(join(RAIZ, 'backend')).filter((n) => /^tsconfig.*\.json$/.test(n))

    expect(configs.length).toBeGreaterThan(1)

    const sinCopiar = configs.filter(
      (config) => !fuentes.some((patron) => coincideConGlob(patron, config))
    )

    expect(sinCopiar).toEqual([])
  })

  it('cada tsconfig que invoca el build existe en el repo', () => {
    const referenciados = [...packageJson.scripts.build.matchAll(/-p\s+(\S+)/g)].map((m) => m[1] ?? '')

    expect(referenciados.length).toBeGreaterThan(1)

    for (const config of referenciados) {
      expect(existsSync(join(RAIZ, 'backend', config))).toBe(true)
    }
  })

  it('el build produce el seed compilado que el contenedor va a correr', () => {
    // `npm run seed` apunta a `dist/scripts/seed.js`. Si el build dejara de
    // generarlo, el contenedor arrancaria bien y solo fallaria el seed: el
    // unico sintoma seria "tsx: not found" o "Cannot find module", sin nada
    // raro en el arranque.
    expect(packageJson.scripts.build).toContain('tsconfig.scripts.json')
    expect(packageJson.scripts.seed).toBe('node dist/scripts/seed.js')
  })
})

describe('variables de entorno', () => {
  const exigidas = [...envSchema.matchAll(/^\s{2}([A-Z_]+):\s*z\./gm)].map((m) => m[1])

  it('el esquema declara variables', () => {
    expect(exigidas.length).toBeGreaterThan(10)
  })

  it('toda variable del esquema esta en .env.example', () => {
    // Una variable nueva sin documentar es un deploy que falla en el arranque
    // por un archivo que nadie abrio.
    const faltan = exigidas.filter((v) => !envExample.includes(`${v}=`))
    expect(faltan).toEqual([])
  })

  it('.env.example marca las variables secretas', () => {
    for (const secreta of ['JWT_SECRET', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY', 'DATABASE_URL']) {
      const linea = envExample.split('\n').find((l) => l.startsWith(`${secreta}=`))
      expect(linea, `${secreta} deberia estar en .env.example`).toBeDefined()
    }
    expect(envExample).toMatch(/SECRET[AS]/i)
  })

  it('.env no se commitea', () => {
    expect(gitignore).toMatch(/^\.env$/m)
  })
})