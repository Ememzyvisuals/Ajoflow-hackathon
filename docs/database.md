# AjoFlow — Database Documentation

All tables live in the `public` schema, Supabase-managed PostgreSQL. RLS is enabled on every table holding user or financial data. Full SQL in `supabase/migrations/001_schema.sql` and `002_rls.sql`.

---

## profiles

**Purpose:** One row per authenticated user. Auto-created via `handle_new_user()` trigger on `auth.users` insert.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | = auth.users.id |
| email | TEXT | |
| full_name | TEXT | nullable until onboarding |
| phone | TEXT | nullable until onboarding; **gates dashboard access** |
| avatar_url | TEXT | |
| role | TEXT | `user` \| `admin` |
| language | TEXT | `en` \| `pidgin` — drives AI response language |
| status | TEXT | `active` \| `suspended` |

**RLS:** Users can read/update own row. Group co-members can read each other's profile (for member directory display).

---

## groups

**Purpose:** A cooperative savings group (Ajo).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name, description, rules | TEXT | |
| type | TEXT | `rotational` \| `target_savings` \| `cooperative` \| `investment` |
| contribution_amount | DECIMAL(12,2) | |
| contribution_frequency | TEXT | `daily` \| `weekly` \| `monthly` |
| admin_id | UUID FK → profiles | group creator |
| payout_mode | TEXT | `auto` \| `manual_approval` |
| invite_code | TEXT UNIQUE | random hex, auto-generated |
| sub_account_id | UUID FK → group_sub_accounts | nullable |

**Triggers:** Insert fires `create_group_wallet_on_group()` → auto-creates `group_wallets` row.

**RLS:** Active members can SELECT. Owner/admin role required for UPDATE.

---

## group_memberships

**Purpose:** Join table — user ↔ group, with role and rotation position.

| Column | Type | Notes |
|---|---|---|
| group_id, user_id | UUID FK | UNIQUE(group_id, user_id) |
| role | TEXT | `owner` \| `admin` \| `member` |
| status | TEXT | `active` \| `inactive` \| `suspended` |
| position | INT | rotation order for rotational Ajo |

**Triggers:** Insert fires `create_trust_score_on_membership()` → auto-creates `trust_scores` row.

**Indexes:** `user_id`, `group_id` (high-traffic lookup paths).

**RLS:** Self can view own memberships. Admins can view/insert/update all memberships in groups they administer.

---

## member_virtual_accounts

**Purpose:** Maps a membership to its Nomba static Virtual Account.

| Column | Type | Notes |
|---|---|---|
| membership_id | UUID FK, UNIQUE | 1:1 with group_memberships |
| account_number | TEXT | Nomba-issued NUBAN |
| bank_name | TEXT | |
| account_reference | TEXT UNIQUE | the `accountRef` sent to Nomba — webhook lookup key |
| account_name | TEXT | |
| status | TEXT | `active` \| `suspended` |

**Critical path:** `account_reference` is the join key used by the webhook handler to resolve `virtual_account.funded` events back to a membership.

---

## group_wallets

**Purpose:** Internal treasury ledger per group. **This is the financial source of truth — never derived from Nomba balance APIs.**

| Column | Type | Notes |
|---|---|---|
| group_id | UUID FK, UNIQUE | |
| balance | DECIMAL(12,2) | current spendable treasury |
| total_received | DECIMAL(12,2) | lifetime inflow |
| total_paid_out | DECIMAL(12,2) | lifetime outflow |
| nomba_account_ref | TEXT | nullable, informational |

**Mutated by:** webhook handler (increments on contribution), `approvePayout()` Server Action (decrements on payout).

---

## payment_cycles

**Purpose:** One row per rotation/collection period for a group (e.g. "July 2026 Round"). Deadlines and "who's collecting this round" are both anchored to the group's currently `active` cycle.

| Column | Type | Notes |
|---|---|---|
| group_id | UUID FK | |
| name | TEXT | |
| start_date, end_date | DATE | `end_date` is the deadline shown as a countdown in the group page and dashboard |
| status | TEXT | `active` \| `completed` \| `cancelled` |

