# AjoFlow — Internal API Documentation

AjoFlow has no separate backend — all server logic lives in Next.js **Server Actions** (`features/*/actions.ts`, called directly from Client Components) and **Route Handlers** (`app/api/*`, used for webhooks and AI endpoints).

All Server Actions return `{ success: boolean; error?: string; data?: T }`.

---

## Authentication APIs (`src/features/auth/actions.ts`)

### `signUp(input)`
Zod-validated: `fullName` (min 2), `email`, `password` (min 8, uppercase + number required), `phone` (optional).
Creates `auth.users` row → trigger auto-creates `profiles`. Returns `{ requiresConfirmation: true }` if email confirmation is enabled.

### `signIn(input)`
Zod-validated: `email`, `password`. Sets session cookie via Supabase Auth.

### `signOut()`
Clears session, redirects to `/login`.

### `sendMagicLink(email)` — dead code, not called anywhere
Exists in `src/features/auth/actions.ts` but is not used by any page. The real magic-link flow is `POST /api/auth/magic-link` (uses Resend + `supabase.auth.admin.generateLink()` directly, bypassing Supabase's rate-limited built-in email sending). Kept for now but should be removed in a future cleanup pass — see `docs/security.md` for why the real route exists instead.

### `updateProfile(input)`
Authenticated only. Updates `fullName`, `phone`, `language`. Used by onboarding flow — **`phone` being set is what unlocks dashboard access** via middleware.

---

## Group APIs (`src/features/groups/actions.ts`)

### `createGroup(input)`
Authorization: any authenticated user.
1. Zod validation (name, type, contribution_amount, frequency, payout_mode)
2. Insert `groups` row
3. Insert `group_memberships` row (role: owner)
4. Create Nomba virtual account, insert `member_virtual_accounts`
5. Insert `audit_logs` row

### `updateGroup(groupId, input)`
Authorization: `owner` or `admin` role required (checked via `group_memberships` query before mutation). Editable fields exposed in the UI (`/groups/[id]/edit`): name, description, rules, payout_mode. Contribution amount, frequency, and group type are deliberately **not** exposed in the edit form to avoid disrupting an active rotation, even though the underlying action would technically accept changes to them.

### `generateInviteLink(groupId, email?)`
Authorization: `owner`/`admin`. Inserts `group_invites` row (7-day expiry), returns shareable URL.

### `acceptGroupInvite(token)`
Authorization: any authenticated user.
1. Validates invite exists, is `pending`, not expired
2. Idempotent: if already a member, marks invite accepted and returns existing group
3. Otherwise creates membership + virtual account, notifies admins, marks invite accepted

### `removeMember(groupId, userId)`
Authorization: `owner`/`admin`. Cannot remove self. Sets membership `status: inactive` (soft delete — preserves contribution history). Exposed in the UI as a "Remove" button (with a confirm step) per member row in the group's Members tab.

---

## Payment APIs (`src/features/payments/actions.ts`)

### `initiateContributionPayment(groupId, membershipId)`
Authorization: authenticated user.
1. Fetches group contribution amount
2. Creates `payment_sessions` row (status: pending)
3. Calls Nomba checkout order creation
4. Returns `checkoutUrl` for client-side redirect
5. On Nomba error, marks session `failed`

### `addPayoutAccount(input)`
Authorization: authenticated user.
Zod-validated: `bankName`, `accountNumber` (exactly 10 digits), `bankCode`.
**Verifies account ownership via Nomba bank lookup before saving** — never trusts client-submitted account names. Bank lookup is wrapped in an 8-second timeout (`withTimeout()`) so a slow/hung Nomba sandbox can't leave the "Verify & Save" button spinning forever — this was a real bug (no timeout, no client-side try/catch) before being fixed. `createServiceClient()` calls throughout this file are guarded with try/catch, since a missing `SUPABASE_SERVICE_ROLE_KEY` used to crash uncaught into a generic "something went wrong" with no diagnosable message.

### `approvePayout(payoutId)`
Authorization: `owner`/`admin` of the payout's group.
1. Checks `group_wallets.balance >= amount`
2. Marks payout `processing`
3. Initiates Nomba transfer with `merchantTxRef = payoutId` and `senderName` set to the group's name (required by Nomba — omitting it causes an HTTP 422)
4. On success: decrements wallet balance, notifies recipient
5. On failure: marks payout `failed` (wallet untouched — no partial deduction)

**This function existed with zero UI caller for a while** — the entire manual-approval payout flow was dead end-to-end. Now surfaced as an "Awaiting Your Approval" section on the Payouts page for admins.

---

## Loan APIs (`src/features/loans/actions.ts`)

*(Moved here from `payments/actions.ts`, which had an unwired, duplicate copy of both functions below — deleted after porting its notification/audit-log behavior into the versions the UI actually calls.)*

### `requestLoan(input)`
Authorization: active member of the target group.
Validates `amount > 0`. **Trust-score gated**: calls `getLoanEligibility(score)` — score < 40 is rejected outright; otherwise amount is capped at a multiplier of the group's contribution amount (3×/2×/1× for score ≥ 80/60/40). Inserts `loan_requests` row (status: pending) only if eligible.

### `decideLoan(loanId, decision)`
Authorization: `owner`/`admin` of the loan's group.
Updates status, sends the requester an in-app notification, writes an audit log entry.

---

## Reconciliation APIs (`src/features/payments/reconciliation.ts`)

Built in response to a platform-wide Nomba webhook reliability issue reported by multiple hackathon teams (see `docs/nomba-integration.md`, "Webhook Reliability"). Not a replacement for the webhook — a fallback for when it doesn't fire.

### `reportPaymentIssue(input)`
Authorization: authenticated user.
Member-facing. Notifies every admin/owner of the group that a member believes they sent a contribution that isn't showing yet.

### `manuallyRecordContribution(input)`
Authorization: `owner`/`admin` of the group.
Admin-facing. Inserts a `contributions` row with `payment_method: 'manual'`, updates `group_wallets`, runs the same on-time/late trust-score check as the webhook path, and writes an audit log entry (`CONTRIBUTION_MANUALLY_RECORDED`) so manually-recorded payments are distinguishable from webhook-confirmed ones.

---

## Cron APIs

### `GET /api/cron/check-overdue`
Authorization: `Authorization: Bearer <CRON_SECRET>` — Vercel sends this automatically when `CRON_SECRET` is set and the route is registered in `vercel.json`. Runs daily.
Finds every active `payment_cycles` row whose `end_date` has passed; for each active member with no `paid` contribution in that cycle, marks `late` (1–6 days overdue) or `failed` (7+ days overdue) and calls the corresponding trust engine function. Closes the cycle (`status: completed`) once past the 7-day grace window.

---

## Group Posts APIs (`src/features/posts/actions.ts`, `src/features/posts/comments.ts`)

### `createGroupPost(input)`
Authorization: active member of the group for `type: "post"` (discussions); `owner`/`admin` only for `type: "announcement"` — enforced server-side in addition to RLS, since RLS alone doesn't distinguish post type.

### `addComment(input)`
Authorization: active member of the group the post belongs to (enforced via RLS on `post_comments`).
Replies are only ever shown in the UI under `type: "post"` (discussions) — announcements render read-only with no reply box, even though the underlying table doesn't prevent commenting on an announcement. This is a UI-level rule, not a database one.

---

### `POST /api/webhooks/nomba`
**No user authentication** — authenticated via HMAC signature instead. See `docs/security.md` for the full verification pipeline.

Response codes:
- `401` — signature verification failed
- `400` — malformed JSON or unreadable body
- `200` — always returned after successful storage, regardless of business-logic outcome (prevents Nomba retry storms; errors are logged to `webhook_events.error` for investigation)

---

## AI APIs (`src/app/api/ai/ask/route.ts`)

### `POST /api/ai/ask`
Authorization: authenticated user (session cookie).
Body: `{ question: string }`.

Pipeline:
1. Fetches user's profile language preference
2. Fetches first active group membership + wallet balance + trust score for context
3. Calls `answerFinancialQuestion()` (Groq, multi-key failover)
4. Returns `{ answer: string }` — degrades gracefully to a static apology message on Groq failure rather than erroring the UI

**Model note (July 2026):** `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` were deprecated by Groq on the free/developer tier on June 17, 2026 — after this codebase's original training data cutoff, which is how the wrong model names ended up here in the first place. Swapped to Groq's recommended replacements: `openai/gpt-oss-120b` (primary) and `openai/gpt-oss-20b` (fallback), in `src/lib/groq/client.ts`.

**Reasoning-token bug (fixed):** the `gpt-oss` models spend part of their token budget on internal reasoning before producing visible output. Both completion calls now pass `reasoning_effort: "low"` — without it, a short `max_tokens` budget (the default here is 400) could be entirely consumed by reasoning, returning an empty string as `content` while still reporting success. This was caught via the debug route returning `"reply": ""` with `success: true`.

---

## Validation Rules Summary

| Field | Rule |
|---|---|
| `email` | Valid email format (Zod `.email()`) |
| `password` | Min 8 chars, 1 uppercase, 1 number |
| `phone` | Required for onboarding completion |
| `contribution_amount` | Must be positive number |
| `accountNumber` | Exactly 10 digits (Nigerian NUBAN standard) |
| `groupId`, `membershipId` | Implicitly validated via RLS-scoped Supabase queries — a Server Action cannot mutate a group the caller isn't a member/admin of |

## Authorization Pattern

Every mutating Server Action follows the same shape:
```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) return { success: false, error: "Not authenticated." };

const { data: membership } = await serviceClient
  .from("group_memberships")
  .select("role")
  .eq("group_id", groupId)
  .eq("user_id", user.id)
  .single();

if (!membership || !["owner", "admin"].includes(membership.role)) {
  return { success: false, error: "Only group admins can ..." };
}
```
This is checked **in addition to** RLS policies — defense in depth, since Server Actions use the service-role client (which bypasses RLS) for operations that need to write across membership boundaries (e.g. notifying other users).

## Error Response Shape

All Server Actions and most Route Handlers return errors as:
```json
{ "success": false, "error": "Human-readable message" }
```
Never raw exception stack traces or database error codes are surfaced to the client.
