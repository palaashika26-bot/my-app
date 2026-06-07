-- Add catalog management fields to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "videos" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "originCity" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "priceRange" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sampleAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "samplePrice" DECIMAL(12,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "fullDescription" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "keyFeatures" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "specifications" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "material" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tags" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isNew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "onSale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "emoji" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "bgColor" TEXT;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "suppliers_country_idx" ON "suppliers" ("country");
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" ("categoryId");
CREATE INDEX IF NOT EXISTS "products_is_active_idx" ON "products" ("isActive");
CREATE INDEX IF NOT EXISTS "product_categories_parent_id_idx" ON "product_categories" ("parentId");
CREATE INDEX IF NOT EXISTS "request_items_status_idx" ON "request_items" ("status");
CREATE INDEX IF NOT EXISTS "sourcing_requests_client_id_status_idx" ON "sourcing_requests" ("clientId", "status");

-- Add relation indexes missing from schema
CREATE INDEX IF NOT EXISTS "inquiries_status_idx" ON "inquiries" ("status");
CREATE INDEX IF NOT EXISTS "inquiry_items_inquiry_id_idx" ON "inquiry_items" ("inquiryId");
CREATE INDEX IF NOT EXISTS "orders_staff_contact_id_idx" ON "orders" ("staffContactId");
