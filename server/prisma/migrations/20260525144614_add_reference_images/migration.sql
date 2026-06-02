-- AlterTable
ALTER TABLE "request_items" ADD COLUMN     "counterNote" TEXT,
ADD COLUMN     "referenceImageUrls" TEXT[],
ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sourcing_requests" ADD COLUMN     "referenceNote" TEXT;
