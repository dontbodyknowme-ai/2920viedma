import { describe, expect, it } from 'vitest'
import {
  customerUpdateSchema,
  orderQuerySchema,
  orderUpdateSchema,
  productoCreateSchema,
  productoIdParamSchema,
  productoQuerySchema
} from '../../src/shared/schemas.js'

/**
 * Esquemas de validacion (Zod).
 *
 * Estos tests fijan la frontera entre lo que el backend acepta y lo que
 * rechaza. No es "test por cobertura": cada caso es una decision de producto
 * que se rompio antes.
 *
 * El mas importante es el de `price`. El frontend y la base de datos trabajan
 * en **pesos enteros**, no en centavos. Si el esquema aceptara un flotante, un
 * `45000.5` pasaria el POST y quedaria guardado en la base; el round-trip del
 * panel lo devolveria como `45000` y el admin veria un precio distinto al que
 * escribio, sin ningun error visible.
 */

/** Cuerpo minimo valido de un producto. */
const vinoValido = {
  name: 'Gran Reserva Malbec',
  winery: 'Bodega Escorihuela',
  varietal: 'Malbec',
  category: 'Tinto' as const,
  vintage: 2019,
  price: 45000,
  imageUrl: 'https://cdn.vinoteca.local/malbec.webp'
}

describe('productoCreateSchema', () => {
  it('acepta un producto completo y completa los defaults de stock y activo', () => {
    const resultado = productoCreateSchema.parse(vinoValido)

    expect(resultado.stock).toBe(0)
    expect(resultado.activo).toBe(true)
    expect(resultado.price).toBe(45000)
  })

  it('rechaza un precio con centavos', () => {
    // El caso del comentario de cabecera: 45000.5 llegaria a la base.
    const resultado = productoCreateSchema.safeParse({ ...vinoValido, price: 45000.5 })

    expect(resultado.success).toBe(false)
  })

  it('rechaza precio cero o negativo', () => {
    expect(productoCreateSchema.safeParse({ ...vinoValido, price: 0 }).success).toBe(false)
    expect(productoCreateSchema.safeParse({ ...vinoValido, price: -1 }).success).toBe(false)
  })

  it('acepta cualquier categoria y rechaza la vacia', () => {
    // **Este test invertio su asercion cuando la tienda paso a ser un kiosco.**
    //
    // Antes decia "rechaza una categoria fuera de la lista cerrada" y probaba que
    // `category: 'Orange'` fuera rechazado, porque el enum era de tipo de producto.
    // Con una tienda que vende de todo, esa asercion era el bug: una cerveza, una
    // gaseosa o una galletita daban **400** y no habia forma de venderlas.
    //
    // Ahora `category` es la hoja de la taxonomia y es texto libre. Lo que si
    // tiene que seguir siendo un error es la categoria **vacia**: un producto sin
    // categoria no aparece en ningun filtro y el admin no lo va a encontrar.
    expect(productoCreateSchema.safeParse({ ...vinoValido, category: 'Cerveza' }).success).toBe(true)
    expect(productoCreateSchema.safeParse({ ...vinoValido, category: 'Gaseosas' }).success).toBe(true)
    expect(productoCreateSchema.safeParse({ ...vinoValido, category: '' }).success).toBe(false)
  })

  it('acepta un producto que no es producto y por lo tanto no tiene bodega, anada ni cepa', () => {
    // Una gaseosa no tiene de donde sacarle una añada. Antes `vintage`, `winery` y
    // `varietal` eran obligatorios, asi que un producto sin ellos no se podia
    // cargar ni por CSV. Exigirles un valor seria escribir informacion falsa.
    const resultado = productoCreateSchema.safeParse({
      name: 'Gaseosa de cola 2L',
      price: 3500,
      category: 'Gaseosas',
      departamento: 'Bebidas',
      grupo: 'Sin alcohol',
      imageUrl: 'https://cdn.vinoteca.local/gaseosa.webp'
    })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.vintage).toBeUndefined()
      expect(resultado.data.winery).toBeUndefined()
    }
  })

  it('rechaza una anada fuera de rango cuando viene', () => {
    // Opcional no es "cualquier cosa": si el admin la manda, tiene que ser una
    // anada de verdad.
    expect(productoCreateSchema.safeParse({ ...vinoValido, vintage: 1800 }).success).toBe(false)
    expect(productoCreateSchema.safeParse({ ...vinoValido, vintage: 2200 }).success).toBe(false)
  })

  it('rechaza una imageUrl que no es URL', () => {
    const resultado = productoCreateSchema.safeParse({ ...vinoValido, imageUrl: 'malbec.webp' })

    expect(resultado.success).toBe(false)
  })

  it('no deja que el cliente asigne el id al crear', () => {
    // El id lo pone la base. Aceptarlo en el POST habilita sobreescribir otro
    // producto: dos filas con el mismo id rompen editar y borrar en silencio.
    const resultado = productoCreateSchema.safeParse({ ...vinoValido, id: 'clx1234567890' })

    // Zod ignora la clave desconocida (no `.strict()`), asi que el punto a
    // fijar es que el valor **no** termine en la salida.
    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data).not.toHaveProperty('id')
    }
  })
})

