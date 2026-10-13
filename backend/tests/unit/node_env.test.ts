import { describe, expect, it, vi } from 'vitest'

/**
 * `NODE_ENV` mal puesto no rompe nada: apaga cosas en silencio.
 *
 * Paso real: en Render faltaba `NODE_ENV=production`. La app arranco, el
 * build paso, `/health` dio 200 con `db: connected`... y la sesion del panel
 * se perdia en cada recarga de pagina, porque la cookie de refresh salia
 *
 *   SameSite=Lax  (sin Secure)
 *
 * en vez de `SameSite=None`. Los dos atributos dependen de `NODE_ENV`, asi que
 * un valor equivocado desactiva una proteccion sin que nada se queje.
 *
 * Estos tests fijan el aviso para que un despliegue mal configurado **diga**
 * que lo esta, en vez de dejar que se descubra en una demo.
 */

const montar = async (nodeEnv: string, publicApiUrl: string) => {
  vi.resetModules()

  const previos = {
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_API_URL: process.env.PUBLIC_API_URL
  }

  process.env.NODE_ENV = nodeEnv
  process.env.PUBLIC_API_URL = publicApiUrl

  const escrito = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

  try {
    await import('../../src/config/env.js')
    return escrito.mock.calls.map((c) => String(c[0])).join('')
  } finally {
    escrito.mockRestore()
    process.env.NODE_ENV = previos.NODE_ENV
    process.env.PUBLIC_API_URL = previos.PUBLIC_API_URL
  }
}

describe('NODE_ENV', () => {
  it('avisa si parece produccion pero no dice NODE_ENV=production', async () => {
    const salida = await montar('development', 'https://vinoteca-cava.vercel.app')

    expect(salida).toContain('AVISO')
    expect(salida).toContain('NODE_ENV')
    // El aviso tiene que decir la consecuencia, no solo el sintoma.
    expect(salida).toMatch(/SameSite/i)
  })

  it('no dice nada si todo esta en production', async () => {
    const salida = await montar('production', 'https://vinoteca-cava.vercel.app')

    expect(salida).not.toContain('AVISO')
  })

  it('no dice nada en desarrollo local', async () => {
    // `PUBLIC_API_URL` en `http://localhost` es la señal de que si es local.
    // Ahi el aviso seria un falso positivo.
    const salida = await montar('development', 'http://localhost:3000')

    expect(salida).not.toContain('AVISO')
  })
})
