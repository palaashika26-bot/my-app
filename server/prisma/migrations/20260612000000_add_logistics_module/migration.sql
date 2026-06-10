-- Full logistics module: standalone shipping requests with admin quote, client
-- accept/reject/counter, payment, fulfillment phases, warehouse slip/cargo, chat.
--
-- This SUPERSEDES the earlier standalone-logistics objects from migration
-- 20260610100000_add_support_tickets_and_logistics (the LogisticsStatus
-- PENDING.. enum + logistics_requests/logistics_messages tables). Those are
-- dropped here — their data is disposable test data — and recreated in this
-- richer shape. The support_tickets tables from that migration are NOT touched.

-- DropSupersededLogistics (idempotent; logistics_messages FK-references logistics_requests)
DROP TABLE IF EXISTS "logistics_messages";
DROP TABLE IF EXISTS "logistics_requests";
DROP TYPE IF EXISTS "LogisticsStatus";

-- CreateEnum
CREATE TYPE "LogisticsStatus" AS ENUM ('SUBMITTED', 'QUOTED', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogisticsPhase" AS ENUM ('AT_WAREHOUSE', 'FLIGHT_BOOKED', 'IN_TRANSIT', 'INDIA_WAREHOUSE');

-- CreateEnum
CREATE TYPE "LogisticsDeliveryMode" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateTable
CREATE TABLE "logistics_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "LogisticsStatus" NOT NULL DEFAULT 'SUBMITTED',
    "shippingMethod" TEXT NOT NULL,
    "weightKg" DECIMAL(12,2),
    "volumeCbm" DECIMAL(12,3),
    "packagingListUrls" TEXT[],
    "packagingThumbUrls" TEXT[],
    "note" TEXT,
    "carrier" TEXT,
    "shippingMode" TEXT,
    "estimatedPriceINR" DECIMAL(12,2),
    "pricePerKgCNY" DECIMAL(12,2),
    "eta" TEXT,
    "quoteNote" TEXT,
    "quotedAt" TIMESTAMP(3),
    "counterPriceINR" DECIMAL(12,2),
    "counterNote" TEXT,
    "counteredAt" TIMESTAMP(3),
    "phase" "LogisticsPhase",
    "completedPhases" TEXT[],
    "deliveryMode" "LogisticsDeliveryMode",
    "deliveryAddress" TEXT,
    "warehouseSlipUrl" TEXT,
    "warehouseSlipThumbUrl" TEXT,
    "slipUploadedAt" TIMESTAMP(3),
    "cargoConfirmedBy" TEXT,
    "cargoConfirmedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_payments" (
    "id" TEXT NOT NULL,
    "logisticsRequestId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amountINR" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "proofImageBase64" TEXT,
    "proofUrl" TEXT,
    "proofThumbUrl" TEXT,
    "proofFileName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_messages" (
    "id" TEXT NOT NULL,
    "logisticsRequestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logistics_requests_requestNumber_key" ON "logistics_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "logistics_requests_clientId_idx" ON "logistics_requests"("clientId");

-- CreateIndex
CREATE INDEX "logistics_requests_requestNumber_idx" ON "logistics_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "logistics_requests_status_idx" ON "logistics_requests"("status");

-- CreateIndex
CREATE INDEX "logistics_requests_createdAt_idx" ON "logistics_requests"("createdAt");

-- CreateIndex
CREATE INDEX "logistics_requests_clientId_status_idx" ON "logistics_requests"("clientId", "status");

-- CreateIndex
CREATE INDEX "logistics_payments_logisticsRequestId_idx" ON "logistics_payments"("logisticsRequestId");

-- CreateIndex
CREATE INDEX "logistics_payments_status_idx" ON "logistics_payments"("status");

-- CreateIndex
CREATE INDEX "logistics_messages_logisticsRequestId_createdAt_idx" ON "logistics_messages"("logisticsRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "logistics_requests" ADD CONSTRAINT "logistics_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_payments" ADD CONSTRAINT "logistics_payments_logisticsRequestId_fkey" FOREIGN KEY ("logisticsRequestId") REFERENCES "logistics_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_payments" ADD CONSTRAINT "logistics_payments_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_messages" ADD CONSTRAINT "logistics_messages_logisticsRequestId_fkey" FOREIGN KEY ("logisticsRequestId") REFERENCES "logistics_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_messages" ADD CONSTRAINT "logistics_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
