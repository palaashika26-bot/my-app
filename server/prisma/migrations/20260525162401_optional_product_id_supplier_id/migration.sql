-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_supplierId_fkey";

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "supplierId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
