-- Fix tracking table: the original migration mistakenly used latitude/longitude
-- instead of stage/updatedAt. Drop the wrong columns and add the correct ones.

ALTER TABLE "tracking" DROP COLUMN "latitude";
ALTER TABLE "tracking" DROP COLUMN "longitude";

ALTER TABLE "tracking" ADD COLUMN "stage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "tracking" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
