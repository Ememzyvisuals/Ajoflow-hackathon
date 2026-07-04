// ⚠️ DELETE before production — unauthenticated debug endpoint
import { NextResponse } from "next/server";
import { getNombaToken, nombaRequest, getNombaEnv, PARENT_ACCOUNT_ID, SUB_ACCOUNT_ID } from "@/lib/nomba/client";

export async function GET() {
  const env = getNombaEnv();

  const results: Record<string, unknown> = {
    environment: env,
    confirmed_rules: {
      token_valid: "30 minutes (cache 25)",
      amounts: "NAIRA — NOT kobo (confirmed hackathon channel Jul 3)",
      accountId_header: "ALWAYS parent account id",
      sub_account_in: "PATH param for VA creation",
      va_endpoint: `/accounts/virtual/${SUB_ACCOUNT_ID}`,
      webhook_header: "nomba-signature",
      webhook_secret: "NombaHackathon2026",
    },
    webhook_info: {
      endpoint: "/api/webhooks/nomba",
      expected_header: "nomba-signature",
      signing_key_set: !!process.env.NOMBA_WEBHOOK_SECRET,
      signing_key_preview: process.env.NOMBA_WEBHOOK_SECRET?.slice(0, 4) + "***",
    },
  };

  // Token test
  try {
    const token = await getNombaToken();
    results.token_test = {
      success: true,
      preview: `${token.slice(0, 12)}...${token.slice(-6)}`,
      length: token.length,
    };
  } catch (err) {
    results.token_test = { success: false, error: err instanceof Error ? err.message : String(err) };
    return NextResponse.json(results);
  }

  // VA creation test — using correct endpoint with subAccountId in path
  const testRef = `aftest${Date.now().toString(36)}`;
  try {
    const raw = await nombaRequest(`/accounts/virtual/${SUB_ACCOUNT_ID}`, {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: { accountRef: testRef, accountName: "AjoFlow Debug Test", currency: "NGN" },
    });
    const d = (raw as { data: Record<string, unknown> }).data;
    results.virtual_account_test = {
      success: true,
      endpoint_used: `/accounts/virtual/${SUB_ACCOUNT_ID}`,
      bankAccountNumber: d?.bankAccountNumber,
      bankAccountName: d?.bankAccountName,
      bankName: d?.bankName,
      accountRef: d?.accountRef,
    };
  } catch (err) {
    results.virtual_account_test = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Bank lookup test
  try {
    const lookup = await nombaRequest("/transfers/bank/lookup", {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: { accountNumber: "0000000000", bankCode: "035" },
    });
    results.bank_lookup_test = { success: true, data: (lookup as { data: unknown }).data };
  } catch (err) {
    results.bank_lookup_test = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results);
}
