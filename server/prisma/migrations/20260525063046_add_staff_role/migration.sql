-- AlterTable
ALTER TABLE "inquiry_items" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffRole" TEXT;
