# AjoFlow — Nomba Integration Documentation

## Environment Configuration

| Env Var | Sandbox | Production |
|---|---|---|
| Base URL (auto-selected) | `https://sandbox.nomba.com/v1` | `https://api.nomba.com/v1` |
| `NOMBA_ENV` | `sandbox` | `production` |

**Confirmed via Nomba hackathon team (not assumed):** the documented sandbox host `sandbox.api.nomba.com` was incorrect in early training materials — the correct, team-confirmed host is `sandbox.nomba.com`. AjoFlow's client (`src/lib/nomba/client.ts`) uses the confirmed URL.

No code changes are required to move from sandbox to production — every Nomba function reads its base URL from `NOMBA_ENV`. See the migration checklist at the bottom of this doc for what *does* need to change (credentials, webhook registration).

---

## Authentication

OAuth2 `client_credentials` grant.

```
POST {BASE_URL}/auth/token/issue
Headers: { "Content-Type": "application/json", "accountId": "<PARENT_ACCOUNT_ID>" }
Body: { "grant_type": "client_credentials", "client_id": "...", "client_secret": "..." }
```

**Token is valid 30 minutes.** AjoFlow caches in-memory for **25 minutes** (`src/lib/nomba/client.ts:getNombaToken()`), refreshing proactively before expiry rather than reactively on 401. (An earlier version of this doc said 55/60 minutes — that was wrong and has been corrected to match the actual code and the hackathon channel's confirmed token lifetime.)

**Every subsequent request** must include `Authorization: Bearer <token>`. The `accountId` header value is **endpoint-specific** — see the per-endpoint sections below. It is not always the parent account.

---

## Account Architecture

```
Parent Account (hackathon-issued)
  └── One Sub-Account (pre-provisioned via Nomba dashboard — NOT creatable via API)
        └── Static Virtual Accounts (one per group membership, created via API)
```

**Why this model:** the Nomba hackathon documentation states sub-accounts are dashboard-provisioned only. AjoFlow was issued exactly one sub-account. Rather than incorrectly assuming dynamic per-group sub-account creation is possible, AjoFlow uses the single sub-account as its payment-receiving layer and enforces **group-level fund isolation entirely within the Supabase ledger** (`group_wallets` table) — Nomba moves money, Supabase tracks whose money it is.

**Known sandbox limitation:** sandbox caps virtual account creation at **2 accounts total per account holder**, platform-wide (confirmed via `/api/debug/nomba-test` — the 3rd creation attempt returns `HTTP 400: Only 2 sandbox virtual accounts are allowed per account holder`). This does not appear to be a per-group limit — it's global to the sub-account. Not expected to apply in production, but budget for it when demoing with more than 2 members in sandbox.

---

## Virtual Accounts

**Endpoint:** `POST /accounts/virtual/{SUB_ACCOUNT_ID}` — the sub-account ID is part of the **URL path**, not the request body. (An earlier version of this doc showed `POST /accounts/virtual` with no path parameter — that was wrong; confirmed correct via a working, tested call through the debug route.)

**Header:** `accountId: <PARENT_ACCOUNT_ID>` — the parent, not the sub-account, for this specific endpoint.

```json
{
  "accountRef": "af<32-char-stripped-membership-uuid>",
  "accountName": "Amina Yusuf",
  "currency": "NGN"
}
```

**Static vs Dynamic:** omitting `expiryDate` creates a **static** account that permanently accepts funds — this is what AjoFlow uses, since members contribute on an ongoing recurring basis (not a one-time payment with an expiry window).

`accountRef` is built deterministically in `buildAccountRef(membershipId)` — stripped of hyphens, prefixed `af`, truncated to Nomba's accepted length. This value is stored in `member_virtual_accounts.account_reference` and is the **join key** the webhook handler uses to resolve incoming funds back to a specific member + group.

**Every member gets one, automatically:** the group owner gets theirs at `createGroup()`, and every other member gets theirs at `acceptGroupInvite()`. This is fetch-or-create — if creation fails non-fatally (e.g. the sandbox 2-account cap above), group/membership creation still succeeds; the member just won't have a virtual account yet. `/api/payments/virtual-account` (`POST`) is a retry endpoint a member can call to generate one after the fact — surfaced in the UI as the "Generate My Account" button on the group page's Overview tab.

**Frontend visibility:** each member's own virtual account is displayed on their group page (Overview tab, `MyVirtualAccountCard`) with a copy-to-clipboard account number. This was built after an audit found the backend fully created these accounts but no page ever displayed them.

---

## Checkout (Card / Transfer)

**Endpoint:** `POST /checkout/order`

**Header:** `accountId: <SUB_ACCOUNT_ID>` — **not the parent.** (Corrected — see "Confirmed community fix" below. An earlier version of this code and doc used the parent account ID here, matching the pattern used for virtual accounts. That was wrong for this specific endpoint.)

**Amounts are in NAIRA, not Kobo.** Confirmed independently by multiple teams in the hackathon channel on July 3, 2026: "Nomba treats amount in naira not kobo." Send the amount as-is, with **no multiplication by 100**. (An earlier version of this doc said amounts are in Kobo and described `nairaToKobo()`/`koboToNaira()` conversion helpers — that was wrong and has caused real bugs before being caught; `src/lib/nomba/checkout.ts` sends `amountNGN` directly with no conversion.)

```json
{
  "order": {
    "orderReference": "AF-XXXXX",
    "amount": 10000,
    "currency": "NGN",
    "customerEmail": "user@email.com",
    "customerId": "<user_id>",
    "callbackUrl": "https://ajoflow.vercel.app/dashboard?payment=success",
    "allowedPaymentMethods": ["Card", "Transfer"]
  }
}
```

### Confirmed community fix — checkout `accountId` header (REVISED July 6, 2026)
An earlier version of this doc (and the code) said `/checkout/order` needed the **sub-account** as the `accountId` header, based on another hackathon participant's own unconfirmed diagnosis. **This has been reverted.** Victor Shoaga (Nomba team) clarified in the hackathon channel on July 6 that the `accountId` header should **always be the parent account ID for every request, with no exceptions** — sub-account scoping happens via path/body/query fields instead (as `/accounts/virtual/{subAccountId}` already does correctly), never via the header. `checkout.ts` now uses the parent header consistently with every other endpoint in this codebase.

**The actual confirmed fix for missing webhook events**, per the same source: the webhook URL must be registered on **both the parent account and the sub-account** — Nomba routes real (non-test) webhooks through an internal redirect service that requires both registrations to deliver properly. This is a **dashboard/form action, not a code change** — when you (re-)submit your webhook URL via the hackathon's submission form, make sure it's registered for both account contexts, not just one.

### ⚠️ Unresolved — webhook signature algorithm (flagged July 6, needs confirmation)
A hackathon channel summary states Nomba's real signature is an HMAC over **a specific string derived from 8 fields plus the `nomba-timestamp` header** — not a hash of the raw JSON body. AjoFlow's current implementation (`src/lib/nomba/webhook.ts`) hashes the raw body directly, matching what was confirmed from the webhook *registration form* at the time this was built. These two pieces of guidance conflict, and **the exact 8 fields and construction order were not specified** in what's been shared — implementing a guess here would replace one possibly-wrong algorithm with another possibly-wrong one, with no way to verify either against a real webhook before shipping.

**Get the exact field list and construction order from Nomba/Victor Shoaga before changing this** — guessing risks silently rejecting real webhooks the same way as today, just for a different reason.

**In the meantime**, the route was restructured so this can never fail silently again: every webhook attempt is now recorded in `webhook_events` (with the raw payload and both the received signature and the failure reason) **even when signature verification rejects it** — previously, a signature mismatch returned a 401 before anything was ever written to the database, meaning a real webhook arriving with an unexpected signature format would vanish with zero trace. If webhooks still seem to not be "arriving" after fixing the dual-registration issue above, check the `webhook_events` table directly — if rows are showing up there with `processed: false` and an "Invalid signature" error, that's proof of exactly this problem, and the manual reconciliation fallback (`reportPaymentIssue` / `manuallyRecordContribution`, see "Webhook Reliability" above) is the safety net for it in the meantime.

### Other claims heard secondhand, not acted on without direct verification
- **"Transfers are under `/v2/`, other endpoints under `/v1/`"** — AjoFlow's own debug route (`/api/debug/nomba-test`) has **directly, empirically confirmed** `/v1/transfers/bank` executes a real, successful sandbox transfer. Given this direct contradicting evidence, this claim was not acted on — switching a confirmed-working path to an unverified one on a submission deadline, based on secondhand chat with no way to retest, was judged too risky. Worth revisiting with more time.
- **Reconciliation via `GET /v1/transactions/accounts/{subAccountId}`** — mentioned as how to check whether a virtual-account credit landed, for cases where it doesn't show in parent-wide transaction views. Not implemented — AjoFlow's reconciliation fallback instead relies on an admin manually confirming via their own bank app, which needs no unverified endpoint to work correctly.

### Test Cards
| Scenario | Card | Notes |
|---|---|---|
| Success | `5060 6666 6666 6666 666` | any expiry, any CVV |
| Insufficient funds | `5060 6666 6666 6666 674` | |
| Tokenization | `5434621074252808` | PIN `0000`, OTP `000000` |

---

## Tokenized Cards (Recurring Contributions)

Per the hackathon channel's confirmed flow:

1. Create checkout order with `tokenizeCard: true`
2. Customer completes payment on the Nomba hosted page
3. Nomba fires `payment_success` webhook with `data.tokenizedCardData.tokenKey` in the payload
4. AjoFlow stores `tokenKey`
5. Subsequent contributions call `POST /checkout/tokenized-card-payment` with the stored `tokenKey` — no re-entry of card details

Implemented in `src/lib/nomba/tokenized-cards.ts`. **Known gap:** nothing currently *schedules* a recurring tokenized charge automatically — the charge function exists and works when called, but there is no cron/trigger that calls it on a due date yet. Today's contribution flow is member-initiated (visit the app, pay), not auto-debited. This is separate from the `/api/cron/check-overdue` job (below), which only detects and scores missed/late payments — it does not attempt to auto-charge a stored card.

---

## Direct Debit

**Sandbox status:** all `/direct-debits/*` endpoints return `404` regardless of payload — confirmed by multiple teams independently in the hackathon channel, and reconfirmed directly via `/api/debug/nomba-test`, not an AjoFlow integration bug.

AjoFlow implements the client against the **documented production contract**:

```
POST /direct-debits              → creates mandate (accountNumber, bankCode, amount, frequency, dateRange)
GET  /direct-debits/{mandateId}  → confirm mandate active
POST /direct-debits/debit-mandate → charge with mandateId
```

`bankCode` uses CBN codes (GTBank `058`, Access `044`, UBA `033`, etc. — `BANK_CODES` map in `src/lib/nomba/direct-debit.ts`).

**Not currently used anywhere in the app** — tokenized cards serve as the working recurring-payment mechanism instead. This code path is unit-testable in isolation but unverified end-to-end since sandbox can't validate it. Flag for production-only validation if you decide to pursue it further.

---

## Transfers (Payouts)

```
POST /transfers/bank/lookup   → verify account name before sending money
POST /transfers/bank          → execute transfer
```

**Required field, easy to miss:** `senderName` is required by Nomba on `/transfers/bank` — omitting it returns `HTTP 422: ["senderName must not be blank"]`. This was a real bug found via the debug route: the transfer code never sent this field at all. Now sends the **group's name** as the sender (e.g. "Market Women Cooperative" shows on the recipient's bank statement), or `"AjoFlow Debug Test"` for the debug route's own sandbox check.

