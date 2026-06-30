// ============================================================
// AjoFlow – Nomba Virtual Accounts
// ONE Sub Account → Many Static Virtual Accounts (per member)
// Static = no expiryDate → permanently receives funds
// accountRef must be 16–64 characters
// ============================================================

import { nombaRequest, PARENT_ACCOUNT_ID } from "./client";

export interface CreateVirtualAccountParams {
  /** Stable unique ref (16–64 chars). We use membership UUID stripped of hyphens. */
  accountRef: string;
  /** Member's full name */
  accountName: string;
  currency?: string;
}

export interface NombaVirtualAccount {
  createdAt: string;
  accountRef: string;
  accountName: string;
  currency: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  expired: boolean;
}

interface NombaVAResponse {
  code: string;
  description: string;
  data: NombaVirtualAccount;
}

// ── Create Static Virtual Account ─────────────────────────────
// No expiryDate → static, keeps receiving forever
export async function createVirtualAccount(
  params: CreateVirtualAccountParams
): Promise<NombaVirtualAccount> {
  const response = await nombaRequest<NombaVAResponse>("/accounts/virtual", {
    method: "POST",
    accountId: PARENT_ACCOUNT_ID,
    body: {
      accountRef: params.accountRef,
      accountName: params.accountName,
      currency: params.currency ?? "NGN",
      // No expiryDate = static virtual account
    },
  });
  return response.data;
}

// ── Fetch Virtual Account by accountRef ───────────────────────
export async function fetchVirtualAccount(
  accountRef: string
): Promise<NombaVirtualAccount> {
  const response = await nombaRequest<NombaVAResponse>(
    `/accounts/virtual/${accountRef}`,
    { accountId: PARENT_ACCOUNT_ID }
  );
  return response.data;
}

// ── Build Stable accountRef from membership ID ─────────────────
// Must be 16–64 chars; no hyphens
export function buildAccountRef(membershipId: string): string {
  const stripped = membershipId.replace(/-/g, "");
  // "af" prefix + first 30 chars of stripped UUID = 32 chars total
  return `af${stripped.slice(0, 30)}`;
}
