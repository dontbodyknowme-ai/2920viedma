import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  wineCreateSchema,
  wineUpdateSchema,
  wineIdParamSchema,
  wineQuerySchema,
  importResultSchema,
  orderQuerySchema,
  orderIdParamSchema,
  orderUpdateSchema,
  customerQuerySchema,
  customerIdParamSchema,
  customerUpdateSchema,
  uploadIdParamSchema
} from './schemas.js'

const toJsonSchema = (schema: any) => zodToJsonSchema(schema, { $refStrategy: 'none' })

/**
 * Objeto "documentado pero no recortado".
 *
 * Fastify **no** serializa con `JSON.stringify`: compila el `response.schema`
 * con `fast-json-stringify`, y ese serializador **descarta toda propiedad que
 * no este declarada**. Un `{ type: 'object' }` a secas no declara ninguna, asi
 * que devuelve `{}`:
 *
 *   s({ type: 'object', properties: { user: { type: 'object' } } })
 *     ({ accessToken: 'abc', user: { id: '1', role: 'admin' } })
 *   // -> {"accessToken":"abc","user":{}}      <-- el usuario desaparece
 *
 * Eso rompia la integracion entera sin que nada diera error: el login
 * respondia 200 con `user: {}`, `hasRole('admin')` daba `false` y el boton de
 * "Panel Admin" no aparecia hasta recargar la pagina (recien ahi entra por
 * `/auth/me`, que si tiene schema completo). Las metricas del dashboard
 * volvian `{}` y el alta de vinos contestaba 201 con cuerpo vacio.
 *
 * `additionalProperties: true` le dice al serializador que conserve lo que no
 * este declarado. Las `properties` que si aparecen siguen documentando en
 * Swagger: estos schemas son documentacion, no contratos cerrados. Convertir
 * cada respuesta en un contrato validado es trabajo aparte, endpoint por
 * endpoint.
 */
const objetoLibre = (): { type: 'object'; additionalProperties: true } => ({
  type: 'object',
  additionalProperties: true
})

const errorLibre = {
  type: 'object' as const,
  properties: { code: { type: 'string' }, message: { type: 'string' } },
  additionalProperties: true
}

export const jsonSchemas = {
  login: {
    body: toJsonSchema(loginSchema),
    response: {
      200: {
        type: 'object',
        properties: { accessToken: { type: 'string' }, user: objetoLibre() },
        additionalProperties: true
      },
      401: errorLibre,
      429: errorLibre
    }
  },
  refresh: {
    body: toJsonSchema(refreshSchema),
    response: {
      200: {
        type: 'object',
        properties: { accessToken: { type: 'string' }, user: objetoLibre() },
        additionalProperties: true
      },
      401: errorLibre
    }
  },
  logout: {
    body: toJsonSchema(logoutSchema),
    response: {
      204: { type: 'null' },
      401: errorLibre
    }
  },
  me: {
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' }
        },
        additionalProperties: true
      },
      401: errorLibre
    }
  },
  wines: {
    list: {
      querystring: toJsonSchema(wineQuerySchema),
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          },
          additionalProperties: true
        }
      }
    },
    create: {
      body: toJsonSchema(wineCreateSchema),
      response: { 201: objetoLibre(), 400: errorLibre }
    },
    update: {
      params: toJsonSchema(wineIdParamSchema),
      body: toJsonSchema(wineUpdateSchema),
      response: { 200: objetoLibre(), 404: errorLibre }
    },
    delete: {
      params: toJsonSchema(wineIdParamSchema),
      response: { 204: { type: 'null' }, 404: errorLibre, 409: errorLibre }
    },
    import: {
      response: {
        201: toJsonSchema(importResultSchema),
        207: toJsonSchema(importResultSchema)
      }
    },
    public: {
      response: { 200: { type: 'array' } }
    }
  },
  orders: {
    list: {
      querystring: toJsonSchema(orderQuerySchema),
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          },
          additionalProperties: true
        }
      }
    },
    get: {
      params: toJsonSchema(orderIdParamSchema),
      response: { 200: objetoLibre(), 404: errorLibre }
    },
    update: {
      params: toJsonSchema(orderIdParamSchema),
      body: toJsonSchema(orderUpdateSchema),
      response: { 200: objetoLibre(), 403: errorLibre, 404: errorLibre }
    }
  },
  customers: {
    list: {
      querystring: toJsonSchema(customerQuerySchema),
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          },
          additionalProperties: true
        }
      }
    },
    get: {
      params: toJsonSchema(customerIdParamSchema),
      response: { 200: objetoLibre(), 404: errorLibre }
    },
    update: {
      params: toJsonSchema(customerIdParamSchema),
      body: toJsonSchema(customerUpdateSchema),
      response: { 200: objetoLibre(), 404: errorLibre }
    }
  },
  metrics: {
    get: {
      response: { 200: objetoLibre() }
    }
  },
  upload: {
    post: {
      response: {
        201: {
          type: 'object',
          properties: { id: { type: 'string' }, url: { type: 'string' } },
          additionalProperties: true
        },
        413: errorLibre,
        415: errorLibre
      }
    },
    delete: {
      params: toJsonSchema(uploadIdParamSchema),
      response: { 204: { type: 'null' }, 404: errorLibre }
    }
  },
  health: {
    get: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            db: { type: 'string' }
          },
          additionalProperties: true
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            db: { type: 'string' }
          },
          additionalProperties: true
        }
      }
    }
  }
}
