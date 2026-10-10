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

export const jsonSchemas = {
  login: {
    body: toJsonSchema(loginSchema),
    response: {
      200: { type: 'object', properties: { accessToken: { type: 'string' }, user: { type: 'object' } } },
      401: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } },
      429: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }
    }
  },
  refresh: {
    body: toJsonSchema(refreshSchema),
    response: {
      200: { type: 'object', properties: { accessToken: { type: 'string' }, user: { type: 'object' } } },
      401: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }
    }
  },
  logout: {
    body: toJsonSchema(logoutSchema),
    response: {
      204: { type: 'null' },
      401: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }
    }
  },
  me: {
    response: {
      200: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' } } },
      401: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }
    }
  },
  wines: {
    list: {
      querystring: toJsonSchema(wineQuerySchema),
      response: {
        200: { type: 'object', properties: { data: { type: 'array' }, total: { type: 'number' }, page: { type: 'number' }, limit: { type: 'number' }, totalPages: { type: 'number' } } }
      }
    },
    create: {
      body: toJsonSchema(wineCreateSchema),
      response: { 201: { type: 'object' }, 400: { type: 'object' } }
    },
    update: {
      params: toJsonSchema(wineIdParamSchema),
      body: toJsonSchema(wineUpdateSchema),
      response: { 200: { type: 'object' }, 404: { type: 'object' } }
    },
    delete: {
      params: toJsonSchema(wineIdParamSchema),
      response: { 204: { type: 'null' }, 404: { type: 'object' }, 409: { type: 'object' } }
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
        200: { type: 'object', properties: { data: { type: 'array' }, total: { type: 'number' }, page: { type: 'number' }, limit: { type: 'number' }, totalPages: { type: 'number' } } }
      }
    },
    get: {
      params: toJsonSchema(orderIdParamSchema),
      response: { 200: { type: 'object' }, 404: { type: 'object' } }
    },
    update: {
      params: toJsonSchema(orderIdParamSchema),
      body: toJsonSchema(orderUpdateSchema),
      response: { 200: { type: 'object' }, 403: { type: 'object' }, 404: { type: 'object' } }
    }
  },
  customers: {
    list: {
      querystring: toJsonSchema(customerQuerySchema),
      response: {
        200: { type: 'object', properties: { data: { type: 'array' }, total: { type: 'number' }, page: { type: 'number' }, limit: { type: 'number' }, totalPages: { type: 'number' } } }
      }
    },
    get: {
      params: toJsonSchema(customerIdParamSchema),
      response: { 200: { type: 'object' }, 404: { type: 'object' } }
    },
    update: {
      params: toJsonSchema(customerIdParamSchema),
      body: toJsonSchema(customerUpdateSchema),
      response: { 200: { type: 'object' }, 404: { type: 'object' } }
    }
  },
  metrics: {
    get: {
      response: { 200: { type: 'object' } }
    }
  },
  upload: {
    post: {
      response: {
        201: { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' } } },
        413: { type: 'object' },
        415: { type: 'object' }
      }
    },
    delete: {
      params: toJsonSchema(uploadIdParamSchema),
      response: { 204: { type: 'null' }, 404: { type: 'object' } }
    }
  },
  health: {
    get: {
      response: {
        200: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' }, uptime: { type: 'number' }, db: { type: 'string' } } },
        503: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' }, uptime: { type: 'number' }, db: { type: 'string' } } }
      }
    }
  }
}