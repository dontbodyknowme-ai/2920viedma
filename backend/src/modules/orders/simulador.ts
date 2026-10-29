import type { FastifyInstance } from 'fastify'
import { obtenerSimuladorNave } from '../pagos/nave/index.js'
import { aplicarPago } from './service.js'

/**
 * La pasarela simulada (spec 012, T021).
 *
 * ## Por que esto es codigo de produccion y no de test
 *
 * Porque tiene que viajar en el build: el que prueba en Render con
 * `NAVE_MODE=mock` no tiene `tsx` ni el repo, tiene la imagen. Y porque el
 * circuito que se quiere validar es el **real**: el `checkoutUrl` que devuelve
 * el proveedor, la pagina a la que manda, el pago que se "aprueba" y la orden
 * que cambia de estado por `aplicarPago`.
 *
 * Lo que no viaja son las rutas: `simuladorRoutes` no registra nada si no hay
 * simulador (o sea, si `NAVE_MODE` no es `mock`). En produccion devuelven 404
 * como cualquier ruta inexistente.
 *
 * ## Por que HTML y no un JSON
 *
 * Esto lo abre una persona en el celular, desde el link de pago. Un JSON es
 * ilegible ahi. Y es la unica respuesta de la app que se renderiza asi: el resto
 * es API. No justifica un motor de plantillas.
 */

const escapar = (valor: string): string =>
  valor.replace(/[&<>"']/g, (caracter) => {
    const mapa: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return mapa[caracter] ?? caracter
  })

const pesos = (monto: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)

const pagina = (contenido: string, titulo: string): string => `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#121212; color:#f5f0e8; font:16px/1.5 system-ui, -apple-system, sans-serif; padding:24px; }
  main { width:100%; max-width:420px; background:#1b1b1b; border:1px solid #333; border-radius:18px; padding:28px; }
  h1 { font-size:20px; margin:0 0 4px; }
  p { color:#a3a3a3; margin:8px 0; }
  .monto { font-size:32px; font-weight:700; color:#e8c46a; margin:16px 0; }
  .fila { display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-top:1px solid #2c2c2c; font-size:14px; }
  .fila span:first-child { color:#8a8a8a; }
  button { width:100%; padding:14px; border-radius:12px; border:0; font-size:15px; font-weight:600;
           margin-top:10px; cursor:pointer; }
  .ok { background:#2f7d4f; color:#fff; }
  .no { background:#7d2f3a; color:#fff; }
  .vencido { background:#3a3a3a; color:#ddd; }
  .nota { margin-top:18px; font-size:12px; color:#8a8a8a; border-top:1px solid #2c2c2c; padding-top:14px; }
  a { color:#e8c46a; }
</style>
</head>
<body><main>${contenido}</main></body>
</html>`

export const simuladorRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const simulador = obtenerSimuladorNave()

  // Sin simulador no se registra **nada**: en sandbox y produccion estas rutas
  // tienen que ser tan inexistentes como cualquier otra que no exista.
  if (simulador === null) return

  fastify.get('/pago-simulado/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const cobro = simulador.ver(id)

    if (cobro === null) {
      return reply.status(404).type('text/html').send(pagina('<h1>Link vencido</h1><p>Este cobro simulado no existe.</p>', 'No encontrado'))
    }

    const resuelto = cobro.estado === 'aprobado' || cobro.estado === 'rechazado' || cobro.estado === 'vencido'

    const acciones = resuelto
      ? `<p>Este cobro ya esta <strong>${escapar(cobro.estado)}</strong>.</p>
         <p class="nota">Volvé a la tienda para ver el estado del pedido.</p>`
      : `<form method="post" action="/pago-simulado/${escapar(id)}/aprobado">
           <button class="ok" type="submit">Simular pago aprobado</button>
         </form>
         <form method="post" action="/pago-simulado/${escapar(id)}/rechazado">
           <button class="no" type="submit">Simular rechazo</button>
         </form>
         <form method="post" action="/pago-simulado/${escapar(id)}/vencido">
           <button class="vencido" type="submit">Simular vencimiento</button>
         </form>`

    return reply
      .type('text/html')
      .send(
        pagina(
          `<h1>Pasarela simulada</h1>
           <p>NAVE_MODE=mock · ningun dinero se mueve</p>
           <div class="monto">${pesos(cobro.monto)}</div>
           <div class="fila"><span>Cobro</span><span>${escapar(cobro.id)}</span></div>
           <div class="fila"><span>Pedido</span><span>${escapar(cobro.externalReference ?? '-')}</span></div>
           <div class="fila"><span>Estado</span><span>${escapar(cobro.estado)}</span></div>
           ${acciones}
           <p class="nota">Esta pagina solo existe con NAVE_MODE=mock. En sandbox y produccion
           el comprador va al checkout real de Nave.</p>`,
          'Pasarela simulada'
        )
      )
  })

  fastify.post('/pago-simulado/:id/:resultado', async (request, reply) => {
    const { id, resultado } = request.params as { id: string; resultado: string }

    const mapa: Record<string, 'aprobado' | 'rechazado' | 'vencido'> = {
      aprobado: 'aprobado',
      rechazado: 'rechazado',
      vencido: 'vencido'
    }

    const estado = mapa[resultado]
    if (estado === undefined) return reply.status(404).send({ code: 'NOT_FOUND', message: 'Resultado desconocido' })

    if (!simulador.cambiarEstado(id, estado)) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Cobro desconocido' })
    }

    /**
     * Se aplica el pago **por el mismo camino** que el webhook real.
     *
     * Llamar a `aplicarPago` aca y no en la pagina del pedido hace que la
     * simulacion pruebe la transicion condicional de verdad: si se rompe la
     * idempotencia, se rompe tambien con el simulador.
     */
    if (estado !== 'vencido') {
      await aplicarPago(fastify.prisma, id, 'Nave')
    }

    return reply.redirect(`/pago-simulado/${encodeURIComponent(id)}`, 303)
  })

  fastify.get('/pago-simulado/:id/qr.svg', async (request, reply) => {
    const { id } = request.params as { id: string }
    const cobro = simulador.ver(id)

    if (cobro === null) return reply.status(404).send({ code: 'NOT_FOUND', message: 'Cobro desconocido' })

    /**
     * **No es un QR.** Es un SVG que lo dice.
     *
     * Dibujar un patron que parezca un QR y no se pueda escanear es peor que no
     * tener QR: alguien lo apunta con el celular, no pasa nada, y concluye que
     * la tienda esta rota. Con el texto "SIMULADO" el malentendido no existe.
     */
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="QR simulado">
  <rect width="240" height="240" fill="#ffffff"/>
  <rect x="16" y="16" width="208" height="208" fill="none" stroke="#111" stroke-width="6" stroke-dasharray="14 10"/>
  <text x="120" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#111">SIMULADO</text>
  <text x="120" y="140" text-anchor="middle" font-family="monospace" font-size="11" fill="#444">${escapar(id)}</text>
  <text x="120" y="164" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#666">NAVE_MODE=mock</text>
</svg>`

    return reply.type('image/svg+xml').send(svg)
  })
}
