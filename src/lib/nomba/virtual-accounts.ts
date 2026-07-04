// ============================================================
// AjoFlow – Nomba Virtual Accounts
// CONFIRMED endpoint from hackathon channel:
// POST /v1/accounts/virtual/{subAccountId}
// Sub-account ID goes in the PATH, not the header
// Header accountId is ALWAYS the parent
// Static VA = no expiryDate = permanently receives funds
// ============================================================

import { nombaRequest, PARENT_ACCOUNT_ID, SUB_ACCOUNT_ID } from "./client";

export interface CreateVirtualAccountParams {
  accountRef: string;
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

export async function createVirtualAccount(
  params: CreateVirtualAccountParams
): Promise<NombaVirtualAccount> {
  // Sub-account ID in the PATH — confirmed from hackathon channel screenshot
  const response = await nombaRequest<NombaVAResponse>(
    `/accounts/virtual/${SUB_ACCOUNT_ID}`,
    {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID, // header ALWAYS parent
      body: {
        accountRef: params.accountRef,
        accountName: params.accountName,
        currency: params.currency ?? "NGN",
        // No expiryDate = static VA
      },
    }
  );
  return response.data;
}

export async function fetchVirtualAccount(accountRef: string): Promise<NombaVirtualAccount> {
  const response = await nombaRequest<NombaVAResponse>(
    `/accounts/virtual/${accountRef}`,
    { accountId: PARENT_ACCOUNT_ID }
  );
  return response.data;
}

// accountRef: "af" + first 30 chars of stripped membership UUID = 32 chars
export function buildAccountRef(membershipId: string): string {
  const stripped = membershipId.replace(/-/g, "");
  return `af${stripped.slice(0, 30)}`;
}
