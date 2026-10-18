import { PrismaClient } from '@prisma/client'
import { program } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

interface ProductoFromLocalStorage {
  id: string
  name: string
  winery: string
  varietal: string
  category: 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante'
  vintage: number
  price: number
  description?: string
  tastingNotes?: string
  foodPairing?: string
  imageUrl: string
  stock?: number
  activo?: boolean
  createdAt?: string
  updatedAt?: string
}

interface CartFromLocalStorage {
  product: ProductoFromLocalStorage
  quantity: number
}

program
  .name('migrate-from-localstorage')
  .description('Migra datos desde localStorage del frontend a PostgreSQL')
  .requiredOption('-i, --input <file>', 'Archivo JSON exportado desde localStorage (vinoteca_wines)')
  .option('-c, --cart <file>', 'Archivo JSON exportado desde localStorage (vinoteca_cart)')
  .option('-d, --dry-run', 'Simula la migración sin escribir en la base de datos', false)
  .option('-v, --verbose', 'Logs detallados', false)

program.parse()

const options = program.opts()

async function main() {
  const winesPath = path.resolve(options.input)
  if (!fs.existsSync(winesPath)) {
    console.error(`❌ Archivo no encontrado: ${winesPath}`)
    process.exit(1)
  }

  const winesJson = fs.readFileSync(winesPath, 'utf-8')
  let wines: ProductoFromLocalStorage[]
  try {
    wines = JSON.parse(winesJson)
  } catch (e) {
    console.error('❌ JSON inválido en archivo de productos')
    process.exit(1)
  }

  if (!Array.isArray(wines)) {
    console.error('❌ El archivo de productos debe ser un array')
    process.exit(1)
  }

  let cart: CartFromLocalStorage[] = []
  if (options.cart) {
    const cartPath = path.resolve(options.cart)
    if (fs.existsSync(cartPath)) {
      try {
        cart = JSON.parse(fs.readFileSync(cartPath, 'utf-8'))
      } catch {
        console.warn('⚠️  Archivo de carrito inválido, se ignora')
      }
    }
  }

  console.log(`📦 ${wines.length} productos a migrar`)
  console.log(`🛒 ${cart.length} líneas de carrito a migrar`)
  console.log(options.dryRun ? '🔍 MODO DRY-RUN: no se escriben datos\n' : '')

  let created = 0
  let updated = 0
  let errors = 0

  for (const wine of wines) {
    try {
      const existing = await prisma.product.findUnique({ where: { id: wine.id } })

      const data = {
        name: wine.name,
        winery: wine.winery,
        varietal: wine.varietal,
        category: wine.category,
        vintage: wine.vintage,
        price: wine.price,
        description: wine.description ?? null,
        tastingNotes: wine.tastingNotes ?? null,
        foodPairing: wine.foodPairing ?? null,
        imageUrl: wine.imageUrl,
        stock: wine.stock ?? 0,
        activo: wine.activo ?? true
      }

      if (existing) {
        if (!options.dryRun) {
          await prisma.product.update({ where: { id: wine.id }, data })
        }
        updated++
        if (options.verbose) console.log(`  ↻ Actualizado: ${wine.name} (${wine.id})`)
      } else {
        if (!options.dryRun) {
          await prisma.product.create({ data: { ...data, id: wine.id } })
        }
        created++
        if (options.verbose) console.log(`  ✓ Creado: ${wine.name} (${wine.id})`)
      }
    } catch (e: any) {
      errors++
      console.error(`  ❌ Error con ${wine.name}: ${e.message}`)
    }
  }

  // Migrar carrito como cliente + pedido pendiente
  if (cart.length > 0 && !options.dryRun) {
    const customer = await prisma.customer.upsert({
      where: { email: 'migrado-localstorage@vinoteca.local' },
      update: {},
      create: {
        email: 'migrado-localstorage@vinoteca.local',
        name: 'Cliente migrado desde localStorage',
        phone: null
      }
    })

    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        total,
        status: 'pendiente',
        shippingAddress: { migrated: true },
        items: {
          create: cart.map(item => ({
            productoId: item.product.id,
            quantity: item.quantity,
            price: item.product.price
          }))
        },
        timeline: {
          create: {
            status: 'pendiente',
            author: 'Sistema (migración)',
            note: 'Pedido creado desde carrito localStorage migrado'
          }
        }
      }
    })

    console.log(`\n🛒 Carrito migrado → Pedido ${order.id} (${cart.length} items, $${total})`)
  }

  console.log('\n✅ Migración completada')
  console.log(`   Creados: ${created}`)
  console.log(`   Actualizados: ${updated}`)
  console.log(`   Errores: ${errors}`)

  if (options.dryRun) {
    console.log('\n⚠️  DRY-RUN: No se guardaron cambios. Ejecuta sin --dry-run para aplicar.')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })