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
 *     el deploy se da por fallido aunque la app este perfecta)
 *   - las migraciones con `prisma migrate dev`, que abre un prompt y cuelga el
 *     deploy, o `db push`, que deja de versionar el esquema
 *   - `prisma migrate deploy` sin la CLI `prisma` en la imagen: la etapa
 *     runner instala con `--omit=dev`, asi que el comando no existe ahi y el
 *     arranque falla sin aviso claro
 *   - una variable nueva en `env.ts` que nadie agrego a `.env.example`: el
 *     deploy falla en el arranque por un archivo que nadie abrio
 *   - un `COPY` del Dockerfile que apunta a un archivo que no existe: el
 *     build muere con `"/prisma": not found`, y como un build fallido deja
 *     sirviendo el deploy anterior con exito, no se ve que paso
 */

const RAIZ = join(__dirname, '..', '..', '..')

const leer = (ruta: string): string => readFileSync(join(RAIZ, ruta), 'utf8')
const leerJson = <T,>(ruta: string): T => JSON.parse(leer(ruta)) as T

const packageJson = leerJson<{ dependencies: Record<string, string>; devDependencies: Record<string, string>; scripts: Record<string, string> }>('backend/package.json')
const packageLock = leerJson<{ packages: Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }> }>('backend/package-lock.json')
const dockerfile = leer('Dockerfile')
const envSchema = leer('backend/src/config/env.ts')
const envExample = leer('backend/.env.example')
const gitignore = leer('.gitignore')