**Read by:** the group page's deadline card, the dashboard's "Payment due in N days" reminders, and `/api/cron/check-overdue`, which closes a cycle out (`completed`) once it's 7+ days past `end_date`.

---

## contributions

**Purpose:** Every individual payment event.

| Column | Type | Notes |
|---|---|---|
| membership_id, group_id | UUID FK | |
| cycle_id | UUID FK → payment_cycles | nullable — which round this contribution belongs to |
| amount | DECIMAL(12,2) | |
| status | TEXT | `pending` \| `paid` \| `late` \| `failed` |
| due_date | DATE | nullable — copied from the active cycle's `end_date` at the time the contribution is created |
| transaction_reference | TEXT | Nomba transactionReference — **unique check prevents double-counting**; manually-recorded contributions get a synthetic `manual-<timestamp>` reference |
| payment_method | TEXT | `card` \| `transfer` \| `manual` (migration `005` — `manual` added for the admin reconciliation fallback; original constraint only allowed `card`/`transfer`) — `manual` means an admin recorded it directly (see "Webhook Reliability" in `docs/nomba-integration.md`), not a Nomba webhook |
| nomba_transaction_id | TEXT | |

**Indexes:** `group_id`, `membership_id`, `status`.

**Note:** `due_date` and `cycle_id` existed in the schema from the start but were never populated — the webhook handler's original insert omitted both. Fixed: it now looks up the group's active cycle and populates both at insert time, which is also what makes real on-time/late detection possible (see `docs/nomba-integration.md`, "Webhooks" section).

---

## payout_accounts

**Purpose:** User's saved bank accounts for receiving payouts. Verified via Nomba bank lookup before insert.

| Column | Type | Notes |
|---|---|---|
| user_id | UUID FK | |
| bank_name, account_number, account_name, bank_code | TEXT | |
| is_default | BOOLEAN | |

**RLS:** Fully owner-scoped (`user_id = auth.uid()`).

---

## payouts

**Purpose:** A scheduled/executed disbursement from a group treasury to a member.

| Column | Type | Notes |
|---|---|---|
| group_id, recipient_id | UUID FK | |
| amount | DECIMAL(12,2) | |
| status | TEXT | `pending` → `approved` → `processing` → `paid` \| `failed` |
| payout_account_id | UUID FK | |
| nomba_transfer_id | TEXT | |
| reference | TEXT UNIQUE | becomes `merchantTxRef` for Nomba transfer — idempotency key |

---

## loan_requests

**Purpose:** Member-initiated loan request against group treasury, gated by trust score.

| Column | Type | Notes |
|---|---|---|
| group_id, member_id | UUID FK | |
| amount | DECIMAL(12,2) | |
| status | TEXT | `pending` \| `approved` \| `rejected` \| `disbursed` \| `repaid` \| `defaulted` |
| decided_by, decided_at | UUID, TIMESTAMPTZ | admin who decided |

**Eligibility enforcement:** `requestLoan()` (`src/features/loans/actions.ts`) calls `getLoanEligibility(score)` from the trust engine before allowing the insert — trust score < 40 is rejected outright; otherwise the requested amount is capped at a multiplier of the group's `contribution_amount` (score ≥ 80 → 3×, ≥ 60 → 2×, ≥ 40 → 1×). This function existed in the codebase for a while with no caller before being wired in.

**Decision side effects:** `decideLoan()` sends the requester an in-app notification and writes an `audit_logs` row (`LOAN_APPROVED`/`LOAN_REJECTED`) — this used to live in a dead duplicate of the function elsewhere in the codebase that no UI ever called; consolidated into the one path that's actually wired to the UI.

---

## trust_scores

**Purpose:** One row per membership — the AjoFlow reputation system.

| Column | Type | Notes |
|---|---|---|
| membership_id | UUID FK, UNIQUE | |
| score | INT | 0–100, clamped |
| on_time_count, late_count, missed_count | INT | |
| streak | INT | resets to 0 on late/missed |

