import { describe, expect, it, vi } from 'vitest'
import {
  crearClienteNaveHttp,
  leerConfigNave,
  primerCampo,
  type ConfigNave,
  type FuenteConfigNave
} from '../../src/modules/pagos/nave/http.js'
import { aUnidadDeNave, deUnidadDeNave } from '../../src/modules/pagos/nave/money.js'
import { traducirEstado, esEstadoConocido } from '../../src/modules/pagos/nave/status-map.js'
import { crearProveedorNave, obtenerSimuladorNave, proveedorDesdeCliente } from '../../src/modules/pagos/nave/index.js'
import { SimuladorNave } from '../../src/modules/pagos/nave/mock.js'
import type { ClienteNave, SolicitudCobro } from '../../src/modules/pagos/nave/types.js'

/**
 * El modulo de Nave, sin red (spec 012, T024/T025).
 *
 * La documentacion oficial todavia no esta (T001), asi que lo que **si** se
 * puede verificar es lo que no depende de ella: que la configuracion falle
 * cerrado, que el token se cachee, que el dinero no se convierta dos veces y que
 * la tabla de estados no invente resultados.
 */

const CONFIG: ConfigNave = {
  baseUrl: 'https://api.nave.test',
  tokenPath: '/oauth/token',
  paymentPath: '/payments',
  clientId: 'id',
  clientSecret: 'secreto',
  posId: 'pos-1'
}

const SOLICITUD: SolicitudCobro = {
  referencia: 'ord_1',
  total: 10000,
  lineas: [{ nombre: 'Malbec', cantidad: 2, precioUnitario: 5000 }],
  pagador: {
    nombre: 'María',
    apellido: 'González',
    email: 'maria@example.com',
    telefono: '1112345678',
    direccion: 'Corrientes 1234'
  },
  urls: {
    exito: 'http://localhost:5173/pedido/token',
    fallo: 'http://localhost:5173/pedido/token?pago=fallido',
    pendiente: 'http://localhost:5173/pedido/token?pago=pendiente',
    webhook: 'http://localhost:3000/api/orders/webhook/nave'
  }
}

const respuesta = (body: unknown, ok = true, status = 200): Response =>
  ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  }) as unknown as Response

describe('configuracion: falla cerrado', () => {
  it('sin variables dice EXACTAMENTE cuales faltan', () => {
    const leida = leerConfigNave({})

    expect('faltan' in leida).toBe(true)
    if ('faltan' in leida) {
      expect(leida.faltan).toContain('NAVE_API_BASE')
      expect(leida.faltan).toContain('NAVE_CLIENT_SECRET')
    }
  })

  it('con una vacia tambien falla: "" no es un valor', () => {
    const fuente: FuenteConfigNave = {
      NAVE_API_BASE: 'https://api.nave.test',
      NAVE_TOKEN_PATH: '/oauth/token',
      NAVE_PAYMENT_PATH: '/payments',
      NAVE_CLIENT_ID: 'id',
      NAVE_CLIENT_SECRET: '   ',
      NAVE_POS_ID: 'pos-1'
    }

    const leida = leerConfigNave(fuente)

    expect('faltan' in leida).toBe(true)
    if ('faltan' in leida) expect(leida.faltan).toEqual(['NAVE_CLIENT_SECRET'])
  })

  it('con todo completo normaliza la base sin la barra final', () => {
    const leida = leerConfigNave({
      NAVE_API_BASE: 'https://api.nave.test/',
      NAVE_TOKEN_PATH: '/oauth/token',
      NAVE_PAYMENT_PATH: '/payments',
      NAVE_CLIENT_ID: 'id',
      NAVE_CLIENT_SECRET: 'secreto',
      NAVE_POS_ID: 'pos-1'
    })

    expect('config' in leida).toBe(true)
    if ('config' in leida) expect(leida.config.baseUrl).toBe('https://api.nave.test')
  })
})

