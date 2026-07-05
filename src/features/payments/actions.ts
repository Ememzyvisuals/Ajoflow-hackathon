"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createCheckoutOrder } from "@/lib/nomba/checkout";
import { transferToBank, buildMerchantTxRef, lookupBankAccount } from "@/lib/nomba/transfers";
import { generateOrderRef } from "@/lib/utils";
import { withTimeout } from "@/lib/timeout";

export type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

// ── Initiate Checkout Payment ──────────────────────────────────
export async function initiateContributionPayment(
  groupId: string,
  membershipId: string
): Promise<ActionResult<{ checkoutUrl: string; orderReference: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  // Get group contribution amount
  const { data: group } = await serviceClient
    .from("groups")
    .select("name, contribution_amount")
    .eq("id", groupId)
    .single();

  if (!group) return { success: false, error: "Group not found." };

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single();

  const orderReference = generateOrderRef();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Create payment session first (optimistic record)
  const { error: sessionError } = await serviceClient
    .from("payment_sessions")
    .insert({
      user_id: user.id,
      group_id: groupId,
      membership_id: membershipId,
      order_reference: orderReference,
      amount: group.contribution_amount,
      status: "pending",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

  if (sessionError) return { success: false, error: sessionError.message };

  try {
    const checkout = await createCheckoutOrder({
      orderReference,
      amountNGN: group.contribution_amount,
      customerEmail: profile?.email ?? "",
      customerId: user.id,
      callbackUrl: `${appUrl}/dashboard?payment=success&ref=${orderReference}`,
      description: `${group.name} – Contribution`,
    });

    // Update session with checkout URL
    await serviceClient
      .from("payment_sessions")
      .update({ checkout_url: checkout.checkoutLink, nomba_order_ref: checkout.orderReference })
      .eq("order_reference", orderReference);

    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "PAYMENT_INITIATED",
      entity_type: "payment_session",
      entity_id: orderReference,
      metadata: { group_id: groupId, amount: group.contribution_amount },
    });

    return {
      success: true,
      data: { checkoutUrl: checkout.checkoutLink, orderReference },
    };
  } catch (err) {
    // Mark session failed
    await serviceClient
      .from("payment_sessions")
      .update({ status: "failed" })
      .eq("order_reference", orderReference);

    return {
      success: false,
      error: err instanceof Error ? err.message : "Payment initiation failed.",
    };
  }
}

// ── Add Payout Account ─────────────────────────────────────────
const PayoutAccountSchema = z.object({
  bankName: z.string().min(2),
  accountNumber: z.string().length(10, "Account number must be 10 digits"),
  bankCode: z.string().min(3),
});

