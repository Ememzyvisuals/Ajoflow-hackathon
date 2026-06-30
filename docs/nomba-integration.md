# AjoFlow — Nomba Integration Documentation

## Environment Configuration

| Env Var | Sandbox | Production |
|---|---|---|
| Base URL (auto-selected) | `https://sandbox.nomba.com/v1` | `https://api.nomba.com/v1` |
| `NOMBA_ENV` | `sandbox` | `production` |

**Confirmed via Nomba hackathon team (not assumed):** the documented sandbox host `sandbox.api.nomba.com` was incorrect in early training materials — the correct, team-confirmed host is `sandbox.nomba.com`. AjoFlow's client (`src/lib/nomba/client.ts`) uses the confirmed URL.

The hackathon team also confirmed teams **may use production credentials** for the hackathon itself, since several sandbox features (direct debit, card tokenization edge cases) are limited. `NOMBA_ENV` makes this a single environment-variable switch — no code changes required.

---

## Authentication

OAuth2 `client_credentials` grant.

```
POST {BASE_URL}/auth/token/issue
Headers: { "Content-Type": "application/json", "accountId": "<PARENT_ACCOUNT_ID>" }
Body: { "grant_type": "client_credentials", "client_id": "...", "client_secret": "..." }
```

Token valid 60 minutes. AjoFlow caches in-memory for 55 minutes (`src/lib/nomba/client.ts:getNombaToken()`), refreshing proactively before expiry rather than reactively on 401.

**Every subsequent request** must include:
- `Authorization: Bearer <token>`
- `accountId: <PARENT_ACCOUNT_ID>` (the **parent**, not sub-account — confirmed by Nomba team)

---

## Account Architecture

```
Parent Account (hackathon-issued)
  └── One Sub-Account (pre-provisioned via Nomba dashboard — NOT creatable via API)
        └── Static Virtual Accounts (one per group membership, created via API)
```

**Why this model:** the Nomba hackathon documentation states sub-accounts are dashboard-provisioned only. AjoFlow was issued exactly one sub-account. Rather than incorrectly assuming dynamic per-group sub-account creation is possible, AjoFlow uses the single sub-account as its payment-receiving layer and enforces **group-level fund isolation entirely within the Supabase ledger** (`group_wallets` table) — Nomba moves money, Supabase tracks whose money it is.

---

## Virtual Accounts

**Endpoint:** `POST /accounts/virtual`

```json
{
  "accountRef": "af<32-char-stripped-membership-uuid>",
  "accountName": "Amina Yusuf",
  "currency": "NGN"
}
```

**Static vs Dynamic:** omitting `expiryDate` creates a **static** account that permanently accepts funds — this is what AjoFlow uses, since members contribute on an ongoing recurring basis (not a one-time payment with an expiry window).

`accountRef` is built deterministically in `buildAccountRef(membershipId)` — stripped of hyphens, prefixed `af`, truncated to Nomba's accepted length. This value is stored in `member_virtual_accounts.account_reference` and is the **join key** the webhook handler uses to resolve incoming funds back to a specific member + group.

---

## Checkout (Card / Transfer)

**Endpoint:** `POST /checkout/order`
**Amounts are in Kobo** (₦1 = 100 kobo) — `nairaToKobo()` / `koboToNaira()` helpers in `src/lib/nomba/checkout.ts` handle conversion at every boundary.

```json
{
  "order": {
    "orderReference": "AF-XXXXX",
    "amount": "1000000",
    "currency": "NGN",
    "customerEmail": "user@email.com",
    "customerId": "<user_id>",
    "callbackUrl": "https://ajoflow.vercel.app/dashboard?payment=success",
    "allowedPaymentMethods": ["Card", "Transfer"]
  }
}
```

Sandbox checkout confirmed at `sandbox.nomba.com/v1/checkout/order` (team-confirmed in hackathon channel — the documented `/sandbox/checkout/order` path did not work for several teams).

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

Implemented in `src/lib/nomba/tokenized-cards.ts`. This directly serves the "intelligent recurring billing" requirement without needing Direct Debit (which has sandbox limitations — see below).

---

## Direct Debit

**Sandbox status:** all `/direct-debits/*` endpoints return `404` regardless of payload — confirmed by multiple teams independently in the hackathon channel, not an AjoFlow integration bug.

AjoFlow implements the client against the **documented production contract**:

```
POST /direct-debits              → creates mandate (accountNumber, bankCode, amount, frequency, dateRange)
GET  /direct-debits/{mandateId}  → confirm mandate active
POST /direct-debits/debit-mandate → charge with mandateId
```

`bankCode` uses CBN codes (GTBank `058`, Access `044`, UBA `033`, etc. — `BANK_CODES` map in `src/lib/nomba/direct-debit.ts`).

**This feature is flagged for production-only validation** — the code path exists and is unit-testable in isolation, but live end-to-end mandate flow could not be verified in sandbox per Nomba's own confirmation. Tokenized cards serve as the working recurring-payment mechanism for the sandbox demo.

---

## Transfers (Payouts)

```
POST /transfers/bank/lookup   → verify account name before sending money
POST /transfers/bank          → execute transfer
```

Every transfer carries a `merchantTxRef` built from the `payouts.id` (`buildMerchantTxRef()`) — this is AjoFlow's idempotency key, matched against the `transfer.success` webhook to confirm completion without risk of double-payout on retry.

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
| `virtual_account.funded` | `handleVirtualAccountFunded()` | Creates `contributions` row, updates `group_wallets`, recalculates trust score |
| `payment_success` | `handlePaymentSuccess()` | Resolves `payment_sessions` by `orderReference`, same reconciliation pipeline |
| `transfer.success` | `handleTransferSuccess()` | Resolves `payouts` by `merchantTxRef`, marks paid |

### Webhook URL Refresh
Per hackathon team confirmation, **submitted webhook URLs expire every 2 hours** and the submission form can be filled multiple times. For local development this means re-submitting the ngrok URL periodically; for the deployed Vercel URL this is a non-issue since the URL is static — but the **initial production webhook URL must still be (re-)submitted via the hackathon form** after final deployment.

---

## Common Failure Cases & Recovery

| Failure | Cause | Recovery |
|---|---|---|
| 401 on every call | Token expired mid-request or wrong `accountId` | Token cache auto-refreshes; verify `NOMBA_PARENT_ACCOUNT_ID` is used, not sub-account |
| Webhook signature mismatch | `JSON.stringify()` reordering vs raw body | AjoFlow reads raw text body before any parsing — never reconstructs JSON for verification |
| Duplicate contribution on webhook retry | Nomba resending the same event | `request_id` UNIQUE constraint + `processed` flag check |
| "International card processing disabled" | Using a non-sandbox-enabled test card variant | Use the confirmed sandbox card numbers listed above |
| Direct debit 404 | Sandbox limitation (confirmed by Nomba team) | Use tokenized cards for sandbox demo; flag mandate flow for production review |

---

## Sandbox → Production Migration Checklist

1. Flip `NOMBA_ENV=production`
2. Swap `NOMBA_CLIENT_ID` / `NOMBA_CLIENT_SECRET` to live credentials
3. Re-submit production webhook URL via Nomba dashboard/form
4. Verify direct debit mandate flow end-to-end (sandbox could not validate this)
5. Confirm production `NOMBA_PARENT_ACCOUNT_ID` / `NOMBA_SUB_ACCOUNT_ID` match the live account issued
