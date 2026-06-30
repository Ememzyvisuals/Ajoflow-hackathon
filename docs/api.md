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

### `sendMagicLink(email)`
Triggers Supabase OTP email flow.

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
Authorization: `owner` or `admin` role required (checked via `group_memberships` query before mutation).

### `generateInviteLink(groupId, email?)`
Authorization: `owner`/`admin`. Inserts `group_invites` row (7-day expiry), returns shareable URL.

### `acceptGroupInvite(token)`
Authorization: any authenticated user.
1. Validates invite exists, is `pending`, not expired
2. Idempotent: if already a member, marks invite accepted and returns existing group
3. Otherwise creates membership + virtual account, notifies admins, marks invite accepted

### `removeMember(groupId, userId)`
Authorization: `owner`/`admin`. Cannot remove self. Sets membership `status: inactive` (soft delete — preserves contribution history).

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
**Verifies account ownership via Nomba bank lookup before saving** — never trusts client-submitted account names.

### `approvePayout(payoutId)`
Authorization: `owner`/`admin` of the payout's group.
1. Checks `group_wallets.balance >= amount`
2. Marks payout `processing`
3. Initiates Nomba transfer with `merchantTxRef = payoutId`
4. On success: decrements wallet balance, notifies recipient
5. On failure: marks payout `failed` (wallet untouched — no partial deduction)

### `requestLoan(input)`
Authorization: active member of the target group.
Validates `amount > 0`. Inserts `loan_requests` row (status: pending).

### `decideLoan(loanId, decision)`
Authorization: `owner`/`admin` of the loan's group.
Updates status, notifies requester via in-app notification, writes audit log.

---

## Webhook APIs (`src/app/api/webhooks/nomba/route.ts`)

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
