import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export const registerClientSchema = z
  .object({
    firstName: z.string().min(1, "First name required").max(50),
    lastName: z.string().min(1, "Last name required").max(50),
    email: z.string().email("Invalid email"),
    phone: z
      .string()
      .min(10, "Invalid phone number")
      .max(15)
      .regex(/^[+]?[0-9]+$/, "Invalid phone number"),
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[^A-Za-z0-9]/, "Must contain special character"),
    confirmPassword: z.string(),
    companyName: z.string().min(1, "Company name required").max(100),
    gstin: z
      .string()
      .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Invalid GSTIN format"
      )
      .optional()
      .or(z.literal("")),
    addressLine1: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pincode: z
      .string()
      .regex(/^[0-9]{6}$/, "Invalid pincode")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterClientInput = z.infer<typeof registerClientSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
