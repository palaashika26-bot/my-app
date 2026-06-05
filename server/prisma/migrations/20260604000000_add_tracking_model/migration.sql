-- CreateTable
CREATE TABLE "tracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "statusNote" TEXT,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_orderId_idx" ON "tracking"("orderId");

-- AddForeignKey
ALTER TABLE "tracking" ADD CONSTRAINT "tracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
