// ============================================================
// AjoFlow – Nomba Transfers
// Bank-to-bank payouts for Ajo recipients
// ============================================================

import { nombaRequest } from "./client";
import { getBankByName } from "@/lib/banks";

export interface BankLookupParams {
  accountNumber: string;
  bankCode: string;
}

export interface BankLookupResult {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface TransferParams {
  amount: number;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  merchantTxRef: string; // Unique reference for idempotency
  narration?: string;
}

export interface TransferResult {
  transactionId: string;
  status: "pending" | "successful" | "failed";
  merchantTxRef: string;
}

// Bank codes now live in src/lib/banks.ts (NIGERIAN_BANKS) alongside
// real logo assets. Re-exported here for backward compatibility.
export { getBankByName };

// ── Bank Account Lookup ───────────────────────────────────────
// Always verify account name before transferring
export async function lookupBankAccount(
  params: BankLookupParams
): Promise<BankLookupResult> {
  const response = await nombaRequest<{ code: string; data: BankLookupResult }>(
    "/transfers/bank/lookup",
    {
      method: "POST",
      body: {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      },
    }
  );
  return response.data;
}

// ── Initiate Bank Transfer ────────────────────────────────────
export async function transferToBank(
  params: TransferParams
): Promise<TransferResult> {
  const response = await nombaRequest<{ code: string; data: TransferResult }>(
    "/transfers/bank",
    {
      method: "POST",
      body: {
        amount: params.amountNGN,  // NAIRA per hackathon channel Jul 3
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        accountName: params.accountName,
        merchantTxRef: params.merchantTxRef,
        narration: params.narration ?? "AjoFlow Payout",
      },
    }
  );

  return response.data;
}

// ── Build merchantTxRef ────────────────────────────────────────
export function buildMerchantTxRef(payoutId: string): string {
  return `ajoflow-payout-${payoutId.replace(/-/g, "").slice(0, 24)}`;
}
