-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'BALANCE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE 'ADVANCE_PAID';
ALTER TYPE "OrderStatus" ADD VALUE 'FULLY_PAID';

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amountINR" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "proofImageBase64" TEXT,
    "proofFileName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
