-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'FULL';

-- CreateTable
CREATE TABLE "request_payments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amountINR" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUBMITTED',
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

    CONSTRAINT "request_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_payments_requestId_idx" ON "request_payments"("requestId");

-- AddForeignKey
ALTER TABLE "request_payments" ADD CONSTRAINT "request_payments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sourcing_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_payments" ADD CONSTRAINT "request_payments_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
