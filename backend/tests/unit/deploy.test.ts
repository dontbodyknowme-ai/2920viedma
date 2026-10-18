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

  it('todo lo que los tsconfig declaran como entrada entra a la imagen', () => {
    // El bug del primer build en Render: el `Dockerfile` copiaba
    // `backend/src` pero no `backend/scripts`. `tsconfig.scripts.json` pide
    // `scripts/seed.ts`, asi que `tsc` se quedó sin ningun input:
    //
    //   error TS18003: No inputs were found in config file
    //   'tsconfig.scripts.json'
    //
    // El build entero moría por un archivo que no participa de la app: se
    // compila para el seed, que corre una vez a mano. Y el error no menciona
    // al seed, dice "no encontré archivos", como si el tsconfig estuviera mal.
    //
    // El test anterior ("cada COPY apunta a algo que existe") no lo agarra:
    // ese COPY faltaba, no apuntaba a algo inexistente. Lo que falta es
    // comprobar que entre **todo** lo que los tsconfig piden.
    const entradas = readdirSync(join(RAIZ, 'backend'))
      .filter((n) => /^tsconfig.*\.json$/.test(n))
      .flatMap((n) => leerJson<{ include?: string[] }>(`backend/${n}`).include ?? [])
      // `src/**/*` y `scripts/seed.ts` alcanzan con el primer segmento
      .map((patron) => patron.split('/').find((s) => !s.includes('*')) ?? '')

    expect(entradas.length).toBeGreaterThan(0)

    const sinCopiar = entradas.filter(
      (raiz) => !fuentes.some((patron) => resuelve(patron).includes(raiz))
    )

    expect(sinCopiar).toEqual([])
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
    // Compilado, el Dockerfile lo copia sin tocar nada mas:
    // `COPY --from=builder /app/dist ./dist`.
    expect(packageJson.scripts.seed).toContain('node dist/scripts/seed.js')
    expect(packageJson.scripts['seed:productos']).toBe('node dist/demo/seed.js')
    expect(packageJson.scripts.build).toContain('tsconfig.scripts.json')
  })

  it('todo script que apunte a dist tiene su fuente en algun tsconfig', () => {
    // `npm run seed` encadena dos scripts compilados. Si uno existiera en el
    // `package.json` pero en ninguno de los dos tsconfig, el `tsc` no lo
    // genera y el comando muere con "Cannot find module" **en produccion**, no
    // en el build: el build pasa igual porque compila lo que hay.
    //
    // Los dos tsconfig porque los dos compilan, cada uno a su carpeta:
    // `tsconfig.json` -> `src/` -> `dist/`, y `tsconfig.scripts.json` ->
    // `scripts/` -> `dist/scripts/`. Antes el catalogo vivia en `scripts/` y
    // alcanzaba con mirar el segundo; ahora vive en `src/` y hace falta el
    // primero tambien.
    const tsconfigSrc = leerJson<{ include: string[] }>('backend/tsconfig.json')
    const tsconfigScripts = leerJson<{ include: string[] }>('backend/tsconfig.scripts.json')

    // `src/**/*` alcanza para todo lo que cuelgue de `src/`. Se comprueba que
    // el glob siga ahi en vez de hardcodear la lista: cambiarlo a mano es
    // justamente lo que haria que esto pasara sin avisar.
    const incluyeSrc = (relativo: string): boolean =>
      tsconfigSrc.include.includes('src/**/*') && relativo.startsWith('src/')
    const incluyeScripts = (relativo: string): boolean =>
      tsconfigScripts.include.includes(relativo)

    const referenciados = Object.values(packageJson.scripts).flatMap((comando) =>
      [...comando.matchAll(/dist\/(?:scripts\/)?([\w-]+)\.js/g)].map((m) => m[1] ?? '')
    )

    expect(referenciados.length).toBeGreaterThan(1)

    const sinFuente = referenciados.filter(
      (nombre) =>
        !incluyeScripts(`scripts/${nombre}.ts`) && !incluyeSrc(`src/demo/${nombre}.ts`)
    )

    expect(sinFuente).toEqual([])
  })

  it('el catalogo de demostracion no se siembra desde scripts/', () => {
    // El arranque (`src/`) **no puede** importar de `scripts/`: `tsconfig.json`
    // tiene `rootDir: ./src`, asi que un import ahi no compila. Y al reves
    // tampoco, que es lo que fija el test de `scripts/seed.ts`.
    //
    // O sea que el catalogo de demostracion tiene que estar en `src/`, como
    // esta. Este test existe para que nadie lo mueva de vuelta creyendo que es
    // un script suelto: es codigo del arranque y corre en cada deploy.
    // Sin regex a proposito: el patron terminaria en `/`, que es el delimitador
    // del literal, y el archivo entero deja de parsear. `includes` dice lo mismo
    // y no tiene ese problema.
    expect(leer('backend/src/demo/bootstrap.ts')).toContain("from './catalogo.js'")
    expect(leer('backend/src/demo/catalogo.ts').includes('../scripts/')).toBe(false)
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

  it('las migraciones usan una conexion SIN pooler', () => {
    // Este bug costo el deploy entero dos veces. `migrate deploy` toma un
    // advisory lock de sesion; con PgBouncer en modo transaction (el pooler de
    // Neon), la conexion real vuelve al pool al terminar la transaccion **con
    // el lock puesto**. Queda `idle`, retenida, y el siguiente `migrate deploy`
    // no lo puede tomar:
    //
    //   Timed out trying to acquire a postgres advisory lock
    //   (SELECT pg_advisory_lock(72707369)). Elapsed: 10000ms.
    //
    // Como las migraciones corren en el arranque, el segundo deploy ya moria.
    // Y Render solo decia "Exited with status 1": el motivo estaba en el log
    // del runtime, no en el del build.
    //
    // `directUrl` es lo que separa las dos conexiones: la app usa la pooled
    // (`url`) y las migraciones la directa (`directUrl`).
    const schema = leer('backend/prisma/schema.prisma')
    const datasource = /datasource db \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? ''

    expect(datasource).toContain('url = env("DATABASE_URL")')
    expect(datasource).toContain('directUrl = env("DIRECT_URL")')
  })

  it('DIRECT_URL esta documentada y separada de DATABASE_URL', () => {
    // Una variable que el motor de migraciones lee directo del entorno, sin
    // pasar por `env.ts`: si falta, el fallo sale de Prisma y no dice que
    // variable falta.
    const linea = envExample.split('\n').find((l) => l.startsWith('DIRECT_URL='))
    expect(linea).toBeDefined()

    const database = envExample.split('\n').find((l) => l.startsWith('DATABASE_URL='))
    expect(linea).not.toBe(database)
  })

  it('docker-compose declara DIRECT_URL', () => {
    expect(leer('docker-compose.yml')).toMatch(/DIRECT_URL/)
  })

  it('el CI define todas las variables que el schema de Prisma exige', () => {
    // `prisma generate` y `prisma migrate` **validan** el datasource aunque no
    // se conecten a nada, y `directUrl = env("DIRECT_URL")` hace que la
    // variable tenga que existir. Agregarla al schema la obligo a declararla en
    // todas partes: `.env.example`, `docker-compose.yml`, Render... y el CI,
    // que es el que mas se olvida porque no tiene `.env` y nadie lo ve local.
    //
    // El costo real de olvidarlo: `Error: Environment variable not found:
    // DIRECT_URL` (P1012) en `Run migrations`, con el job **verde en el
    // frontend** y el backend en rojo. Se vio tres commits seguidos.
    const schema = leer('backend/prisma/schema.prisma')
    const exigidas = [...schema.matchAll(/env\("([A-Z_]+)"\)/g)].map((m) => m[1] ?? '')

    expect(exigidas).toContain('DATABASE_URL')
    expect(exigidas).toContain('DIRECT_URL')

    const workflow = leer('.github/workflows/ci.yml')

    // El job de backend es el que corre Prisma. El fragmento va de `backend:`
    // hasta `docker:`, que es donde empieza el job siguiente.
    const jobBackend = workflow.slice(
      workflow.indexOf('\n  backend:'),
      workflow.indexOf('\n  docker:')
    )

    const faltantes = exigidas.filter((v) => !new RegExp(`^\\s*${v}:`, 'm').test(jobBackend))

    expect(faltantes).toEqual([])
  })

  it('el CI construye la imagen desde la raiz', () => {
    // El `Dockerfile` esta en la raiz a proposito (el contexto tiene que ser la
    // raiz). Un `docker build ./backend` en el workflow no lo encuentra y el
    // job falla en el primer paso, que es facil de pasar por alto porque el
    // error dice "Dockerfile not found" y no "el contexto esta mal".
    const workflow = leer('.github/workflows/ci.yml')

    expect(workflow).toContain('docker build -t vinoteca-backend .')
    expect(workflow).not.toMatch(/docker build[^\n]*\.\/backend/)
  })

  it('el CI aplica migraciones con `migrate deploy`', () => {
    // `migrate dev` abre un prompt interactivo y crea una base sombra. En un
    // runner sin TTY eso se cuelga o falla por un motivo que no tiene nada que
    // ver con el codigo que se quiere probar.
    const workflow = leer('.github/workflows/ci.yml')

    expect(workflow).toContain('npm run db:deploy')
    expect(workflow).not.toContain('npm run db:migrate')
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
