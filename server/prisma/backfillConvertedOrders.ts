import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function backfill() {
  // Find all CONVERTED requests with no convertedOrderId
  const requests = await prisma.sourcingRequest.findMany({
    where: {
      status: 'CONVERTED',
      convertedOrderId: null
    },
    include: {
      client: true,
      items: true
    }
  })

  console.log(`Found ${requests.length} requests to backfill`)

  for (const request of requests) {
    // Find the order created around the same time
    // for the same client
    const order = await prisma.order.findFirst({
      where: {
        clientId: request.clientId,
        createdAt: {
          gte: request.createdAt
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (order) {
      await prisma.sourcingRequest.update({
        where: { id: request.id },
        data: { convertedOrderId: order.id }
      })
      console.log(`✅ ${request.requestNumber} → ${order.orderNumber}`)
    } else {
      console.log(`❌ No order found for ${request.requestNumber}`)
    }
  }

  await prisma.$disconnect()
  console.log('Backfill complete!')
}

backfill().catch(console.error)
