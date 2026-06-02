import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
  // Find the request
  const request = await prisma.sourcingRequest.findFirst({
    where: { requestNumber: 'BK-REQ-2026-0005' },
    include: { items: true }
  })
  console.log('Request:', JSON.stringify(request, null, 2))

  // Find orders for this client
  const orders = await prisma.order.findMany({
    where: { clientId: request?.clientId ?? undefined },
    include: { items: true }
  })
  console.log('Orders for client:', JSON.stringify(orders, null, 2))

  // Check all orders
  const allOrders = await prisma.order.findMany({
    include: { items: true }
  })
  console.log('Total orders in DB:', allOrders.length)
  allOrders.forEach(o => {
    console.log(`${o.orderNumber} | items: ${o.items.length} | clientId: ${o.clientId} | deletedAt: ${o.deletedAt}`)
  })

  await prisma.$disconnect()
}

debug().catch(console.error)
