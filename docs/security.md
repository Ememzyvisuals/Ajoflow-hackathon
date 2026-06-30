# AjoFlow — Security Documentation

## Authentication

Supabase Auth handles credential storage, session issuance, and OAuth flows. AjoFlow never touches raw passwords — they are hashed and stored by Supabase's GoTrue service.

Three supported methods:
- Email + Password
- Magic Link (passwordless OTP via email)
- Google OAuth

Sessions are stored in httpOnly cookies, refreshed automatically by `middleware.ts` on every request via `supabase.auth.getUser()`.

## Authorization

Two layers, defense in depth:

1. **Row Level Security (Postgres)** — every table holding user or financial data has RLS policies scoped to `auth.uid()` and group membership (see `supabase/migrations/002_rls.sql`). This is the database-level guarantee that holds even if application code has a bug.
2. **Server Action role checks** — Server Actions that use the service-role client (which bypasses RLS, necessary for cross-user operations like notifying other group members) independently re-verify the caller's role against `group_memberships` before any mutation. See `docs/api.md` for the pattern.

## Supabase RLS — Key Policies

| Table | Policy Summary |
|---|---|
| `profiles` | Self read/update; group co-members can read each other |
| `groups` | Active members can SELECT; owner/admin can UPDATE |
| `group_memberships` | Self can view own; admins can view/manage all in their groups |
| `contributions` | Active group members can SELECT; users can INSERT their own |
| `payouts` | Active members can SELECT; admins can INSERT/UPDATE |
| `payout_accounts` | Fully owner-scoped (`user_id = auth.uid()`) |
| `webhook_events`, `audit_logs` | Service-role only — never queried client-side |

## Webhook Verification

The single most security-critical code path in AjoFlow (`src/app/api/webhooks/nomba/route.ts`):

```ts
const rawBody = await request.text();           // raw bytes, not parsed
// Header name confirmed from Nomba hackathon webhook registration form
  const signature = request.headers.get("nomba-signature");

const expected = crypto.createHmac("sha256", WEBHOOK_SECRET)
  .update(rawBody)
  .digest("hex");

const valid = crypto.timingSafeEqual(
  Buffer.from(expected, "hex"),
  Buffer.from(signature, "hex")
);
```

Key decisions:
- **Raw body, not re-serialized JSON** — `JSON.stringify(JSON.parse(body))` can produce different bytes than the original (key ordering, whitespace), which would break signature verification. AjoFlow reads the body as text exactly once, before any parsing.
- **`crypto.timingSafeEqual`**, not `===` — prevents timing-attack signature guessing.
- **Idempotency via `request_id` UNIQUE constraint** on `webhook_events` — Nomba retries are detected and no-op'd, preventing double-crediting a contribution if the same webhook arrives twice.

## Payment Verification

**Frontend payment responses are never trusted.** A member completing checkout client-side only redirects them back to the app — it does **not** mark a contribution as paid. Only a verified, signed webhook from Nomba can create a `contributions` row. This is enforced structurally: there is no Server Action or client code path that writes to `contributions.status = 'paid'` other than the webhook handler.

## Transfer Verification

Before any payout:
1. `lookupBankAccount()` — Nomba bank lookup confirms the account name matches what's on file, preventing payouts to mistyped/wrong account numbers
2. `group_wallets.balance` checked server-side immediately before initiating transfer
3. `merchantTxRef` built from the `payouts.id` — Nomba transfer retries are idempotent at the Nomba layer, and AjoFlow's own state machine (`pending → processing → paid/failed`) prevents double-approval

## Fraud Prevention

| Vector | Mitigation |
|---|---|
| Duplicate webhook processing | `webhook_events.request_id` UNIQUE + `processed` boolean check |
| Duplicate contribution from same transaction | `contributions.transaction_reference` checked before insert |
| Double-payout approval | Payout status state machine — `approvePayout()` checks `status !== 'pending'` and rejects |
| Self-removal from own admin role | `removeMember()` explicitly blocks `userId === user.id` |
| Cross-group data leakage | RLS policies scope every query to the caller's active memberships |

## Rate Limiting

AI calls are rate-limited at the architecture level rather than per-request throttling: `ai_reports.cached_until` (24h TTL) means a group's AI report is computed once per day maximum regardless of how many members view it. The Groq client's multi-key failover (`src/lib/groq/client.ts`) additionally protects against hitting any single key's free-tier rate limit during demo traffic spikes.

## CSRF Protection

Next.js Server Actions include built-in CSRF protection via same-origin header checks performed automatically by the framework — no custom token implementation is required for Server Action invocations.

## Input Validation

Every Server Action validates input through Zod schemas before any database write. Schemas are co-located with the actions in `features/*/actions.ts`. Invalid input returns `{ success: false, error }` before any side effect occurs — validation always happens before the auth/role check short-circuits would matter, ensuring malformed requests fail fast.

## Audit Logging

Every financial state mutation writes an immutable `audit_logs` row: `GROUP_CREATED`, `GROUP_JOINED`, `CONTRIBUTION_CREATED`, `PAYOUT_APPROVED`, `LOAN_APPROVED`, `LOAN_REJECTED`, `PAYMENT_INITIATED`. These are written by the service-role client and are readable (not writable) by the acting user via RLS.

## Secrets Management

| Secret | Exposure |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, never sent to client, bypasses RLS — used exclusively inside Server Actions and Route Handlers |
| `NOMBA_CLIENT_SECRET` | Server-only — all Nomba API calls happen in `src/lib/nomba/*`, never called from Client Components |
| `NOMBA_WEBHOOK_SECRET` | Server-only — used exclusively for HMAC verification |
| `GROQ_KEY_*` | Server-only |
| `RESEND_API_KEY` | Server-only |
| `NEXT_PUBLIC_*` | Intentionally exposed (Supabase URL + anon key, which is safe by design — RLS is the actual security boundary, not key secrecy) |

No secret is ever interpolated into client-rendered HTML or passed as a prop to a Client Component.

## Data Protection

- All monetary values stored as `DECIMAL(12,2)`, never floating point — eliminates rounding-error exploitation
- Bank account numbers are stored as-is (not encrypted at rest) since Supabase Postgres storage is itself encrypted at rest by the platform; RLS prevents cross-user read access
- No PII is logged to `console.log` in production code paths — only error messages and entity IDs
