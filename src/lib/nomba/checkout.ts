// ============================================================
// AjoFlow – Nomba Checkout
// CONFIRMED from hackathon channel (July 3 2026):
// "Nomba treats amount in NAIRA not kobo"
// Multiple people confirmed — send amount in NAIRA directly
// NO multiplication by 100
//
// CONFIRMED from hackathon channel (July 5 2026, Tochukwu):
// /checkout/order must use the SUB-ACCOUNT as the accountId header,
// not the parent. Orders created under the parent's accountId silently
// never fire a webhook event at all — payment succeeds, Nomba's own
// event-logs show zero events, nothing arrives at our webhook URL.
// This does not affect /accounts/virtual, which correctly uses the
// parent header (see virtual-accounts.ts).
// ============================================================

import { nombaRequest, SUB_ACCOUNT_ID } from "./client";

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
    { method: "POST", accountId: SUB_ACCOUNT_ID, body }
  );

  return response.data;
}

// Keep helpers for webhook payloads (Nomba webhooks still send amounts)
// but based on confirmed community info, treat webhook amounts as NAIRA too
export const nairaToDisplay = (n: number): string =>
  `₦${n.toLocaleString("en-NG")}`;
