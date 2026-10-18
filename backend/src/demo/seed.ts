/**
 * El catalogo de demostracion, a mano: `npm run seed:productos`.
 *
 * ## Cuando se usa esto y cuando no
 *
 * El arranque ya siembra solo si la tabla esta vacia (`demo/bootstrap.ts`), asi
 * que este comando **no hace falta** para que la tienda tenga productos. Queda para
 * dos cosas que el arranque no puede hacer:
 *
 *   - **Completar** un seed que fallo a medias. `sembrarCatalogo` inserta de a uno
 *     y sin transaccion, asi que si se corta en el producto 12 de 24 quedan 11; el
 *     siguiente arranque entra por 'ya-hay-productos' y no completa nada. Esto si.
 *   - **Reponer** el catalogo de demostracion en una base de desarrollo.
 *
 * Y por eso `update` es lo que hace, no `create`: correrlo dos veces no duplica y,
 * sobre todo, **no pisa los cambios** que se hicieron a mano... salvo que si, porque
 * un `update` por `id` escribe todos los campos. Para un comando que se corre a
 * mano y a proposito, overwrite es lo esperable: uno decide cuando ejecutarlo.
 *
 * El arranque y este comando **no** comparten criterio a proposito. El del
 * arranque jamas sobreescribe porque se corre solo en cada deploy; este se corre
 * una vez, con una mano en el teclado, y ahi pisar es justo lo pedido.
 */

import { prisma } from '../app.js'
import { logger } from '../utils/logger.js'
import { sembrarCatalogo } from './catalogo.js'

const main = async (): Promise<void> => {
  const { creados, actualizados } = await sembrarCatalogo(prisma)

  const total = await prisma.product.count()
  const activos = await prisma.product.count({ where: { activo: true } })

  logger.info(`Catalogo listo: ${creados} creados, ${actualizados} actualizados.`)
  logger.info(`Total en la base: ${total} productos, ${activos} activos.`)
}

main()
  .catch((error) => {
    logger.error(error, 'Error en el seed de productos')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
