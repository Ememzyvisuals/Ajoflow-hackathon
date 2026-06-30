// ============================================================
// AjoFlow – Nomba Tokenized Card Service
// Flow: Checkout(tokenizeCard:true) → webhook → store tokenKey
//       → POST /v1/checkout/tokenized-card-payment (recurring)
// NOTE: Works in sandbox with card 5434621074252808, PIN 0000, OTP 000000
// NOTE: Direct debit returns 404 in sandbox – use tokenized cards instead
// ============================================================

import { nombaRequest, PARENT_ACCOUNT_ID } from "./client";

export interface CreateTokenizedCheckoutParams {
  orderReference: string;
  amountNGN: number;
  customerEmail: string;
  customerId: string;
  callbackUrl: string;
  description?: string;
}

export interface TokenizedCheckoutOrder {
  checkoutLink: string;
  orderReference: string;
}

// ── Step 1: Create Checkout with tokenizeCard: true ──────────
// After payment, webhook fires payment_success with tokenizedCardData.tokenKey
export async function createTokenizedCheckoutOrder(
  params: CreateTokenizedCheckoutParams
): Promise<TokenizedCheckoutOrder> {
  const amountInKobo = Math.round(params.amountNGN * 100);

  const response = await nombaRequest<{ code: string; data: TokenizedCheckoutOrder }>(
    "/checkout/order",
    {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: {
        order: {
          orderReference: params.orderReference,
          amount: amountInKobo.toString(),
          currency: "NGN",
          customerEmail: params.customerEmail,
          customerId: params.customerId,
          callbackUrl: params.callbackUrl,
          tokenizeCard: true, // KEY: enables card tokenization
          allowedPaymentMethods: ["Card", "Transfer"],
          orderMetaData: {
            productName: params.description ?? "Ajo Contribution",
            internalRef: params.orderReference,
          },
        },
      },
    }
  );

  return response.data;
}

// ── Step 2: Charge Recurring with stored tokenKey ────────────
export interface ChargeTokenizedCardParams {
  tokenKey: string;
  amountNGN: number;
  orderReference: string;
  customerEmail: string;
}

export interface TokenizedChargeResult {
  transactionId: string;
  status: string;
  amount: number;
}

export async function chargeTokenizedCard(
  params: ChargeTokenizedCardParams
): Promise<TokenizedChargeResult> {
  const amountInKobo = Math.round(params.amountNGN * 100);

  const response = await nombaRequest<{ code: string; data: TokenizedChargeResult }>(
    "/checkout/tokenized-card-payment",
    {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: {
        tokenKey: params.tokenKey,
        amount: amountInKobo,
        currency: "NGN",
        orderReference: params.orderReference,
        customerEmail: params.customerEmail,
      },
    }
  );

  return response.data;
}
