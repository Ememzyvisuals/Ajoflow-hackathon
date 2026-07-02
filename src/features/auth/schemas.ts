// ============================================================
// Auth Schemas & Types — kept separate from "use server" file
// because "use server" files can ONLY export async functions
// ============================================================

import { z } from "zod";

export const SignUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  phone: z.string().optional(),
});

export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};
