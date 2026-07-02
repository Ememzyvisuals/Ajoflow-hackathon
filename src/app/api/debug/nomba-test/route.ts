// ============================================================
// AjoFlow – Nomba Sandbox Sanity Check
// GET /api/debug/nomba-test
// ⚠️ DELETE before production — unauthenticated debug endpoint
// ============================================================

import { NextResponse } from "next/server";
import { getNombaToken, nombaRequest, getNombaEnv, PARENT_ACCOUNT_ID } from "@/lib/nomba/client";

export async function GET() {
  const env = getNombaEnv();

  // MUST declare results before using it
  const results: Record<string, unknown> = {
    environment: env,
    webhook_info: {
      endpoint: "/api/webhooks/nomba",
      expected_header: "nomba-signature",
      signing_key_env: "NOMBA_WEBHOOK_SECRET",
      signing_key_set: !!process.env.NOMBA_WEBHOOK_SECRET,
      signing_key_preview: process.env.NOMBA_WEBHOOK_SECRET
        ? process.env.NOMBA_WEBHOOK_SECRET.slice(0, 4) + "***"
        : "NOT SET",
    },
  };

  // ── Step 1: Token Issue ───────────────────────────────────
  try {
    const token = await getNombaToken();
    results.token_test = {
      success: true,
      token_preview: `${token.slice(0, 12)}...${token.slice(-6)}`,
      token_length: token.length,
    };
  } catch (err) {
    results.token_test = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(results, { status: 200 });
  }

  // ── Step 2: Create a throwaway test Virtual Account ───────
  const testRef = `aftest${Date.now().toString(36)}`;
  try {
    const raw = await nombaRequest("/accounts/virtual", {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: {
        accountRef: testRef,
        accountName: "AjoFlow Sandbox Test",
        currency: "NGN",
      },
    });

    const rawData = (raw as Record<string, unknown>).data as Record<string, unknown> | undefined;

    results.virtual_account_test = {
      success: true,
      accountRef_used: testRef,
      raw_response: raw,
      shape_check: {
        has_data_field: rawData !== undefined,
        data_keys: rawData ? Object.keys(rawData) : null,
        bankAccountNumber: rawData?.bankAccountNumber ?? "NOT FOUND — check field name",
        bankName: rawData?.bankName ?? "NOT FOUND",
        accountName: rawData?.accountName ?? "NOT FOUND",
      },
    };
  } catch (err) {
    results.virtual_account_test = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // ── Step 3: Bank Lookup ───────────────────────────────────
  try {
    const lookupRaw = await nombaRequest("/transfers/bank/lookup", {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: {
        accountNumber: "0000000000",
        bankCode: "035", // Wema Bank sandbox test
      },
    });
    results.bank_lookup_test = { success: true, raw_response: lookupRaw };
  } catch (err) {
    results.bank_lookup_test = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      note: "May fail if test account/bank combo invalid in your sandbox instance",
    };
  }

  return NextResponse.json(results, { status: 200 });
}
