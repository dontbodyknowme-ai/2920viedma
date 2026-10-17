import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Wine } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { primeraVisible } from '../../utils/permisos'
import { ApiError } from '../../api/client'

/**
 * Pantalla de acceso al panel.
 *
 * Se muestra en `/admin` cuando no hay sesion abierta. Es una pantalla completa,
 * no un modal sobre la tienda: el visitante llego escribiendo la URL, asi que
 * todavia no ve nada de la tienda y no hay nada que tapar.
 *
 * **El error se muestra debajo del campo y el foco vuelve a el.** Si el mensaje
 * apareciera arriba, el usuario tendria que volver a buscar el input. Con el
 * foco de vuelta, alcanza con escribir de nuevo.
 */

/**
 * El texto que ve la persona cuando el login falla.
 *
 * Es una funcion pura y exportada, no una constante: hay que poder probarla sin
 * montar el formulario entero, y los casos que importan —un `code` desconocido,
 * un error de red— no se reproducen tampoco desde el navegador.
 *
 * ## Por que traduce **aca** y no en `app.ts`
 *
 * `code` y `message` cumplen papeles distintos. El `code` es para que el
 * frontend **brinque** —`if (code === 'INVALID_CREDENTIALS')`—, y para eso tiene
 * que ser estable y legible por una máquina. El `message` es lo que lee una
 * persona, y solo el frontend sabe quien la esta mirando. Meter el texto humano
 * en el backend obliga a que cada consumidor pase por alto un `message` que ya
 * no es un codigo, que es justo la forma en que un `code` deja de ser confiable.
 *
 * ## La regla de fondo
 *
 * **Una persona nunca lee un identificador en este panel.** Por eso el
 * `default` es una frase en español y no el `message` crudo: cuando el backend
 * responde `401` con `{ code: 'INVALID_CREDENTIALS', message:
 * 'INVALID_CREDENTIALS' }` —y `app.ts:147` manda `message: error.message`, que
 * en `UnauthorizedError` **es** el codigo— el texto crudo seria el codigo. Con
 * el `default` generico, un `code` nuevo del backend degrada a una frase en vez
 * de filtrar un `CODIGO_NUEVO` a la pantalla.
 *
 * Un `Map` y no un objeto porque `code in MENSAJES` daria `true` para
 * `'constructor'`, `'toString'` y cualquier otro codigo que se colara.
 */
const MENSAJES = new Map<string, string>([
  ['INVALID_CREDENTIALS', 'Email o contrasena incorrectos.'],
  ['VALIDATION_ERROR', 'Revisa el email: no parece una direccion valida.'],
  ['FST_ERR_RATE_LIMIT', 'Demasiados intentos. Espera un minuto e intenta de nuevo.']
])

const GENERICO = 'No pudimos iniciar sesion. Revisa el email y la contrasena.'

export const mensajeDeLoginFallido = (error: unknown): string => {
  // La red se cayo antes de que el backend respondiera, o el navegador lo
  // bloqueo. `fetch` tira `TypeError` para eso en todos los navegadores, y no
  // hay ningun `code`: es el unico caso en que el problema **no** son las
  // credenciales, asi que decir "revisa la contrasena" seria mandar a buscar en
  // el lugar equivocado — otra vez.
  if (error instanceof TypeError) {
    return 'No pudimos contactar al servidor. Intenta de nuevo en un momento.'
  }

  const code = error instanceof ApiError ? error.code : undefined
  if (code !== undefined) return MENSAJES.get(code) ?? GENERICO

  return GENERICO
}

