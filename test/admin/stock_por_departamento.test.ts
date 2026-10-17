import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import type { AdminWine } from '../../src/types/admin'
import { montarAdmin, desmontarAdmin, type MontajeAdmin } from './andamiaje_admin'
import { CatalogoAdmin } from '../../src/pages/admin/catalogo'
import { DEPARTAMENTOS, PESTAÑA_TODOS, SIN_DEPARTAMENTO } from '../../src/utils/departamentos'
import { CLAVE_CARRITO, CLAVE_VINOS } from '../andamiaje'

/**
 * El stock separado por departamento (pestañas de "Stock de ...").
 *
 * ## Que se verifica
 *
 * Que la tabla pida **una cosa por pestana**: que al elegir "Stock de bebidas"
 * la peticion lleve `departamento=Bebidas`, y que la peticion que se hace al
 * cargar no lleve el parametro. Y que las cuatro pestañas existan y esten
 * marcadas, una sola a la vez.
 *
 * ## Por se va por la API y no por el DOM
 *
 * Por lo mismo que `dashboard.test.ts`: la pregunta que importa es "¿que se
 * pidio?", no "¿que se ve?". Una tabla que se dibuja con los datos de la
 * peticion anterior se veria bien mientras muestra otra cosa, y un test de DOM
 * de eso daria verde. El parametro de la URL es lo que decide que fila aparece.
 *
 * Y el `fetch` se intercepta, no el modulo `api`: asi corren el hook y el
 * cliente HTTP de verdad y solo se responde la red.
 */

/** Los cuatro productos: uno por departamento, con nombres reconocibles. */
const VINOS: AdminWine[] = DEPARTAMENTOS.map((departamento, indice) => ({
  id: `v${indice}`,
  name: `Producto de ${departamento.valor}`,
  winery: 'Bodega Test',
  varietal: 'Malbec',
  category: 'Tinto',
  departamento: departamento.valor,
  vintage: 2021,
  price: 10000 + indice,
  description: 'Producto de prueba.',
  imageUrl: 'https://example.com/vino.jpg',
  stock: indice,
  activo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}))

interface RespuestaStub {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

const respuesta = (status: number, cuerpo: unknown): RespuestaStub => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: String(status),
  json: async () => cuerpo
})

/** Las URLs que se pidieron, en orden, para preguntar por los parametros. */
let pedidas: string[] = []

const fetchStub = (): typeof fetch =>
  vi.fn(async (entrada: RequestInfo | URL) => {
    const url = String(entrada)
    pedidas.push(url)

    if (url.endsWith('/api/auth/me')) {
      return respuesta(401, { message: 'Sesión expirada' })
    }
    if (url.endsWith('/api/auth/refresh')) {
      return respuesta(401, { message: 'Sin refresh' })
    }
    if (url.includes('/api/wines')) {
      const pedido = new URL(url, 'http://localhost')
      const departamento = pedido.searchParams.get('departamento')

      // El servidor filtra. El stub responde lo mismo que responderia Prisma,
      // para que la tabla no muestre productos de otros departamentos.
      const datos =
        departamento === null
          ? VINOS
          : VINOS.filter((vino) => vino.departamento === departamento)

      return respuesta(200, {
        data: datos,
        total: datos.length,
        page: 1,
        limit: 10,
        totalPages: 1
      })
    }

    return respuesta(404, { message: `Sin stub para ${url}` })
  }) as unknown as typeof fetch

/** Espera a que se cumpla `prueba`, dejando correr el reloj entre intentos. */
const esperarA = async (prueba: () => boolean, intentos = 40): Promise<void> => {
  for (let i = 0; i < intentos; i++) {
    if (prueba()) return
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 10))
    })
  }
  throw new Error('La condicion no se cumplio dentro de los intentos dados')
}

/** Monta el catalogo del panel y espera a que la tabla se dibuje. */
const montarCatalogo = async (): Promise<MontajeAdmin> => {
  const montaje = await montarAdmin(createElement(CatalogoAdmin))
  await esperarA(() => montaje.contenedor.querySelector('table') !== null)
  return montaje
}

/** La URL de la ultima peticion al catalogo. */
const ultimaPeticionDeCatalogo = (): URL => {
  const deCatalogo = pedidas.filter((url) => url.includes('/api/wines'))
  const ultima = deCatalogo[deCatalogo.length - 1]
  if (ultima === undefined) throw new Error('No se pidio /api/wines')
  return new URL(ultima, 'http://localhost')
}

/** Pulsa la pestaña cuya etiqueta es `etiqueta`. */
const pulsarPestana = async (montaje: MontajeAdmin, etiqueta: string): Promise<void> => {
  const botones = [...montaje.contenedor.querySelectorAll('nav[aria-label] button')]
  const elegido = botones.find((boton) => boton.textContent === etiqueta)

  if (elegido === undefined) {
    throw new Error(`No se encontro la pestaña "${etiqueta}"`)
  }

  await act(async () => {
    ;(elegido as HTMLButtonElement).click()
  })
}

/** Las etiquetas de las pestañas, en orden. */
const pestanas = (montaje: MontajeAdmin): string[] =>
  [...montaje.contenedor.querySelectorAll('nav[aria-label] button')].map(
    (boton) => boton.textContent ?? ''
  )

