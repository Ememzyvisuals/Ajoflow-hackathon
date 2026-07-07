// ============================================================
// AjoFlow – Nomba Checkout
// CONFIRMED from hackathon channel (July 3 2026):
// "Nomba treats amount in NAIRA not kobo"
// Multiple people confirmed — send amount in NAIRA directly
// NO multiplication by 100
//
// accountId header (July 6 2026 — superseding an earlier fix):
// Victor Shoaga (Nomba team) clarified in the hackathon channel that the
// accountId header should ALWAYS be the parent account ID for EVERY
// request, with sub-account scoping done via path/body/query fields
// instead, never via the header. An earlier fix here (based on another
// participant's own unconfirmed diagnosis) had switched this to the
// sub-account, theorizing that fixed missing webhooks. Reverted to the
// parent per the more authoritative guidance. The actual, confirmed fix
// for missing webhook events is registering the webhook URL on BOTH the
// parent AND the sub-account — see docs/nomba-integration.md.
// ============================================================

import { nombaRequest, PARENT_ACCOUNT_ID } from "./client";

export interface CreateCheckoutOrderParams {
  orderReference: string;
  amountNGN: number;       // Amount in NAIRA — sent as-is to Nomba
  customerEmail: string;
  customerId: string;
  callbackUrl: string;
  description?: string;
  tokenizeCard?: boolean;
  allowedPaymentMethods?: ("Card" | "Transfer")[];
}

export interface NombaCheckoutOrder {
  checkoutLink: string;
  orderReference: string;
}

export async function createCheckoutOrder(
  params: CreateCheckoutOrderParams
): Promise<NombaCheckoutOrder> {
  // CONFIRMED: amount in NAIRA, not kobo
  // "Nomba treats amount in naira not kobo" - hackathon channel July 3
  const body: Record<string, unknown> = {
    order: {
      orderReference: params.orderReference,
      amount: params.amountNGN,  // NAIRA directly — no conversion
      currency: "NGN",
      customerEmail: params.customerEmail,
      customerId: params.customerId,
      callbackUrl: params.callbackUrl,
      allowedPaymentMethods: params.allowedPaymentMethods ?? ["Card", "Transfer"],
      orderMetaData: {
        productName: params.description ?? "Ajo Contribution",
        internalRef: params.orderReference,
      },
    },
  };

  if (params.tokenizeCard) {
    (body.order as Record<string, unknown>).tokenizeCard = true;
  }

  const response = await nombaRequest<{ code: string; data: NombaCheckoutOrder }>(
    "/checkout/order",
    { method: "POST", accountId: PARENT_ACCOUNT_ID, body }
  );

  return response.data;
}

// Keep helpers for webhook payloads (Nomba webhooks still send amounts)
// but based on confirmed community info, treat webhook amounts as NAIRA too
export const nairaToDisplay = (n: number): string =>
  `₦${n.toLocaleString("en-NG")}`;
