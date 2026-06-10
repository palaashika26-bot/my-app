import { z } from "zod";

// A single base64 data URL or short URL string; capped so a payload can't blow up.
const attachment = z.string().max(15_000_000);

export const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  category: z.string().min(1).max(100),
  description: z.string().min(1, "Description is required").max(5000),
  orderId: z.string().max(100).optional().nullable(),
  priority: z.string().max(50).optional().nullable(),
  attachments: z.array(attachment).max(5).optional(),
});

export const ticketMessageSchema = z.object({
  text: z.string().max(5000).optional(),
  attachments: z.array(attachment).max(5).optional(),
}).refine((d) => (d.text && d.text.trim().length > 0) || (d.attachments && d.attachments.length > 0), {
  message: "Message text or an attachment is required",
});

export const ticketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;
export type TicketStatusInput = z.infer<typeof ticketStatusSchema>;