/** La etiqueta de la pestaña marcada, o `null`. */
const pestanaActiva = (montaje: MontajeAdmin): string | null =>
  montaje.contenedor.querySelector('nav[aria-label] button[aria-current]')?.textContent ?? null

beforeEach(() => {
  pedidas = []
  vi.stubGlobal('fetch', fetchStub())
  localStorage.removeItem(CLAVE_VINOS)
  localStorage.removeItem(CLAVE_CARRITO)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('las pestañas de stock', () => {
  it('son las cuatro de la tienda, mas "Todos"', async () => {
    // **La lista va escrita a mano, no derivada de `DEPARTAMENTOS`.** La primera
    // version de este test comparaba contra `[PESTAÑA_TODOS, ...DEPARTAMENTOS]`
    // y era tautologico: borrando dos departamentos de la lista, el test
    // comparaba dos Departamentos contra dos Departamentos y daba verde. Se
    // comprobo saboteando la lista, que es la unica forma de que se note.
    const montaje = await montarCatalogo()

    expect(pestanas(montaje)).toEqual([
      PESTAÑA_TODOS,
      'Stock de bebidas',
      'Stock de regalería',
      'Stock de snacks y chocolates',
      'Stock de comidas'
    ])

    await desmontarAdmin(montaje)
  })

  it('el valor que viaja es el del departamento, no el de la etiqueta', async () => {
    // El `valor` va a la base y en el `?departamento=`; la `etiqueta` es lo que
    // se lee. Si se cruzaran, el filtro compararia contra "Stock de bebidas" y
    // no matchearia con ningun producto.
    expect(DEPARTAMENTOS.map((d) => d.valor)).toEqual([
      'Bebidas',
      'Regalería',
      'Snacks y chocolates',
      'Comidas'
    ])
    // El `String(...)` es para que el guard siga siendo de runtime: con `as
    // const`, TypeScript ya prueba que los dos son literales distintos y
    // rechaza la comparacion como "no hay solapamiento" (TS2367). Sin el
    // ensanchado, el test no compila — y un test que no compila no corre.
    expect(DEPARTAMENTOS.every((d) => String(d.valor) !== String(d.etiqueta))).toBe(true)
  })

  it('arranca en "Todos", y sin parametro de departamento en la peticion', async () => {
    // Si la peticion inicial ya filtrara, "Todos" mentiria:aria una tabla con un
    // departamento y el filtro puesto "Todos".
    const montaje = await montarCatalogo()

    expect(pestanaActiva(montaje)).toBe(PESTAÑA_TODOS)
    expect(ultimaPeticionDeCatalogo().searchParams.get('departamento')).toBeNull()

    await desmontarAdmin(montaje)
  })

  it('cada pestaña pide su departamento y queda marcada ella sola', async () => {
    for (const departamento of DEPARTAMENTOS) {
      const montaje = await montarCatalogo()

      await pulsarPestana(montaje, departamento.etiqueta)

      expect(
        ultimaPeticionDeCatalogo().searchParams.get('departamento'),
        `"${departamento.etiqueta}" no pidio su departamento`
      ).toBe(departamento.valor)
      expect(pestanaActiva(montaje)).toBe(departamento.etiqueta)
      // Solo una marcada: dos `aria-current` serian dos "esta" en pantalla.
      expect(
        montaje.contenedor.querySelectorAll('nav[aria-label] button[aria-current]')
      ).toHaveLength(1)

      await desmontarAdmin(montaje)
    }
  })

  it('volver a "Todos" saca el parametro de la peticion', async () => {
    // El filtro tiene que **saber** quitarse: si "Todos" solo no hiciera nada,
    // el admin que eligio una seccion no tiene forma de volver a ver todo sin
    // recargar la pagina.
    const montaje = await montarCatalogo()

    await pulsarPestana(montaje, DEPARTAMENTOS[0].etiqueta)
    expect(ultimaPeticionDeCatalogo().searchParams.get('departamento')).not.toBeNull()

    await pulsarPestana(montaje, PESTAÑA_TODOS)
    expect(ultimaPeticionDeCatalogo().searchParams.get('departamento')).toBeNull()

    await desmontarAdmin(montaje)
  })

  it('el titulo dice que stock se esta viendo', async () => {
    const montaje = await montarCatalogo()

    await pulsarPestana(montaje, DEPARTAMENTOS[2].etiqueta)

    expect(montaje.contenedor.querySelector('h2')?.textContent).toBe(
      DEPARTAMENTOS[2].etiqueta
    )

    await desmontarAdmin(montaje)
  })

  it('SIN_DEPARTAMENTO es el valor sin filtro, no un departamento', async () => {
    // Guarda de contrato: `SIN_DEPARTAMENTO` se manda como `departamento=`, y si
    // alguien lo cambia por un valor real, la pestaña "Todos" empieza a filtrar
    // de verdad sin que nadie lo note.
    expect(SIN_DEPARTAMENTO).toBe('')
    expect(DEPARTAMENTOS.map((d) => d.valor)).not.toContain(SIN_DEPARTAMENTO)
  })
})
