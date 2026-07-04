// ============================================================
// AjoFlow – Nomba Webhook Handler
// POST /api/webhooks/nomba
// Never trust frontend. Only trust verified webhooks.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { recordOnTimePayment } from "@/features/trust/engine";
import type { VirtualAccountFundedPayload, PaymentSuccessWebhookPayload } from "@/lib/nomba/webhook";

const WEBHOOK_SECRET = process.env.NOMBA_WEBHOOK_SECRET!;

// ── HMAC Signature Verification ───────────────────────────────
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[Webhook] NOMBA_WEBHOOK_SECRET not configured");
    return false;
  }
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

// ── Main Handler ───────────────────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Cannot read body" }, { status: 400 });
  }

  // ── 1. Signature Verification ──────────────────────────────
  // Confirmed from Nomba webhook registration form:
  // header name is "nomba-signature" (not "x-nomba-signature")
  const signature =
    request.headers.get("nomba-signature") ??
    request.headers.get("x-nomba-signature") ??   // fallback just in case
    "";

  if (process.env.NOMBA_ENV !== "sandbox") {
    // Skip signature check in sandbox only for initial testing
    if (!verifySignature(rawBody, signature)) {
      console.warn("[Webhook] Invalid signature received");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // ── 2. Parse Payload ───────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload.event_type ?? payload.eventType) as string;
  const requestId = (payload.requestId ?? payload.request_id ?? crypto.randomUUID()) as string;

  const supabase = createServiceClient();

  // ── 3. Idempotency Check ────────────────────────────────────
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id, processed")
    .eq("request_id", requestId)
    .single();

  if (existingEvent?.processed) {
    console.info(`[Webhook] Duplicate event ${requestId} – skipping`);
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  // ── 4. Store Raw Event ──────────────────────────────────────
  if (!existingEvent) {
    await supabase.from("webhook_events").insert({
      request_id: requestId,
      event_type: eventType,
      payload,
      signature,
      processed: false,
    });
  }

  // ── 5. Process Event ────────────────────────────────────────
  try {
    switch (eventType) {
      case "virtual_account.funded":
        await handleVirtualAccountFunded(payload as unknown as VirtualAccountFundedPayload, supabase);
        break;
      case "payment_success":
        await handlePaymentSuccess(payload as unknown as PaymentSuccessWebhookPayload, supabase);
        break;
      case "transfer.success":
        await handleTransferSuccess(payload, supabase);
        break;
      default:
        console.info(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // Mark as processed
    await supabase
      .from("webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("request_id", requestId);

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (err) {
    console.error(`[Webhook] Processing error for ${eventType}:`, err);
    await supabase
      .from("webhook_events")
      .update({ error: err instanceof Error ? err.message : String(err) })
      .eq("request_id", requestId);

    // Always return 200 to prevent Nomba retrying for business logic errors
    return NextResponse.json({ message: "Received" }, { status: 200 });
  }
}

// ── virtual_account.funded ─────────────────────────────────────
async function handleVirtualAccountFunded(
  payload: VirtualAccountFundedPayload,
  supabase: ReturnType<typeof createServiceClient>
) {
  const { accountRef, amountReceived, transactionReference, senderName } = payload.data;

  // Amount confirmed in Naira (hackathon channel July 3 2026)
  const amountNGN = amountReceived;

  // 1. Find virtual account by accountRef
  const { data: va } = await supabase
    .from("member_virtual_accounts")
    .select("membership_id")
    .eq("account_reference", accountRef)
    .single();

  if (!va) {
    console.warn(`[Webhook] VA not found for accountRef: ${accountRef}`);
    return;
  }

  // 2. Get membership → group
  const { data: membership } = await supabase
    .from("group_memberships")
    .select("id, group_id, user_id")
    .eq("id", va.membership_id)
    .single();

  if (!membership) {
    console.warn(`[Webhook] Membership not found for VA membership_id: ${va.membership_id}`);
    return;
  }

  // 3. Prevent duplicate contribution via transaction reference
  const { data: existingContrib } = await supabase
    .from("contributions")
    .select("id")
    .eq("transaction_reference", transactionReference)
    .single();

  if (existingContrib) {
    console.info(`[Webhook] Contribution already recorded for ref: ${transactionReference}`);
    return;
  }

  // 4. Create contribution record
  const { data: contribution, error: contribError } = await supabase
    .from("contributions")
    .insert({
      membership_id: membership.id,
      group_id: membership.group_id,
      amount: amountNGN,
      status: "paid",
      paid_at: new Date().toISOString(),
      transaction_reference: transactionReference,
      payment_method: "transfer",
    })
    .select()
    .single();

  if (contribError) {
    console.error("[Webhook] Failed to create contribution:", contribError);
    throw contribError;
  }

  // 5. Update group wallet (Supabase ledger – source of truth)
  const { data: wallet } = await supabase
    .from("group_wallets")
    .select("balance, total_received")
    .eq("group_id", membership.group_id)
    .single();

  if (wallet) {
    await supabase
      .from("group_wallets")
      .update({
        balance: wallet.balance + amountNGN,
        total_received: wallet.total_received + amountNGN,
        last_updated: new Date().toISOString(),
      })
      .eq("group_id", membership.group_id);
  }

  // 6. Update trust score
  await recordOnTimePayment(membership.id);

  // 7. Notify member
  await supabase.from("notifications").insert({
    user_id: membership.user_id,
    type: "contribution_paid",
    title: "Contribution Received ✅",
    message: `₦${amountNGN.toLocaleString()} has been recorded for your group.`,
    data: {
      contribution_id: contribution.id,
      amount: amountNGN,
      sender: senderName,
    },
  });

  // 8. Audit log
  await supabase.from("audit_logs").insert({
    user_id: membership.user_id,
    action: "CONTRIBUTION_CREATED",
    entity_type: "contribution",
    entity_id: contribution.id,
    metadata: {
      amount: amountNGN,
      group_id: membership.group_id,
      transaction_reference: transactionReference,
      source: "virtual_account_funded",
    },
  });

  console.info(`[Webhook] ✅ Contribution ₦${amountNGN} recorded for membership ${membership.id}`);
}

// ── payment_success ────────────────────────────────────────────
async function handlePaymentSuccess(
  payload: PaymentSuccessWebhookPayload,
  supabase: ReturnType<typeof createServiceClient>
) {
  const orderRef = payload.data.order.orderReference;
  const amountKobo = payload.data.order.amount;
  const amountNGN = amountKobo; // Naira directly per hackathon channel confirmation
  const transactionId = payload.data.transaction.transactionId;

  // Find payment session by order reference
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("*")
    .eq("order_reference", orderRef)
    .single();

  if (!session) {
    console.warn(`[Webhook] Payment session not found: ${orderRef}`);
    return;
  }

  if (session.status === "completed") {
    console.info(`[Webhook] Session already completed: ${orderRef}`);
    return;
  }

  // Mark session completed
  await supabase
    .from("payment_sessions")
    .update({ status: "completed", nomba_order_ref: orderRef })
    .eq("id", session.id);

  // Check for duplicate
  const { data: existingContrib } = await supabase
    .from("contributions")
    .select("id")
    .eq("nomba_transaction_id", transactionId)
    .single();

  if (existingContrib) return;

  // Create contribution
  const { data: contribution, error } = await supabase
    .from("contributions")
    .insert({
      membership_id: session.membership_id,
      group_id: session.group_id,
      amount: amountNGN,
      status: "paid",
      paid_at: new Date().toISOString(),
      transaction_reference: orderRef,
      nomba_transaction_id: transactionId,
      payment_method: "card",
    })
    .select()
    .single();

  if (error) throw error;

  // Update group wallet
  const { data: wallet } = await supabase
    .from("group_wallets")
    .select("balance, total_received")
    .eq("group_id", session.group_id)
    .single();

  if (wallet) {
    await supabase
      .from("group_wallets")
      .update({
        balance: wallet.balance + amountNGN,
        total_received: wallet.total_received + amountNGN,
        last_updated: new Date().toISOString(),
      })
      .eq("group_id", session.group_id);
  }

  // Trust score update
  await recordOnTimePayment(session.membership_id);

  // Notify
  await supabase.from("notifications").insert({
    user_id: session.user_id,
    type: "contribution_paid",
    title: "Payment Confirmed ✅",
    message: `₦${amountNGN.toLocaleString()} card payment recorded.`,
    data: { contribution_id: contribution.id, amount: amountNGN },
  });

  await supabase.from("audit_logs").insert({
    user_id: session.user_id,
    action: "CONTRIBUTION_CREATED",
    entity_type: "contribution",
    entity_id: contribution.id,
    metadata: { amount: amountNGN, source: "checkout", order_reference: orderRef },
  });

  console.info(`[Webhook] ✅ Card contribution ₦${amountNGN} recorded for session ${session.id}`);
}

// ── transfer.success ───────────────────────────────────────────
async function handleTransferSuccess(
  payload: Record<string, unknown>,
  supabase: ReturnType<typeof createServiceClient>
) {
  const data = payload.data as Record<string, unknown>;
  const merchantTxRef = data?.merchantTxRef as string;
  if (!merchantTxRef) return;

  // Extract payout ID from ref (format: ajoflow-payout-{id24chars})
  const payoutId = merchantTxRef.replace("ajoflow-payout-", "");

  const { data: payout } = await supabase
    .from("payouts")
    .select("*")
    .ilike("id", `${payoutId.slice(0, 8)}%`)
    .single();

  if (!payout) return;

  if (payout.status === "paid") return;

  await supabase
    .from("payouts")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payout.id);

  await supabase.from("audit_logs").insert({
    action: "PAYOUT_COMPLETED",
    entity_type: "payout",
    entity_id: payout.id,
    metadata: { merchantTxRef, source: "webhook" },
  });

  console.info(`[Webhook] ✅ Payout completed for ${payout.id}`);
}
