// ARCHIVO GENERADO. No editar a mano.
//
// Regenerar con:  node scripts/generar-mocks.mjs
//
// El generador usa un PRNG con semilla fija, asi que el archivo es estable entre
// corridas. El historial de cada cliente se calcula desde los pedidos, y las
// metricas tambien, asi que los tres conjuntos no pueden quedar desincronizados.

import type {
  AdminWine,
  Customer,
  Metrics,
  Order
} from '../types/admin'

export const mockWines: AdminWine[] = [
  {
    'id': '1',
    'name': 'Gran Reserva Malbec',
    'winery': 'Bodega Catena Zapata',
    'varietal': 'Malbec',
    'category': 'Tinto',
    'vintage': 2020,
    'price': 45000,
    'description': 'Vino tinto de gran cuerpo con notas de frutos rojos maduros y roble frances.',
    'tastingNotes': 'Ciruela, vainilla, chocolate negro y un final persistente.',
    'foodPairing': 'Carnes rojas asadas, chivo a la estaca y quesos curados.',
    'imageUrl': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
    'stock': 24,
    'activo': true
  },
  {
    'id': '2',
    'name': 'Chardonnay White Bones',
    'winery': 'El Enemigo',
    'varietal': 'Chardonnay',
    'category': 'Blanco',
    'vintage': 2021,
    'price': 38000,
    'description': 'Elegente blanco con gran acidez, mineralidad y paso por barrica.',
    'tastingNotes': 'Manzana verde, manteca, notas citricas y minerales.',
    'foodPairing': 'Pescados grasos, mariscos y pastas con salsas blancas.',
    'imageUrl': 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800',
    'stock': 18,
    'activo': true
  },
  {
    'id': '3',
    'name': 'Cabernet Sauvignon Reserva',
    'winery': 'Catena Chadwick',
    'varietal': 'Cabernet Sauvignon',
    'category': 'Tinto',
    'vintage': 2019,
    'price': 62000,
    'description': 'Cabernet de guarda con estructura firme y final largo de cedro.',
    'tastingNotes': 'Grosella negra, grafito, cedro y un final mineral persistente.',
    'foodPairing': 'Cordera al vino tinto, milanesas y semicurado de Parma.',
    'imageUrl': 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
    'stock': 12,
    'activo': true
  },
  {
    'id': '4',
    'name': 'Pinot Noir Seleccion',
    'winery': 'Luigi Bosca',
    'varietal': 'Pinot Noir',
    'category': 'Tinto',
    'vintage': 2021,
    'price': 39500,
    'description': 'Delicado, aromatico, con fruta roja brillante y taninos sedosos.',
    'tastingNotes': 'Fresa, cereza, sotobosque y un sutil toque de tierra humeda.',
    'foodPairing': 'Salmon, canard, setas y quesos de cabra.',
    'imageUrl': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
    'stock': 9,
    'activo': true
  },
  {
    'id': '5',
    'name': 'Malbec Reserva Familia',
    'winery': 'Bodega Norton',
    'varietal': 'Malbec',
    'category': 'Tinto',
    'vintage': 2018,
    'price': 28000,
    'description': 'Malbec de acceso, maduro y facil de beber, con buena estructura.',
    'tastingNotes': 'Ciruela madura, pimienta y un toque de cacao.',
    'foodPairing': 'Hamburguesas, parrilla y itragnes.',
    'imageUrl': 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
    'stock': 40,
    'activo': true
  },
  {
    'id': '6',
    'name': 'Cabernet Franc',
    'winery': 'Pulenta Estate',
    'varietal': 'Cabernet Franc',
    'category': 'Tinto',
    'vintage': 2020,
    'price': 33500,
    'description': 'Vermut taste en taza, herbaceo, con grafito y fruta roja.',
    'tastingNotes': 'Frambuesa, menta, grafito y un final fresco.',
    'foodPairing': 'Cordera, hamburguesas gourmet y escabeche.',
    'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
    'stock': 15,
    'activo': true
  },
  {
    'id': '7',
    'name': 'Sauvignon Blanc',
    'winery': 'Trapiche',
    'varietal': 'Sauvignon Blanc',
    'category': 'Blanco',
    'vintage': 2022,
    'price': 24500,
    'description': 'Blanco fresco y aromatico, de acidez vibrante.',
    'tastingNotes': 'Limon, pomelo, hierba fresca y un toque mineral.',
    'foodPairing': 'Mariscos, ceviche, ensaladas y tabla fria.',
    'imageUrl': 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&q=80&w=800',
    'stock': 33,
    'activo': true
  },
  {
    'id': '8',
    'name': 'Riesling Trocken',
    'winery': 'Los Cemillos',
    'varietal': 'Riesling',
    'category': 'Blanco',
    'vintage': 2021,
    'price': 31000,
    'description': 'Blanco seco de moscatel con acidez brillante y un fondo mineral.',
    'tastingNotes': 'Lima, miel de azahar, pizarra y un final largo.',
    'foodPairing': 'Cocina asiatica, curry y marisco.',
    'imageUrl': 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
    'stock': 7,
    'activo': true
  },
  {
    'id': '9',
    'name': 'Rose Provence',
    'winery': 'Chateau Peyrelongue',
    'varietal': 'Grenache',
    'category': 'Rosado',
    'vintage': 2022,
    'price': 22000,
    'description': 'Rosado seco, fluido, de color palido y frescura vibrante.',
    'tastingNotes': 'Frambuesa, sandia, jazmin y un final mineral.',
    'foodPairing': 'Ensaladas, aperitivos y comidas ligeras.',
    'imageUrl': 'https://images.unsplash.com/photo-1600091503597-6ddfe4cf94b2?auto=format&fit=crop&q=80&w=800',
    'stock': 21,
    'activo': true
  },
  {
    'id': '10',
    'name': 'Espumante Brut Nature',
    'winery': 'Bodega Cono Sur',
    'varietal': 'Chardonnay',
    'category': 'Espumante',
    'vintage': 2020,
    'price': 19500,
    'description': 'Espumante de Charmat, seco y fresco, con burbuja fina y persistente.',
    'tastingNotes': 'Manzana verde, pan tostado y citrico.',
    'foodPairing': 'Brindis, aperitivos, pizzas y postres.',
    'imageUrl': 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
    'stock': 45,
    'activo': true
  },
  {
    'id': '11',
    'name': 'Espumante Rose',
    'winery': 'Chandon',
    'varietal': 'Pinot Noir',
    'category': 'Espumante',
    'vintage': 2021,
    'price': 36000,
    'description': 'Espumante rosado elegante, con fruta roja y burbuja sedosa.',
    'tastingNotes': 'Fresa, frambuesa y brioche tostado.',
    'foodPairing': 'Brindis, aperitivos y postres de fruta.',
    'imageUrl': 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&q=80&w=800',
    'stock': 0,
    'activo': false
  },
  {
    'id': '12',
    'name': 'Merlot Vintage',
    'winery': 'Valderramero',
    'varietal': 'Merlot',
    'category': 'Tinto',
    'vintage': 2017,
    'price': 21500,
    'description': 'Merlot suave, con fruta madura y taninos pulidos.',
    'tastingNotes': 'Ciruela, chocolate con leche y un final suave.',
    'foodPairing': 'Pasta, hamburguesas y wardenales.',
    'imageUrl': 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
    'stock': 28,
    'activo': false
  }
]

