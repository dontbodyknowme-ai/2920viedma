/**
 * Catalogo de vinos (catalogo real).
 *
 * Solo vinos. El catalogo dejo de ser un kiosco y ahora es una vinateria:
 * cuatro vinos reales, todos tintos, de Rutini Wines y La Rural.
 *
 * ## Por que vive en `src/` y no en `scripts/`
 *
 * Antes era `scripts/seed-productos.ts` y se corria **a mano**. Ese es el
 * problema: `npm start` hace `prisma migrate deploy && node dist/main.js`, o
 * sea que un deploy deja la tabla de productos **vacia** y la tienda muestra
 * cero productos hasta que alguien se acuerde del seed.
 *
 * Para que el arranque lo pueda usar tiene que estar en `src/`: `scripts/` lo
 * compila `tsconfig.scripts.json` con `rootDir: ./scripts`, y un archivo de ahi
 * **no puede importar de `src/`** —es lo que fija `deploy.test.ts`—. Y al reves
 * tampoco, porque `tsconfig.json` tiene `rootDir: ./src`.
 *
 * **Idempotente.** El `id` es un slug estable, no un `cuid`, para poder hacer
 * `upsert` por el: correrlo dos veces actualiza en vez de duplicar.
 *
 * ## Datos pendientes de confirmar
 *
 * La anada (vintage) esta en `null` porque no se verifico aun en la botella.
 * Los precios son placeholder (1000) y el stock es 0: se cargan desde el panel
 * admin cuando el dueno tenga los valores reales.
 */

import type { PrismaClient } from '@prisma/client'

export interface ProductoDemo {
  id: string
  name: string
  /** `null` para lo que no viene de una bodega. */
  winery: string | null
  /** `null` para lo que no tiene cepa. */
  varietal: string | null
  /** `null` cuando la anada no esta confirmada. */
  vintage: number | null
  /** La hoja de la taxonomia: Vinos. */
  category: string
  departamento: string
  /** Nivel medio. `null` si cuelga directo del departamento. */
  grupo: string | null
  /** Color del producto. `null` fuera de la categoria "Vinos". */
  tipoVino: string | null
  price: number
  description: string
  tastingNotes: string
  foodPairing: string
  imageUrl: string
  stock: number
  activo: boolean
}

