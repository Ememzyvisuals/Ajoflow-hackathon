"use server";

// ============================================================
// Auth Server Actions
// "use server" files can ONLY export async functions — no
// schemas, types, or plain objects exported from here.
// Schemas/types live in ./schemas.ts
// ============================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SignUpSchema, SignInSchema } from "./schemas";
import type { ActionResult } from "./schemas";

// ── Sign Up ────────────────────────────────────────────────────
export async function signUp(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<ActionResult<{ requiresConfirmation?: boolean }>> {
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
      emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { success: false, error: "An account with this email already exists." };
    }
    return { success: false, error: error.message };
  }

  if (data.user && !data.session) {
    return { success: true, data: { requiresConfirmation: true } };
  }

  return { success: true };
}

// ── Sign In ────────────────────────────────────────────────────
export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
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
  const parsed = z.string().email("Invalid email address").safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "Invalid email address." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard` },
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
  revalidatePath("/profile");
  return { success: true };
}
