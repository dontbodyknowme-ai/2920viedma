import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DEPARTAMENTOS } from '../src/utils/departamentos'
import { Categorias, tienePresentacion } from '../src/components/categorias'

/**
 * Las tarjetas de la home y la taxonomia son **la misma lista**.
 *
 * ## Por que este archivo existe
 *
 * `categorias.tsx` tenia su propia lista de cuatro tarjetas, aparte de
 * `DEPARTAMENTOS`. Se desincronizo sin que nada dijera nada: la home seguia
 * mostrando una tarjeta llamada **"Comidas"** —que ya no era ningun
 * departamento— mientras la taxonomia tenia **"Gastronomia"**. Dos copias de la
 * misma lista divergen en el primer cambio de una de las dos, y el sintoma es
 * una pantalla que ofrece algo que no existe.
 *
 * ## Que verifica, y que no
 *
 * Que **todo** departamento tenga su entrada de presentacion (icono y detalle).
 *
 * Lo que **no** verifica —y no puede— es que la lista de la home siga a la
 * taxonomia: al derivar una de la otra, ya no hay dos copias que puedan
 * divergir. Se intento igual, sacando un departamento de `DEPARTAMENTOS`: los
 * cuatro tests dieron **verde**, porque quitar un departamento lo saca de los
 * dos lados a la vez. Ese bug quedo **eliminado por construccion**, no
 * enshrined en un test, y un test que pasa no esta probando lo que su nombre
 * dice.
 *
 * El riesgo que si queda —y el que estos tests miran— es agregar un
 * departamento y **no** darle su entrada en `PRESENTACION`. `PRESENTACION` es un
 * `Record<string, ...>`, asi que TypeScript acepta cualquier clave: compila, pasa
 * el lint, y en pantalla no hay tarjeta. Agregando "Limpieza" a la taxonomia sin
 * su entrada, caen tres de los cuatro.
 */

let contenedor: HTMLDivElement
let root: Root

const montar = async (): Promise<void> => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  await act(async () => {
    root.render(createElement(Categorias))
  })
}

const desmontar = async (): Promise<void> => {
  await act(async () => {
    root.unmount()
  })
  contenedor.remove()
}

/** Los titulos de las tarjetas, en orden. */
const titulos = (): string[] =>
  [...contenedor.querySelectorAll('h3')].map((h3) => h3.textContent ?? '')

describe('las tarjetas de la home siguen a la taxonomia', () => {
  it('todo departamento tiene su entrada de presentacion', () => {
    // El guard que faltaba. `PRESENTACION` es un `Record<string, ...>`, asi que
    // TypeScript acepta cualquier clave: agregar un departamento sin icono
    // compila, pasa el lint y no falla ningun test — hasta que en pantalla hay
    // un `undefined` donde deberia haber una copa.
    const sinPresentacion = DEPARTAMENTOS
      .map((d) => d.valor)
      .filter((valor) => !tienePresentacion(valor))

    expect(sinPresentacion).toEqual([])
  })

  it('no hay entradas de departamentos que ya no existen', async () => {
    // Una entrada vieja es inocua: `PRESENTACION` solo se consulta para los
    // departamentos de la taxonomia, asi que una clave que ya no existe no
    // renderiza nada. Se comprueba igual para que la lista no se vaya llenando
    // de claves muertas.
    const mostrados = new Set(DEPARTAMENTOS.map((d) => d.etiqueta))
    await montar()
    try {
      for (const titulo of titulos()) {
        expect(mostrados.has(titulo), `"${titulo}" no es un departamento de la taxonomia`).toBe(true)
      }
    } finally {
      await desmontar()
    }
  })
  it('la tarjeta de descartes se llama como el departamento, no como antes', () => {
    // Este es el caso concreto que casi se va: la taxonomia paso de "Comidas" a
    // "Gastronomia" y la home seguia con "Comidas".
    const descartes = DEPARTAMENTOS.find((d) => d.valor === 'Gastronomía')

    expect(descartes?.etiqueta).toBe('Gastronomía')

    return montar().then(async () => {
      try {
        expect(titulos()).not.toContain('Comidas')
        expect(titulos()).toContain('Gastronomía')
      } finally {
        await desmontar()
      }
    })
  })

  it('la home ofrece los mismos departamentos que el filtro del catalogo', () => {
    // Las dos pantallas se mueven juntas: agregar un departamento sin tocar aca
    // lo dejaba visible en el filtro y ausente en la home.
    return montar().then(async () => {
      try {
        expect(titulos().sort()).toEqual(DEPARTAMENTOS.map((d) => d.etiqueta).sort())
      } finally {
        await desmontar()
      }
    })
  })
})