describe('money: una sola conversion', () => {
  it('ida y vuelta no cambia el monto', () => {
    expect(deUnidadDeNave(aUnidadDeNave(1500))).toBe(1500)
  })

  it('ida y vuelta con un total que no es multiplo de 100', () => {
    // Hoy las dos funciones son la identidad porque no esta confirmado que Nave
    // use centavos (T001). El dia que lo este, `aUnidadDeNave` multiplica por
    // 100 y `deUnidadDeNave` divide: un total como 15.347 es el que delata un
    // redondeo mal hecho, porque 15347 * 100 = 1534700 y volver tiene que dar
    // exactamente 15347. El test fija la invariante desde ahora.
    expect(deUnidadDeNave(aUnidadDeNave(15347))).toBe(15347)
    expect(Number.isInteger(aUnidadDeNave(15347))).toBe(true)
  })
})

describe('el simulador y produccion', () => {
  it('los ids no se repiten aunque el proceso se reinicie', async () => {
    // `PaymentAttempt.referenciaExterna` es `@unique` en Postgres, y en
    // desarrollo el que la llena es este simulador. Con un contador en memoria,
    // el reinicio lo devolvia a 1 y el primer cobro de la corrida nueva chocaba
    // con la fila de la anterior (`P2002`): el intento se marcaba `expirado` y
    // el checkout respondia 502. En Render free el proceso se duerme y despierta
    // seguido, asi que no es un caso raro.
    const primeraCorrida = new SimuladorNave('https://api.test')
    const primero = await primeraCorrida.crearCobro(SOLICITUD)
    const segundo = await primeraCorrida.crearCobro(SOLICITUD)

    const segundaCorrida = new SimuladorNave('https://api.test')
    const despuesDelReinicio = await segundaCorrida.crearCobro(SOLICITUD)

    expect(primero.id).not.toBe(segundo.id)
    expect(despuesDelReinicio.id).not.toBe(primero.id)
  })

  it('con produccion=true no registra el simulador publico', () => {
    // `NAVE_MODE=mock` registra `/pago-simulado/:id/aprobado`, que llama a
    // `aplicarPago` **sin autenticacion**: cualquiera con un link de checkout se
    // acredita el pedido. Con `NODE_ENV=production` no se registra y el
    // proveedor falla con el motivo exacto en vez del generico.
    const resultado = crearProveedorNave('mock', {}, {
      baseUrl: 'https://api.test',
      produccion: true
    })

    expect(resultado.simulador).toBeNull()
    expect(resultado.problema).toContain('NODE_ENV=production')
    expect(obtenerSimuladorNave()).toBeNull()
  })

  it('fuera de produccion si lo registra: es el circuito de prueba', () => {
    const resultado = crearProveedorNave('mock', {}, {
      baseUrl: 'https://api.test',
      produccion: false
    })

    expect(resultado.simulador).not.toBeNull()
    expect(obtenerSimuladorNave()).not.toBeNull()
  })
})

describe('estados: no se inventan resultados', () => {
  it('traduce los estados conocidos y normaliza mayusculas', () => {
    expect(traducirEstado('APPROVED')).toBe('approved')
    expect(traducirEstado(' Pagado ')).toBe('approved')
    expect(traducirEstado('rejected')).toBe('rejected')
    expect(traducirEstado('expired')).toBe('expirado')
  })

  it('un estado desconocido se devuelve crudo', () => {
    // Mapearlo a `rechazado` degradaria un pedido aprobado, y a `aprobado`
    // seria peor. `aplicarPago` no lo encuentra y no cambia nada.
    expect(traducirEstado('refunded')).toBe('refunded')
    expect(esEstadoConocido('refunded')).toBe(false)
  })
})

