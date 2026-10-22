import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { bootstrapCatalogo } from '../../src/demo/bootstrap.js'
import { CATALOGO, PRODUCTOS_RETIRADOS, sembrarCatalogo } from '../../src/demo/catalogo.js'

/**
 * El arranque siembra el catalogo **solo si la tabla esta vacia**.
 *
 * ## Que se esta protegiendo
 *
 * `npm start` es `prisma migrate deploy && node dist/main.js`. Migra y levanta;
 * **no siembra**. El seed de productos era un script que alguien corria a mano,
 * una vez, acordandose. Un deploy que lo olvidaba dejaba la tienda abierta con
 * cero productos y **sin un solo error en los logs**: la migracion habia
 * funcionado, `/health` daba 200, el deploy figuraba como sano. El unico sintoma
 * era que un visitante no encontraba nada que buscar.
 *
 * ## La garantia que importa mas: nunca sobreescribe
 *
 * El riesgo obvio de un seed automatico es que cada deploy revuelva los precios
 * que el dueno del negocio edito a mano. Por eso la condicion es `count() === 0`
 * y no "si no hay marca de sembrado": con dos productos en la base no se hace
 * nada, y el dueno edita tranquilo.
 *
 * Los tests de esa mitad son los que hay que **sabotear**: si el `count` se
 * ignora, o si el seed corre siempre, la tienda muestra el catalogo de
 * demostracion encima del catalogo real y no hay ningun error que lo delate.
 */

const prismaFalso = {
  product: {
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn()
  }
}

const como = (): PrismaClient => prismaFalso as unknown as PrismaClient

/** Cuenta por un campo, para los tests de datos. */
const contarPor = (campo: (p: (typeof CATALOGO)[number]) => string): Map<string, number> => {
  const cuenta = new Map<string, number>()

  for (const producto of CATALOGO) {
    const clave = campo(producto)
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1)
  }

  return cuenta
}

/** Los grupos con menos de dos productos, como texto para que el fallo se lea. */
const escasos = (campo: (p: (typeof CATALOGO)[number]) => string, minimo = 2): string[] =>
  [...contarPor(campo).entries()]
    .filter(([, n]) => n < minimo)
    .map(([clave, n]) => `${clave}: ${n}`)

beforeEach(() => {
  vi.clearAllMocks()
  prismaFalso.product.create.mockResolvedValue({})
  prismaFalso.product.update.mockResolvedValue({})
  // `deleteMany` devuelve `{ count }`: es el numero de productos que se
  // retiraron. Sin esto, `retirados` seria `undefined` y el log diria
  // "undefined retirados".
  prismaFalso.product.deleteMany.mockResolvedValue({ count: 0 })
})

describe('bootstrapCatalogo', () => {
  it('siembra cuando la tabla esta vacia', async () => {
    prismaFalso.product.count.mockResolvedValue(0)
    prismaFalso.product.findUnique.mockResolvedValue(null)

    const resultado = await bootstrapCatalogo(como(), true)

    expect(resultado).toEqual({
      sembrado: true,
      motivo: 'sembrado',
      existentes: 0,
      creados: CATALOGO.length
    })
    expect(prismaFalso.product.create).toHaveBeenCalledTimes(CATALOGO.length)
  })

  it('NO siembra si ya hay un solo producto', async () => {
    // **El caso importante.** No "si hay muchos": **uno**. El dia que el dueno
    // borre todos menos el que mas le gusta y el proximo deploy le devuelva el
    // catalogo de demostracion entero encima, esta es la linea que lo evita.
    prismaFalso.product.count.mockResolvedValue(1)

    const resultado = await bootstrapCatalogo(como(), true)

    expect(resultado.sembrado).toBe(false)
    expect(resultado.motivo).toBe('ya-hay-productos')
    expect(prismaFalso.product.create).not.toHaveBeenCalled()
    expect(prismaFalso.product.update).not.toHaveBeenCalled()
  })

  it('no siembra si esta deshabilitado, y ni siquiera mira la base', async () => {
    // `SEED_CATALOGO=false` es lo que pone un negocio que carga su catalogo por
    // otro lado. Y tiene que **no consultar**: si hiciera el `count` y despues
    // no sembrara, un `SEED_CATALOGO=false` en una base sin las migraciones
    // aplicadas tiraria un error de Prisma al arrancar, o sea que la variable
    // que existe para apagar la cosa la romperia.
    prismaFalso.product.count.mockResolvedValue(0)

    const resultado = await bootstrapCatalogo(como(), false)

    expect(resultado).toEqual({
      sembrado: false,
      motivo: 'deshabilitado',
      existentes: -1,
      creados: 0
    })
    expect(prismaFalso.product.count).not.toHaveBeenCalled()
  })

  it('un fallo al contar no tumba el arranque', async () => {
    prismaFalso.product.count.mockRejectedValue(new Error('P1001'))

    const resultado = await bootstrapCatalogo(como(), true)

    expect(resultado).toEqual({ sembrado: false, motivo: 'fallo', existentes: 0, creados: 0 })
    expect(prismaFalso.product.create).not.toHaveBeenCalled()
  })

  it('un fallo del seed no tumba el arranque', async () => {
    // Es la parte de la que mas facil se duda: "si el catalogo de demostracion
    // esta roto, mejor que la tienda no abra". No: un negocio sin productos se
    // arregla borrando una fila; uno que no abre, no.
    prismaFalso.product.count.mockResolvedValue(0)
    prismaFalso.product.findUnique.mockRejectedValue(new Error('boom'))

    await expect(bootstrapCatalogo(como(), true)).resolves.toMatchObject({
      sembrado: false,
      motivo: 'fallo'
    })
  })
})