export const mockCustomers: Customer[] = [
  {
    'id': 'cli-1',
    'name': 'Maria Gomez',
    'email': 'maria.gomez@correo.com',
    'phone': '+54 261 412-8890',
    'tags': [
      'vip'
    ],
    'notes': [
      {
        'id': 'nota-1-1',
        'text': 'Pidio envio express a Mendoza capital.',
        'author': 'Admin',
        'createdAt': '2026-09-01T15:07:26.488Z'
      },
      {
        'id': 'nota-1-2',
        'text': 'Consulta por estaciones. Es VIP, atender con prioridad.',
        'author': 'Admin',
        'createdAt': '2026-09-18T15:07:26.488Z'
      }
    ],
    'totalOrders': 1,
    'totalSpent': 0,
    'lastOrderAt': '2026-08-30T15:07:26.488Z',
    'createdAt': '2026-09-15T15:07:26.488Z'
  },
  {
    'id': 'cli-2',
    'name': 'Juan Perez',
    'email': 'juan.perez@correo.com',
    'phone': '+54 261 415-2231',
    'tags': [],
    'notes': [],
    'totalOrders': 2,
    'totalSpent': 241500,
    'lastOrderAt': '2026-09-20T15:07:26.488Z',
    'createdAt': '2026-08-17T15:07:26.488Z'
  },
  {
    'id': 'cli-3',
    'name': 'Lucia Fernandez',
    'email': 'lucia.fernandez@correo.com',
    'phone': '+54 261 403-7712',
    'tags': [],
    'notes': [],
    'totalOrders': 2,
    'totalSpent': 89500,
    'lastOrderAt': '2026-09-30T15:07:26.488Z',
    'createdAt': '2026-05-23T15:07:26.488Z'
  },
  {
    'id': 'cli-4',
    'name': 'Carlos Diaz',
    'email': 'carlos.diaz@correo.com',
    'phone': '+54 261 422-5567',
    'tags': [],
    'notes': [
      {
        'id': 'nota-4-1',
        'text': 'Paga con transferencia, confirmar antes de enviar.',
        'author': 'Admin',
        'createdAt': '2026-10-03T15:07:26.488Z'
      },
      {
        'id': 'nota-4-2',
        'text': 'Compra para restaurante, suele pedir por volumen.',
        'author': 'Admin',
        'createdAt': '2026-09-25T15:07:26.488Z'
      }
    ],
    'totalOrders': 2,
    'totalSpent': 135000,
    'lastOrderAt': '2026-09-24T15:07:26.488Z',
    'createdAt': '2026-07-22T15:07:26.488Z'
  },
  {
    'id': 'cli-5',
    'name': 'Ana Martinez',
    'email': 'ana.martinez@correo.com',
    'phone': '+54 261 418-9903',
    'tags': [
      'vip'
    ],
    'notes': [
      {
        'id': 'nota-5-1',
        'text': 'Compra para restaurante, suele pedir por volumen.',
        'author': 'Admin',
        'createdAt': '2026-09-02T15:07:26.488Z'
      }
    ],
    'totalOrders': 2,
    'totalSpent': 114000,
    'lastOrderAt': '2026-09-21T15:07:26.488Z',
    'createdAt': '2026-04-17T15:07:26.488Z'
  },
  {
    'id': 'cli-6',
    'name': 'Diego Rojas',
    'email': 'diego.rojas@correo.com',
    'phone': '+54 261 431-2244',
    'tags': [],
    'notes': [],
    'totalOrders': 2,
    'totalSpent': 0,
    'lastOrderAt': '2026-09-10T15:07:26.488Z',
    'createdAt': '2026-08-02T15:07:26.488Z'
  },
  {
    'id': 'cli-7',
    'name': 'Sofia Castillo',
    'email': 'sofia.castillo@correo.com',
    'phone': '+54 261 409-7781',
    'tags': [],
    'notes': [
      {
        'id': 'nota-7-1',
        'text': 'Consulta por estaciones. Es VIP, atender con prioridad.',
        'author': 'Admin',
        'createdAt': '2026-09-24T15:07:26.488Z'
      },
      {
        'id': 'nota-7-2',
        'text': 'Mostro interes en un vino con nombre propio.',
        'author': 'Admin',
        'createdAt': '2026-09-12T15:07:26.488Z'
      }
    ],
    'totalOrders': 2,
    'totalSpent': 145500,
    'lastOrderAt': '2026-09-14T15:07:26.488Z',
    'createdAt': '2026-05-15T15:07:26.488Z'
  },
  {
    'id': 'cli-8',
    'name': 'Miguel Torres',
    'email': 'miguel.torres@correo.com',
    'phone': '+54 261 444-3320',
    'tags': [
      'mayorista',
      'vip'
    ],
    'notes': [],
    'totalOrders': 2,
    'totalSpent': 203000,
    'lastOrderAt': '2026-10-06T15:07:26.488Z',
    'createdAt': '2026-08-29T15:07:26.488Z'
  },
  {
    'id': 'cli-9',
    'name': 'Valeria Romero',
    'email': 'valeria.romero@correo.com',
    'phone': '+54 261 407-6655',
    'tags': [
      'vip'
    ],
    'notes': [
      {
        'id': 'nota-9-1',
        'text': 'Paga con transferencia, confirmar antes de enviar.',
        'author': 'Admin',
        'createdAt': '2026-09-25T15:07:26.488Z'
      }
    ],
    'totalOrders': 2,
    'totalSpent': 427500,
    'lastOrderAt': '2026-10-04T15:07:26.488Z',
    'createdAt': '2026-07-24T15:07:26.488Z'
  },
  {
    'id': 'cli-10',
    'name': 'Federico Alvarez',
    'email': 'federico.alvarez@correo.com',
    'phone': '+54 261 425-1188',
    'tags': [],
    'notes': [
      {
        'id': 'nota-10-1',
        'text': 'Compra para restaurante, suele pedir por volumen.',
        'author': 'Admin',
        'createdAt': '2026-09-15T15:07:26.488Z'
      },
      {
        'id': 'nota-10-2',
        'text': 'Pidio envio express a Mendoza capital.',
        'author': 'Admin',
        'createdAt': '2026-09-17T15:07:26.488Z'
      }
    ],
    'totalOrders': 2,
    'totalSpent': 419000,
    'lastOrderAt': '2026-09-22T15:07:26.488Z',
    'createdAt': '2026-05-22T15:07:26.488Z'
  },
  {
    'id': 'cli-11',
    'name': 'Camila Sosa',
    'email': 'camila.sosa@correo.com',
    'phone': '+54 261 412-4439',
    'tags': [],
    'notes': [],
    'totalOrders': 2,
    'totalSpent': 221500,
    'lastOrderAt': '2026-09-01T15:07:26.488Z',
    'createdAt': '2026-09-09T15:07:26.488Z'
  },
  {
    'id': 'cli-12',
    'name': 'Nicolas Vega',
    'email': 'nicolas.vega@correo.com',
    'phone': '+54 261 439-6672',
    'tags': [],
    'notes': [],
    'totalOrders': 1,
    'totalSpent': 62000,
    'lastOrderAt': '2026-10-02T15:07:26.488Z',
    'createdAt': '2026-08-16T15:07:26.488Z'
  },
  {
    'id': 'cli-13',
    'name': 'Florencia Paz',
    'email': 'florencia.paz@correo.com',
    'phone': '+54 261 406-8815',
    'tags': [
      'vip'
    ],
    'notes': [
      {
        'id': 'nota-13-1',
        'text': 'Mostro interes en un vino con nombre propio.',
        'author': 'Admin',
        'createdAt': '2026-09-15T15:07:26.488Z'
      },
      {
        'id': 'nota-13-2',
        'text': 'Paga con transferencia, confirmar antes de enviar.',
        'author': 'Admin',
        'createdAt': '2026-09-08T15:07:26.488Z'
      }
    ],
    'totalOrders': 1,
    'totalSpent': 68500,
    'lastOrderAt': '2026-08-27T15:07:26.488Z',
    'createdAt': '2026-06-11T15:07:26.488Z'
  },
  {
    'id': 'cli-14',
    'name': 'Gonzalo Mendez',
    'email': 'gonzalo.mendez@correo.com',
    'phone': '+54 261 421-9036',
    'tags': [],
    'notes': [],
    'totalOrders': 1,
    'totalSpent': 28000,
    'lastOrderAt': '2026-08-24T15:07:26.488Z',
    'createdAt': '2026-08-01T15:07:26.488Z'
  },
  {
    'id': 'cli-15',
    'name': 'Silvia Rojas',
    'email': '',
    'phone': '',
    'tags': [
      'nuevo',
      'mayorista'
    ],
    'notes': [],
    'totalOrders': 1,
    'totalSpent': 0,
    'lastOrderAt': '2026-09-06T15:07:26.488Z',
    'createdAt': '2026-05-14T15:07:26.488Z'
  }
]