export const AdminGate = () => {
  const [clave, setClave] = useState('')
  // Vacio a proposito. Dejaba `admin@vinoteca.local` puesto, y con tres
  // cuentas eso obliga a cada vendedor a borrarlo a mano: un campo con texto
  // parece un valor real, no una sugerencia. El `placeholder` de mas abajo
  // sigue diciendo que formato se espera, que es para eso que esta el.
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [fallando, setFallando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const enviar = async (evento: React.FormEvent): Promise<void> => {
    evento.preventDefault()

    try {
      // El login entra por `useAuth().login()` y **no** por `api.auth.login()`.
      // La llamada cruda devuelve los tokens pero no toca ningun estado: el
      // token vive en el modulo `api` y el usuario en el `AuthProvider`, y las
      // dos cosas las setea el hook. Con la llamada directa, `isAuthenticated`
      // sigue en `false`, `AdminLayout` vuelve a renderizar `<AdminGate />` y
      // el formulario se limpia: bucle infinito **con la password correcta**.
      // Ese fue el bug que hacia el panel inaccesible.
      //
      // El `login` devuelve el usuario, y no se lee del contexto, porque dentro
      // del mismo `await` el `user` del closure es el de antes del login, o sea
      // `null`. Mandarlo siempre a `/admin`eria funcionar: el layout redirige
      // igual. Pero seria mandarlo a una URL que **sabe** que no puede ver.
      const usuario = await login(email, clave)
      navigate(primeraVisible(usuario.role) ?? '/admin', { replace: true })
    } catch (err: unknown) {
      setError(mensajeDeLoginFallido(err))
      setClave('')
      setFallando(true)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-marfil px-4 text-carbon'>
      <div className='w-full max-w-sm'>
        <div className='mb-6 text-center'>
          <Wine className='mx-auto h-10 w-10 text-verde-500' aria-hidden='true' />
          <h1 className='mt-3 font-serif text-2xl font-bold'>Administracion</h1>
          <p className='mt-1 text-sm text-neutral-600'>
            Esta seccion es restringida.
          </p>
        </div>

        <form
          onSubmit={enviar}
          noValidate
          className='rounded-2xl border border-neutral-200 bg-blanco p-6'
        >
          <label
            htmlFor='email-admin'
            className='mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-600'
          >
            Email
          </label>
          <input
            id='email-admin'
            type='email'
            autoComplete='email'
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error !== '') setError('')
            }}
            className='w-full rounded-xl border bg-blanco px-3 py-2.5 text-sm text-carbon placeholder-neutral-600 focus:outline-none focus:border-verde-salvia'
            placeholder='admin@vinoteca.local'
          />

          <label
            htmlFor='clave-admin'
            className='mt-4 mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-600'
          >
            Contrasena
          </label>
          <input
            id='clave-admin'
            type='password'
            autoFocus
            autoComplete='current-password'
            value={clave}
            onChange={(e) => {
              setClave(e.target.value)
              if (error !== '') setError('')
            }}
            className={[ 
              'w-full rounded-xl border bg-blanco px-3 py-2.5 text-sm',
              'text-carbon placeholder-neutral-600 focus:outline-none',
              error !== ''
                ? 'border-verde-500 focus:border-verde-300'
                : 'border-neutral-300 focus:border-verde-salvia'
            ].join(' ')}
            aria-invalid={error !== ''}
            aria-describedby={error !== '' ? 'error-clave' : undefined}
          />

          {error !== '' && (
            <p
              id='error-clave'
              role='alert'
              className={[ 
                'mt-2 rounded-lg border border-verde-500/50 bg-verde-800/40 px-3 py-2 text-sm',
                fallando ? 'animate-pulse' : ''
              ].join(' ')}
            >
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={clave === '' || email === ''}
            className='mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-verde-500/40 bg-verde-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-blanco transition-colors hover:bg-verde-600 disabled:cursor-not-allowed disabled:opacity-40'
          >
            <KeyRound className='h-4 w-4' aria-hidden='true' />
            Entrar
          </button>
        </form>

        <p className='mt-4 text-center text-xs text-neutral-600'>
          Acceso de prueba. La contrasena se valida contra el backend real.
        </p>
      </div>
    </div>
  )
}