**Mutated exclusively by `src/features/trust/engine.ts`** — never updated directly from UI. Called from three places: the webhook handler (on-time/late, based on whether payment beat the cycle deadline), `manuallyRecordContribution()` (same on-time/late check, for admin-recorded payments), and `/api/cron/check-overdue` (late/missed, for contributions nobody ever paid at all — this cron job is what makes `recordLatePayment()`/`recordMissedPayment()` reachable; they had no caller for a while after being written).

---

## group_posts / post_comments

**Purpose:** Community announcements and discussions per group.

| group_posts | Type |
|---|---|
| group_id, author_id | UUID FK |
| content | TEXT |
| type | `announcement` \| `post` |
| pinned | BOOLEAN |

`post_comments` references `group_posts.id`, scoped via the same group membership RLS pattern.

---

## notifications

**Purpose:** In-app notification feed per user.

| Column | Type | Notes |
|---|---|---|
| user_id | UUID FK | |
| type | TEXT | see `NotificationType` union in `types/index.ts` |
| title, message | TEXT | |
| read | BOOLEAN | |
| data | JSONB | event-specific payload (e.g. `{contribution_id, amount}`) |

---

## group_invites

**Purpose:** Discord-style invite links.

| Column | Type | Notes |
|---|---|---|
| group_id, invited_by | UUID FK | |
| token | TEXT UNIQUE | random hex, used in `/invite/[token]` URL |
| status | TEXT | `pending` \| `accepted` \| `expired` \| `revoked` |
| expires_at | TIMESTAMPTZ | default NOW() + 7 days |

---

## webhook_events

**Purpose:** Idempotency + audit ledger for every Nomba webhook received.

| Column | Type | Notes |
|---|---|---|
| request_id | TEXT UNIQUE | **Nomba's requestId — the idempotency key** |
| event_type | TEXT | |
| payload | JSONB | full raw webhook body, always stored |
| processed | BOOLEAN | |
| error | TEXT | nullable, populated if business logic throws |

**RLS:** Service-role only — never queried from the client.

---

## audit_logs

**Purpose:** Immutable log of every financial state change.

| Column | Type | Notes |
|---|---|---|
| user_id | UUID FK | nullable (system actions) |
| action | TEXT | e.g. `CONTRIBUTION_CREATED`, `PAYOUT_APPROVED` |
| entity_type, entity_id | TEXT | polymorphic reference |
| metadata | JSONB | |

**RLS:** Service-role writes; users can read their own action history.

---

## ai_reports

**Purpose:** Cached Groq-generated reports (24h TTL) to minimize AI calls.

| Column | Type | Notes |
|---|---|---|
| group_id | UUID FK | |
| type | TEXT | `trust_report` \| `health_report` \| `payout_recommendation` \| `risk_alert` |
| content | TEXT | |
| cached_until | TIMESTAMPTZ | queries filter `WHERE cached_until > NOW()` |

---

## payment_sessions

**Purpose:** Tracks Nomba Checkout order lifecycle before webhook confirmation.

| Column | Type | Notes |
|---|---|---|
| order_reference | TEXT UNIQUE | sent to Nomba, matched on webhook |
| status | TEXT | `pending` \| `completed` \| `failed` \| `expired` |
| checkout_url | TEXT | |

---

## group_sub_accounts

**Purpose:** Maps a group to its Nomba sub-account context (hackathon model: one pre-provisioned sub-account shared across groups, isolation enforced at Supabase ledger level).

---

## Scalability Notes

- All high-traffic FK columns are indexed (`group_id`, `membership_id`, `user_id`, `status`)
- `webhook_events.request_id` UNIQUE constraint provides O(1) idempotency lookup
- Group-scoped RLS policies use `EXISTS` subqueries against `group_memberships` — indexed and cheap at hackathon scale; would benefit from a materialized membership cache at high scale (10k+ groups)
- `DECIMAL(12,2)` chosen over FLOAT for all monetary columns to avoid rounding errors
