import { buildApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'

const start = async (): Promise<void> => {
  try {
    const app = await buildApp()
    
    await new Promise<void>((resolve, reject) => {
      app.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
        if (err) {
          reject(err)
        } else {
          logger.info(`🚀 Servidor escuchando en ${address}`)
          logger.info(`📚 Documentación: ${address}/api/docs`)
          resolve()
        }
      })
    })
  } catch (error) {
    logger.error(error, 'Error al iniciar el servidor')
    process.exit(1)
  }
}

start()