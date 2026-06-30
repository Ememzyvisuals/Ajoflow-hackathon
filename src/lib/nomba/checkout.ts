// ============================================================
// AjoFlow – Nomba Checkout Service
// Sandbox URL: https://sandbox.nomba.com/v1/checkout/order
// Production:  https://api.nomba.com/v1/checkout/order
// Amounts in KOBO (₦1 = 100 kobo)
// tokenizeCard: true → enables card tokenization for recurring
// Sandbox test card: 5060 6666 6666 6666 666 (any expiry, CVV)
// Tokenization test: 5434621074252808, PIN 0000, OTP 000000
// ============================================================

import { nombaRequest, PARENT_ACCOUNT_ID } from "./client";

export interface CreateCheckoutOrderParams {
  orderReference: string;
  amountNGN: number;
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

// ── Create Checkout Order ─────────────────────────────────────
export async function createCheckoutOrder(
  params: CreateCheckoutOrderParams
): Promise<NombaCheckoutOrder> {
  const amountInKobo = Math.round(params.amountNGN * 100);

  const body: Record<string, unknown> = {
    order: {
      orderReference: params.orderReference,
      amount: amountInKobo.toString(),
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

  // Add tokenizeCard if requested (for recurring contributions)
  if (params.tokenizeCard) {
    (body.order as Record<string, unknown>).tokenizeCard = true;
  }

  const response = await nombaRequest<{ code: string; data: NombaCheckoutOrder }>(
    "/checkout/order",
    {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body,
    }
  );

  return response.data;
}

// ── Kobo ↔ Naira Helpers ─────────────────────────────────────
export const koboToNaira = (kobo: number): number => kobo / 100;
export const nairaToKobo = (naira: number): number => Math.round(naira * 100);
