/**
 * Rellena el catalogo de demostracion **solo si la tabla esta vacia**.
 *
 * ## Que resuelve
 *
 * `npm start` es `prisma migrate deploy && node dist/main.js`: aplica las
 * migraciones y levanta el servidor, pero **no siembra**. El seed de productos
 * era un script que alguien tinha que correr a mano, una vez, y acordarse. Un
 * deploy que se olvidaba dejaba la tienda abierta con cero productos y sin ningun
 * error en los logs: la migracion habia funcionado, el healthcheck daba 200, y
 * el unico sintoma era que un visitante no encontraba nada que buscar.
 *
 * Es el peor de los fallos porque **nada esta roto**. Y encima es el primero que
 * ve quien abre la tienda por primera vez.
 *
 * ## La condicion es "vacia", no "no sembrada nunca"
 *
 * Podria haberse sembrado una marca `demoSembrado` y no volver a mirar. Se eligio
 * `count() === 0` porque el estado de la tabla **es** el estado del negocio, y un
 * flag al lado se desincroniza de el en cuanto alguien borra un producto desde el
 * panel —el flag sigue en `true` mirando una tabla vacia—.
 *
 * Y de ahi sale la garantia que importa: **esta funcion nunca sobreescribe.**
 * Con dos productos en la base no hace nada, no importa cuantas veces arranque el
 * servidor. Es lo que permite que el dueno del negocio edite precios, nombre y
 * descripcion sin que el siguiente deploy le devuelva todo a los valores de
 * demostracion.
 *
 * El caso raro es el que queda: si el dueno borra **todos** los productos a
 * proposito, el siguiente arranque los vuelve a sembrar. Es el precio de que la
 * app se llene sola, y `SEED_CATALOGO=false` lo desactiva.
 */

import type { PrismaClient } from '@prisma/client'
import { sembrarCatalogo } from './catalogo.js'
import { logger } from '../utils/logger.js'

/** Por que se sembro o no. Sirve para el log y para que el test pueda preguntarlo. */
export type MotivoBootstrap =
  | 'deshabilitado'
  | 'ya-hay-productos'
  | 'sembrado'
  | 'fallo'

export interface ResultadoBootstrap {
  sembrado: boolean
  motivo: MotivoBootstrap
  /** Productos que ya habia antes de decidir. `0` en el camino de fallo. */
  existentes: number
  creados: number
}

/**
 * Siembra el catalogo si hace falta.
 *
 * **Nunca tira.** Un fallo del seed no puede impedir que el servidor arranque: si
 * el catalogo de demostracion esta roto, lo razonable es que la tienda abra con
 * lo que haya —o vacia— y no que no abra. Por eso el error se loguea y se
 * devuelve en el resultado en vez de propagarse: quien llama decide, y el
 * arranque decide seguir.
 */
export const bootstrapCatalogo = async (
  prisma: PrismaClient,
  habilitado: boolean
): Promise<ResultadoBootstrap> => {
  if (!habilitado) {
    logger.info('Catalogo de demostracion: omitido (SEED_CATALOGO=false)')
    return { sembrado: false, motivo: 'deshabilitado', existentes: -1, creados: 0 }
  }

  let existentes: number
  try {
    existentes = await prisma.product.count()
  } catch (error) {
    logger.error(error, 'No se pudo contar el catalogo; se sigue sin sembrar')
    return { sembrado: false, motivo: 'fallo', existentes: 0, creados: 0 }
  }

  if (existentes > 0) {
    // El camino de todos los arranques salvo el primero. El log dice cuantos hay
    // para que "no aparecio el producto que agregue" se pueda leer de un vistazo.
    logger.info(`Catalogo de demostracion: omitido, ya hay ${existentes} productos`)
    return { sembrado: false, motivo: 'ya-hay-productos', existentes, creados: 0 }
  }

  try {
    const { creados, actualizados, retirados } = await sembrarCatalogo(prisma)
    logger.info(
      `Catalogo de demostracion: ${creados} productos creados, ${actualizados} actualizados` +
        (retirados > 0 ? `, ${retirados} retirados` : '')
    )
    return { sembrado: true, motivo: 'sembrado', existentes: 0, creados }
  } catch (error) {
    // Un seed a medias deja productos metidos: `sembrarCatalogo` va de a uno, sin
    // transaccion. Se dice en el log porque es la unica forma de que el proximo
    // arranque los vea: va a entrar por 'ya-hay-productos' y **no** va a completar
    // el catalogo. Sin este aviso el sintoma es un catalogo a medias del que nadie
    // entiende por que no crece.
    logger.error(
      error,
      'Fallo el seed del catalogo de demostracion. Puede quedar a medias: ' +
        'borra los productos o corre "npm run seed:productos" para completarlo'
    )
    return { sembrado: false, motivo: 'fallo', existentes: 0, creados: 0 }
  }
}
