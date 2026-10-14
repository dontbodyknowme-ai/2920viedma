# ---- Build stage ----
#
# **Este Dockerfile vive en la raiz del repo, no en `backend/`.** Es a proposito:
# Railway y Koyeb toman el **contexto de build** del "Root Directory", que es un
# ajuste del panel. Ninguno de los dos permite declararlo en el archivo de
# configuracion (el schema de `railway.json` solo tiene `dockerfilePath`), asi
# que con el Dockerfile en `backend/` el contexto tinha que estar puesto a mano
# en la UI. Y ahi paso lo que paso: el ajuste se reseteo al renombrar el servicio
# y al recargar el repo, tres veces, cada vez en silencio.
#
# Un contexto en la raiz sin querer trae `package.json`, `tsconfig.json` y `src/`
# **del frontend**, que existen en los dos lados. El build los copia sin
# quejarse y recien revienta cuando llega a `prisma/`, que solo existe en
# `backend/`:
#
#   failed to compute cache key: ... "/prisma": not found
#
# Con el Dockerfile en la raiz, el contexto es la raiz por definicion y no hay
# nada que configurar. Los paths de `backend/` van explicitos en cada COPY.
FROM node:24-slim AS builder

# `openssl` va **aca tambien**, no solo en la etapa runner. `prisma generate`
# detecta la version de OpenSSL mirando el sistema para decidir que engine
# bajar; sin el paquete instalado asume la 1.1 y genera
# `libquery_engine-debian-openssl-1.1.x.so.node`, mientras que node:24-slim
# corre con OpenSSL 3. El resultado es un contenedor que no encuentra su engine:
#
#   Prisma Client could not locate the Query Engine for runtime
#   "debian-openssl-3.0.x"
#
# Es un fallo invisible: el build pasa y solo revienta en el arranque.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Placeholders para que `prisma generate` pueda **validar** el schema.
#
# `generate` no se conecta a la base, pero lee y valida el datasource, y
# `directUrl = env("DIRECT_URL")` hace que la variable tenga que existir. Sin
# esto el build muere con:
#
#   error: Environment variable not found: DIRECT_URL.   (P1012)
#
# Solo viven en la etapa builder: la runner no hereda este `ENV`, asi que en
# produccion mandan las variables de verdad y estos no llegan a la imagen final.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# `COPY package*.json` primero para que `npm ci` se cachee y no se repita en
# cada cambio de codigo. El `*.json` agarra el lockfile tambien: si faltara,
# `npm ci` se niega a instalar.
COPY backend/package*.json ./
RUN npm ci

COPY backend/prisma ./prisma/
RUN npx prisma generate

# `tsconfig*.json` y no `tsconfig.json`: el build corre dos compilaciones,
# `tsconfig.json` para `src/` y `tsconfig.scripts.json` para el seed. Copiar
# solo el primero dejaba al segundo fuera de la imagen y `npm run build` moria
# con "File 'tsconfig.scripts.json' not found".
#
# Y el fallo era invisible: el build fallaba, el proveedor de deploy NO
# levantaba la imagen nueva y seguia sirviendo la anterior con exito. Todo
# parecia andar bien y lo unico raro era que los cambios del repo no aplicaban.
COPY backend/tsconfig*.json ./
COPY backend/src ./src/

# `scripts/` tambien entra, y no es opcional: `tsconfig.scripts.json` compila
# `scripts/seed.ts` a `dist/scripts/seed.js`, que es lo que corre `npm run seed`
# en el contenedor. Sin este COPY, `tsc -p tsconfig.scripts.json` se queda sin
# ningun input y falla:
#
#   error TS18003: No inputs were found in config file 'tsconfig.scripts.json'
#
# O sea: el build entero muere por un archivo que ni se estaba compilando para
# la app, y el error no menciona al seed.
COPY backend/scripts ./scripts/

RUN npm run build

# ---- Runtime stage ----
FROM node:24-slim AS runner

# `openssl` y `ca-certificates` los necesita el engine de Prisma para hablar
# TLS con la base, y `curl` esta para el healthcheck. `openssl` tambien esta en
# la etapa builder: `prisma generate` lo necesita para detectar la version
# correcta (ver arriba).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# `--include=optional` NO es opcional (juego de palabras). `sharp` trae sus
# binarios en paquetes opcionales por plataforma (`@img/sharp-linux-x64` y
# `@img/sharp-libvips-linux-x64`). Con `--omit=dev` a secas npm instala el
# primero y **se saltea el segundo**, y el modulo revienta al cargarlo:
#
#   Error: Could not load the "sharp" module using the linux-x64 runtime
#   ERR_DLOPEN_FAILED: libvips-cpp.so.42: cannot open shared object file
#
# Sin `sharp` el backend no levanta, porque las rutas de upload lo importan al
# arrancar. Es lo que recomienda la documentacion de sharp.
COPY backend/package*.json ./
RUN npm ci --omit=dev --include=optional

# El Prisma Client se copia desde la etapa builder: en la runner se instalo con
# `--omit=dev` y sin el paquete `@prisma/client` no queda nada que generar.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Las migraciones se aplican en el predeploy (`prisma migrate deploy`), que
# corre en esta imagen: sin el schema aca, no hay nada que aplicar.
COPY backend/prisma ./prisma/

# `dist/` incluye `dist/scripts/seed.js`: el seed se compila en el build para no
# depender de `tsx`, que es devDependency y no existe en esta imagen.
COPY --from=builder /app/dist ./dist

USER node

# Las migraciones se aplican **antes de arrancar**, en el CMD y no en un
# predeploy: Koyeb no tiene hook de predeploy y `railway.json` ya no esta (se
# migro de plataforma). Ver `backend/package.json` -> `start`.
#
# Se corre en cada arranque, no solo en el deploy, y eso es deliberado. La
# alternativa era acordarse de correr `npm run db:deploy` a mano antes de cada
# despliegue, y el costo de olvidarse es **invisible**: `/health` hace
# `SELECT 1`, que no toca ninguna tabla, asi que la base respondiendo con las
# tablas sin crear pasa el healthcheck. El deploy queda "sano" y la primera
# consulta real revienta con "relation does not exist".
#
# Es seguro correrlo en cada arranque: `prisma migrate deploy` toma un advisory
# lock, asi que dos reinicios simultaneos no se pisan. Y si falla, el proceso
# sale con codigo distinto de cero en vez de arrancar medio migrado.
CMD ["sh", "-c", "npm run start"]
