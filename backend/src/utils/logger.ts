import pino from 'pino'
import { env } from '../config/env.js'

const isDev = env.NODE_ENV === 'development'

const pinoInstance = pino as unknown as pino.Logger & { (opts?: pino.LoggerOptions): pino.Logger }

export const logger = pinoInstance({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  formatters: {
    level: (label: string) => ({ level: label })
  },
  base: {
    service: 'vinoteca-backend'
  }
})