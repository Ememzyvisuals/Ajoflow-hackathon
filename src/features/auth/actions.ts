"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ── Schemas ────────────────────────────────────────────────────
export const SignUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  phone: z.string().optional(),
});

export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type ActionResult = { success: boolean; error?: string; data?: unknown };

// ── Sign Up ────────────────────────────────────────────────────
export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone ?? null,
      },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { success: false, error: "An account with this email already exists." };
    }
    return { success: false, error: error.message };
  }

  if (data.user && !data.session) {
    return {
      success: true,
      data: { requiresConfirmation: true },
    };
  }

  return { success: true };
}

// ── Sign In ────────────────────────────────────────────────────
export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = SignInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { success: false, error: "Invalid email or password." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Sign Out ───────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Magic Link ─────────────────────────────────────────────────
export async function sendMagicLink(email: string): Promise<ActionResult> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "Invalid email address." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Update Profile ─────────────────────────────────────────────
export async function updateProfile(input: {
  fullName?: string;
  phone?: string;
  language?: "en" | "pidgin";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      phone: input.phone,
      language: input.language,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
