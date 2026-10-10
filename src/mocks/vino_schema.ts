import type { AdminWine, Wine } from '../types/admin'

/**
 * Valida y normaliza el cuerpo de un vino.
 *
 * Vive en su propio modulo porque lo usan dos sitios: los handlers HTTP de
 * `POST /api/wines` y `PATCH /api/wines/:id`, y la importacion de CSV. Con la
 * logica duplicada, una fila importada y un alta manual podian terminar con
 * reglas de validacion distintas: el mismo vino seria valido por una puerta e
 * invalido por la otra.
 *
 * Devuelve `null` en vez de tirar excepcion. Un CSV con 500 filas donde 30
 * estan malas tiene que importar las otras 470 y reportar las 30, no abortar
 * entero.
 */

const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800'

const ANIO_MINIMO = 1850

export const vinoDesdeCuerpo = (cuerpo: Record<string, unknown>): AdminWine | null => {
  const nombre = typeof cuerpo.name === 'string' ? cuerpo.name.trim() : ''
  const bodega = typeof cuerpo.winery === 'string' ? cuerpo.winery.trim() : ''
  const precio = Number(cuerpo.price)
  const cosecha = Number(cuerpo.vintage)

  if (nombre === '' || bodega === '') return null
  if (!Number.isFinite(precio) || precio <= 0) return null
  if (!Number.isInteger(cosecha) || cosecha < ANIO_MINIMO) return null

  return {
    id:
      typeof cuerpo.id === 'string' && cuerpo.id.trim() !== ''
        ? cuerpo.id.trim()
        : crypto.randomUUID(),
    name: nombre,
    winery: bodega,
    varietal: typeof cuerpo.varietal === 'string' && cuerpo.varietal !== '' ? cuerpo.varietal : 'Blend',
    category: (cuerpo.category as Wine['category']) ?? 'Tinto',
    vintage: cosecha,
    price: precio,
    description: typeof cuerpo.description === 'string' ? cuerpo.description : '',
    tastingNotes: typeof cuerpo.tastingNotes === 'string' ? cuerpo.tastingNotes : undefined,
    foodPairing: typeof cuerpo.foodPairing === 'string' ? cuerpo.foodPairing : undefined,
    imageUrl:
      typeof cuerpo.imageUrl === 'string' && cuerpo.imageUrl !== ''
        ? cuerpo.imageUrl
        : IMAGEN_POR_DEFECTO,
    // `Math.max(0, ...)` porque un stock negativo en el panel significa
    // "debemos 5 botellas", que no existe: es 0.
    stock: Number.isFinite(Number(cuerpo.stock)) ? Math.max(0, Number(cuerpo.stock)) : 0,
    activo: cuerpo.activo === undefined ? true : Boolean(cuerpo.activo)
  }
}