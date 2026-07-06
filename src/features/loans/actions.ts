"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getLoanEligibility } from "@/features/trust/engine";

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

  // Trust-score-gated eligibility — getLoanEligibility existed with zero
  // caller before this; now it actually gates real loan requests.
  const [{ data: trustScore }, { data: group }] = await Promise.all([
    supabase.from("trust_scores").select("score").eq("membership_id", membership.id).single(),
    supabase.from("groups").select("contribution_amount").eq("id", parsed.data.groupId).single(),
  ]);

  const score = trustScore?.score ?? 100;
  const eligibility = getLoanEligibility(score);

  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason };
  }

  const maxAmount = (group?.contribution_amount ?? 0) * eligibility.maxMultiplier;
  if (maxAmount > 0 && parsed.data.amount > maxAmount) {
    return {
      success: false,
      error: `Your trust score (${score}) qualifies you for up to ${eligibility.maxMultiplier}× your contribution amount (₦${maxAmount.toLocaleString()}). ${eligibility.reason}`,
    };
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

  const { data: loan } = await supabase
    .from("loan_requests")
    .select("*")
    .eq("id", loanId)
    .single();

  if (!loan) return { success: false, error: "Loan not found." };

  const { error } = await supabase
    .from("loan_requests")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", loanId);

  if (error) return { success: false, error: error.message };

  // Notify the requester of the decision — this used to only exist in a
  // dead duplicate of this function elsewhere in the codebase that no UI
  // ever called; ported the behavior here where it actually runs.
  await supabase.from("notifications").insert({
    user_id: loan.member_id,
    type: decision === "approved" ? "loan_approved" : "loan_rejected",
    title: decision === "approved" ? "Loan Approved ✅" : "Loan Rejected",
    message:
      decision === "approved"
        ? `Your loan request of ₦${Number(loan.amount).toLocaleString()} has been approved.`
        : `Your loan request of ₦${Number(loan.amount).toLocaleString()} was not approved.`,
    data: { loan_id: loanId, amount: loan.amount },
  });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: `LOAN_${decision.toUpperCase()}`,
    entity_type: "loan_request",
    entity_id: loanId,
    metadata: { amount: loan.amount, group_id: loan.group_id },
  });

  revalidatePath("/loans");
  return { success: true };
}
