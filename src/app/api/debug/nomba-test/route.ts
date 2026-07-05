// ⚠️ DELETE before production — unauthenticated debug endpoint.
// Tests every Nomba (and Groq) integration the platform actually calls,
// so you always know exactly what's live vs broken before a demo.
import { NextResponse } from "next/server";
import {
  getNombaToken,
  nombaRequest,
  getNombaEnv,
  PARENT_ACCOUNT_ID,
  SUB_ACCOUNT_ID,
} from "@/lib/nomba/client";
import { createVirtualAccount, fetchVirtualAccount } from "@/lib/nomba/virtual-accounts";
import { lookupBankAccount, buildMerchantTxRef } from "@/lib/nomba/transfers";
import { createCheckoutOrder } from "@/lib/nomba/checkout";
import { createDirectDebitMandate } from "@/lib/nomba/direct-debit";
import { verifyNombaWebhookSignature } from "@/lib/nomba/webhook";
import { withTimeout } from "@/lib/timeout";
import crypto from "crypto";

// Test account provided for bank lookup verification
const TEST_ACCOUNT = { accountNumber: "9047115612", bankName: "Opay (Paycom)", bankCode: "100004" };

type TestResult = { success: boolean; skipped?: boolean; note?: string; error?: string; data?: unknown };

