-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'QUOTED', 'PARTIALLY_ACCEPTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "RequestItemStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'COUNTERED');

-- CreateEnum
CREATE TYPE "RequestItemType" AS ENUM ('CATALOG', 'CUSTOM');

-- CreateTable
CREATE TABLE "sourcing_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "totalBudgetINR" DECIMAL(12,2),
    "notes" TEXT,
    "staffNotes" TEXT,
    "quotedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourcing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "RequestItemType" NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "productDescription" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "targetPriceINR" DECIMAL(12,2),
    "quotedRMB" DECIMAL(12,2),
    "quotedINR" DECIMAL(12,2),
    "imageUrl" TEXT,
    "status" "RequestItemStatus" NOT NULL DEFAULT 'PENDING',
    "clientResponse" TEXT,
    "counterPriceINR" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_activities" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sourcing_requests_requestNumber_key" ON "sourcing_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "sourcing_requests_clientId_idx" ON "sourcing_requests"("clientId");

-- CreateIndex
CREATE INDEX "sourcing_requests_requestNumber_idx" ON "sourcing_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "request_items_requestId_idx" ON "request_items"("requestId");

-- AddForeignKey
ALTER TABLE "sourcing_requests" ADD CONSTRAINT "sourcing_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sourcing_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_activities" ADD CONSTRAINT "request_activities_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sourcing_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_activities" ADD CONSTRAINT "request_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
