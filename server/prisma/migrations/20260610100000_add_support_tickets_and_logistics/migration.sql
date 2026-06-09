-- Additive only: two new features (support tickets + standalone logistics requests),
-- each with a messages table. New enums, tables, indexes, and FKs only.
-- No drops, no changes to existing tables. Fully backward-compatible.

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LogisticsStatus" AS ENUM ('PENDING', 'QUOTED', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED');

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orderId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT,
    "clientLastReadAt" TIMESTAMP(3),
    "staffLastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orderRef" TEXT,
    "weightKg" TEXT,
    "cbm" TEXT,
    "shippingMethod" TEXT,
    "packagingList" TEXT[],
    "status" "LogisticsStatus" NOT NULL DEFAULT 'PENDING',
    "quotePricePerKg" DECIMAL(12,2),
    "quoteNote" TEXT,
    "clientLastReadAt" TIMESTAMP(3),
    "staffLastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_messages" (
    "id" TEXT NOT NULL,
    "logisticsId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_clientId_idx" ON "support_tickets"("clientId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticketId_createdAt_idx" ON "support_ticket_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_requests_requestNumber_key" ON "logistics_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "logistics_requests_clientId_idx" ON "logistics_requests"("clientId");

-- CreateIndex
CREATE INDEX "logistics_requests_status_idx" ON "logistics_requests"("status");

-- CreateIndex
CREATE INDEX "logistics_requests_createdAt_idx" ON "logistics_requests"("createdAt");

-- CreateIndex
CREATE INDEX "logistics_messages_logisticsId_createdAt_idx" ON "logistics_messages"("logisticsId", "createdAt");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_requests" ADD CONSTRAINT "logistics_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_messages" ADD CONSTRAINT "logistics_messages_logisticsId_fkey" FOREIGN KEY ("logisticsId") REFERENCES "logistics_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_messages" ADD CONSTRAINT "logistics_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
