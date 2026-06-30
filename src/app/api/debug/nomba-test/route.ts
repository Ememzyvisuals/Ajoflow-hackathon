// ============================================================
// AjoFlow – Nomba Sandbox Sanity Check
// GET /api/debug/nomba-test
//
// Purpose: run ONE real token request + ONE real virtual account
// creation against the live Nomba sandbox and return the raw
// response shapes, so you can confirm our assumed field names
// (data.access_token, data.bankAccountNumber, etc.) actually
// match what Nomba returns before relying on it for the demo.
//
// ⚠️ DELETE THIS ROUTE or gate it before going to production —
// it is intentionally unauthenticated for quick manual testing
// but should not ship in a public production build.
// ============================================================

import { NextResponse } from "next/server";
import { getNombaToken, nombaRequest, getNombaEnv, PARENT_ACCOUNT_ID } from "@/lib/nomba/client";

export async function GET() {
  const env = getNombaEnv();
  // Also expose what headers this server expects for webhooks
  results.webhook_info = {
    endpoint: "/api/webhooks/nomba",
    expected_header: "nomba-signature",
    signing_key_env: "NOMBA_WEBHOOK_SECRET",
    signing_key_set: !!process.env.NOMBA_WEBHOOK_SECRET,
    signing_key_preview: process.env.NOMBA_WEBHOOK_SECRET
      ? process.env.NOMBA_WEBHOOK_SECRET.slice(0, 4) + "***"
      : "NOT SET",
  };
  const results: Record<string, unknown> = { environment: env };

  // ── Step 1: Token Issue ─────────────────────────────────────
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
    // Can't proceed without a token
    return NextResponse.json(results, { status: 200 });
  }

  // ── Step 2: Create a throwaway test Virtual Account ─────────
  const testRef = `aftest${Date.now().toString(36)}`;
  try {
    const raw = await nombaRequest(
      "/accounts/virtual",
      {
        method: "POST",
        accountId: PARENT_ACCOUNT_ID,
        body: {
          accountRef: testRef,
          accountName: "AjoFlow Sandbox Test",
          currency: "NGN",
        },
      }
    );
    results.virtual_account_test = {
      success: true,
      accountRef_used: testRef,
      raw_response: raw,
      shape_check: {
        has_data_field: typeof (raw as Record<string, unknown>).data !== "undefined",
        data_keys: typeof (raw as Record<string, unknown>).data === "object"
          ? Object.keys((raw as { data: object }).data)
          : null,
      },
    };
  } catch (err) {
    results.virtual_account_test = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // ── Step 3: Bank Lookup (if VA test passed, try a known test account) ─
  try {
    const lookupRaw = await nombaRequest(
      "/transfers/bank/lookup",
      {
        method: "POST",
        accountId: PARENT_ACCOUNT_ID,
        body: {
          accountNumber: "0000000000", // documented Wema Bank sandbox test account
          bankCode: "035", // Wema Bank
        },
      }
    );
    results.bank_lookup_test = { success: true, raw_response: lookupRaw };
  } catch (err) {
    results.bank_lookup_test = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      note: "This may fail if the documented test account/bank code combo isn't valid in your sandbox instance — check raw error above.",
    };
  }

  return NextResponse.json(results, { status: 200 });
}
