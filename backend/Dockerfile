# ---- Build stage ----
# Node 24 LTS. `sharp` y `@prisma/client` piden >=22; con Node 20 la
# instalacion del image falla en `npm ci`.
#
# **Debian slim, no Alpine.** En Alpine el build pasaba (la imagen se armaba
# bien) pero el contenedor no arrancaba nunca:
#
#   PrismaClientInitializationError: Unable to require
#   libquery_engine-linux-musl.so.node
#   Error loading shared library libssl.so.1.1: No such file or directory
#
# Alpine usa musl con OpenSSL 3 y el engine de Prisma pide OpenSSL 1.1.
# `prisma generate` no carga el engine, asi que el fallo aparecia recien al
# arrancar el contenedor, no al construir. Escalar el Dockerfile de Debian a
# musl es el problema de Prisma en Alpine; usar Debian lo evita.
FROM node:24-slim AS builder

# `openssl` va **acá tambien**, no solo en la etapa runner. `prisma generate`
# detecta la version de OpenSSL mirando el sistema para decidir que engine
# bajar; sin el paquete instalado asume la 1.1 y genera
# `libquery_engine-debian-openssl-1.1.x.so.node`, mientras que node:24-slim
# corre con OpenSSL 3. El resultado es un contenedor que no encuentra su engine:
#
#   Prisma Client could not locate the Query Engine for runtime
#   "debian-openssl-3.0.x"
#
# Es un fallo invisible: el build pasa y solo revienta en el `docker run`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# `tsconfig*.json` y no `tsconfig.json`: el build corre dos compilaciones,
# `tsconfig.json` para `src/` y `tsconfig.scripts.json` para el seed. Copiar
# solo el primero dejaba al segundo fuera de la imagen y `npm run build`
# moria con "File 'tsconfig.scripts.json' not found".
#
# El fallo es invisible desde afuera: el build falla, Railway NO levanta la
# imagen nueva y sigue sirviendo el deploy anterior con exito. Todo parece
# andando y lo unico que se ve es que un cambio del repo "no aplica".
COPY tsconfig*.json ./
COPY src ./src/

# Build
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

# Install runtime dependencies only
#
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
COPY package*.json ./
RUN npm ci --omit=dev --include=optional

# Copy Prisma client and generated assets
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma/

# Copy built app
COPY --from=builder /app/dist ./dist

# Non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]