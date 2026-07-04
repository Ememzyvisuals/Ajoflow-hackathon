// ============================================================
// AjoFlow – Nomba Direct Debit Service
// ⚠️  SANDBOX STATUS: All endpoints return 404 in sandbox.
//     Build implemented against documented API contracts.
//     Flag to Nomba team to enable before judging.
//     For demo: use tokenized cards (fully functional in sandbox).
// FLOW:
//   POST /v1/direct-debits    → create mandate
//   Customer consents via bank notification
//   GET  /v1/direct-debits/{mandateId} → confirm active
//   POST /v1/direct-debits/debit-mandate → charge
// Bank codes: GTBank=058, Access=044, UBA=033, FirstBank=011
// ============================================================

import { nombaRequest, PARENT_ACCOUNT_ID } from "./client";

export interface CreateMandateParams {
  accountNumber: string;
  bankCode: string;         // CBN bank code e.g. "058" for GTBank
  amountNGN: number;
  frequency: "daily" | "weekly" | "monthly";
  startDate: string;        // ISO date string
  endDate: string;
  narration?: string;
}

export interface MandateResult {
  mandateId: string;
  status: string;
  accountNumber: string;
  bankCode: string;
}

// ── Create Direct Debit Mandate ───────────────────────────────
// ⚠️ Returns 404 in sandbox — use in production only
export async function createDirectDebitMandate(
  params: CreateMandateParams
): Promise<MandateResult> {
  const response = await nombaRequest<{ code: string; data: MandateResult }>(
    "/direct-debits",
    {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        amount: params.amountNGN,  // NAIRA per hackathon channel Jul 3
        frequency: params.frequency,
        startDate: params.startDate,
        endDate: params.endDate,
        narration: params.narration ?? "AjoFlow Contribution",
      },
    }
  );

  return response.data;
}

// ── Get Mandate Status ────────────────────────────────────────
export async function getMandateStatus(mandateId: string): Promise<MandateResult> {
  const response = await nombaRequest<{ code: string; data: MandateResult }>(
    `/direct-debits/${mandateId}`,
    { accountId: PARENT_ACCOUNT_ID }
  );
  return response.data;
}

// ── Charge Mandate ────────────────────────────────────────────
export async function chargeMandate(params: {
  mandateId: string;
  amountNGN: number;
  narration?: string;
}): Promise<{ transactionId: string; status: string }> {
  const response = await nombaRequest<{ code: string; data: { transactionId: string; status: string } }>(
    "/direct-debits/debit-mandate",
    {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: {
        mandateId: params.mandateId,
        amount: params.amountNGN,  // NAIRA per hackathon channel Jul 3
        narration: params.narration ?? "AjoFlow Contribution",
      },
    }
  );

  return response.data;
}

// Nigerian bank codes reference
export const BANK_CODES: Record<string, string> = {
  "GTBank": "058",
  "Access Bank": "044",
  "UBA": "033",
  "First Bank": "011",
  "Zenith Bank": "057",
  "Fidelity Bank": "070",
  "Sterling Bank": "232",
  "Wema Bank": "035",
  "Moniepoint MFB": "50515",
  "Opay": "999992",
  "Kuda MFB": "50211",
};
