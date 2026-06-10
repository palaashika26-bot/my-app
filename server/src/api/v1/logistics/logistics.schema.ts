import { z } from "zod";

// Storage paths / URLs for packaging-list files and the warehouse slip. The
// browser uploads bytes directly to object storage and sends back short paths,
// so these are length-bounded strings (not base64 blobs).
const urlList = z.array(z.string().min(1).max(2048)).max(12).optional();
const SHIP_METHODS = ["Air", "Express", "Sea"] as const;

export const createLogisticsSchema = z.object({
  shippingMethod: z.enum(SHIP_METHODS),
  weightKg: z.number().positive().max(1_000_000).optional(),
  volumeCbm: z.number().positive().max(1_000_000).optional(),
  packagingListUrls: urlList,
  packagingThumbUrls: urlList,
  note: z.string().max(2000).optional(),
});

export const quoteLogisticsSchema = z.object({
  carrier: z.string().min(1, "Carrier is required").max(200),
  shippingMode: z.enum(SHIP_METHODS),
  estimatedPriceINR: z.number().positive("Price must be positive"),
  pricePerKgCNY: z.number().positive().optional(),
  eta: z.string().max(100).optional(),
  quoteNote: z.string().max(2000).optional(),
});

// Single accept / reject / counter on the one logistics quote (not per-item).
export const respondLogisticsSchema = z
  .object({
    response: z.enum(["ACCEPTED", "REJECTED", "COUNTERED"]),
    counterPriceINR: z.number().positive().optional(),
    counterNote: z.string().max(500).optional(),
  })
  .refine((d) => d.response !== "COUNTERED" || d.counterPriceINR != null, {
    message: "Counter price is required for a counter offer",
    path: ["counterPriceINR"],
  });

// Admin re-quote in response to a client counter — price required, rest optional.
export const respondCounterLogisticsSchema = z.object({
  estimatedPriceINR: z.number().positive("Price must be positive"),
  pricePerKgCNY: z.number().positive().optional(),
  carrier: z.string().min(1).max(200).optional(),
  shippingMode: z.enum(SHIP_METHODS).optional(),
  eta: z.string().max(100).optional(),
  quoteNote: z.string().max(2000).optional(),
});

export const updatePhaseSchema = z.object({
  phase: z.enum(["AT_WAREHOUSE", "FLIGHT_BOOKED", "IN_TRANSIT", "INDIA_WAREHOUSE"]),
});

// Client picks pickup or delivery; delivery requires an address.
export const deliveryModeSchema = z
  .object({
    deliveryMode: z.enum(["PICKUP", "DELIVERY"]),
    deliveryAddress: z.string().max(1000).optional(),
  })
  .refine((d) => d.deliveryMode !== "DELIVERY" || Boolean(d.deliveryAddress?.trim()), {
    message: "Delivery address is required for delivery",
    path: ["deliveryAddress"],
  });

export const uploadSlipSchema = z.object({
  warehouseSlipUrl: z.string().min(1).max(2048),
  warehouseSlipThumbUrl: z.string().min(1).max(2048).optional(),
});

export const confirmCargoSchema = z.object({
  confirmedBy: z.string().min(1, "Staff name is required").max(200),
});

export const cancelLogisticsSchema = z.object({
  cancelReason: z.string().max(500).optional(),
});

export const sendLogisticsMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});

export type CreateLogisticsInput = z.infer<typeof createLogisticsSchema>;
export type QuoteLogisticsInput = z.infer<typeof quoteLogisticsSchema>;
export type RespondLogisticsInput = z.infer<typeof respondLogisticsSchema>;
export type RespondCounterLogisticsInput = z.infer<typeof respondCounterLogisticsSchema>;
export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;
export type DeliveryModeInput = z.infer<typeof deliveryModeSchema>;
export type UploadSlipInput = z.infer<typeof uploadSlipSchema>;
export type ConfirmCargoInput = z.infer<typeof confirmCargoSchema>;
export type CancelLogisticsInput = z.infer<typeof cancelLogisticsSchema>;
export type SendLogisticsMessageInput = z.infer<typeof sendLogisticsMessageSchema>;
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
