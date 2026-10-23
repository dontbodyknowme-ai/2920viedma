// Servidor de mentira para probar el frontend sin una base de datos.
// Sirve /api/products/public y /api/auth/*; todo lo demas 404.
import { createServer } from 'node:http'

const productos = [
  {
    id: 'p1', name: 'Malbec Reserva', winery: 'Bodega Norte', varietal: 'Malbec',
    category: 'Vinos', departamento: 'Bebidas', grupo: 'Con alcohol', tipoVino: 'Tinto',
    vintage: 2021, price: 18500, description: 'Un tinto de cuerpo medio.',
    description: 'Un tinto de cuerpo medio.', tastingNotes: null, foodPairing: null,
    imageUrl: 'https://images.unsplash.com/photo-1553361371-9b9f9e0ee9d7?w=400'
  },
  {
    id: 'p2', name: 'Set de Copas', winery: null, varietal: null,
    category: 'Vajilla', departamento: 'Regalos', grupo: null, tipoVino: null,
    vintage: null, price: 12000, description: 'Copas de cristal.',
    tastingNotes: null, foodPairing: null,
    imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'
  },
  {
    id: 'p3', name: 'Chocolate Amargo', winery: null, varietal: null,
    category: 'Chocolates', departamento: 'Snacks y dulces', grupo: null, tipoVino: null,
    vintage: null, price: 3400, description: 'Cacao al 80 %.',
    tastingNotes: null, foodPairing: null,
    imageUrl: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400'
  }
]

const json = (res, codigo, cuerpo) => {
  res.writeHead(codigo, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
  })
  res.end(JSON.stringify(cuerpo))
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000')

  if (req.method === 'OPTIONS') return json(res, 200, {})
  if (url.pathname === '/api/products/public') return json(res, 200, productos)
  if (url.pathname === '/api/auth/me') return json(res, 401, { message: 'sin sesion' })
  if (url.pathname === '/api/auth/refresh') return json(res, 401, { message: 'sin refresh' })
  if (url.pathname === '/health') return json(res, 200, { ok: true })

  return json(res, 404, { code: 'NOT_FOUND', message: url.pathname })
}).listen(3000, () => console.log('API de mentira en :3000'))
