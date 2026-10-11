import { FastifyInstance } from 'fastify'
import { requireRole } from '../auth/middleware.js'
import { jsonSchemas } from '../../shared/json-schemas.js'
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns'

async function salesByDay(prisma: any, startDate: Date) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: startDate } },
    select: { total: true, createdAt: true }
  })

  const map = new Map<string, number>()
  for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
    map.set(format(d, 'yyyy-MM-dd'), 0)
  }

  for (const o of orders) {
    const key = format(o.createdAt, 'yyyy-MM-dd')
    map.set(key, (map.get(key) ?? 0) + o.total)
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({ date, total }))
}

async function topProducts(prisma: any) {
  const items = await prisma.orderItem.groupBy({
    by: ['wineId'],
    _sum: { quantity: true, price: true },
    orderBy: { _sum: { price: 'desc' } },
    take: 5
  })

  const wines = await prisma.wine.findMany({
    where: { id: { in: items.map((i: any) => i.wineId) } },
    select: { id: true, name: true }
  })

  const wineMap = new Map(wines.map((w: any) => [w.id, w.name]))

  return items.map((i: any) => ({
    wineId: i.wineId,
    name: wineMap.get(i.wineId) ?? '',
    revenue: i._sum.price ?? 0,
    count: i._sum.quantity ?? 0
  }))
}

async function recentOrders(prisma: any, limit: number) {
  const orders = await prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, total: true, createdAt: true, customer: { select: { name: true } } }
  })

  return orders.map((o: any) => ({
    id: o.id,
    type: 'order' as const,
    description: `Pedido #${o.id.slice(0, 8)} - ${o.customer.name}`,
    timestamp: o.createdAt.toISOString(),
    amount: o.total
  }))
}

async function recentCustomers(prisma: any, limit: number) {
  const customers = await prisma.customer.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true }
  })

  return customers.map((c: any) => ({
    id: c.id,
    type: 'customer' as const,
    description: `Nuevo cliente: ${c.name}`,
    timestamp: c.createdAt.toISOString()
  }))
}

export const metricsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { prisma } = fastify

  fastify.get(
    '/api/metrics',
    {
      preHandler: requireRole('admin', 'gestor'),
      schema: jsonSchemas.metrics.get
    },
    async () => {
      const now = new Date()
      const startToday = startOfDay(now)
      const startWeek = startOfWeek(now, { weekStartsOn: 1 })
      const startMonth = startOfMonth(now)
      const start30 = subDays(now, 30)

      const [
        today, week, month, avg,
        sales30d, topProductsResult, recentOrdersResult, recentCustomersResult
      ] = await Promise.all([
        prisma.order.aggregate({ where: { createdAt: { gte: startToday } }, _sum: { total: true } }),
        prisma.order.aggregate({ where: { createdAt: { gte: startWeek } }, _sum: { total: true } }),
        prisma.order.aggregate({ where: { createdAt: { gte: startMonth } }, _sum: { total: true } }),
        prisma.order.aggregate({ _avg: { total: true } }),
        salesByDay(prisma, start30),
        topProducts(prisma),
        recentOrders(prisma, 3),
        recentCustomers(prisma, 2)
      ])

      return {
        salesToday: today._sum.total ?? 0,
        salesWeek: week._sum.total ?? 0,
        salesMonth: month._sum.total ?? 0,
        abandonedCarts: 0,
        avgTicket: Math.round(avg._avg.total ?? 0),
        conversion: 0,
        salesLast30Days: sales30d,
        topProducts: topProductsResult,
        recentActivity: [...recentOrdersResult, ...recentCustomersResult]
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 5)
      }
    }
  )
}