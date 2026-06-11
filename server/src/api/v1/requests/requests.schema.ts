import { z } from "zod";

// Each reference image as base64 must not exceed 7 MB (≈5 MB binary equivalent).
// This catches oversized payloads before they hit the DB and prevents proxy
// timeouts caused by large request bodies.
const MAX_BASE64_IMAGE_BYTES = 7_000_000;

function isUnderMaxSize(url: string): boolean {
  return Buffer.byteLength(url, "utf8") <= MAX_BASE64_IMAGE_BYTES;
}

const requestItemBaseObject = z.object({
  type: z.enum(["CATALOG", "CUSTOM"]),
  productId: z.string().uuid("Invalid product ID").optional(),
  productName: z.string().min(1, "Product name required").max(200),
  productDescription: z.string().max(1000).optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit: z.enum(["PCS", "KG", "BOX", "SET"]).default("PCS"),
  targetPriceINR: z.number().positive("Target price must be positive").optional(),
  notes: z.string().max(500).optional(),
});

const catalogRefine = (data: z.infer<typeof requestItemBaseObject>) => {
  if (data.type === "CATALOG" && !data.productId) return false;
  return true;
};

export const requestItemSchema = requestItemBaseObject.refine(catalogRefine, {
  message: "Catalog items must have productId",
});

const requestItemWithImagesBase = requestItemBaseObject.extend({
  referenceImageUrls: z
    .array(
      z.string().refine(isUnderMaxSize, "Each image must be under 5 MB after base64 decoding")
    )
    .max(5)
    .optional(),
  // The client uploads a small webp thumbnail alongside each reference image and
  // sends its storage path here. Without this field the validate() middleware
  // (which replaces req.body with the parsed result) strips it, so every
  // thumbnail was silently dropped before reaching the repository.
  referenceThumbUrls: z
    .array(z.string().refine(isUnderMaxSize, "Each thumbnail path is too long"))
    .max(5)
    .optional(),
});

const requestTypeSchema = z.enum(["SOURCING", "QUOTATION", "SAMPLE"]).optional();

export const createRequestSchema = z.object({
  notes: z.string().max(1000).optional(),
  totalBudgetINR: z.number().positive().optional(),
  requestType: requestTypeSchema,
  items: z
    .array(requestItemSchema)
    .min(1, "Add at least one product")
    .max(20, "Maximum 20 products"),
});

export const sendQuotationSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        quotedRMB: z.number().positive("Price must be positive"),
      })
    )
    .min(1),
  staffNotes: z.string().max(1000).optional(),
  advanceAmountINR: z.number().positive().optional(),
});

// Logistics estimate captured with the quotation (Stage 2). All optional/nullable
// so staff can save partial data or clear a field. pricePerKg arrives as a string
// from the UI and is coerced to a Decimal in the repository.
export const logisticsSchema = z.object({
  weight: z.string().max(100).optional().nullable(),
  mode: z.string().max(100).optional().nullable(),
  pricePerKg: z.string().max(50).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export const rejectRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const cancelRequestSchema = z.object({
  cancelReason: z.string().max(500).optional(),
});

export const respondToQuotationSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        response: z.enum(["ACCEPTED", "REJECTED", "COUNTERED"]),
        counterPriceINR: z.number().positive().optional(),
        counterNote: z.string().max(500).optional(),
      })
    )
    .min(1),
});

export const respondToCounterSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        newQuotedRMB: z.number().positive("Price must be positive"),
      })
    )
    .min(1),
});

export const createRequestSchemaV2 = createRequestSchema.extend({
  referenceNote: z.string().max(2000).optional(),
  items: z
    .array(requestItemWithImagesBase.refine(catalogRefine, { message: "Catalog items must have productId" }))
    .min(1, "Add at least one product")
    .max(20, "Maximum 20 products"),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type CreateRequestInputV2 = z.infer<typeof createRequestSchemaV2>;
export type SendQuotationInput = z.infer<typeof sendQuotationSchema>;
export type LogisticsInput = z.infer<typeof logisticsSchema>;
export type RespondToQuotationInput = z.infer<typeof respondToQuotationSchema>;
export type RespondToCounterInput = z.infer<typeof respondToCounterSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
