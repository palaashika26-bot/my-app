-- Additive, nullable columns only. No drops, no backfill, fully backward-compatible.
-- Migrates request/item/payment/dispute images from base64-in-DB to object storage
-- (Supabase Storage). New rows store storage paths/URLs (+ small thumbnail paths)
-- in these columns; legacy rows keep their `data:` URLs and still render. The
-- existing base64 columns (proofImageBase64) are retained read-only for back-compat.

-- AlterTable: request items — thumbnail columns. Full URLs reuse imageUrl /
-- referenceImageUrls (already URL-shaped), which now hold storage paths.
ALTER TABLE "request_items" ADD COLUMN     "imageThumbUrl" TEXT,
ADD COLUMN     "referenceThumbUrls" TEXT[];

-- AlterTable: order payments — storage URL + thumbnail. proofImageBase64 kept for legacy rows.
ALTER TABLE "payments" ADD COLUMN     "proofUrl" TEXT,
ADD COLUMN     "proofThumbUrl" TEXT;

-- AlterTable: request payments — same.
ALTER TABLE "request_payments" ADD COLUMN     "proofUrl" TEXT,
ADD COLUMN     "proofThumbUrl" TEXT;

-- AlterTable: disputes — thumbnail array. Full URLs reuse the existing attachments[] column.
ALTER TABLE "disputes" ADD COLUMN     "attachmentThumbs" TEXT[];
