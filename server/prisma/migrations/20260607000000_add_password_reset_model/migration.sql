-- Create password_resets table
CREATE TABLE IF NOT EXISTS "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_key" ON "password_resets"("token");

-- Create indexes
CREATE INDEX IF NOT EXISTS "password_resets_email_idx" ON "password_resets"("email");
CREATE INDEX IF NOT EXISTS "password_resets_token_idx" ON "password_resets"("token");
