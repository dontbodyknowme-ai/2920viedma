import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Wine } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { primeraVisible } from '../../utils/permisos'

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

export const AdminGate = () => {
  const [clave, setClave] = useState('')
  const [email, setEmail] = useState('admin@vinoteca.local')
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
      const mensaje = err instanceof Error ? err.message : 'Contrasena incorrecta.'
      setError(mensaje)
      setClave('')
      setFallando(true)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-charcoal-950 px-4 text-cream-100'>
      <div className='w-full max-w-sm'>
        <div className='mb-6 text-center'>
          <Wine className='mx-auto h-10 w-10 text-wine-500' aria-hidden='true' />
          <h1 className='mt-3 font-serif text-2xl font-bold'>Administracion</h1>
          <p className='mt-1 text-sm text-neutral-400'>
            Esta seccion es restringida.
          </p>
        </div>

        <form
          onSubmit={enviar}
          noValidate
          className='rounded-2xl border border-neutral-800 bg-charcoal-900 p-6'
        >
          <label
            htmlFor='email-admin'
            className='mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-400'
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
            className='w-full rounded-xl border bg-charcoal-800 px-3 py-2.5 text-sm text-cream-100 placeholder-neutral-600 focus:outline-none focus:border-gold-500'
            placeholder='admin@vinoteca.local'
          />

          <label
            htmlFor='clave-admin'
            className='mt-4 mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-400'
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
              'w-full rounded-xl border bg-charcoal-800 px-3 py-2.5 text-sm',
              'text-cream-100 placeholder-neutral-600 focus:outline-none',
              error !== ''
                ? 'border-wine-500 focus:border-wine-400'
                : 'border-neutral-700 focus:border-gold-500'
            ].join(' ')}
            aria-invalid={error !== ''}
            aria-describedby={error !== '' ? 'error-clave' : undefined}
          />

          {error !== '' && (
            <p
              id='error-clave'
              role='alert'
              className={[ 
                'mt-2 rounded-lg border border-wine-500/50 bg-wine-900/40 px-3 py-2 text-sm',
                fallando ? 'animate-pulse' : ''
              ].join(' ')}
            >
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={clave === '' || email === ''}
            className='mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-wine-500/40 bg-wine-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cream-100 transition-colors hover:bg-wine-500 disabled:cursor-not-allowed disabled:opacity-40'
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