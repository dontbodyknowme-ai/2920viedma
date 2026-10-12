import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  LOGIN_RATE_MAX: z.coerce.number().int().positive().default(5),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string().default('wine-images'),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  // URL **pública** del bucket, distinta de `STORAGE_ENDPOINT` (que es el
  // endpoint de la API S3 y no se puede abrir en un navegador).
  // Cloudflare R2: https://pub-<cuenta>.r2.dev  (o un dominio propio)
  // La devuelve `POST /api/upload` y es la que queda guardada en el vino.
  // No se firma: una URL firmada caduca en una hora y el vino la tiene guardada
  // para siempre, o sea que la imagen se rompia al dia siguiente.
  STORAGE_PUBLIC_URL: z.string().url(),
  PUBLIC_API_URL: z.string().url()
})

export const env = envSchema.parse(process.env)