export const mockOrders: Order[] = [
  {
    'id': 'CAVA-1001',
    'customerId': 'cli-2',
    'customerName': 'Juan Perez',
    'customerEmail': 'juan.perez@correo.com',
    'items': [
      {
        'wineId': '5',
        'wineName': 'Malbec Reserva Familia',
        'imageUrl': 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 28000
      },
      {
        'wineId': '6',
        'wineName': 'Cabernet Franc',
        'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 33500
      }
    ],
    'total': 123000,
    'status': 'pendiente',
    'shippingAddress': {
      'street': 'Rivadavia 720',
      'city': 'Maipu',
      'zip': 'M5519',
      'phone': '+54 261 422-5567'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-30T15:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-08-30T15:07:26.488Z',
    'updatedAt': '2026-08-30T15:07:26.488Z'
  },
  {
    'id': 'CAVA-1002',
    'customerId': 'cli-3',
    'customerName': 'Lucia Fernandez',
    'customerEmail': 'lucia.fernandez@correo.com',
    'items': [
      {
        'wineId': '5',
        'wineName': 'Malbec Reserva Familia',
        'imageUrl': 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 28000
      },
      {
        'wineId': '11',
        'wineName': 'Espumante Rose',
        'imageUrl': 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 36000
      }
    ],
    'total': 192000,
    'status': 'cancelado',
    'shippingAddress': {
      'street': 'Av. del Puerto 1280',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 412-8890'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-30T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-10-01T02:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'cancelado',
        'timestamp': '2026-10-01T01:07:26.488Z',
        'author': 'Admin',
        'note': 'Cancelado a pedido del cliente.'
      }
    ],
    'createdAt': '2026-09-30T15:07:26.488Z',
    'updatedAt': '2026-10-01T01:07:26.488Z'
  },
  {
    'id': 'CAVA-1003',
    'customerId': 'cli-4',
    'customerName': 'Carlos Diaz',
    'customerEmail': 'carlos.diaz@correo.com',
    'items': [
      {
        'wineId': '8',
        'wineName': 'Riesling Trocken',
        'imageUrl': 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 31000
      },
      {
        'wineId': '6',
        'wineName': 'Cabernet Franc',
        'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 33500
      }
    ],
    'total': 131500,
    'status': 'cancelado',
    'shippingAddress': {
      'street': 'Colon 981',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 431-2244'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-24T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-25T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'cancelado',
        'timestamp': '2026-09-25T02:07:26.488Z',
        'author': 'Admin',
        'note': 'Cancelado a pedido del cliente.'
      }
    ],
    'createdAt': '2026-09-24T15:07:26.488Z',
    'updatedAt': '2026-09-25T02:07:26.488Z'
  },
  {
    'id': 'CAVA-1004',
    'customerId': 'cli-5',
    'customerName': 'Ana Martinez',
    'customerEmail': 'ana.martinez@correo.com',
    'items': [
      {
        'wineId': '5',
        'wineName': 'Malbec Reserva Familia',
        'imageUrl': 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 28000
      },
      {
        'wineId': '11',
        'wineName': 'Espumante Rose',
        'imageUrl': 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 36000
      },
      {
        'wineId': '6',
        'wineName': 'Cabernet Franc',
        'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 33500
      }
    ],
    'total': 192500,
    'status': 'cancelado',
    'shippingAddress': {
      'street': 'Av. del Puerto 1280',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 412-8890'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-21T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-22T07:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'cancelado',
        'timestamp': '2026-09-22T03:07:26.488Z',
        'author': 'Admin',
        'note': 'Cancelado a pedido del cliente.'
      }
    ],
    'createdAt': '2026-09-21T15:07:26.488Z',
    'updatedAt': '2026-09-22T03:07:26.488Z'
  },
  {
    'id': 'CAVA-1005',
    'customerId': 'cli-6',
    'customerName': 'Diego Rojas',
    'customerEmail': 'diego.rojas@correo.com',
    'items': [
      {
        'wineId': '5',
        'wineName': 'Malbec Reserva Familia',
        'imageUrl': 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 28000
      }
    ],
    'total': 56000,
    'status': 'devuelto',
    'shippingAddress': {
      'street': 'San Martin 1580',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 403-7712'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-10T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-11T02:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'devuelto',
        'timestamp': '2026-09-11T04:07:26.488Z',
        'author': 'Admin',
        'note': 'Devolucion aceptada. Producto en buen estado.'
      }
    ],
    'createdAt': '2026-09-10T15:07:26.488Z',
    'updatedAt': '2026-09-11T04:07:26.488Z'
  },
  {
    'id': 'CAVA-1006',
    'customerId': 'cli-7',
    'customerName': 'Sofia Castillo',
    'customerEmail': 'sofia.castillo@correo.com',
    'items': [
      {
        'wineId': '11',
        'wineName': 'Espumante Rose',
        'imageUrl': 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 36000
      },
      {
        'wineId': '12',
        'wineName': 'Merlot Vintage',
        'imageUrl': 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 21500
      }
    ],
    'total': 79000,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Rivadavia 720',
      'city': 'Maipu',
      'zip': 'M5519',
      'phone': '+54 261 422-5567'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-14T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-15T05:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-09-15T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-09-15T06:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-09-14T15:07:26.488Z',
    'updatedAt': '2026-09-15T06:07:26.488Z'
  },
  {
    'id': 'CAVA-1007',
    'customerId': 'cli-8',
    'customerName': 'Miguel Torres',
    'customerEmail': 'miguel.torres@correo.com',
    'items': [
      {
        'wineId': '4',
        'wineName': 'Pinot Noir Seleccion',
        'imageUrl': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 39500
      },
      {
        'wineId': '1',
        'wineName': 'Gran Reserva Malbec',
        'imageUrl': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 45000
      }
    ],
    'total': 129500,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Belgrano 445',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 415-2231'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-03T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-03T20:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-09-05T19:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-09-05T18:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-09-03T15:07:26.488Z',
    'updatedAt': '2026-09-05T18:07:26.488Z'
  },
  {
    'id': 'CAVA-1008',
    'customerId': 'cli-9',
    'customerName': 'Valeria Romero',
    'customerEmail': 'valeria.romero@correo.com',
    'items': [
      {
        'wineId': '11',
        'wineName': 'Espumante Rose',
        'imageUrl': 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 36000
      },
      {
        'wineId': '6',
        'wineName': 'Cabernet Franc',
        'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 33500
      },
      {
        'wineId': '12',
        'wineName': 'Merlot Vintage',
        'imageUrl': 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 21500
      },
      {
        'wineId': '9',
        'wineName': 'Rose Provence',
        'imageUrl': 'https://images.unsplash.com/photo-1600091503597-6ddfe4cf94b2?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 22000
      }
    ],
    'total': 259500,
    'status': 'enviado',
    'shippingAddress': {
      'street': 'Rivadavia 720',
      'city': 'Maipu',
      'zip': 'M5519',
      'phone': '+54 261 422-5567'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-10-04T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-10-05T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-10-06T19:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-10-04T15:07:26.488Z',
    'updatedAt': '2026-10-06T19:07:26.488Z'
  },
  {
    'id': 'CAVA-1009',
    'customerId': 'cli-10',
    'customerName': 'Federico Alvarez',
    'customerEmail': 'federico.alvarez@correo.com',
    'items': [
      {
        'wineId': '12',
        'wineName': 'Merlot Vintage',
        'imageUrl': 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 21500
      },
      {
        'wineId': '8',
        'wineName': 'Riesling Trocken',
        'imageUrl': 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 31000
      },
      {
        'wineId': '4',
        'wineName': 'Pinot Noir Seleccion',
        'imageUrl': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 39500
      }
    ],
    'total': 233000,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Aristides Maillu 233',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 418-9903'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-07T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-08T13:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-09-08T01:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-09-09T18:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-09-07T15:07:26.488Z',
    'updatedAt': '2026-09-09T18:07:26.488Z'
  },
  {
    'id': 'CAVA-1010',
    'customerId': 'cli-11',
    'customerName': 'Camila Sosa',
    'customerEmail': 'camila.sosa@correo.com',
    'items': [
      {
        'wineId': '10',
        'wineName': 'Espumante Brut Nature',
        'imageUrl': 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 19500
      },
      {
        'wineId': '2',
        'wineName': 'Chardonnay White Bones',
        'imageUrl': 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 38000
      },
      {
        'wineId': '6',
        'wineName': 'Cabernet Franc',
        'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 33500
      },
      {
        'wineId': '9',
        'wineName': 'Rose Provence',
        'imageUrl': 'https://images.unsplash.com/photo-1600091503597-6ddfe4cf94b2?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 22000
      }
    ],
    'total': 221500,
    'status': 'enviado',
    'shippingAddress': {
      'street': 'Aristides Maillu 233',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 418-9903'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-21T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-08-22T01:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-08-23T19:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-08-21T15:07:26.488Z',
    'updatedAt': '2026-08-23T19:07:26.488Z'
  },
  {
    'id': 'CAVA-1011',
    'customerId': 'cli-12',
    'customerName': 'Nicolas Vega',
    'customerEmail': 'nicolas.vega@correo.com',
    'items': [
      {
        'wineId': '8',
        'wineName': 'Riesling Trocken',
        'imageUrl': 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 31000
      }
    ],
    'total': 62000,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Av. del Puerto 1280',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 412-8890'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-10-02T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-10-02T22:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-10-04T09:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-10-05T09:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-10-02T15:07:26.488Z',
    'updatedAt': '2026-10-05T09:07:26.488Z'
  },
  {
    'id': 'CAVA-1012',
    'customerId': 'cli-13',
    'customerName': 'Florencia Paz',
    'customerEmail': 'florencia.paz@correo.com',
    'items': [
      {
        'wineId': '7',
        'wineName': 'Sauvignon Blanc',
        'imageUrl': 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 24500
      },
      {
        'wineId': '10',
        'wineName': 'Espumante Brut Nature',
        'imageUrl': 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 19500
      }
    ],
    'total': 68500,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Colon 981',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 431-2244'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-27T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-08-28T13:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-08-28T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-08-30T00:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-08-27T15:07:26.488Z',
    'updatedAt': '2026-08-30T00:07:26.488Z'
  },
  {
    'id': 'CAVA-1013',
    'customerId': 'cli-14',
    'customerName': 'Gonzalo Mendez',
    'customerEmail': 'gonzalo.mendez@correo.com',
    'items': [
      {
        'wineId': '5',
        'wineName': 'Malbec Reserva Familia',
        'imageUrl': 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 28000
      }
    ],
    'total': 28000,
    'status': 'pendiente',
    'shippingAddress': {
      'street': 'Rivadavia 720',
      'city': 'Maipu',
      'zip': 'M5519',
      'phone': '+54 261 422-5567'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-24T15:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-08-24T15:07:26.488Z',
    'updatedAt': '2026-08-24T15:07:26.488Z'
  },
  {
    'id': 'CAVA-1014',
    'customerId': 'cli-15',
    'customerName': 'Silvia Rojas',
    'customerEmail': '',
    'items': [
      {
        'wineId': '6',
        'wineName': 'Cabernet Franc',
        'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 33500
      },
      {
        'wineId': '5',
        'wineName': 'Malbec Reserva Familia',
        'imageUrl': 'https://images.unsplash.com/photo-1558001373-7b9fbd4830e1?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 28000
      }
    ],
    'total': 89500,
    'status': 'cancelado',
    'shippingAddress': {
      'street': 'Aristides Maillu 233',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 418-9903'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-06T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-06T23:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'cancelado',
        'timestamp': '2026-09-07T13:07:26.488Z',
        'author': 'Admin',
        'note': 'Cancelado a pedido del cliente.'
      }
    ],
    'createdAt': '2026-09-06T15:07:26.488Z',
    'updatedAt': '2026-09-07T13:07:26.488Z'
  },
  {
    'id': 'CAVA-1015',
    'customerId': 'cli-1',
    'customerName': 'Maria Gomez',
    'customerEmail': 'maria.gomez@correo.com',
    'items': [
      {
        'wineId': '12',
        'wineName': 'Merlot Vintage',
        'imageUrl': 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 21500
      },
      {
        'wineId': '10',
        'wineName': 'Espumante Brut Nature',
        'imageUrl': 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 19500
      }
    ],
    'total': 82000,
    'status': 'devuelto',
    'shippingAddress': {
      'street': 'San Martin 1580',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 403-7712'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-30T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-08-30T23:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'devuelto',
        'timestamp': '2026-08-31T14:07:26.488Z',
        'author': 'Admin',
        'note': 'Devolucion aceptada. Producto en buen estado.'
      }
    ],
    'createdAt': '2026-08-30T15:07:26.488Z',
    'updatedAt': '2026-08-31T14:07:26.488Z'
  },
  {
    'id': 'CAVA-1016',
    'customerId': 'cli-2',
    'customerName': 'Juan Perez',
    'customerEmail': 'juan.perez@correo.com',
    'items': [
      {
        'wineId': '4',
        'wineName': 'Pinot Noir Seleccion',
        'imageUrl': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 39500
      }
    ],
    'total': 118500,
    'status': 'preparando',
    'shippingAddress': {
      'street': 'Colon 981',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 431-2244'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-20T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-21T00:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-09-20T15:07:26.488Z',
    'updatedAt': '2026-09-21T00:07:26.488Z'
  },
  {
    'id': 'CAVA-1017',
    'customerId': 'cli-3',
    'customerName': 'Lucia Fernandez',
    'customerEmail': 'lucia.fernandez@correo.com',
    'items': [
      {
        'wineId': '10',
        'wineName': 'Espumante Brut Nature',
        'imageUrl': 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 19500
      },
      {
        'wineId': '8',
        'wineName': 'Riesling Trocken',
        'imageUrl': 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 31000
      }
    ],
    'total': 89500,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Aristides Maillu 233',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 418-9903'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-25T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-26T01:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-09-27T07:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-09-28T18:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-09-25T15:07:26.488Z',
    'updatedAt': '2026-09-28T18:07:26.488Z'
  },
  {
    'id': 'CAVA-1018',
    'customerId': 'cli-4',
    'customerName': 'Carlos Diaz',
    'customerEmail': 'carlos.diaz@correo.com',
    'items': [
      {
        'wineId': '1',
        'wineName': 'Gran Reserva Malbec',
        'imageUrl': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 45000
      }
    ],
    'total': 135000,
    'status': 'preparando',
    'shippingAddress': {
      'street': 'Av. del Puerto 1280',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 412-8890'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-14T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-15T00:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-09-14T15:07:26.488Z',
    'updatedAt': '2026-09-15T00:07:26.488Z'
  },
  {
    'id': 'CAVA-1019',
    'customerId': 'cli-5',
    'customerName': 'Ana Martinez',
    'customerEmail': 'ana.martinez@correo.com',
    'items': [
      {
        'wineId': '2',
        'wineName': 'Chardonnay White Bones',
        'imageUrl': 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 38000
      }
    ],
    'total': 114000,
    'status': 'enviado',
    'shippingAddress': {
      'street': 'Belgrano 445',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 415-2231'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-30T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-08-31T10:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-08-31T19:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-08-30T15:07:26.488Z',
    'updatedAt': '2026-08-31T19:07:26.488Z'
  },
  {
    'id': 'CAVA-1020',
    'customerId': 'cli-6',
    'customerName': 'Diego Rojas',
    'customerEmail': 'diego.rojas@correo.com',
    'items': [
      {
        'wineId': '9',
        'wineName': 'Rose Provence',
        'imageUrl': 'https://images.unsplash.com/photo-1600091503597-6ddfe4cf94b2?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 22000
      },
      {
        'wineId': '3',
        'wineName': 'Cabernet Sauvignon Reserva',
        'imageUrl': 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 62000
      },
      {
        'wineId': '12',
        'wineName': 'Merlot Vintage',
        'imageUrl': 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 21500
      }
    ],
    'total': 167500,
    'status': 'devuelto',
    'shippingAddress': {
      'street': 'Rivadavia 720',
      'city': 'Maipu',
      'zip': 'M5519',
      'phone': '+54 261 422-5567'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-05T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-06T12:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'devuelto',
        'timestamp': '2026-09-06T19:07:26.488Z',
        'author': 'Admin',
        'note': 'Devolucion aceptada. Producto en buen estado.'
      }
    ],
    'createdAt': '2026-09-05T15:07:26.488Z',
    'updatedAt': '2026-09-06T19:07:26.488Z'
  },
  {
    'id': 'CAVA-1021',
    'customerId': 'cli-7',
    'customerName': 'Sofia Castillo',
    'customerEmail': 'sofia.castillo@correo.com',
    'items': [
      {
        'wineId': '1',
        'wineName': 'Gran Reserva Malbec',
        'imageUrl': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 45000
      },
      {
        'wineId': '12',
        'wineName': 'Merlot Vintage',
        'imageUrl': 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 21500
      }
    ],
    'total': 66500,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Belgrano 445',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 415-2231'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-22T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-08-22T22:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-08-24T03:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-08-24T21:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-08-22T15:07:26.488Z',
    'updatedAt': '2026-08-24T21:07:26.488Z'
  },
  {
    'id': 'CAVA-1022',
    'customerId': 'cli-8',
    'customerName': 'Miguel Torres',
    'customerEmail': 'miguel.torres@correo.com',
    'items': [
      {
        'wineId': '7',
        'wineName': 'Sauvignon Blanc',
        'imageUrl': 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 24500
      }
    ],
    'total': 73500,
    'status': 'entregado',
    'shippingAddress': {
      'street': 'Belgrano 445',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 415-2231'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-10-06T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-10-07T07:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-10-07T17:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'entregado',
        'timestamp': '2026-10-07T15:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-10-06T15:07:26.488Z',
    'updatedAt': '2026-10-07T15:07:26.488Z'
  },
  {
    'id': 'CAVA-1023',
    'customerId': 'cli-9',
    'customerName': 'Valeria Romero',
    'customerEmail': 'valeria.romero@correo.com',
    'items': [
      {
        'wineId': '6',
        'wineName': 'Cabernet Franc',
        'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 33500
      },
      {
        'wineId': '10',
        'wineName': 'Espumante Brut Nature',
        'imageUrl': 'https://images.unsplash.com/photo-1594372366281-0b5636cc8d0b?auto=format&fit=crop&q=80&w=800',
        'quantity': 2,
        'price': 19500
      },
      {
        'wineId': '3',
        'wineName': 'Cabernet Sauvignon Reserva',
        'imageUrl': 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 62000
      }
    ],
    'total': 168000,
    'status': 'pendiente',
    'shippingAddress': {
      'street': 'Av. del Puerto 1280',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 412-8890'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-08-27T15:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-08-27T15:07:26.488Z',
    'updatedAt': '2026-08-27T15:07:26.488Z'
  },
  {
    'id': 'CAVA-1024',
    'customerId': 'cli-10',
    'customerName': 'Federico Alvarez',
    'customerEmail': 'federico.alvarez@correo.com',
    'items': [
      {
        'wineId': '3',
        'wineName': 'Cabernet Sauvignon Reserva',
        'imageUrl': 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 62000
      }
    ],
    'total': 186000,
    'status': 'enviado',
    'shippingAddress': {
      'street': 'Belgrano 445',
      'city': 'Godoy Cruz',
      'zip': 'M5502',
      'phone': '+54 261 415-2231'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-22T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-23T06:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'enviado',
        'timestamp': '2026-09-23T09:07:26.488Z',
        'author': 'Admin'
      }
    ],
    'createdAt': '2026-09-22T15:07:26.488Z',
    'updatedAt': '2026-09-23T09:07:26.488Z'
  },
  {
    'id': 'CAVA-1025',
    'customerId': 'cli-11',
    'customerName': 'Camila Sosa',
    'customerEmail': 'camila.sosa@correo.com',
    'items': [
      {
        'wineId': '4',
        'wineName': 'Pinot Noir Seleccion',
        'imageUrl': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
        'quantity': 3,
        'price': 39500
      },
      {
        'wineId': '2',
        'wineName': 'Chardonnay White Bones',
        'imageUrl': 'https://images.unsplash.com/photo-1599113656124-b96bf21e30d3?auto=format&fit=crop&q=80&w=800',
        'quantity': 1,
        'price': 38000
      }
    ],
    'total': 156500,
    'status': 'cancelado',
    'shippingAddress': {
      'street': 'San Martin 1580',
      'city': 'Mendoza',
      'zip': 'M5500',
      'phone': '+54 261 403-7712'
    },
    'timeline': [
      {
        'status': 'pendiente',
        'timestamp': '2026-09-01T15:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'preparando',
        'timestamp': '2026-09-02T01:07:26.488Z',
        'author': 'Admin'
      },
      {
        'status': 'cancelado',
        'timestamp': '2026-09-03T00:07:26.488Z',
        'author': 'Admin',
        'note': 'Cancelado a pedido del cliente.'
      }
    ],
    'createdAt': '2026-09-01T15:07:26.488Z',
    'updatedAt': '2026-09-03T00:07:26.488Z'
  }
]

export const mockMetrics: Metrics = {
  'salesToday': 0,
  'salesWeek': 73500,
  'salesMonth': 395000,
  'abandonedCarts': 0,
  'avgTicket': 126765,
  'conversion': 0,
  'salesLast30Days': [
    {
      'date': '2026-09-10',
      'revenue': 56000,
      'orders': 1
    },
    {
      'date': '2026-09-11',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-12',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-13',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-14',
      'revenue': 214000,
      'orders': 2
    },
    {
      'date': '2026-09-15',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-16',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-17',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-18',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-19',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-20',
      'revenue': 118500,
      'orders': 1
    },
    {
      'date': '2026-09-21',
      'revenue': 192500,
      'orders': 1
    },
    {
      'date': '2026-09-22',
      'revenue': 186000,
      'orders': 1
    },
    {
      'date': '2026-09-23',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-24',
      'revenue': 131500,
      'orders': 1
    },
    {
      'date': '2026-09-25',
      'revenue': 89500,
      'orders': 1
    },
    {
      'date': '2026-09-26',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-27',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-28',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-29',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-09-30',
      'revenue': 192000,
      'orders': 1
    },
    {
      'date': '2026-10-01',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-10-02',
      'revenue': 62000,
      'orders': 1
    },
    {
      'date': '2026-10-03',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-10-04',
      'revenue': 259500,
      'orders': 1
    },
    {
      'date': '2026-10-05',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-10-06',
      'revenue': 73500,
      'orders': 1
    },
    {
      'date': '2026-10-07',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-10-08',
      'revenue': 0,
      'orders': 0
    },
    {
      'date': '2026-10-09',
      'revenue': 0,
      'orders': 0
    }
  ],
  'topProducts': [
    {
      'wineId': '6',
      'name': 'Cabernet Franc',
      'imageUrl': 'https://images.unsplash.com/photo-1566754436893-98224ee05be4?auto=format&fit=crop&q=80&w=800',
      'units': 10,
      'revenue': 335000
    },
    {
      'wineId': '4',
      'name': 'Pinot Noir Seleccion',
      'imageUrl': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800',
      'units': 7,
      'revenue': 276500
    },
    {
      'wineId': '1',
      'name': 'Gran Reserva Malbec',
      'imageUrl': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
      'units': 6,
      'revenue': 270000
    },
    {
      'wineId': '3',
      'name': 'Cabernet Sauvignon Reserva',
      'imageUrl': 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800',
      'units': 4,
      'revenue': 248000
    },
    {
      'wineId': '8',
      'name': 'Riesling Trocken',
      'imageUrl': 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&q=80&w=800',
      'units': 6,
      'revenue': 186000
    }
  ],
  'recentActivity': [
    {
      'type': 'order',
      'id': 'CAVA-1022',
      'description': 'Pedido CAVA-1022 - Miguel Torres',
      'timestamp': '2026-10-06T15:07:26.488Z'
    },
    {
      'type': 'order',
      'id': 'CAVA-1008',
      'description': 'Pedido CAVA-1008 - Valeria Romero',
      'timestamp': '2026-10-04T15:07:26.488Z'
    },
    {
      'type': 'order',
      'id': 'CAVA-1011',
      'description': 'Pedido CAVA-1011 - Nicolas Vega',
      'timestamp': '2026-10-02T15:07:26.488Z'
    },
    {
      'type': 'order',
      'id': 'CAVA-1002',
      'description': 'Pedido CAVA-1002 - Lucia Fernandez',
      'timestamp': '2026-09-30T15:07:26.488Z'
    },
    {
      'type': 'order',
      'id': 'CAVA-1017',
      'description': 'Pedido CAVA-1017 - Lucia Fernandez',
      'timestamp': '2026-09-25T15:07:26.488Z'
    }
  ]
}