async function runTest<T>(fn: () => Promise<T>, timeoutMs = 8000, label = "request"): Promise<TestResult> {
  try {
    const data = await withTimeout(fn(), timeoutMs, label);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const env = getNombaEnv();
  const results: Record<string, unknown> = {
    environment: env,
    ran_at: new Date().toISOString(),
  };

  // ── 1. Auth token ────────────────────────────────────────────
  const tokenResult = await runTest(async () => {
    const token = await getNombaToken();
    return { preview: `${token.slice(0, 12)}...${token.slice(-6)}`, length: token.length };
  }, 8000, "Token issue");
  results.token_issue = tokenResult;

  // If auth itself is broken, every downstream call will fail for the same
  // reason — still run them so the report is complete, but it's expected.
  const authBroken = !tokenResult.success;

  // ── 2. Virtual account creation ──────────────────────────────
  const testRef = `aftest${Date.now().toString(36)}`;
  const vaCreateResult = await runTest(async () => {
    const raw = await nombaRequest(`/accounts/virtual/${SUB_ACCOUNT_ID}`, {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: { accountRef: testRef, accountName: "AjoFlow Debug Test", currency: "NGN" },
    });
    return (raw as { data: unknown }).data;
  }, 8000, "Virtual account creation");
  results.virtual_account_creation = { ...vaCreateResult, endpoint: `POST /accounts/virtual/${SUB_ACCOUNT_ID}`, used_by: "createGroup (owner's virtual account)" };

  // ── 3. Virtual account fetch ──────────────────────────────────
  const vaFetchResult = await runTest(
    () => fetchVirtualAccount(testRef),
    8000,
    "Virtual account fetch"
  );
  results.virtual_account_fetch = { ...vaFetchResult, used_by: "Wallet balance refresh" };

  // ── 4. Bank account lookup (your Opay test account) ───────────
  const bankLookupResult = await runTest(
    () => lookupBankAccount({ accountNumber: TEST_ACCOUNT.accountNumber, bankCode: TEST_ACCOUNT.bankCode }),
    8000,
    "Bank account lookup"
  );
  results.bank_account_lookup = {
    ...bankLookupResult,
    tested_with: TEST_ACCOUNT,
    used_by: "Add Payout Account (Verify & Save button)",
  };

  // ── 5. Checkout order creation (contribution payments) ─────────
  const checkoutResult = await runTest(async () => {
    const order = await createCheckoutOrder({
      orderReference: `debug-${Date.now()}`,
      amountNGN: 100,
      customerEmail: "debug@ajoflow.test",
      customerId: "debug-user",
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ajoflow.vercel.app"}/dashboard`,
      description: "AjoFlow debug test order",
    });
    return order;
  }, 8000, "Checkout order creation");
  results.checkout_order_creation = { ...checkoutResult, used_by: "Contribution payment flow" };

  // ── 6. Bank transfer (tiny sandbox amount to your Opay test account) ──
  const transferResult = await runTest(async () => {
    if (!bankLookupResult.success) {
      throw new Error("Skipped — bank lookup must succeed first to get a verified account name");
    }
    const data = bankLookupResult.data as { accountName: string };
    const raw = await nombaRequest(`/transfers/bank`, {
      method: "POST",
      accountId: PARENT_ACCOUNT_ID,
      body: {
        amount: 100,
        accountNumber: TEST_ACCOUNT.accountNumber,
        bankCode: TEST_ACCOUNT.bankCode,
        accountName: data.accountName,
        merchantTxRef: buildMerchantTxRef(`debug-${Date.now()}`),
        narration: "AjoFlow debug transfer test",
      },
    });
    return (raw as { data: unknown }).data;
  }, 10000, "Bank transfer");
  results.bank_transfer = { ...transferResult, tested_with: TEST_ACCOUNT, amount_ngn: 100, used_by: "Payout disbursement (transferToBank)" };

  // ── 7. Direct debit mandate — known sandbox limitation ──────────
  const directDebitResult = await runTest(
    () =>
      createDirectDebitMandate({
        accountNumber: TEST_ACCOUNT.accountNumber,
        bankCode: "058",
        amountNGN: 5000,
        frequency: "monthly",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      }),
    8000,
    "Direct debit mandate creation"
  );
  results.direct_debit_mandate = {
    ...directDebitResult,
    known_limitation: "Nomba sandbox returns 404 for all /direct-debits endpoints as of this build — expected to fail. Use tokenized cards for recurring charges instead.",
    used_by: "Not currently used in the app (fell back to tokenized cards)",
  };

  // ── 8. Webhook signature verification (local, no network call) ──
  try {
    const payload = JSON.stringify({ test: "debug-payload" });
    const secret = process.env.NOMBA_WEBHOOK_SECRET ?? "";
    const validSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const passesValid = verifyNombaWebhookSignature(payload, validSig);
    const rejectsInvalid = !verifyNombaWebhookSignature(payload, "0".repeat(64));
    results.webhook_signature_verification = {
      success: !!secret && passesValid && rejectsInvalid,
      secret_configured: !!secret,
      accepts_valid_signature: passesValid,
      rejects_invalid_signature: rejectsInvalid,
      used_by: "/api/webhooks/nomba",
      error: !secret ? "NOMBA_WEBHOOK_SECRET is not set in this environment" : undefined,
    };
  } catch (err) {
    results.webhook_signature_verification = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // ── 9. Groq AI (used by AI report + AI assistant) ────────────────
  const groqResult = await runTest(async () => {
    const keys = [process.env.GROQ_KEY_1, process.env.GROQ_KEY_2, process.env.GROQ_KEY_3].filter(Boolean);
    if (keys.length === 0) throw new Error("No GROQ_KEY_1/2/3 environment variables set");
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: keys[0] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = (await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: "Reply with exactly: ok" }],
      max_tokens: 60,
      reasoning_effort: "low",
    } as any)) as { choices: { message: { content: string | null } }[] };
    return { reply: completion.choices[0]?.message?.content, keys_configured: keys.length };
  }, 10000, "Groq chat completion");
  results.groq_ai = { ...groqResult, model: "openai/gpt-oss-120b", used_by: "AI Assistant + Group Trust Report" };

  // ── Summary ──────────────────────────────────────────────────────
  const entries = Object.entries(results).filter(([k]) => !["environment", "ran_at"].includes(k)) as [string, TestResult][];
  results.summary = {
    total: entries.length,
    passing: entries.filter(([, v]) => v.success).length,
    failing: entries.filter(([, v]) => !v.success).length,
    auth_broken: authBroken,
  };

  return NextResponse.json(results, { status: 200 });
}