describe('productoIdParamSchema', () => {
  it('acepta un cuid', () => {
    expect(productoIdParamSchema.safeParse({ id: 'clx1234567890' }).success).toBe(true)
  })

  it('rechaza un id numerico', () => {
    // El id numerico es el bug mas caro de un backend con Prisma: la ruta
    // matchea y Prisma revienta con un error 500 en vez de un 400.
    expect(productoIdParamSchema.safeParse({ id: '42' }).success).toBe(false)
  })
})

describe('productoQuerySchema', () => {
  it('coacciona los query params de texto a numero', () => {
    // En HTTP `?page=2` llega como string. Sin `coerce` el default (1) gana
    // siempre y la paginacion del panel nunca avanza de la primera pagina.
    const resultado = productoQuerySchema.parse({ page: '2', limit: '25' })

    expect(resultado.page).toBe(2)
    expect(resultado.limit).toBe(25)
  })

  it('aplica los defaults de pagina y limite', () => {
    const resultado = productoQuerySchema.parse({})

    expect(resultado.page).toBe(1)
    expect(resultado.limit).toBe(10)
  })

  it('rechaza un limite mayor al maximo', () => {
    // Sin tope, un `?limit=100000` baja la tabla entera al navegador.
    expect(productoQuerySchema.safeParse({ limit: '100000' }).success).toBe(false)
  })

  it('rechaza una pagina cero o negativa', () => {
    expect(productoQuerySchema.safeParse({ page: '0' }).success).toBe(false)
    expect(productoQuerySchema.safeParse({ page: '-3' }).success).toBe(false)
  })
})

describe('orderQuerySchema', () => {
  it('exige fechas con formato YYYY-MM-DD', () => {
    // `YYYY-MM-DD` y no ISO completo a proposito: el filtro se compara como
    // string contra el dia local del pedido (ver `aIsoLocal` en el frontend).
    // Aceptar un datetime completo correria el corte por huso.
    expect(orderQuerySchema.safeParse({ dateFrom: '2026-01-15' }).success).toBe(true)
    expect(orderQuerySchema.safeParse({ dateFrom: '15/01/2026' }).success).toBe(false)
    expect(orderQuerySchema.safeParse({ dateTo: '2026-01-15T23:30:00Z' }).success).toBe(false)
  })

  it('rechaza un estado de pedido inexistente', () => {
    const resultado = orderQuerySchema.safeParse({ status: 'pagado' })

    expect(resultado.success).toBe(false)
  })
})

describe('orderUpdateSchema', () => {
  it('rechaza un cuerpo vacio', () => {
    // Un PATCH sin campos no es un no-op inocuo: en el backend significa
    // "reescribir el pedido sin tocar nada". Se rechaza en la frontera.
    const resultado = orderUpdateSchema.safeParse({})

    expect(resultado.success).toBe(false)
  })

  it('acepta un cambio de estado con direccion de envio', () => {
    const resultado = orderUpdateSchema.safeParse({
      status: 'enviado',
      shippingAddress: { calle: 'Av. Corrientes 1234' }
    })

    expect(resultado.success).toBe(true)
  })
})

describe('customerUpdateSchema', () => {
  it('rechaza un cuerpo vacio', () => {
    expect(customerUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('acepta replacing de tags completo', () => {
    // Los tags se **reemplazan**, no se agregan: por eso se espera el array
    // entero y no un tag suelto.
    const resultado = customerUpdateSchema.safeParse({ tags: ['vip', 'mayorista'] })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.tags).toEqual(['vip', 'mayorista'])
    }
  })

  it('rechaza tags que no son strings', () => {
    const resultado = customerUpdateSchema.safeParse({ tags: ['vip', 42] })

    expect(resultado.success).toBe(false)
  })
})