import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  unit: z.string().default("PCS"),
  moq: z.number().int().min(1).default(1),
  basePrice: z.number().positive("Base price must be positive"),
  currency: z.string().default("CNY"),
  supplierId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  images: z.array(z.string()).default([]),
  videos: z.array(z.string()).default([]),
  brand: z.string().max(100).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  originCity: z.string().max(100).optional().nullable(),
  priceRange: z.string().max(50).optional().nullable(),
  sampleAvailable: z.boolean().default(false),
  samplePrice: z.number().positive().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  fullDescription: z.string().max(5000).optional().nullable(),
  keyFeatures: z.array(z.string()).default([]),
  specifications: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional()
    .nullable(),
  weight: z.string().max(50).optional().nullable(),
  material: z.string().max(100).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
  isNew: z.boolean().default(false),
  onSale: z.boolean().default(false),
  emoji: z.string().max(10).optional().nullable(),
  bgColor: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
