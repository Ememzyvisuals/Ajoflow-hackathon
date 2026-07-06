"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recordOnTimePayment, recordLatePayment } from "@/features/trust/engine";

export type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

// ── Member reports "I sent money but it's not showing" ──────────
const ReportIssueSchema = z.object({
  groupId: z.string().uuid(),
  membershipId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
});

export async function reportPaymentIssue(input: {
  groupId: string;
  membershipId: string;
  amount: number;
  note?: string;
}): Promise<ActionResult<{ reportId: string }>> {
  const parsed = ReportIssueSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: report, error } = await supabase
    .from("payment_issue_reports")
    .insert({
      group_id: parsed.data.groupId,
      membership_id: parsed.data.membershipId,
      reporter_id: user.id,
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data: admins } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", parsed.data.groupId)
    .in("role", ["owner", "admin"])
    .eq("status", "active");

  if (admins && admins.length > 0) {
    await supabase.from("notifications").insert(
      admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        type: "payment_issue_reported",
        title: "Payment Not Showing \u26a0\ufe0f",
        message: `${profile?.full_name ?? "A member"} says they sent \u20a6${parsed.data.amount.toLocaleString()} but it isn't showing yet.${parsed.data.note ? ` Note: ${parsed.data.note}` : ""}`,
        data: { group_id: parsed.data.groupId, report_id: report.id },
      }))
    );
  }

  return { success: true, data: { reportId: report.id } };
}

// \u2500\u2500 Attach a receipt to an existing report \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export async function attachReceiptPath(reportId: string, receiptPath: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("payment_issue_reports")
    .update({ receipt_path: receiptPath })
    .eq("id", reportId)
    .eq("reporter_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getReceiptSignedUrl(reportId: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Server configuration error." };
  }

  const { data: report } = await serviceClient
    .from("payment_issue_reports")
    .select("group_id, receipt_path")
    .eq("id", reportId)
    .single();

  if (!report || !report.receipt_path) {
    return { success: false, error: "No receipt attached to this report." };
  }

  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", report.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only group admins can view receipts." };
  }

  const { data: signed, error } = await serviceClient.storage
    .from("receipts")
    .createSignedUrl(report.receipt_path, 300);

  if (error || !signed) return { success: false, error: "Could not generate receipt link." };
  return { success: true, data: { url: signed.signedUrl } };
}

export async function decidePaymentReport(
  reportId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Server configuration error." };
  }

  const { data: report } = await serviceClient
    .from("payment_issue_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found." };
  if (report.status !== "pending") return { success: false, error: "This report has already been decided." };

  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", report.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only group admins can decide payment reports." };
  }

  if (decision === "approved") {
    const result = await manuallyRecordContribution({
      groupId: report.group_id,
      membershipId: report.membership_id,
      amount: report.amount,
      reference: `report-${report.id}`,
    });
    if (!result.success) return result;
  }

  await serviceClient
    .from("payment_issue_reports")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      receipt_path: null,
    })
    .eq("id", reportId);

  if (report.receipt_path) {
    await serviceClient.storage.from("receipts").remove([report.receipt_path]);
  }

  await serviceClient.from("notifications").insert({
    user_id: report.reporter_id,
    type: decision === "approved" ? "payment_report_approved" : "payment_report_rejected",
    title: decision === "approved" ? "Payment Confirmed \u2705" : "Payment Report Rejected",
    message:
      decision === "approved"
        ? `Your reported payment of \u20a6${Number(report.amount).toLocaleString()} has been confirmed and recorded.`
        : `Your reported payment of \u20a6${Number(report.amount).toLocaleString()} could not be confirmed. Contact your group admin.`,
    data: { report_id: reportId, group_id: report.group_id },
  });

  revalidatePath(`/groups/${report.group_id}`);
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