/** `tsconfig*.json` -> regex que matchea `tsconfig.scripts.json`. */
const coincideConGlob = (patron: string, archivo: string): boolean =>
  new RegExp(
    `^${patron.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
  ).test(archivo)

describe('donde vive el Dockerfile', () => {
  it('esta en la raiz del repo, no en backend/', () => {
    // Railway y Koyeb toman el **contexto de build** del "Root Directory", que
    // es un ajuste del panel. Ninguno de los dos deja declararlo en un
    // archivo: el schema de `railway.json` solo tiene `dockerfilePath`. Con el
    // Dockerfile en `backend/`, el contexto habia que ponerlo a mano en la UI.
    //
    // Y ahi se reseteo solo, tres veces: al renombrar el servicio y al recargar
    // el repo. Cada reset es silencioso: el contexto cae a la raiz, donde
    // `package.json`, `tsconfig.json` y `src/` existen **pero son los del
    // frontend**, asi que el build los copia sin quejarse y solo revienta
    // cuando llega a `prisma/`, que solo esta en `backend/`.
    //
    // Con el Dockerfile en la raiz, el contexto es la raiz por definicion y no
    // hay nada que configurar en ningun panel.
    expect(existsSync(join(RAIZ, 'Dockerfile'))).toBe(true)
    expect(existsSync(join(RAIZ, 'backend', 'Dockerfile'))).toBe(false)
  })

  it('docker-compose usa el contexto de la raiz', () => {
    // `build: ./backend` es la forma corta de decir "contexto = backend". Con
    // el Dockerfile movido, esa linea sola rompe el `docker compose up` local.
    const compose = leer('docker-compose.yml')

    expect(compose).not.toMatch(/build:\s*\.\/backend/)
    expect(compose).toMatch(/context:\s*\./)
  })
})

describe('lo que el Dockerfile copia', () => {
  // `COPY --from=builder ...` no lee del contexto: sale de otra etapa.
  const fuentes = [...dockerfile.matchAll(/^COPY\s+(.+)$/gm)]
    .map((m) => m[1] ?? '')
    .filter((linea) => !linea.startsWith('--from='))
    .map((linea) => linea.split(/\s+/)[0] ?? '')
    .filter(Boolean)

  /** Expande un patron de COPY contra el disco y devuelve lo que encuentra. */
  const resuelve = (patron: string): string[] => {
    const partes = patron.split('/')
    const archivo = partes.pop() ?? ''
    const directorio = join(RAIZ, ...partes)

    if (!partes.length || !existsSync(directorio)) return []

    return readdirSync(directorio).filter((n) => coincideConGlob(archivo, n))
  }

  it('cada COPY apunta a algo que existe en el repo', () => {
    // Este es el test que de verdad importa, y el que mas caro salio. Un
    // `COPY` a un path inexistente no falla al principio del build: falla
    // cuando Docker calcula el checksum de esa capa, al final, con
    //
    //   failed to compute cache key: ... "/prisma": not found
    //
    // y como un build fallido deja sirviendo el deploy anterior con exito,
    // desde afuera no se ve nada raro: /health da 200, la API responde, y lo
    // unico raro es que los cambios del repo no aplican.
    expect(fuentes.length).toBeGreaterThan(0)

    const inexistentes = fuentes.filter((patron) => resuelve(patron).length === 0)

    expect(inexistentes).toEqual([])
  })

  it('copia todos los tsconfig del backend, no solo tsconfig.json', () => {
    // `COPY backend/tsconfig.json ./` se lleva un archivo y deja afuera al
    // resto. Con `backend/tsconfig*.json ./` el patron cubre los que se
    // agreguen despues, sin acordarse de editar el Dockerfile.
    const configs = readdirSync(join(RAIZ, 'backend')).filter((n) => /^tsconfig.*\.json$/.test(n))

    expect(configs.length).toBeGreaterThan(1)

    const sinCopiar = configs.filter(
      (config) => !fuentes.some((patron) => resuelve(patron).includes(config))
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

  it('la etapa de runtime no instala devDependencies', () => {
    // Salvo `--include=optional`: `sharp` baja sus binarios en paquetes
    // opcionales y sin esto el contenedor no arranca (ver AGENTS.md).
    expect(dockerfile).toContain('npm ci --omit=dev --include=optional')
  })
})

describe('.dockerignore', () => {
  it('existe en la raiz', () => {
    // Sin el, el contexto de la raiz arrastra los `node_modules` del frontend
    // (384 MB) y los del backend (278 MB): 663 MB que se suben en cada build.
    expect(existsSync(join(RAIZ, '.dockerignore'))).toBe(true)
  })

  it('excluye node_modules', () => {
    expect(leer('.dockerignore')).toMatch(/node_modules/)
  })

  it('los archivos que existen en los dos lados van anclados a la raiz', () => {
    // Un patron sin barra inicial matchea en **cualquier** nivel, asi que un
    // `src` a secas tambien se lleva `backend/src` y el build se rompe sin
    // avisar. Esto aplica a los archivos que existen de los dos lados.
    //
    // `node_modules`, `dist` y `build` si van planos a proposito: esos
    // existen en cualquier nivel y hay que excluirlos en todos.
    const patrones = leer('.dockerignore')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))

    const compartidos = new Set([
      'src',
      'public',
      'index.html',
      'tsconfig.json',
      'tsconfig.node.json',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js'
    ])

    expect(patrones.filter((p) => compartidos.has(p))).toEqual([])
    expect(patrones).toContain('node_modules')
    expect(patrones).toContain('dist')
  })
})

describe('orden de arranque', () => {
  it('aplica las migraciones antes de levantar el server', () => {
    // Koyeb no tiene hook de predeploy. Correrlas en el arranque es lo que
    // hace imposible olvidarlas: si fueran un paso manual y se olvidaran,
    // /health haria `SELECT 1` (que no toca ninguna tabla), la base responderia
    // y el deploy pasaria como sano. La primera consulta real reventaria con
    // "relation does not exist".
    expect(packageJson.scripts.start).toBe('prisma migrate deploy && node dist/main.js')
  })

  it('las migraciones usan `migrate deploy`, nunca `migrate dev`', () => {
    // `migrate dev` abre un prompt interactivo. En un arranque eso es un
    // contenedor que se queda esperando una respuesta que nunca llega.
    expect(packageJson.scripts['db:deploy']).toBe('prisma migrate deploy')
  })

  it('el build no corre migraciones', () => {
    // Si el build las corre, una migracion falla el build y no se puede
    // desplegar aunque el codigo este bien.
    expect(packageJson.scripts.build).not.toContain('migrate')
  })

  it('la CLI de prisma esta en dependencies para que exista en la imagen', () => {
    // La etapa runner instala con `--omit=dev`. Con la CLI en devDependencies,
    // `prisma migrate deploy` dentro del contenedor es "prisma: not found" y
    // el contenedor no arranca nunca.
    expect(packageJson.dependencies.prisma).toBeDefined()
    expect(packageJson.devDependencies.prisma).toBeUndefined()
  })

  it('el healthcheck del Dockerfile es una ruta que existe', () => {
    // `/health` esta en la raiz: el prefijo `/api` es solo de los endpoints de
    // negocio. Con `/api/health` el deploy se da por fallido aunque la app
    // este perfecta.
    expect(leer('backend/src/modules/health/routes.ts')).toContain("'/health'")
  })
})

describe('comandos que se ejecutan dentro del contenedor', () => {
  // La etapa runner instala con `npm ci --omit=dev`. Cualquier comando que
  // corra ahi tiene que arrancar con `node` o con una CLI de `dependencies`.
  const ORDENES = ['start', 'db:deploy', 'seed']

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
    // el arranque era "prisma: not found". Con `tsx` en devDependencies, el
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
    expect(leer('backend/scripts/seed.ts')).not.toMatch(/from '\.\.\/src\//)
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

describe('package.json y lockfile', () => {
  it('coinciden', () => {
    // Mover la CLI de prisma de devDependencies a dependencies actualizo el
    // package.json pero no el lockfile, que la seguia listando en
    // devDependencies. El CI corre `npm ci`, que se niega a instalar si los dos
    // archivos no coinciden:
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

    expect(Object.keys(raizLock.dependencies ?? {}).sort()).toEqual(
      Object.keys(packageJson.dependencies).sort()
    )
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
    expect(exigidas.filter((v) => !envExample.includes(`${v}=`))).toEqual([])
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

  it('docker-compose declara STORAGE_PUBLIC_URL', () => {
    // 005/T1 la volvio obligatoria. `docker compose up` sin ella levanta un
    // contenedor que muere al importar `env.ts`, y el error apunta al schema
    // de zod, no al compose que se quedo sin la variable.
    expect(leer('docker-compose.yml')).toMatch(/STORAGE_PUBLIC_URL/)
  })
})
