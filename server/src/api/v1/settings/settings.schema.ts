import { z } from "zod";

export const updateExchangeRateSchema = z.object({
  rate: z
    .number({ invalid_type_error: "Rate must be a number" })
    .positive("Rate must be a positive number")
    .max(10000, "Rate is unreasonably large"),
});
