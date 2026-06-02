import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function fix() {
  // Find the order
  const order = await prisma.order.findFirst({
    where: { orderNumber: 'EL-2026-003' },
    include: { items: true }
  })

  if (!order) {
    console.log('Order EL-2026-003 not found')
    await prisma.$disconnect()
    return
  }

  console.log(`Found order ${order.orderNumber} (id: ${order.id}), current items: ${order.items.length}`)

  if (order.items.length > 0) {
    console.log('Order already has items — skipping')
    await prisma.$disconnect()
    return
  }

  // Find the source request
  const request = await prisma.sourcingRequest.findFirst({
    where: {
      clientId: order.clientId,
      status: 'CONVERTED',
      approvedAt: { not: null }
    },
    include: { items: true },
    orderBy: { approvedAt: 'desc' }
  })

  if (!request) {
    console.log('Could not find matching CONVERTED request for this order')
    await prisma.$disconnect()
    return
  }

  console.log(`Found source request: ${request.requestNumber} with ${request.items.length} items`)
  request.items.forEach(i => {
    console.log(`  - ${i.productName} qty=${i.quantity} quotedRMB=${i.quotedRMB} quotedINR=${i.quotedINR}`)
  })

  // Create the missing order items
  const itemsToCreate = request.items.map(item => ({
    orderId: order.id,
    productId: item.productId ?? null,
    supplierId: null,
    quantity: item.quantity,
    unitPriceCNY: Number(item.quotedRMB) || 0,
    unitPriceINR: Number(item.quotedINR) || 0,
    totalINR: (Number(item.quotedINR) || 0) * item.quantity,
    notes: item.productName,
  }))

  const created = await prisma.orderItem.createMany({ data: itemsToCreate })
  console.log(`Created ${created.count} order item(s) for EL-2026-003`)

  // Also update order totals to match
  const totalINR = itemsToCreate.reduce((sum, i) => sum + i.totalINR, 0)
  await prisma.order.update({
    where: { id: order.id },
    data: {
      subtotalINR: totalINR,
      totalINR: totalINR,
    }
  })
  console.log(`Updated order totalINR to ${totalINR}`)

  // Verify
  const updated = await prisma.order.findFirst({
    where: { orderNumber: 'EL-2026-003' },
    include: { items: true }
  })
  console.log(`\nVerification — EL-2026-003 now has ${updated?.items.length} items:`)
  updated?.items.forEach(i => {
    console.log(`  - ${i.notes} qty=${i.quantity} unitCNY=${i.unitPriceCNY} totalINR=${i.totalINR}`)
  })

  await prisma.$disconnect()
}

fix().catch(console.error)
