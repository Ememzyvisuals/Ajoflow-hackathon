"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

const RequestLoanSchema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().max(500).optional(),
});

// ── Request Loan ─────────────────────────────────────────────────
export async function requestLoan(input: {
  groupId: string;
  amount: number;
  reason?: string;
}): Promise<ActionResult> {
  const parsed = RequestLoanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  // Confirm active membership in the group (RLS also enforces this, but a
  // clear error message here is better than a raw Postgres error).
  const { data: membership } = await supabase
    .from("group_memberships")
    .select("id")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    return { success: false, error: "You're not an active member of this group." };
  }

  const { error } = await supabase.from("loan_requests").insert({
    group_id: parsed.data.groupId,
    member_id: user.id,
    amount: parsed.data.amount,
    reason: parsed.data.reason ?? null,
    status: "pending",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/loans");
  return { success: true };
}

// ── Admin Decide Loan ────────────────────────────────────────────
export async function decideLoan(
  loanId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("loan_requests")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", loanId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/loans");
  return { success: true };
}