export async function addPayoutAccount(
  input: z.infer<typeof PayoutAccountSchema> & { isDefault?: boolean }
): Promise<ActionResult<{ accountName: string }>> {
  const parsed = PayoutAccountSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  // Verify account via Nomba bank lookup — timeboxed so a slow/hung Nomba
  // sandbox can never leave the "Verify & Save" button spinning forever.
  let accountName: string;
  try {
    const lookup = await withTimeout(
      lookupBankAccount({
        accountNumber: parsed.data.accountNumber,
        bankCode: parsed.data.bankCode,
      }),
      8000,
      "Bank account lookup"
    );
    accountName = lookup.accountName;
  } catch {
    return { success: false, error: "Could not verify bank account. Please check the details and try again." };
  }

  // If setting as default, unset previous default
  if (input.isDefault) {
    await serviceClient
      .from("payout_accounts")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { error } = await serviceClient.from("payout_accounts").insert({
    user_id: user.id,
    bank_name: parsed.data.bankName,
    account_number: parsed.data.accountNumber,
    account_name: accountName,
    bank_code: parsed.data.bankCode,
    is_default: input.isDefault ?? false,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/wallet");
  return { success: true, data: { accountName } };
}

// ── Approve Payout ─────────────────────────────────────────────
export async function approvePayout(payoutId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  // Get payout details
  const { data: payout } = await serviceClient
    .from("payouts")
    .select("*, payout_accounts(*), groups(*)")
    .eq("id", payoutId)
    .single();

  if (!payout) return { success: false, error: "Payout not found." };
  if (payout.status !== "pending") return { success: false, error: "Payout already processed." };

  // Verify admin
  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", payout.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only group admins can approve payouts." };
  }

  // Check group wallet balance
  const { data: wallet } = await serviceClient
    .from("group_wallets")
    .select("balance")
    .eq("group_id", payout.group_id)
    .single();

  if (!wallet || wallet.balance < payout.amount) {
    return { success: false, error: "Insufficient group wallet balance." };
  }

  // Mark as processing
  await serviceClient
    .from("payouts")
    .update({ status: "processing", approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", payoutId);

  try {
    const merchantTxRef = buildMerchantTxRef(payoutId);
    const result = await transferToBank({
      amount: payout.amount,
      accountNumber: payout.payout_accounts.account_number,
      bankCode: payout.payout_accounts.bank_code,
      accountName: payout.payout_accounts.account_name,
      senderName: payout.groups.name ?? "AjoFlow",
      merchantTxRef,
      narration: `AjoFlow Payout – ${payout.groups.name}`,
    });

    await serviceClient.from("payouts").update({
      nomba_transfer_id: result.transactionId,
      status: result.status === "successful" ? "paid" : "processing",
      paid_at: result.status === "successful" ? new Date().toISOString() : null,
    }).eq("id", payoutId);

    // Deduct from group wallet
    await serviceClient
      .from("group_wallets")
      .update({
        balance: wallet.balance - payout.amount,
        total_paid_out: (wallet as { total_paid_out: number }).total_paid_out + payout.amount,
        last_updated: new Date().toISOString(),
      })
      .eq("group_id", payout.group_id);

    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "PAYOUT_APPROVED",
      entity_type: "payout",
      entity_id: payoutId,
      metadata: { amount: payout.amount, merchantTxRef },
    });

    await serviceClient.from("notifications").insert({
      user_id: payout.recipient_id,
      type: "payout_received",
      title: "💰 Payout Sent!",
      message: `₦${payout.amount.toLocaleString()} has been sent to your bank account.`,
      data: { payout_id: payoutId, amount: payout.amount },
    });

    revalidatePath("/payouts");
    return { success: true };
  } catch (err) {
    await serviceClient.from("payouts").update({ status: "failed" }).eq("id", payoutId);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Transfer failed.",
    };
  }
}

// ── Request Loan ───────────────────────────────────────────────
export async function requestLoan(input: {
  groupId: string;
  amount: number;
  reason: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  if (input.amount <= 0) return { success: false, error: "Amount must be positive." };

  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("id")
    .eq("group_id", input.groupId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) return { success: false, error: "You are not an active member of this group." };

  const { error } = await serviceClient.from("loan_requests").insert({
    group_id: input.groupId,
    member_id: user.id,
    amount: input.amount,
    reason: input.reason,
    status: "pending",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/loans");
  return { success: true };
}

// ── Approve / Reject Loan ──────────────────────────────────────
export async function decideLoan(
  loanId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  const { data: loan } = await serviceClient
    .from("loan_requests")
    .select("*")
    .eq("id", loanId)
    .single();

  if (!loan) return { success: false, error: "Loan not found." };

  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", loan.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can decide loan requests." };
  }

  await serviceClient
    .from("loan_requests")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", loanId);

  await serviceClient.from("notifications").insert({
    user_id: loan.member_id,
    type: decision === "approved" ? "loan_approved" : "loan_rejected",
    title: decision === "approved" ? "Loan Approved ✅" : "Loan Rejected",
    message:
      decision === "approved"
        ? `Your loan request of ₦${loan.amount.toLocaleString()} has been approved.`
        : `Your loan request of ₦${loan.amount.toLocaleString()} was not approved.`,
    data: { loan_id: loanId, amount: loan.amount },
  });

  await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: `LOAN_${decision.toUpperCase()}`,
    entity_type: "loan_request",
    entity_id: loanId,
    metadata: { amount: loan.amount, group_id: loan.group_id },
  });

  revalidatePath("/loans");
  return { success: true };
}
