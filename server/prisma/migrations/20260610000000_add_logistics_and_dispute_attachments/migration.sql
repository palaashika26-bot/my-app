-- Additive, nullable columns only. No drops, no backfill, fully backward-compatible.
-- Logistics estimate persisted on the sourcing request (Stage 2), replacing
-- browser localStorage. Multiple dispute proof attachments (Stage 9).

-- AlterTable
ALTER TABLE "sourcing_requests" ADD COLUMN     "logisticsMode" TEXT,
ADD COLUMN     "logisticsNote" TEXT,
ADD COLUMN     "logisticsPricePerKg" DECIMAL(12,2),
ADD COLUMN     "logisticsWeight" TEXT;

-- AlterTable
ALTER TABLE "disputes" ADD COLUMN     "attachments" TEXT[];