describe('sembrarCatalogo', () => {
  it('es idempotente: la segunda pasada actualiza en vez de duplicar', async () => {
    // `sembrarCatalogo` decide entre `create` y `update` preguntando por el
    // `id`. Si se ignora que el producto ya existe, el segundo paso lo inserta de
    // nuevo, el catalogo queda duplicado y el filtro por categoria muestra el
    // mismo producto dos veces.
    prismaFalso.product.findUnique.mockResolvedValue({ id: 'ya-existe' })

    const { creados, actualizados } = await sembrarCatalogo(como())

    expect(creados).toBe(0)
    expect(actualizados).toBe(CATALOGO.length)
    expect(prismaFalso.product.create).not.toHaveBeenCalled()
    expect(prismaFalso.product.update).toHaveBeenCalledTimes(CATALOGO.length)
  })

  it('borra los productos retirados, y solo esos', async () => {
    // El `upsert` por `id` no borra nada: los productos que se reemplazaron
    // (los dos energizantes genericos, ahora Monster/Speed/Red Bull) se
    // quedan en la base y el filtro los muestra al lado de los nuevos.
    //
    // Y el "solo esos" es la parte que importa: si en vez de la lista se
    // borrara "todo lo que no esta en el catalogo", se llevaria por delante los
    // productos que cargo el dueno, que es justo lo que el seed jamas debe
    // hacer.
    prismaFalso.product.findUnique.mockResolvedValue(null)
    prismaFalso.product.deleteMany.mockResolvedValue({ count: 2 })

    const { retirados } = await sembrarCatalogo(como())

    expect(retirados).toBe(2)
    expect(prismaFalso.product.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: PRODUCTOS_RETIRADOS } }
    })
  })

  it('no borra nada cuando no hay productos retirados', async () => {
    // El `count` de `deleteMany` es 0 en el caso normal. Lo que se verifica es
    // que la llamada se hace **igual**, con la lista: es una operacion
    // idempotente y el `count` sale de la base, no de un `if`.
    prismaFalso.product.findUnique.mockResolvedValue({ id: 'ya-existe' })
    prismaFalso.product.deleteMany.mockResolvedValue({ count: 0 })

    const { retirados } = await sembrarCatalogo(como())

    expect(retirados).toBe(0)
    expect(prismaFalso.product.deleteMany).toHaveBeenCalledTimes(1)
  })
})

/**
 * Que el catalogo de demostracion se pueda mostrar.
 *
 * ## Por que hay reglas de datos y no una prueba de busqueda
 *
 * La primera version de estos tests reimplementaba la busqueda del frontend —
 * concatenar unos campos y hacer `includes`— y por eso fallaba con "blanco no
 * encuentra nada": se le habia olvidado `tipoVino`. O sea, **una segunda copia de
 * `filtrarVinos`**, que es la clase de duplicacion que este repo viene
 * desarmando desde el rename: dos copias del mismo criterio divergen en el
 * primer cambio de una de las dos.
 *
 * Lo que queda son reglas sobre los **datos**, que solo se pueden comprobar
 * aca y que dicen algo real sobre una tienda que se va a compartir con gente:
 *
 *   - ningun filtro puede llevar a un lugar con un unico producto, porque no se
 *     distingue de un fallo del seed
 *   - ninguna categoria con un solo producto hace que la busqueda no sirva:
 *     si `filtrarVinos` devolviera el catalogo entero, estos datos no lo notarian
 *   - los `id` no se repiten, o falta un producto sin que nada avise
 *   - no se repite la foto, que en la grilla se lee como error de carga
 *
 * La busqueda en si se verifica en el frontend, donde vive, con sus propios
 * tests.
 */
