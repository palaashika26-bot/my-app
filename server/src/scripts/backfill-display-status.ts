/**
 * One-time backfill: compute and write displayStatus for every existing order.
 * Run with: npx ts-node src/scripts/backfill-display-status.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DISPLAY_STAGE_ORDER = [
  "Order Placed",
  "Payment Confirmed",
  "Sourcing",
  "At China Warehouse",
  "China Consolidation Warehouse",
  "Repacking Warehouse",
  "Shipped from China",
  "In Transit",
  "Arrived India Warehouse",
  "Out for Delivery",
  "Completed",
];

const DB_STATUS_TO_DISPLAY: Record<string, string> = {
  PAYMENT_PENDING: "Payment Pending",
  CONFIRMED:       "Payment Confirmed",
  ADVANCE_PAID:    "Payment Confirmed",
  FULLY_PAID:      "Payment Confirmed",
  SOURCING:        "Sourcing",
  QC_PENDING:      "At China Warehouse",
  QC_PASSED:       "Ready for Shipping",
  QC_FAILED:       "Exception",
  REPACKING:       "Repacking Warehouse",
  SHIPPED:         "Shipped from China",
  DELIVERED:       "Completed",
  CANCELLED:       "Exception",
};

function computeDisplayStatus(dbStatus: string, completedStages: string[]): string {
  if (dbStatus === "CANCELLED" || dbStatus === "QC_FAILED") return "Exception";
  const cs = completedStages ?? [];
  if (cs.length > 0) {
    let maxIdx = -1;
    for (let i = 0; i < DISPLAY_STAGE_ORDER.length; i++) {
      if (cs.includes(DISPLAY_STAGE_ORDER[i])) maxIdx = i;
    }
    if (maxIdx >= 0) return DISPLAY_STAGE_ORDER[maxIdx];
  }
  return DB_STATUS_TO_DISPLAY[dbStatus] ?? dbStatus;
}

async function main() {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    select: { id: true, status: true, completedStages: true, orderNumber: true },
  });

  console.log(`Backfilling displayStatus for ${orders.length} orders...`);

  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    const displayStatus = computeDisplayStatus(order.status, order.completedStages);
    await prisma.order.update({
      where: { id: order.id },
      data: { displayStatus },
    });
    console.log(`  ${order.orderNumber} [${order.status}] → "${displayStatus}"`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
