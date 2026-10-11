# ---- Build stage ----
# Node 24 LTS. `sharp` y `@prisma/client` piden >=22; con Node 20 la
# instalacion del image falla en `npm ci`.
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

# Build
RUN npm run build

# ---- Runtime stage ----
FROM node:24-alpine AS runner

WORKDIR /app

# Install runtime dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

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