describe('el catalogo de demostracion', () => {
  it('cubre los cuatro departamentos, y ninguno con un solo producto', () => {
    // Una pestana de stock con un producto parece que se perdio algo al sembrar,
    // y no hay forma de distinguirlo de un fallo real. El minimo es dos, y no
    // uno "porque tenga algo": con dos ya se ve que la tabla funciona.
    expect([...contarPor((p) => p.departamento).keys()]).toEqual([
      'Bebidas',
      'Regalos',
      'Listo para comer',
      'Snack y chocolates'
    ])
    expect(escasos((p) => p.departamento)).toEqual([])
  })

  it('ninguna categoria tiene un solo producto', () => {
    // Es lo que hace que la **busqueda** sirva. Con una categoria de un solo
    // producto, un buscador roto que devuelve todo el catalogo da el mismo
    // resultado que uno bien escrito, y ningun test lo nota. Con dos, se separa
    // "encontre lo que buscaba" de "me devolvio todo".
    expect(escasos((p) => p.category)).toEqual([])
  })

  it('ningun grupo tiene un solo producto', () => {
    // "Con alcohol" con 13 y "Sin alcohol" con 1 es un filtro donde una de las
    // dos opciones parece rota.
    expect(escasos((p) => p.grupo ?? '(cuelga del departamento)')).toEqual([])
  })

  it('los id son unicos', () => {
    // El `id` es el slug del `upsert`. Un id repetido no se ve en la base —el
    // segundo pisa al primero— pero hace que el total que anuncia el seed no
    // coincida con la cantidad de filas, y que falte un producto sin avisar.
    const ids = CATALOGO.map((p) => p.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no se repite la misma foto en dos productos', () => {
    // Una foto repetida en la grilla se lee como un error de carga. Es la forma
    // mas comun de que un catalogo de demostracion parezca roto sin estarlo.
    const urls = CATALOGO.map((p) => p.imageUrl)

    expect(new Set(urls).size).toBe(urls.length)
  })

  it('una anada sin bodega esta incompleta, no inventada', () => {
    // `vintage: 2024` con `winery: null` es un dato a medias: el anado sin decir
    // de quien. Y al reves —bodega sin anado— es perfectamente valido.
    const aMedias = CATALOGO.filter((p) => p.vintage !== null && p.winery === null).map(
      (p) => p.id
    )

    expect(aMedias).toEqual([])
  })

  it('el color es solo de los vinos', () => {
    // `tipoVino` en una gaseosa es informacion falsa en la base. El filtro del
    // catalogo tiene una fila de color que solo deberia aparecer cuando hay
    // vinos: un "Tinto" colgado de una cerveza rompe el criterio.
    const conColor = CATALOGO.filter((p) => p.tipoVino !== null)

    expect(conColor.length).toBeGreaterThan(0)
    expect([...new Set(conColor.map((p) => p.category))]).toEqual(['Vinos'])
  })

  it('todo lo que es vino de verdad tiene bodega, anada y color', () => {
    // El contrapeso del anterior: si se corrige deixando el color vacio en
    // todas partes, el test de arriba pasa con cero vinos. Un vino sin bodega,
    // sin anada o sin color no es un vino: es un producto mal cargado.
    const incompletos = CATALOGO.filter(
      (p) =>
        p.category === 'Vinos' &&
        (p.winery === null || p.vintage === null || p.tipoVino === null)
    ).map((p) => p.id)

    expect(incompletos).toEqual([])
  })

  it('todos los productos tienen foto y descripcion', () => {
    // Sin foto, la grilla muestra el icono de imagen rota. Sin descripcion, la
    // ficha del producto queda en blanco.
    const sinFoto = CATALOGO.filter((p) => !p.imageUrl.trim()).map((p) => p.id)
    const sinDescripcion = CATALOGO.filter((p) => !p.description.trim()).map((p) => p.id)

    expect(sinFoto).toEqual([])
    expect(sinDescripcion).toEqual([])
  })

  it('todos los productos tienen precio y categoria', () => {
    // `category` es NOT NULL en Prisma, asi que un `''` revienta el seed entero a
    // la mitad —y el catalogo queda a medias sin que nada avise, que es el
    // peor estado posible (ver el aviso de `bootstrapCatalogo`).
    const sinPrecio = CATALOGO.filter((p) => p.price <= 0).map((p) => p.id)
    const sinCategoria = CATALOGO.filter((p) => !p.category.trim()).map((p) => p.id)

    expect(sinPrecio).toEqual([])
    expect(sinCategoria).toEqual([])
  })

  it('tiene productos agotados e inactivos, para que los filtros del panel tengan que filtrar', () => {
    // El filtro por estado del panel (RF de 004-a) necesita algo que filtrar. Sin
    // un producto sin stock y uno desactivado, la columna no se puede demostrar:
    // un filtro que no saca nada se ve igual que uno que funciona.
    expect(CATALOGO.filter((p) => p.stock === 0).length).toBeGreaterThan(0)
    expect(CATALOGO.filter((p) => !p.activo).length).toBeGreaterThan(0)
  })
})
