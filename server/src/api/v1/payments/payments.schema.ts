import { z } from "zod";

export const submitPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  type: z.enum(["ADVANCE", "BALANCE"]),
  amountINR: z.number().positive("Amount must be positive"),
  proofImageBase64: z.string().min(1, "Payment proof required"),
  proofFileName: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const submitRequestPaymentSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
  type: z.enum(["ADVANCE", "FULL"]),
  amountINR: z.number().positive("Amount must be positive"),
  proofImageBase64: z.string().min(1, "Payment proof required"),
  proofFileName: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const verifyPaymentSchema = z.object({
  action: z.enum(["VERIFY", "REJECT"]),
  rejectionReason: z.string().max(500).optional(),
});

export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
export type SubmitRequestPaymentInput = z.infer<typeof submitRequestPaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
