-- AddColumn: orders.display_status
ALTER TABLE "orders" ADD COLUMN "displayStatus" TEXT NOT NULL DEFAULT 'Payment Confirmed';

-- CreateIndex
CREATE INDEX "orders_displayStatus_idx" ON "orders"("displayStatus");
