/**
 * One-time backfill: set Shipment.deliveredAt for all orders that are
 * already in DELIVERED status but whose Shipment row has deliveredAt = null.
 * Uses the shipment's updatedAt as the effective delivery timestamp.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all DELIVERED orders whose shipment has no deliveredAt
  const orders = await prisma.order.findMany({
    where: { status: "DELIVERED", deletedAt: null },
    select: {
      id: true,
      orderNumber: true,
      updatedAt: true,
      shipment: { select: { id: true, deliveredAt: true } },
    },
  });

  let fixedShipments = 0;
  let createdShipments = 0;

  for (const order of orders) {
    if (order.shipment) {
      if (!order.shipment.deliveredAt) {
        await prisma.shipment.update({
          where: { orderId: order.id },
          data: {
            deliveredAt: order.updatedAt,
            status: "DELIVERED",
          },
        });
        fixedShipments++;
        console.log(`  Fixed shipment for order ${order.orderNumber} → deliveredAt = ${order.updatedAt.toISOString()}`);
      }
    } else {
      // Order has no Shipment row at all — create one
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          deliveredAt: order.updatedAt,
          status: "DELIVERED",
        },
      });
      createdShipments++;
      console.log(`  Created shipment for order ${order.orderNumber} → deliveredAt = ${order.updatedAt.toISOString()}`);
    }
  }

  console.log(`\nDone. Fixed: ${fixedShipments} shipments, Created: ${createdShipments} new shipment rows.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
