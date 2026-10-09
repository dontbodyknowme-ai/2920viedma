/**
 * Control de acceso al panel de administracion.
 *
 * **No hay boton de acceso en la tienda.** Al panel se entra escribiendo
 * `/admin` en la barra de direcciones, y ahi aparece el pedido de contrasena.
 * La barra de navegacion publica no menciona que exista un panel: un boton
 * "Modo Admin" le comunicaria a cualquier visitante que hay una seccion
 * restringida y como alcanzarla.
 *
 * ## Esto no es autenticacion
 *
 * La contrasena se compara en el navegador, contra un valor que viaja en el
 * bundle de JavaScript. Cualquiera que abra la consola del navegador puede
 * leerla. **Sirve para que el panel no quede abierto a un clic de cualquiera,
 * no para proteger datos.** Es un mock, y la razon es que todavia no hay
 * backend: no hay servidor contra el cual validar.
 *
 * Cuando exista la API de la spec 004-b, este archivo se reemplaza por una
 * llamada a `POST /api/auth/login` que devuelva un token, y el token se
 * valida en cada request. Nada de lo de aca sobrevive a ese cambio salvo el
 * formulario del prompt.
 *
 * ## Donde va la contrasena
 *
 * Se lee de `VITE_ADMIN_PASSWORD`. Si no esta definida, se usa `admin123`, que
 * es solo para desarrollo: con la de por defecto, cualquiera que abra el codigo
 * fuente puede entrar. En un despliegue hay que definir la variable.
 *
 * `VITE_` es el prefijo que Vite expone al bundle del navegador. Cualquier
 * variable con ese prefijo es publica, y por eso justamente este approach no
 * puede ser autenticacion real.
 */

/** Clave de la sesion abierta. */
const CLAVE_SESION = 'admin_sesion'

/**
 * Contrasena por defecto de desarrollo.
 *
 * Va en el codigo a proposito, y no es un olvido: es la unica forma de que el
 * panel funcione en una copia del repo sin configurar nada. El comentario de
 * arriba dice que no protege nada.
 */
const CLAVE_POR_DEFECTO = 'admin123'

const claveEsperada = (): string => {
  // `import.meta.env` se lee en un `try` porque un test corre en Node sin que
  // Vite reemplace la expression, y ahi `import.meta.env` es `undefined`.
  try {
    const desdeEntorno = import.meta.env?.VITE_ADMIN_PASSWORD
    return typeof desdeEntorno === 'string' && desdeEntorno !== ''
      ? desdeEntorno
      : CLAVE_POR_DEFECTO
  } catch {
    return CLAVE_POR_DEFECTO
  }
}

/**
 * `sessionStorage` y no `localStorage`.
 *
 * La sesion del panel dura lo que dura la pestana. Con `localStorage` el
 * acceso quedaria dado por semanas en una maquina compartida, sin que nadie
 * haya vuelto a pedir la contrasena. Cerrar la pestana es la forma de salir,
 * y hay un "Cerrar sesion" explicito en el header.
 */
const leerSesion = (): boolean => {
  try {
    return sessionStorage.getItem(CLAVE_SESION) === 'abierta'
  } catch {
    // Sin almacenamiento la sesion no se puede dar: es el estado seguro.
    return false
  }
}

export const haySesionAdmin = (): boolean => leerSesion()

/**
 * Valida la contrasena y abre sesion si coincide.
 *
 * Devuelve `true` o `false` y no tira: el formulario necesita distinguir
 * "clave incorrecta" de "algo fallo", y el mensaje va al usuario.
 */
export const iniciarSesionAdmin = (clave: string): boolean => {
  if (clave !== claveEsperada()) return false

  try {
    sessionStorage.setItem(CLAVE_SESION, 'abierta')
    return true
  } catch {
    // Si no se puede guardar la sesion, se deja pasar igual: sin persistencia
    // el panel funciona, pero habra que poner la clave en cada recarga.
    return true
  }
}

export const cerrarSesionAdmin = (): void => {
  try {
    sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // ignore
  }
}