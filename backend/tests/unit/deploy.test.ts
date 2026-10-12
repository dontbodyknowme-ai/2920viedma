import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
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