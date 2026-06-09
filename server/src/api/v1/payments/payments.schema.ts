import { z } from "zod";

// Proof now arrives as a storage URL (proofUrl) with an optional thumbnail.
// proofImageBase64 is retained, optional, for backward compatibility with older
// clients; at least one of the two must be present.
const proofFields = {
  proofUrl: z.string().min(1).max(2048).optional(),
  proofThumbUrl: z.string().min(1).max(2048).optional(),
  proofImageBase64: z.string().min(1).optional(),
  proofFileName: z.string().optional(),
};
const hasProof = (d: { proofUrl?: string; proofImageBase64?: string }) =>
  Boolean(d.proofUrl || d.proofImageBase64);
const proofRefine = { message: "Payment proof required", path: ["proofUrl"] as (string | number)[] };

export const submitPaymentSchema = z
  .object({
    orderId: z.string().uuid("Invalid order ID"),
    type: z.enum(["ADVANCE", "BALANCE"]),
    amountINR: z.number().positive("Amount must be positive"),
    ...proofFields,
    notes: z.string().max(500).optional(),
  })
  .refine(hasProof, proofRefine);

export const submitRequestPaymentSchema = z
  .object({
    requestId: z.string().uuid("Invalid request ID"),
    type: z.enum(["ADVANCE", "FULL"]),
    amountINR: z.number().positive("Amount must be positive"),
    ...proofFields,
    notes: z.string().max(500).optional(),
  })
  .refine(hasProof, proofRefine);

export const verifyPaymentSchema = z.object({
  action: z.enum(["VERIFY", "REJECT"]),
  rejectionReason: z.string().max(500).optional(),
});

export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
export type SubmitRequestPaymentInput = z.infer<typeof submitRequestPaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
