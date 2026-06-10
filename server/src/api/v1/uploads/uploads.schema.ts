import { z } from "zod";
import { MAX_UPLOAD_BATCH } from "../../../config/storage";

export const signUploadSchema = z.object({
  scope: z.enum([
    "request-item",
    "payment-proof",
    "dispute",
    "logistics-packing",
    "logistics-slip",
  ]),
  contentTypes: z
    .array(z.string().min(1).max(100))
    .min(1, "At least one file is required")
    .max(MAX_UPLOAD_BATCH, `Maximum ${MAX_UPLOAD_BATCH} files per request`),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;
