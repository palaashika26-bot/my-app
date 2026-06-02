import { z } from "zod";

const inquiryItemSchema = z
  .object({
    type: z.enum(["CATALOG", "CUSTOM"]),
    productId: z.string().uuid("Invalid product ID").optional(),
    productName: z.string().min(1, "Product name required").max(200),
    productDescription: z.string().max(1000).optional(),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    targetPricePerUnit: z.number().positive("Target price must be positive").optional(),
    unit: z.enum(["PCS", "KG", "BOX", "SET"]).default("PCS"),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "CATALOG" && !data.productId) return false;
      return true;
    },
    { message: "Catalog items must have a product selected" }
  );

export const createInquirySchema = z.object({
  notes: z.string().max(1000).optional(),
  items: z
    .array(inquiryItemSchema)
    .min(1, "Add at least one product")
    .max(20, "Maximum 20 products per inquiry"),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
