-- Delete existing test inquiry data before schema change
DELETE FROM "inquiries";

-- AlterEnum: add new status values
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_ACCEPTED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';

-- DropColumn: remove old single-product columns from inquiries
ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "productId";
ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "customDescription";
ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "targetPricePerUnit";

-- AddColumn: add new columns to inquiries
ALTER TABLE "inquiries" ADD COLUMN "inquiryNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "inquiries" ADD COLUMN "notes" TEXT;

-- Remove the temporary default and add unique constraint
ALTER TABLE "inquiries" ALTER COLUMN "inquiryNumber" DROP DEFAULT;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_inquiryNumber_key" UNIQUE ("inquiryNumber");

-- CreateTable: inquiry_items
CREATE TABLE "inquiry_items" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "productDescription" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "targetPricePerUnit" DECIMAL(12,2),
    "quotedPrice" DECIMAL(12,2),
    "notes" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inquiry_items_inquiryId_idx" ON "inquiry_items"("inquiryId");

-- AddForeignKey
ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (optional product link)
ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
