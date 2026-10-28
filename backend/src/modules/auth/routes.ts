import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { authService } from './service.js'
import { env } from '../../config/env.js'
import { UnauthorizedError, ForbiddenError } from '../../utils/errors.js'
import { authenticate } from './middleware.js'

/**
 * Atributos de la cookie de refresh. **En una sola funcion**, porque el
 * `clearCookie` tiene que usar exactamente los mismos: si difieren en un
 * atributo, el navegador no encuentra la cookie que borrar y el logout deja de
 * cerrar la sesion.
 *
 * `sameSite` es lo que rompia la sesion en produccion. El frontend vive en
 * `vinoteca-cava.vercel.app` y la API en `vinoteca-cava.onrender.com`: son
 * **sitios distintos**, asi que cualquier `fetch` entre ellos es cross-site. Con
 * `lax` el navegador manda la cookie solo en navegaciones de primer nivel
 * (es decir, cuando el usuario escribe la URL o entra por un link), no en un
 * `fetch` desde JavaScript. Como la sesion vive en memoria (`src/api/client.ts`)
 * y se rehidrata con `/api/auth/refresh`, el resultado era:
 *
 *   - login  -> 200, el panel abre
 *   - F5     -> el modulo se reinicia, `/api/auth/refresh` llega sin cookie,
 *               responde 401, y el gate vuelve a pedir la contrasena
 *
 * O sea: la sesion duraba hasta el primer refresh de pagina. En local nunca se
 * ve, porque `localhost:5173` y `localhost:3000` son el mismo sitio y `lax`
 * alcanza.
 *
 * `SameSite=None` es la unica forma de que viaje cross-site, y los navegadores
 * lo **rechazan sin `Secure`**, asi que en produccion los dos van juntos.
 */
const opcionesCookie = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  // La cookie solo viaja a los endpoints de auth, no a toda la API: reduce la
  // superficie de robo (logs, proxies) y es lo que exige el navegador para
  // que el clearCookie del logout encuentre la cookie que borrar.
  path: '/api/auth'
})

/**
 * Verifica el origen de los requests que usan la cookie de refresh.
 *
 * Con `SameSite=None` (produccion, cross-site) un sitio malicioso puede
 * disparar un fetch con credenciales; si el `Origin` esta presente y no es uno
 * de los permitidos, se rechaza. Si no viene `Origin` (scripts, tests), se
 * permite: los navegadores siempre lo mandan en un POST cross-origin.
 */
const verificarOrigen = async (request: FastifyRequest): Promise<void> => {
  const origin = request.headers.origin
  if (origin === undefined) return
  if (!env.CORS_ORIGIN.includes(origin)) {
    throw new ForbiddenError()
  }
}

export const authRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: env.LOGIN_RATE_MAX,
          timeWindow: env.RATE_LIMIT_WINDOW,
          keyGenerator: (request) => request.ip
        }
      },
      schema: jsonSchemas.login
    },
    async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
      const { accessToken, refreshToken, user } = await authService.login(request.body.email, request.body.password)

      reply.setCookie('refreshToken', refreshToken, opcionesCookie())

      return { accessToken, user }
    }
  )

  fastify.post(
    '/api/auth/refresh',
    {
      preHandler: verificarOrigen,
      schema: jsonSchemas.refresh
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookie = request.cookies.refreshToken
      if (!cookie) {
        reply.clearCookie('refreshToken', opcionesCookie())
        throw new UnauthorizedError('INVALID_REFRESH_TOKEN')
      }

      const { accessToken, refreshToken, user } = await authService.refresh(cookie)

      reply.setCookie('refreshToken', refreshToken, opcionesCookie())

      return { accessToken, user }
    }
  )

  fastify.post(
    '/api/auth/logout',
    {
      preHandler: verificarOrigen,
      schema: jsonSchemas.logout
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookie = request.cookies.refreshToken
      if (cookie) {
        await authService.logout(cookie)
      }
      reply.clearCookie('refreshToken', opcionesCookie())
      return reply.status(204).send()
    }
  )

  fastify.get(
    '/api/auth/me',
    {
      preHandler: authenticate,
      schema: jsonSchemas.me
    },
    async (request: FastifyRequest) => {
      return request.user ? {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        role: request.user.role
      } : null
    }
  )
}