const U = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=800`

export const CATALOGO: ProductoDemo[] = [
  {
    id: 'vino-trumpeter-malbec',
    name: 'Trumpeter Malbec',
    winery: 'Rutini Wines',
    varietal: 'Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: null,
    price: 1000,
    description:
      'Frutado y con cuerpo, con notas de ciruela, cereza y violetas.',
    tastingNotes:
      'Un Malbec de color violeta intenso, con aromas de ciruelas, cerezas y flores que recuerdan a las violetas. En boca tiene cuerpo y una estructura marcada, con un final aterciopelado.',
    foodPairing:
      'Carnes vacunas a la parrilla, pastas rellenas con salsas de carne y quesos duros.',
    imageUrl: U('1506377247377-2a5b3b417ebb'),
    stock: 0,
    activo: true
  },
  {
    id: 'vino-san-felipe-roble-malbec',
    name: 'San Felipe Roble Malbec',
    winery: 'La Rural',
    varietal: 'Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: null,
    price: 1000,
    description:
      'Frutado y especiado, con taninos suaves y un final aterciopelado.',
    tastingNotes:
      'De color rojo púrpura con reflejos ciruela. Combina aromas florales de violetas con notas de frutos rojos y negros, como cereza y cassis, y un toque de pimienta negra. En boca es jugoso, de taninos suaves y final aterciopelado.',
    foodPairing:
      'Carnes a la parrilla, empanadas de carne y quesos semiduros.',
    imageUrl: U('1474722883778-792e7990302f'),
    stock: 0,
    activo: true
  },
  {
    id: 'vino-rutini-coleccion-cabernet-malbec',
    name: 'Rutini Colección Cabernet Malbec',
    winery: 'Rutini Wines',
    varietal: 'Cabernet Sauvignon / Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: null,
    price: 1000,
    description:
      'Un blend equilibrado que combina estructura, fruta y taninos suaves.',
    tastingNotes:
      'De color rojo rubí profundo, este corte combina el cuerpo y la estructura del Cabernet Sauvignon con la suavidad del Malbec. Un tinto armonioso, de aromas frutados y taninos amables.',
    foodPairing:
      'Carnes rojas asadas, quesos semiduros, pastas rellenas, lasaña y empanadas.',
    imageUrl: U('1599113656124-b96bf21e30d3'),
    stock: 0,
    activo: true
  },
  {
    id: 'vino-rutini-coleccion-malbec',
    name: 'Rutini Colección Malbec',
    winery: 'Rutini Wines',
    varietal: 'Malbec',
    category: 'Vinos',
    departamento: 'Bebidas',
    grupo: 'Con alcohol',
    tipoVino: 'Tinto',
    vintage: null,
    price: 1000,
    description:
      'Frutado y floral, con notas especiadas y taninos sedosos.',
    tastingNotes:
      'De color rojo violáceo con matices azulados. Presenta aromas de ciruela, violetas y especias que recuerdan a la vainilla, el anís y la pimienta negra. En boca se destaca por su fruta y sus taninos envolventes y sedosos.',
    foodPairing:
      'Carnes grilladas, cordero, locro, guiso de lentejas y quesos duros.',
    imageUrl: U('1569919659476-f0852f6834b7'),
    stock: 0,
    activo: true
  }
]

/**
 * Productos del catalogo anterior (kiosco) que **se retiraron**.
 *
 * Ahora el catalogo es solo vinos, asi que todos los productos del kiosco
 * (cervezas, gaseosas, snacks, regalos, energizantes, etc.) se borran cuando
 * se siembra la nueva version.
 *
 * La lista es explicita: solo ids que **este** catalogo creo. Nunca un producto
 * que el dueno cargo desde el panel.
 */
export const PRODUCTOS_RETIRADOS: string[] = [
  'producto-gran-reserva-malbec',
  'producto-chardonnay-white-bones',
  'producto-cabernet-sauvignon-reserva',
  'producto-malbec-reserva-familia',
  'producto-syrah-valleys',
  'producto-pinot-noir-selection',
  'producto-blanc-de-blancs',
  'producto-espumante-brut-nature',
  'producto-espumante-rose',
  'producto-rose-provence',
  'bebida-cerveza-artesanal-ipa',
  'bebida-cerveza-artesanal-stout',
  'bebida-cerveza-pilsener',
  'bebida-aperitivo-gin-tonic',
  'bebida-aperitivo-frutos-rojos',
  'bebida-destilado-whisky-bourbon',
  'bebida-destilado-whisky-scotch',
  'bebida-gaseosa-cola-2l',
  'bebida-gaseosa-ginger-ale',
  'bebida-agua-saborizada-limon',
  'bebida-agua-saborizada-menta',
  'bebida-jugo-naranja-botella',
  'bebida-jugo-frutos-rojos',
  'bebida-monster-energy-473ml',
  'bebida-speed-250ml',
  'bebida-red-bull-250ml',
  'regaleria-set-copas',
  'regaleria-termo-acero',
  'gastronomia-queso-brie',
  'gastronomia-queso-parmesano',
  'gastronomia-costillas-ahumadas',
  'gastronomia-papas-cesar',
  'snacks-chocolate-amargo-70',
  'snacks-chocolate-con-leche',
  'snacks-papas-fritas',
  'snacks-papas-cheddar',
  'bebida-energizante-250',
  'bebida-energizante-sin-azucar'
]

/**
 * Siembra el catalogo de vinos.
 *
 * `upsert` por `id`, asi que es idempotente: correrla dos veces actualiza en
 * vez de duplicar. Devuelve cuantos creo, cuantos actualizo y cuantos retiro,
 * para que el bootstrap lo pueda loguear.
 *
 * **El `prisma` se recibe por parametro y no se crea aca.** Un modulo que
 * instancia su propio `PrismaClient` al importarse no se puede probar sin una
 * base: los tests mockean `@prisma/client` y por eso el cliente tiene que ser
 * inyectado desde afuera.
 */
export const sembrarCatalogo = async (
  prisma: PrismaClient
): Promise<{ creados: number; actualizados: number; retirados: number }> => {
  let creados = 0
  let actualizados = 0

  for (const producto of CATALOGO) {
    const { id, ...datos } = producto
    const existente = await prisma.product.findUnique({ where: { id } })
    if (existente === null) {
      await prisma.product.create({ data: { id, ...datos } })
      creados++
    } else {
      await prisma.product.update({ where: { id }, data: datos })
      actualizados++
    }
  }

  // Los retirados, y **solo** los retirados. Ver la nota de la lista de arriba.
  const { count: retirados } = await prisma.product.deleteMany({
    where: { id: { in: PRODUCTOS_RETIRADOS } }
  })

  return { creados, actualizados, retirados }
}