describe('el cliente HTTP', () => {
  it('cachea el token entre cobros', async () => {
    const pedir = vi.fn(async (url: string) =>
      String(url).includes('/oauth/token')
        ? respuesta({ access_token: 'tok', expires_in: 3600 })
        : respuesta({ id: 'p1', checkout_url: 'https://nave.test/pagar/p1' })
    )

    const cliente = crearClienteNaveHttp(CONFIG, { fetchImpl: pedir })

    await cliente.crearCobro(SOLICITUD)
    await cliente.crearCobro(SOLICITUD)

    const pedidosDeToken = pedir.mock.calls.filter(([url]) => String(url).includes('/oauth/token'))
    expect(pedidosDeToken).toHaveLength(1)
    expect(pedir).toHaveBeenCalledTimes(3)
  })

  it('el monto viaja en pesos enteros, una sola vez', async () => {
    const pedir = vi.fn(async (url: string) => {
      if (String(url).includes('/oauth/token')) return respuesta({ access_token: 'tok', expires_in: 3600 })
      return respuesta({ id: 'p1', checkout_url: 'https://nave.test/pagar/p1' }, true)
    })

    const cliente = crearClienteNaveHttp(CONFIG, { fetchImpl: pedir })
    await cliente.crearCobro(SOLICITUD)

    const llamadaAlCobro = pedir.mock.calls.find(([url]) => String(url).includes('/payments'))
    const cuerpo = JSON.parse(String(llamadaAlCobro?.[1]?.body)) as { amount: number }

    expect(cuerpo.amount).toBe(10000)
  })

  it('falla con un mensaje util si el cobro no trae id o URL', async () => {
    const cliente = crearClienteNaveHttp(CONFIG, {
      fetchImpl: vi.fn(async (url: string) =>
        String(url).includes('/oauth/token')
          ? respuesta({ access_token: 'tok', expires_in: 3600 })
          : respuesta({ id: 'p1' })
      )
    })

    await expect(cliente.crearCobro(SOLICITUD)).rejects.toThrow(/sin id o sin URL de checkout/)
  })

  it('no manda el token en la query string', async () => {
    const pedir = vi.fn(async (url: string) =>
      String(url).includes('/oauth/token')
        ? respuesta({ access_token: 'tok', expires_in: 3600 })
        : respuesta({ id: 'p1', checkout_url: 'https://nave.test/pagar/p1' })
    )

    await crearClienteNaveHttp(CONFIG, { fetchImpl: pedir }).crearCobro(SOLICITUD)

    const alCobro = pedir.mock.calls.find(([url]) => String(url).includes('/payments'))
    expect(String(alCobro?.[0])).not.toContain('tok')
    expect((alCobro?.[1]?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })
})

describe('el adaptador', () => {
  it('traduce el estado al vocabulario de aplicarPago', async () => {
    const cliente: ClienteNave = {
      crearCobro: async () => ({
        id: 'c1',
        checkoutUrl: 'https://nave.test/pagar/c1',
        qr: { payload: 'p' },
        expiraEn: new Date('2026-10-28T13:00:00Z')
      }),
      estadoDe: async () => ({
        id: 'c1',
        estado: 'aprobado',
        monto: 10000,
        externalReference: 'ord_1',
        fechaAprobacion: null,
        expiraEn: null
      })
    }

    const proveedor = proveedorDesdeCliente(cliente)

    expect(await proveedor.estadoDe('c1')).toMatchObject({ estado: 'approved', monto: 10000 })
    expect(await proveedor.crearPreference(SOLICITUD)).toMatchObject({
      id: 'c1',
      initPoint: 'https://nave.test/pagar/c1',
      qr: { payload: 'p' },
      expiraEn: '2026-10-28T13:00:00.000Z'
    })
  })
})

describe('primerCampo', () => {
  it('devuelve el primer valor no vacio', () => {
    expect(primerCampo({ a: null, b: '', c: 'valor' }, ['a', 'b', 'c'])).toBe('valor')
    expect(primerCampo({ a: 0 }, ['a'])).toBe(0)
    expect(primerCampo({}, ['a'])).toBeNull()
  })
})
