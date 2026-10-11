import pino from 'pino'
import { env } from '../config/env.js'

const isDev = env.NODE_ENV === 'development'

const pinoInstance = pino as unknown as pino.Logger & { (opts?: pino.LoggerOptions): pino.Logger }

/**
 * El transporte pretty solo existe si `pino-pretty` esta instalado, que es una
 * devDependency. En la imagen de produccion (`npm ci --omit=dev`) no esta, y
 * pedirlo ahi tira `unable to determine transport target for "pino-pretty"` al
 * importar el modulo: el backend no levanta.
 *
 * O sea: un `NODE_ENV` mal puesto -que es justo lo que dice `.env.example`-
 * convertia una variable de entorno en un contenedor que no arranca. Por eso
 * se decide por disponibilidad y no solo por `NODE_ENV`: si `pino-pretty` no
 * esta, se loguea en JSON, que es lo que corresponde en produccion igual.
 */
const hayPinoPretty = (): boolean => {
  try {
    require.resolve('pino-pretty')
    return true
  } catch {
    return false
  }
}

const usarPretty = isDev && hayPinoPretty()

export const logger = pinoInstance({
  level: isDev ? 'debug' : 'info',
  transport: usarPretty
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