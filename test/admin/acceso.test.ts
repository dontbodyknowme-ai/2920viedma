import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  cerrarSesionAdmin,
  haySesionAdmin,
  iniciarSesionAdmin
} from '../../src/utils/admin_acceso'

/**
 * Acceso al panel.
 *
 * Lo que se fija aca es la decision de no tener boton de acceso en la tienda, y
 * que la clave no se quede abierta en el panel por un descuido de estado.
 */

describe('sesion del panel', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('no hay sesion al empezar', () => {
    expect(haySesionAdmin()).toBe(false)
  })

  it('la clave incorrecta no abre sesion', () => {
    expect(iniciarSesionAdmin('no-es-la-clave')).toBe(false)
    expect(haySesionAdmin()).toBe(false)
  })

  it('la clave vacia no abre sesion', () => {
    // Un campo vacio pasa la validacion de `required` del navegador, asi que
    // el gate tiene que rechazarlo por su cuenta igual.
    expect(iniciarSesionAdmin('')).toBe(false)
    expect(haySesionAdmin()).toBe(false)
  })

  it('la clave correcta abre sesion', () => {
    // `admin123` es la de por defecto de `src/utils/admin_acceso.ts`.
    expect(iniciarSesionAdmin('admin123')).toBe(true)
    expect(haySesionAdmin()).toBe(true)
  })

  it('cerrar sesion deja al panel cerrado', () => {
    iniciarSesionAdmin('admin123')
    cerrarSesionAdmin()

    expect(haySesionAdmin()).toBe(false)
  })

  it('cerrar sesion sin sesion abierta no rompe nada', () => {
    expect(() => cerrarSesionAdmin()).not.toThrow()
    expect(haySesionAdmin()).toBe(false)
  })

  it('la sesion vive en sessionStorage, no en localStorage', () => {
    // Con `localStorage`, el acceso quedaria dado por semanas en una maquina
    // compartida sin que nadie haya vuelto a pedir la clave.
    iniciarSesionAdmin('admin123')

    expect(sessionStorage.getItem('admin_sesion')).toBe('abierta')
    expect(localStorage.getItem('admin_sesion')).toBeNull()
  })

  it('un flag antiguo en localStorage no abre el panel', () => {
    // La 004-a dejo antes un flag `isAdmin` que se activaba con un boton
    // publico. Queda el flag pegado en el localStorage de cualquiera que haya
    // probado esa version: no puede seguir abriendo la puerta.
    localStorage.setItem('isAdmin', 'true')

    expect(haySesionAdmin()).toBe(false)
  })

  it('la comparacion de claves distingue mayusculas', () => {
    // Una clave no es un texto que se pueda normalizar: `Admin123` es otra clave.
    expect(iniciarSesionAdmin('Admin123')).toBe(false)
    expect(iniciarSesionAdmin('ADMIN123')).toBe(false)
  })

  it('el error de clave incorrecta no dice cual era la correcta', () => {
    // El gate muestra el mismo texto para "clave incorrecta" que para cualquier
    // otro fallo. Acá se comprueba que la funcion no distingue: si distinguiera,
    // el mensaje cambiaria y serviria de oraculo para adivinar.
    const primerIntento = iniciarSesionAdmin('cualquier-cosa')
    const segundoIntento = iniciarSesionAdmin('otra-cosa-distinta')

    expect(primerIntento).toBe(segundoIntento)
  })
})