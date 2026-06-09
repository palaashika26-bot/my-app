import { z } from "zod";

const attachment = z.string().max(15_000_000);

export const createLogisticsSchema = z.object({
  weightKg: z.string().max(100).optional().nullable(),
  cbm: z.string().max(100).optional().nullable(),
  shippingMethod: z.string().max(100).optional().nullable(),
  orderRef: z.string().max(100).optional().nullable(),
  packagingList: z.array(attachment).max(5).optional(),
  note: z.string().max(2000).optional().nullable(),
});

export const logisticsMessageSchema = z.object({
  text: z.string().max(5000).optional(),
  attachments: z.array(attachment).max(5).optional(),
}).refine((d) => (d.text && d.text.trim().length > 0) || (d.attachments && d.attachments.length > 0), {
  message: "Message text or an attachment is required",
});

export const logisticsQuoteSchema = z.object({
  pricePerKg: z.string().max(50).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export const logisticsStatusSchema = z.object({
  status: z.enum(["PENDING", "QUOTED", "CONFIRMED", "IN_TRANSIT", "COMPLETED"]),
});

export type CreateLogisticsInput = z.infer<typeof createLogisticsSchema>;
export type LogisticsMessageInput = z.infer<typeof logisticsMessageSchema>;
export type LogisticsQuoteInput = z.infer<typeof logisticsQuoteSchema>;
export type LogisticsStatusInput = z.infer<typeof logisticsStatusSchema>;
