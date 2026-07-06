// ============================================================
// AjoFlow – Nomba Webhook Verification
// Uses HMAC-SHA256 with the webhook secret
// requestId is used for idempotency dedup
// ============================================================

import crypto from "crypto";

const WEBHOOK_SECRET = process.env.NOMBA_WEBHOOK_SECRET!;

// ── Verify Nomba Webhook Signature ────────────────────────────
// Nomba sends a signature in the header for HMAC verification
export function verifyNombaWebhookSignature(
  payload: string,      // Raw request body as string
  signature: string     // Value from the signature header
): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[Webhook] NOMBA_WEBHOOK_SECRET is not set!");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(signature.replace("sha256=", ""), "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

// ── Webhook Event Types ───────────────────────────────────────
export const WEBHOOK_EVENTS = {
  PAYMENT_SUCCESS: "payment_success",
  VIRTUAL_ACCOUNT_FUNDED: "virtual_account.funded",
  TRANSFER_SUCCESS: "transfer.success",
  TRANSFER_FAILED: "transfer.failed",
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

// ── Payment Success Payload ────────────────────────────────────
export interface PaymentSuccessWebhookPayload {
  event_type: "payment_success";
  requestId: string;   // Use for idempotency
  data: {
    transaction: {
      transactionId: string;
      type: "online_checkout";
      transactionAmount: number;  // In NAIRA, not Kobo — confirmed via hackathon channel
      fee: number;
      time: string;
    };
    customer?: {
      billerId: string;
      senderName: string;
    };
    order: {
      orderReference: string;
      amount: number;  // In NAIRA, not Kobo — confirmed via hackathon channel
      currency: string;
      paymentMethod: "card_payment" | "bank_transfer";
      cardType?: string;
      cardLast4Digits?: string;
    };
  };
}

// ── Virtual Account Funded Payload ────────────────────────────
export interface VirtualAccountFundedPayload {
  event_type: "virtual_account.funded";
  requestId: string;  // Use for idempotency
  data: {
    accountRef: string;       // The accountRef we set when creating the VA
    accountNumber: string;
    amountReceived: number;   // In NAIRA, not Kobo — confirmed via hackathon channel
    amountExpected?: number;  // In NAIRA, not Kobo (if expectedAmount was set)
    senderName?: string;
    senderAccountNumber?: string;
    senderBankName?: string;
    transactionReference: string;
    transactionId: string;
    time: string;
  };
}

// ── Transfer Success Payload ──────────────────────────────────
export interface TransferSuccessPayload {
  event_type: "transfer.success";
  requestId: string;
  data: {
    transactionId: string;
    merchantTxRef: string;   // The reference we provided
    amount: number;          // In NAIRA, not Kobo — confirmed via hackathon channel
    recipientAccountNumber: string;
    recipientBankName: string;
    time: string;
  };
}

export type NombaWebhookPayload =
  | PaymentSuccessWebhookPayload
  | VirtualAccountFundedPayload
  | TransferSuccessPayload;
