import { describe, expect, it } from 'vitest'
import {
  CAMPOS_VACIOS,
  erroresDe,
  estaCompleto,
  type DatosDelFormulario
} from '../src/components/checkout/formulario'
// Sin este import, `localStorage` no existe: Node 24+ cuelga el suyo
// experimental y tapa el de jsdom (ver el comentario en `andamiaje.ts`).
import './andamiaje'

/**
 * Las reglas del formulario de checkout (spec 009, T6).
 *
 * ## Que se prueba aca y que no
 *
 * Lo que se puede afirmar **sin montar**: que el boton exige los cinco campos y
 * que cada campo vacio tiene su error.
 *
 * Lo que necesita el componente montado —el `fetch`, la navegacion a
 * `/pedido/:token`, el estado del pago en pantalla— se verifica en
 * `checkout_pagina.test.ts`.
 *
 * ## Por que estas funciones puras existen
 *
 * `estaCompleto` y `erroresDe` estan **exportadas** y no viven metidas en el
 * componente. Con todo adentro, el unico modo de probarlas es montar el
 * formulario, escribir en cinco campos y volver a leer el DOM: veinte lineas de
 * andamiaje para afirmar que un `&&` esta bien. Con la regla afuera, es una
 * linea de test.
 */

const COMPLETO: DatosDelFormulario = {
  nombre: 'María',
  apellido: 'González',
  telefono: '11 1234-5678',
  email: 'maria@example.com',
  direccion: 'Av. Corrientes 1234'
}

describe('el boton exige los cinco campos', () => {
  it('con todo lleno se puede mandar', () => {
    expect(estaCompleto(COMPLETO)).toBe(true)
  })

  it('con todo vacio no', () => {
    expect(estaCompleto(CAMPOS_VACIOS)).toBe(false)
  })

  it.each(Object.keys(CAMPOS_VACIOS) as (keyof DatosDelFormulario)[])(
    'falta %s y no se puede mandar',
    (campo) => {
      expect(estaCompleto({ ...COMPLETO, [campo]: '' })).toBe(false)
    }
  )

  it.each(Object.keys(CAMPOS_VACIOS) as (keyof DatosDelFormulario)[])(
    'un %s de solo espacios tampoco alcanza',
    (campo) => {
      // Sin `.trim()`, `"   "` cuenta como contenido y el boton se habilita
      // para un formulario que el backend va a rechazar.
      expect(estaCompleto({ ...COMPLETO, [campo]: '   ' })).toBe(false)
    }
  )

  it('el email cuenta: sin el, no se compra', () => {
    // Es lo que decidio D-9. Con el email opcional, dos compradores sin email
    // no se podrian distinguir nunca y cada compra abriria un cliente nuevo.
    expect(estaCompleto({ ...COMPLETO, email: '' })).toBe(false)
  })

  it('no hay campo de contrasena ni de DNI que completar', () => {
    // RF-01: el comprador no tiene cuenta. Si estos campos aparecieran, el
    // formulario estaria pidiendo algo que no existe del lado del backend.
    const campos = Object.keys(CAMPOS_VACIOS).join(',')
    expect(campos).not.toContain('password')
    expect(campos).not.toContain('clave')
    expect(campos).not.toContain('dni')
  })
})

describe('los errores de campo', () => {
  const ninguno = {
    nombre: false,
    apellido: false,
    telefono: false,
    email: false,
    direccion: false
  }

  it('un formulario recien abierto no muestra errores', () => {
    // Cinco campos en rojo al cargar parecen un formulario roto.
    expect(erroresDe(CAMPOS_VACIOS, ninguno)).toEqual({})
  })

  it('marca solo el campo que se toco y se dejo vacio', () => {
    const errores = erroresDe(
      { ...COMPLETO, telefono: '' },
      { ...ninguno, telefono: true }
    )

    expect(Object.keys(errores)).toEqual(['telefono'])
  })

  it('un campo tocado con contenido no da error', () => {
    const errores = erroresDe(COMPLETO, { ...ninguno, telefono: true })

    expect(errores).toEqual({})
  })
})
