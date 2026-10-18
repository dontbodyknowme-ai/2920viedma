import { buildApp, prisma } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { bootstrapCatalogo } from './demo/bootstrap.js'

const start = async (): Promise<void> => {
  try {
    const app = await buildApp()

    // Antes de escuchar, y sin dejar que un fallo aqui impida escuchar.
    //
    // El orden importa: primero migra (`npm start` lo corre antes de este
    // proceso), despues siembra si hace falta, despues levanta. Al reves, un
    // visitante puede entrar a la tienda un instante antes de que existan los
    // productos y ver un catalogo vacio que no se recarga solo.
    //
    // `bootstrapCatalogo` no tira nunca, pero el `try` esta de mas a proposito:
    // si manana el catalogo de demostracion trae un error de sintaxis o algo
    // impredictible, la tienda tiene que abrir igual. Un negocio que no muestra
    // productos se puede arreglar; uno que no abre, no.
    try {
      await bootstrapCatalogo(prisma, env.SEED_CATALOGO)
    } catch (error) {
      logger.error(error, 'El bootstrap del catalogo fallo; el servidor sigue igual')
    }

    await new Promise<void>((resolve, reject) => {
      app.listen({ port: env.PORT, host: env.HOST }, (err, address) => {
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