Every transfer carries a `merchantTxRef` built from the `payouts.id` (`buildMerchantTxRef()`) — this is AjoFlow's idempotency key, matched against the `transfer.success` webhook to confirm completion without risk of double-payout on retry.

`amount` is sent in **NAIRA**, same rule as checkout above.

---

## Webhooks

**Endpoint:** `POST /api/webhooks/nomba`

### Verification Pipeline
```
1. Read raw request body as text (NOT parsed JSON — signature is computed over raw bytes)
2. Extract `nomba-signature` header (confirmed from Nomba hackathon webhook form)
3. HMAC-SHA256(raw_body, NOMBA_WEBHOOK_SECRET) compared via crypto.timingSafeEqual
4. Parse JSON only after signature passes
5. Extract requestId
6. Check webhook_events table for existing processed=true row with that requestId
7. If duplicate → 200 OK, no-op (idempotent)
8. If new → store raw event, run business logic, mark processed=true
```

### Handled Events
| Event | Handler | Effect |
|---|---|---|
| `virtual_account.funded` | `handleVirtualAccountFunded()` | Creates `contributions` row (with real `due_date`/`cycle_id` from the group's active cycle), updates `group_wallets`, records on-time **or late** trust score depending on whether payment beat the cycle deadline |
| `payment_success` | `handlePaymentSuccess()` | Resolves `payment_sessions` by `orderReference`, same reconciliation pipeline, same on-time/late trust logic |
| `transfer.success` | `handleTransferSuccess()` | Resolves `payouts` by `merchantTxRef`, marks paid |

**Trust-score fix (July 5, 2026):** both handlers previously called `recordOnTimePayment()` unconditionally, regardless of whether the payment actually arrived before or after the group's cycle deadline. A payment received a week late was being scored as "on time." Both handlers now check the active `payment_cycles.end_date` and call `recordLatePayment()` instead when the payment is genuinely late.

### Webhook URL Refresh
Per hackathon team confirmation, **submitted webhook URLs expire every 2 hours** and the submission form can be filled multiple times. For local development this means re-submitting the ngrok URL periodically; for the deployed Vercel URL this is a non-issue since the URL is static — but the **initial production webhook URL must still be (re-)submitted via the hackathon form** after final deployment, using **production credentials and a production webhook secret**, which typically differ from sandbox's.

---

## Webhook Reliability — Known Platform-Wide Issue

On July 5, 2026, multiple hackathon teams independently reported the same failure in the `#nomba-hackathon` Slack channel: card/checkout payments complete successfully (Nomba's own hosted page confirms success) but **no webhook event is generated at all** — not visible in Nomba's own `/v1/webhooks/event-logs`, and nothing arrives at the registered webhook URL. This appears to be either a Nomba-side issue or the `accountId` header scoping bug described above (now fixed in AjoFlow's checkout code).

Because this is a platform-wide issue outside AjoFlow's control, **do not assume the webhook alone is a reliable source of truth for whether a payment landed.** AjoFlow has a manual fallback:

- **Member side:** "Sent money but it's not showing?" button on the virtual account card (`reportPaymentIssue`, `src/features/payments/reconciliation.ts`) — notifies the group's admins directly.
- **Admin side:** "Record Payment" button per member in the group's Members tab (`manuallyRecordContribution`) — lets an admin who has personally verified the transfer in their own bank app record the contribution manually. This correctly updates the wallet balance, trust score (on-time/late, same deadline check as the webhook path), and writes an audit log entry (`CONTRIBUTION_MANUALLY_RECORDED`) so it's distinguishable from a webhook-confirmed payment.

This does not replace the webhook — it's a safety net for when the webhook doesn't fire, so a member paying correctly isn't penalized by a trust-score drop through no fault of their own.

---

## Overdue Contribution Detection (Cron)

**Endpoint:** `GET /api/cron/check-overdue`, registered in `vercel.json` to run daily. Protected by `CRON_SECRET` (Vercel automatically sends this as a Bearer token when the env var is set).

For every active payment cycle whose `end_date` has passed, checks every active member for a `paid` contribution in that cycle:
- Cycle ended 1–6 days ago and member hasn't paid → contribution marked `late`, `recordLatePayment()` called
- Cycle ended 7+ days ago and member hasn't paid → contribution marked `failed`, `recordMissedPayment()` called, cycle marked `completed`

This is what actually calls `recordLatePayment()`/`recordMissedPayment()` in the trust engine — both existed in the codebase with zero caller before this route was built, meaning trust scores could only ever go up, never reflect a genuinely missed payment.

---

## Debug/Test Endpoint

**Endpoint:** `GET /api/debug/nomba-test` — exercises every Nomba (and Groq) integration in one call: token issue, VA creation/fetch, bank lookup, checkout order creation, a real ₦100 sandbox bank transfer, direct debit (expected 404), webhook signature self-test, and a live Groq completion.

**This route executes a real bank transfer and creates real sandbox resources on every call — it is not read-only.** It:
- Hard-blocks itself entirely when `NOMBA_ENV=production` (returns 403)
- Requires `?key=<DEBUG_ROUTE_SECRET>` matching an env var even in sandbox

**Delete this route file before your final production deployment** if you no longer need it — a debug endpoint that can move money, even a gated one, is safer not to ship at all once it's served its purpose.

---

## Common Failure Cases & Recovery

| Failure | Cause | Recovery |
|---|---|---|
| 401 on every call | Token expired mid-request or wrong `accountId` | Token cache auto-refreshes every 25 min; verify the correct account ID is used per endpoint (see per-section headers above — it's not always the parent) |
| Webhook signature mismatch | `JSON.stringify()` reordering vs raw body | AjoFlow reads raw text body before any parsing — never reconstructs JSON for verification |
| Duplicate contribution on webhook retry | Nomba resending the same event | `request_id` UNIQUE constraint + `processed` flag check |
| `HTTP 422: senderName must not be blank` on transfer | Missing required field | Fixed — `transferToBank` now always sends `senderName` |
| Zero webhook events after successful checkout | `accountId` header scoping on `/checkout/order`, or a platform-wide Nomba issue | Fixed the header (sub-account, not parent); use the manual reconciliation fallback if it persists |
| "Only 2 sandbox virtual accounts are allowed per account holder" | Sandbox-wide cap, not a bug | Expected in sandbox testing; not expected in production |
| Direct debit 404 | Sandbox limitation (confirmed by Nomba team) | Use tokenized cards instead; not currently wired into any auto-charge schedule |
| `createServiceClient()` throws / "something went wrong" on payout account verification | `SUPABASE_SERVICE_ROLE_KEY` missing/invalid on the deployment | Function now throws a clear, specific message naming the missing env var instead of an opaque crash |

---

## Sandbox → Production Migration Checklist

1. Flip `NOMBA_ENV=production` in Vercel
2. Swap `NOMBA_CLIENT_ID` / `NOMBA_CLIENT_SECRET` to live credentials
3. Swap `NOMBA_PARENT_ACCOUNT_ID` / `NOMBA_SUB_ACCOUNT_ID` to the live account IDs issued for production — sandbox IDs will not work against `api.nomba.com`
4. Re-register your webhook URL with Nomba for production, and update `NOMBA_WEBHOOK_SECRET` — production likely issues a different signing secret than sandbox
5. Confirm `NEXT_PUBLIC_APP_URL` is the real production domain, exact casing (a capital letter in this value caused a real OAuth redirect bug earlier in development — Supabase/Nomba redirect matching is case-sensitive)
6. Delete or keep `/api/debug/nomba-test` gated — it is blocked in production by an env check, but deleting it entirely removes any risk
7. Verify direct debit mandate flow end-to-end if you intend to use it — sandbox could not validate this at all
8. Smoke-test group creation once for real after switching — production Nomba may enforce real KYC/BVN requirements on virtual account creation that sandbox does not; this could not be verified without production credentials
