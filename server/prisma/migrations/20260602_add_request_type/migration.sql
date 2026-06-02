-- Create RequestType enum
CREATE TYPE "RequestType" AS ENUM ('SOURCING', 'QUOTATION', 'SAMPLE');

-- Add requestType column to sourcing_requests table
ALTER TABLE "sourcing_requests" ADD COLUMN "requestType" "RequestType" NOT NULL DEFAULT 'SOURCING';
