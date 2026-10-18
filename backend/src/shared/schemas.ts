import { z } from 'zod'

/** ============================================================
 *  Auth
 *  ============================================================ */

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const refreshSchema = z.object({})

export const logoutSchema = z.object({})

export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type LogoutInput = z.infer<typeof logoutSchema>

/** ============================================================
 *  Vinos — Admin
 *  ============================================================ */

const wineBaseSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(200),
  // Bodega, anada y cepa son **opcionales** desde que la tienda dejo de ser una
  // vinateria. Una gaseosa no tiene bodega ni anada ni cepa, y lo unico que se
  // puede exigir es que no mientan: si el admin las deja vacias, el producto
  // existe sin ellas. Concederles un valor por default seria escribir datos
  // falsos en la base.
  winery: z.string().min(1).max(200).optional(),
  varietal: z.string().min(1).max(100).optional(),
  vintage: z.number().int().min(1900).max(2100).optional(),
  // La categoria es la **hoja** de la taxonomia: Vinos, Cerveza, Gaseosas,
  // Jugos. Dejo de ser el enum de tipo de vino cuando la tienda paso a vender de
  // todo; el color del vino vive en `tipoVino`.
  //
  // Texto libre y no enum por la misma razon de siempre: ampliar un enum de
  // Postgres es una migracion y el admin no puede correr migraciones desde el
  // panel. Con el enum de antes, crear una cerveza daba **400**.
  category: z.string().min(1).max(80),
  /// Departamento de la tienda. Texto libre con default para que un CSV viejo
  /// (sin la columna) entre en vez de ser rechazado.
  departamento: z.string().min(1).max(80).default('Bebidas'),
  /// Nivel medio. Opcional porque "Energizantes" cuelga directo de Bebidas: no
  /// es ni con alcohol ni sin alcohol, y hacerlo obligatorio lo obligaria a
  /// mentir con el grupo.
  grupo: z.string().min(1).max(80).optional(),
  /// Color del vino, solo para la categoria "Vinos".
  tipoVino: z.string().min(1).max(40).optional(),
  price: z.number().int().positive(),
  description: z.string().max(5000).optional(),
  tastingNotes: z.string().max(5000).optional(),
  foodPairing: z.string().max(5000).optional(),
  imageUrl: z.string().url(),
  stock: z.number().int().nonnegative().default(0),
  activo: z.boolean().default(true)
})

export const wineCreateSchema = wineBaseSchema.omit({ id: true })
export const wineUpdateSchema = wineBaseSchema.partial().omit({ id: true })
export const wineImportSchema = wineBaseSchema.required({ id: true })
export const wineIdParamSchema = z.object({ id: z.string().cuid() })

export const wineQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  // La categoria dejo de ser enum: es la hoja de la taxonomia y hay que poder
  // filtrar por "Cerveza". Con `z.enum` el filtro daria 400 en vez de resultados.
  category: z.string().optional(),
  /// Filtro del stock por departamento. Texto libre como el campo: el panel
  /// manda el valor exacto de la pestaña activa.
  departamento: z.string().optional(),
  /// Filtro del nivel medio. Es lo que usa el catalogo publico cuando se elige
  /// "Con alcohol": tiene que devolver cervezas y aperitivos sin que la pantalla
  /// sepa de antemano cuales son.
  grupo: z.string().optional(),
  varietal: z.string().optional(),
  status: z.enum(['activo', 'inactivo']).optional()
})

export type WineCreateInput = z.infer<typeof wineCreateSchema>
export type WineUpdateInput = z.infer<typeof wineUpdateSchema>
export type WineImportInput = z.infer<typeof wineImportSchema>
export type WineIdParam = z.infer<typeof wineIdParamSchema>
export type WineQuery = z.infer<typeof wineQuerySchema>

/** CSV Import */
export const importResultSchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  errors: z.array(z.object({
    row: z.number().int().positive(),
    field: z.string(),
    message: z.string()
  }))
})

export type ImportResult = z.infer<typeof importResultSchema>

/** ============================================================
 *  Vinos — Público
 *  ============================================================ */

export const publicWineQuerySchema = z.object({})

/** ============================================================
 *  Pedidos
 *  ============================================================ */

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['pendiente', 'preparando', 'enviado', 'entregado', 'cancelado', 'devuelto']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional()
})

export const orderIdParamSchema = z.object({ id: z.string().cuid() })

export const orderUpdateSchema = z.object({
  status: z.enum(['pendiente', 'preparando', 'enviado', 'entregado', 'cancelado', 'devuelto']).optional(),
  customerName: z.string().optional(),
  shippingAddress: z.record(z.unknown()).optional()
}).refine(data => Object.keys(data).length > 0, 'Al menos un campo requerido')

export type OrderQuery = z.infer<typeof orderQuerySchema>
export type OrderIdParam = z.infer<typeof orderIdParamSchema>
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>

/** ============================================================
 *  Clientes
 *  ============================================================ */

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  tags: z.string().optional()
})

export const customerIdParamSchema = z.object({ id: z.string().cuid() })

export const customerUpdateSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional()
}).refine(data => Object.keys(data).length > 0, 'Al menos un campo requerido')

export type CustomerQuery = z.infer<typeof customerQuerySchema>
export type CustomerIdParam = z.infer<typeof customerIdParamSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>

/** ============================================================
 *  Métricas
 *  ============================================================ */

export const metricsQuerySchema = z.object({})

/** ============================================================
 *  Upload
 *  ============================================================ */

export const uploadIdParamSchema = z.object({ id: z.string().uuid() })

/** ============================================================
 *  Health
 *  ============================================================ */

export const healthQuerySchema = z.object({})