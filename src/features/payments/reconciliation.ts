"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recordOnTimePayment, recordLatePayment } from "@/features/trust/engine";

export type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

// ── Member reports "I sent money but it's not showing" ──────────
const ReportIssueSchema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
});

export async function reportPaymentIssue(input: {
  groupId: string;
  amount: number;
  note?: string;
}): Promise<ActionResult> {
  const parsed = ReportIssueSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data: admins } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", parsed.data.groupId)
    .in("role", ["owner", "admin"])
    .eq("status", "active");

  if (!admins || admins.length === 0) {
    return { success: false, error: "No admin found for this group." };
  }

  await supabase.from("notifications").insert(
    admins.map((a: { user_id: string }) => ({
      user_id: a.user_id,
      type: "payment_issue_reported",
      title: "Payment Not Showing ⚠️",
      message: `${profile?.full_name ?? "A member"} says they sent ₦${parsed.data.amount.toLocaleString()} but it isn't showing yet.${parsed.data.note ? ` Note: ${parsed.data.note}` : ""}`,
      data: { group_id: parsed.data.groupId, reporter_id: user.id, amount: parsed.data.amount },
    }))
  );

  return { success: true };
}

// ── Admin manually records a contribution ────────────────────────
// This is the real safety net: if Nomba's webhook never fires (a known,
// currently-widespread platform issue — confirmed by multiple teams in
// the hackathon channel), an admin can still verify the transfer landed
// in their own bank app and record it here, so the member isn't stuck
// looking unpaid through no fault of their own.
const ManualRecordSchema = z.object({
  groupId: z.string().uuid(),
  membershipId: z.string().uuid(),
  amount: z.number().positive(),
  reference: z.string().max(200).optional(),
});

export async function manuallyRecordContribution(input: {
  groupId: string;
  membershipId: string;
  amount: number;
  reference?: string;
}): Promise<ActionResult> {
  const parsed = ManualRecordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Server configuration error." };
  }

  const { data: adminMembership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", user.id)
    .single();

  if (!adminMembership || !["owner", "admin"].includes(adminMembership.role)) {
    return { success: false, error: "Only group admins can manually record a payment." };
  }

  const { data: activeCycle } = await serviceClient
    .from("payment_cycles")
    .select("id, end_date")
    .eq("group_id", parsed.data.groupId)
    .eq("status", "active")
    .order("end_date", { ascending: true })
    .limit(1)
    .single();

  const { error } = await serviceClient.from("contributions").insert({
    membership_id: parsed.data.membershipId,
    group_id: parsed.data.groupId,
    cycle_id: activeCycle?.id ?? null,
    amount: parsed.data.amount,
    status: "paid",
    due_date: activeCycle?.end_date ?? null,
    paid_at: new Date().toISOString(),
    transaction_reference: parsed.data.reference ?? `manual-${Date.now()}`,
    payment_method: "manual",
  });

  if (error) return { success: false, error: error.message };

  const { data: wallet } = await serviceClient
    .from("group_wallets")
    .select("balance, total_received")
    .eq("group_id", parsed.data.groupId)
    .single();

  if (wallet) {
    await serviceClient
      .from("group_wallets")
      .update({
        balance: wallet.balance + parsed.data.amount,
        total_received: wallet.total_received + parsed.data.amount,
        last_updated: new Date().toISOString(),
      })
      .eq("group_id", parsed.data.groupId);
  }

  const isLate = activeCycle?.end_date ? new Date() > new Date(activeCycle.end_date) : false;
  if (isLate) {
    await recordLatePayment(parsed.data.membershipId);
  } else {
    await recordOnTimePayment(parsed.data.membershipId);
  }

  await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: "CONTRIBUTION_MANUALLY_RECORDED",
    entity_type: "contribution",
    entity_id: parsed.data.membershipId,
    metadata: { amount: parsed.data.amount, group_id: parsed.data.groupId, reason: "webhook_fallback" },
  });

  revalidatePath(`/groups/${parsed.data.groupId}`);
  return { success: true };
}
