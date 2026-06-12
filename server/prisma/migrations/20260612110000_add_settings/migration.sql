-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- Seed the default CNY→INR exchange rate (previously hardcoded at 11.50).
INSERT INTO "settings" ("key", "value", "updatedAt")
VALUES ('cny_inr_rate', '11.50', NOW())
ON CONFLICT ("key") DO NOTHING;
