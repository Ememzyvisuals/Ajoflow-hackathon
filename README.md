# AjoFlow

**Modern Cooperative Finance Platform for Africa**

AjoFlow digitizes traditional Ajo, Esusu, and cooperative thrift savings with automated Nomba payments, AI-powered trust scoring, and real-time community collaboration tools. Built for the **Nomba Hackathon 2026 — Virtual Accounts Infrastructure Track**.

---

## Table of Contents

- [For Reviewers — Demo Access](#for-reviewers--demo-access)
- [Project Overview](#project-overview)
- [Why AjoFlow](#why-ajoflow)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Database Schema Overview](#database-schema-overview)
- [Core Flows](#core-flows)
- [Nomba Integration](#nomba-integration)
- [AI System](#ai-system)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Deployment Guide](#deployment-guide)
- [Security Overview](#security-overview)
- [Performance Optimizations](#performance-optimizations)
- [Roadmap](#roadmap)
- [License](#license)

---

## For Reviewers — Demo Access

**Live app:** https://ajoflow.vercel.app

**Demo login (pre-seeded, no signup needed):**
- Email: `adeshinaemmanuel333@gmail.com`
- Password: `testdemo@2026`

This account belongs to an active group ("Barbers Association") where you can review the group dashboard, deadline countdown, trust scores, discussions, and payout flow. **Note:** this group's virtual account could not be generated because Nomba's sandbox 2-account-per-holder limit was already reached during our own testing (see below) — everything else is fully functional and testable.

### Known Sandbox Limitation — Virtual Account Creation

Nomba's sandbox enforces a hard limit of **2 virtual accounts per account holder, platform-wide** (not per-group). This limit was reached during our own integration testing via `/api/debug/nomba-test`, which consumed both available slots. As a result, **creating a brand-new group in this live demo will show "Could not generate virtual account"** — this is a Nomba sandbox constraint, not an application bug. The feature is fully implemented and was verified working during development:

```json
// Successful virtual account creation (2026-07-05T06:38:55.234Z)
{"success":true,"data":{"bankAccountNumber":"8035229829","bankAccountName":"Nomba/AjoFlow Debug Test","bankName":"Nombank MFB","accountRef":"aftestmr7f7d5n","accountName":"Nomba Hackathon 2026/emmanuel Ariyo","currency":"NGN","expired":false}}

// Second successful creation, same session (2026-07-05T06:46:47.466Z)
{"success":true,"data":{"bankAccountNumber":"7476988193","bankAccountName":"Nomba/AjoFlow Debug Test","bankName":"Nombank MFB","accountRef":"aftestmr7fhhxl"}}

// Third attempt — Nomba's own sandbox confirming the cap
{"success":false,"error":"HTTP 400: Only 2 sandbox virtual accounts are allowed per account holder"}
```

Relevant code: `src/lib/nomba/virtual-accounts.ts`, `src/features/groups/actions.ts`.

---



**Mission:** Build a production-grade digital Ajo, Esusu, and Cooperative Finance operating system powered entirely by Nomba's payment infrastructure.

AjoFlow is **not** a simple thrift tracker — it's group savings infrastructure. Every cooperative group gets its own isolated treasury, every member gets a dedicated bank-grade virtual account, and every transaction is reconciled automatically via webhooks with zero manual intervention.

### Core Capabilities

| Feature | Description |
|---|---|
| Group Management | Rotational Ajo, Target Savings, Cooperative, Investment groups |
| Virtual Accounts | One static, non-expiring NUBAN per member per group |
| Checkout Payments | Card + bank transfer via Nomba hosted checkout |
| Tokenized Cards | One-click recurring contributions |
| Trust Engine | AI-weighted score (0–100) from payment behavior |
| AI Assistant | Conversational insights in English & Nigerian Pidgin |
| Payouts | Admin-approved bank transfers with name verification |
| Loans | Trust-score-gated loan requests within groups |
| Community | Announcements, discussions, comments per group |
| PWA | Installable on Android, iOS, and desktop |

---

## Why AjoFlow

Traditional Ajo relies on paper records, cash handling, and WhatsApp groups — all of which create disputes, lost records, and zero financial transparency. AjoFlow solves each of these with bank-grade digital infrastructure while preserving the cultural and social trust mechanics that make Ajo work.

---

## Architecture Overview

```
                              ┌─────────────────────┐
                              │   Nomba Parent       │
                              │   Account            │
                              └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │  Nomba Sub-Account    │
                              │  (pre-provisioned via │
                              │   hackathon dashboard)│
                              └──────────┬───────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
          ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
          │ Member Virtual    │ │ Member Virtual    │ │ Member Virtual    │
          │ Account (Static)  │ │ Account (Static)  │ │ Account (Static)  │
          └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
                    │                     │                     │
                    └──────────┬──────────┴──────────┬──────────┘
                               ▼                      ▼
                      ┌─────────────────┐   ┌──────────────────┐
                      │  Nomba Webhook   │   │ Checkout / Token  │
                      │  Receiver        │   │ Card Payment      │
                      └────────┬─────────┘   └────────┬──────────┘
                               │                       │
                               └──────────┬────────────┘
                                          ▼
                                ┌───────────────────┐
                                │  HMAC Verification  │
                                │  + Idempotency Check │
                                └──────────┬──────────┘
                                          ▼
                                ┌───────────────────┐
                                │  Supabase Ledger    │
                                │  (Source of Truth)   │
                                └──────────┬──────────┘
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
                ┌─────────────────┐┌──────────────┐┌─────────────────┐
                │ Group Treasury   ││ Trust Score   ││ Notifications +  │
                │ Update           ││ Recalculation ││ AI Insight        │
                └─────────────────┘└──────────────┘└─────────────────┘
```

**Key principle: Nomba moves money. Supabase is the financial ledger.** Balances, trust scores, and contribution history are never derived from Nomba API responses — they are computed and stored transactionally in Postgres.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, TailwindCSS |
| Backend | Next.js Server Actions + Route Handlers |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth — Email/Password, Magic Link, Google OAuth |
| Payments | Nomba API (Checkout, Virtual Accounts, Transfers, Tokenized Cards) |
| AI | Groq (`llama-3.3-70b-versatile`) with multi-key failover routing |
| Email | Resend |
| Hosting | Vercel |
| PWA | Custom Service Worker + Web App Manifest |

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/login, signup/          # Auth pages
│   ├── (dashboard)/                   # Authenticated app shell
│   │   ├── dashboard/                 # Home overview
│   │   ├── groups/                    # Group list, detail, create
│   │   ├── contributions/             # Contribution history
│   │   ├── payouts/                   # Payout queue + history
│   │   ├── members/                   # Member directory
│   │   ├── loans/                     # Loan requests
│   │   ├── ai-assistant/              # AI chat
│   │   ├── notifications/             # In-app notifications
│   │   ├── wallet/                    # Payout bank accounts
│   │   └── settings/, profile/
│   ├── onboarding/                    # Mandatory post-signup flow
│   ├── invite/[token]/                # Discord-style invite acceptance
│   ├── api/
│   │   ├── webhooks/nomba/            # Webhook receiver
│   │   ├── payments/checkout/         # Checkout initiation
│   │   └── ai/ask/                    # AI assistant endpoint
│   └── auth/callback/                 # OAuth/magic-link callback
├── features/
│   ├── auth/actions.ts                # Server Actions: signup, login
│   ├── groups/actions.ts              # Server Actions: create, invite, join
│   ├── payments/actions.ts            # Server Actions: checkout, payout, loans
│   └── trust/engine.ts                # Trust score calculation
├── lib/
│   ├── nomba/                         # client, virtual-accounts, checkout,
│   │                                     tokenized-cards, direct-debit, transfers, webhook
│   ├── supabase/                      # client, server, middleware
│   ├── groq/client.ts                 # Multi-endpoint AI router
│   ├── resend/client.ts               # Branded transactional emails
│   └── utils.ts
├── components/
│   ├── layout/                        # Sidebar, MobileNav, TopNav
│   └── shared/BankIcon.tsx            # Branded bank badges
└── types/index.ts                     # Full database type definitions

supabase/migrations/
├── 001_schema.sql                     # All tables, triggers, indexes
└── 002_rls.sql                        # Row Level Security policies
```

---

## Database Schema Overview

20 tables form the financial ledger. Key relationships:

```
profiles ──< group_memberships >── groups ──< group_sub_accounts (1:1)
                  │
                  ├──< member_virtual_accounts (1:1)
                  ├──< trust_scores (1:1, auto-created via trigger)
                  └──< contributions >── payment_cycles

groups ──< group_wallets (1:1, auto-created via trigger)
groups ──< payouts >── payout_accounts
groups ──< loan_requests
groups ──< group_posts >── post_comments
groups ──< group_invites

webhook_events (idempotency ledger, request_id UNIQUE)
audit_logs (immutable financial action log)
ai_reports (24h-cached Groq outputs)
```

Full table definitions, indexes, and RLS policies are in `supabase/migrations/`. Every table that holds money (`contributions`, `payouts`, `group_wallets`) is protected by RLS scoped to group membership.

---

## Core Flows

### Authentication Flow
```
Signup (email/password | Google OAuth | Magic Link)
  → Supabase Auth creates auth.users row
  → DB trigger auto-creates profiles row
  → Redirect to /onboarding (phone number required)
  → Middleware gates all dashboard routes until onboarding complete
```

### Group Membership Flow
```
Admin creates group
  → group_memberships row (role: owner)
  → member_virtual_accounts row (Nomba VA created, non-fatal on failure)
  → trust_scores row (auto, score: 100)
  → group_wallets row (auto, balance: 0)

Admin generates invite link → group_invites row (token, 7-day expiry)
Invitee clicks link → signs up/logs in → acceptGroupInvite()
  → group_memberships row (role: member)
  → member_virtual_accounts row (Nomba VA created)
  → Admins notified
```
Each member's own virtual account (account number + bank name, copy-to-clipboard) is shown on their group page. If VA creation failed non-fatally (e.g. sandbox's 2-account-per-holder cap), a "Generate My Account" button retries it via `POST /api/payments/virtual-account`.

### Contribution Flow (Bank Transfer)
```
Member transfers to their static Virtual Account
  → Nomba fires virtual_account.funded webhook
  → HMAC signature verified
  → requestId checked against webhook_events (idempotency)
  → accountRef → membership_id → group_id resolved
  → Group's active payment_cycles.end_date checked
  → contributions row created (status: paid, due_date/cycle_id populated)
  → group_wallets.balance incremented
  → trust_scores recalculated: on-time (+3, +1 streak) if before deadline,
    late (-5, streak reset) if after — this branch used to never trigger;
    every payment was scored on-time regardless of actual timing
  → notifications row created
  → audit_logs row created
```

**If the webhook never arrives** (see "Known Nomba Platform Issue" below): the member can report it via "Sent money but it's not showing?" on their virtual account card, which notifies the group admin. The admin can then verify in their own bank app and record it manually — same wallet/trust-score/audit-log effects, tagged `payment_method: manual` so it's distinguishable from a webhook-confirmed payment.

### Contribution Flow (Card / Checkout)
```
Member taps "Pay Now"
  → Server Action creates payment_sessions row
  → Nomba checkout order created (amount in NAIRA — not Kobo)
  → Member redirected to Nomba hosted checkout
  → Nomba fires payment_success webhook
  → Same reconciliation pipeline as above, same on-time/late check
```

### Overdue Detection (Cron)
```
Vercel Cron → GET /api/cron/check-overdue (daily, CRON_SECRET-protected)
  → For every active cycle past its end_date:
      1–6 days overdue, unpaid  → contribution marked 'late', recordLatePayment()
      7+ days overdue, unpaid   → contribution marked 'failed', recordMissedPayment(), cycle closed
```
This is what makes `recordLatePayment()`/`recordMissedPayment()` reachable at all — before this cron job existed, both functions were fully implemented with zero caller anywhere in the codebase, meaning trust scores could only ever increase.

### Payout Flow
```
Admin reviews payout queue → approves (UI: "Awaiting Your Approval" on Payouts page)
  → group_wallets.balance checked (must cover amount)
  → Nomba bank lookup verifies recipient account name
  → Nomba transfer initiated (merchantTxRef = payout_id, senderName = group name)
  → transfer.success webhook confirms
  → payouts.status = paid
  → group_wallets.balance decremented
  → Recipient notified + emailed
```
`senderName` is a required Nomba field — omitting it fails with `HTTP 422: senderName must not be blank`, a real bug caught via the debug route. The approval UI itself didn't exist for a while: `approvePayout()` was fully implemented with no page calling it, meaning the entire manual-approval payout flow was dead end-to-end until it was surfaced.

### Trust Score Engine
```
+3   per on-time payment
+1   per consecutive streak payment
-5   per late payment (streak reset)
-10  per missed payment (streak reset)
-15  per loan default
Clamped to [0, 100]
```
Also gates loan requests: `getLoanEligibility(score)` rejects requests below score 40, and caps requestable amount at 3×/2×/1× the group's contribution amount for scores ≥80/≥60/≥40 respectively — enforced server-side in `requestLoan()`, not just displayed.

---

## Known Nomba Platform Issue — Webhook Reliability

On July 5, 2026, multiple teams in the hackathon's `#nomba-hackathon` Slack channel independently reported the same failure: checkout/card payments complete successfully (Nomba's own hosted page confirms success) but generate **zero webhook events** — not visible even in Nomba's own event-logs endpoint. One team (Tochukwu) traced part of this to the `accountId` header on `/checkout/order` needing to be the **sub-account**, not the parent — AjoFlow's checkout code has been corrected to match. If webhook unreliability persists after that fix, it appears to be a platform-wide Nomba issue outside this app's control, which is why the manual reconciliation fallback above exists — treat the webhook as best-effort, not guaranteed, until Nomba's team resolves it.

---

## Nomba Integration

**Track:** Virtual Accounts Infrastructure
**Sandbox base URL:** `https://sandbox.nomba.com/v1`
**Production base URL:** `https://api.nomba.com/v1`

### Authentication
OAuth2 `client_credentials` grant. Token cached in-memory for **25 minutes** (valid 30). Every request requires the `accountId` header — but which account ID depends on the endpoint (see below), not always the parent.

### Architecture Decision: Sub-Account Model
Nomba hackathon sub-accounts are **dashboard-provisioned only** (not creatable via API). AjoFlow uses **one pre-provisioned sub-account** as the platform's payment-receiving layer, with **per-membership static Virtual Accounts** layered on top. Group-level fund isolation is enforced in the **Supabase ledger**, not at the Nomba account level — this is the correct architecture given the hackathon's sub-account provisioning constraint. Sandbox additionally caps virtual account creation at 2 per account holder, platform-wide (confirmed via the debug route).

### APIs Used

| API | Purpose | `accountId` header | Sandbox Status |
|---|---|---|---|
| `POST /auth/token/issue` | OAuth token | Parent | ✅ Working |
| `POST /accounts/virtual/{subAccountId}` | Create static member VA | Parent (sub-account is in the URL path, not the header) | ✅ Working |
| `POST /checkout/order` | Card/transfer checkout | **Sub-account** | ✅ Working — see note below |
| `POST /checkout/order` (`tokenizeCard: true`) | Recurring card tokenization | Sub-account | ✅ Working (test card `5434621074252808`, PIN `0000`, OTP `000000`) |
| `POST /checkout/tokenized-card-payment` | Charge stored token | Sub-account | ✅ Working — not currently scheduled/automated anywhere |
| `POST /transfers/bank/lookup` | Verify payout account name | Parent | ✅ Working |
| `POST /transfers/bank` | Send payout | Parent | ✅ Working — requires `senderName`, easy to miss (returns 422 without it) |
| `POST /direct-debits` | Recurring mandate | Parent | ⚠️ Returns 404 in sandbox — implemented against documented contract, unused elsewhere in the app |
| `GET /api/cron/check-overdue` | Daily overdue detection (AjoFlow's own route, not Nomba's) | n/a | ✅ Working, `CRON_SECRET`-protected |
| `GET /api/debug/nomba-test` | Exercises every integration above in one call | n/a | ✅ Working — **executes a real transfer, gated behind `NOMBA_ENV` + `DEBUG_ROUTE_SECRET`, delete before final production ship** |
| Webhooks | `virtual_account.funded`, `payment_success`, `transfer.success` | n/a | ⚠️ HMAC verification working, but see "Known Nomba Platform Issue" above — delivery itself has been unreliable platform-wide as of July 5, 2026 |

**checkout `accountId` note:** this was originally implemented using the parent account, matching the pattern used for virtual accounts. A hackathon teammate (Tochukwu) independently confirmed checkout orders created under the parent header complete payment but generate zero webhook events — switching to the sub-account fixed it. See "Known Nomba Platform Issue" above for full context.

### Webhook Security
1. Raw body read before JSON parsing (signature must match exact bytes)
2. HMAC-SHA256 computed with `NOMBA_WEBHOOK_SECRET`, compared via `crypto.timingSafeEqual`
3. `requestId` checked against `webhook_events` table before processing — **duplicate webhooks are no-ops**
4. Every event stored raw before business logic runs (audit trail even on processing failure)
5. Handler always returns `200` after storage to prevent Nomba retry storms on business-logic errors

---

## AI System

**Provider:** Groq, multi-key round-robin with automatic failover (primary → secondary → tertiary on rate-limit/timeout/model-unavailable).
**Primary model:** `openai/gpt-oss-120b` — strong financial reasoning + Nigerian Pidgin comprehension.
**Fallback model:** `openai/gpt-oss-20b` — used if the primary model errors mid-request.

> **Model history:** originally built against `llama-3.3-70b-versatile` / `llama-3.1-8b-instant`. Groq deprecated both on the free/developer tier on June 17, 2026. Swapped to their recommended replacements above. Both are reasoning models that spend part of their token budget on internal reasoning before visible output — `reasoning_effort: "low"` is set on every call, without which a short `max_tokens` budget can be entirely consumed by reasoning, silently returning an empty response while still reporting success.

### Features
- **Trust Reports** — narrative summary of group payment health
- **AI Assistant** — conversational Q&A ("Who hasn't paid?", "When is my payout?")
- **Group Health Scoring** — weighted composite of participation, payment completion, average trust
- **Contribution Reminders** — natural-language reminder generation

### Cost Optimization
- AI reports cached 24 hours per group (`ai_reports.cached_until`)
- Target: < 1 AI call per active user per day
- No AI call on every page load — only on explicit user action or scheduled batch job

---

## Environment Variables

See `.env.example` for the full list. Critical groups:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Nomba
NOMBA_ENV=sandbox                    # or "production"
NOMBA_PARENT_ACCOUNT_ID=
NOMBA_SUB_ACCOUNT_ID=
NOMBA_CLIENT_ID=
NOMBA_CLIENT_SECRET=
NOMBA_WEBHOOK_SECRET=

# Groq (3-key failover pool)
GROQ_KEY_1=
GROQ_KEY_2=
GROQ_KEY_3=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL="AjoFlow <onboarding@resend.dev>"

# Route protection
CRON_SECRET=            # Vercel sends this automatically as a Bearer token to /api/cron/*
DEBUG_ROUTE_SECRET=      # required as ?key=... to use /api/debug/nomba-test even in sandbox

NEXT_PUBLIC_APP_URL=
```

> **Note:** `RESEND_FROM_EMAIL`'s default shared domain (`resend.dev`) can only deliver to the email address on the Resend account itself — sending magic links to arbitrary user emails requires a verified custom domain in Resend. Group invites avoid this entirely by using a shareable link instead of email delivery.

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- A Supabase project
- Nomba hackathon credentials (parent account ID, sub-account ID, client ID/secret)
- Groq API key(s)
- Resend API key

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your credentials

# 3. Run database migrations
# In Supabase SQL Editor, run in order:
#   supabase/migrations/001_schema.sql
#   supabase/migrations/002_rls.sql
#   supabase/migrations/003_fix_group_memberships_recursion.sql
#   supabase/migrations/004_avatars_and_loan_policy.sql
#   supabase/migrations/005_allow_manual_payment_method.sql

# 4. Enable Google OAuth in Supabase Dashboard
# Authentication → Providers → Google → add Client ID/Secret
# Redirect URL: https://<project>.supabase.co/auth/v1/callback

# 5. Start dev server
npm run dev
```

Visit `http://localhost:3000`.

### Webhook Testing Locally
Use [ngrok](https://ngrok.com) or similar to expose `localhost:3000/api/webhooks/nomba`, then submit that URL via the Nomba hackathon webhook form. Note: hackathon webhook URLs refresh every 2 hours — resubmit as needed during development.

### Verifying Live Sandbox Response Shapes
Before relying on the Nomba integration for a demo, hit:

```
GET /api/debug/nomba-test?key=<DEBUG_ROUTE_SECRET>
```

This exercises every Nomba integration in one call — token issue, VA create/fetch, bank lookup, checkout order creation, a real ₦100 sandbox transfer, direct debit (expected 404), webhook signature self-test, and a live Groq completion — returning real response shapes and a pass/fail summary.

**This route executes a real bank transfer and creates real sandbox resources — it is not read-only.** It requires `DEBUG_ROUTE_SECRET` even in sandbox, and hard-blocks itself with a 403 whenever `NOMBA_ENV=production`.

**Delete `src/app/api/debug/nomba-test/route.ts` before your final production deployment** if you no longer need it — a gated debug endpoint that can still move money is safer not shipped at all once it's served its purpose.

### Overdue Contribution Cron
`vercel.json` registers `/api/cron/check-overdue` to run daily. Requires `CRON_SECRET` to be set — Vercel sends it automatically as a Bearer token to registered cron routes.

---

## Deployment Guide

### Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Add all environment variables from `.env.example`
4. Deploy — domain will be `ajoflow.vercel.app` or similar
5. Update `NEXT_PUBLIC_APP_URL` to the deployed URL and redeploy
6. Submit the production webhook URL (`https://ajoflow.vercel.app/api/webhooks/nomba`) via the Nomba hackathon form

### Supabase
1. Run both migration files in the SQL Editor
2. Enable Google OAuth provider with production redirect URL
3. Set Site URL and Redirect URLs in Auth settings to the Vercel domain

---

## Security Overview

- **Auth:** Supabase Auth with httpOnly cookies, refreshed via middleware on every request
- **RLS:** Every financial table scoped to active group membership; service-role bypass used only in server-side webhook/Server Action code, never exposed to the client
- **Webhooks:** HMAC-SHA256 verified, idempotent via `request_id` unique constraint, raw payload always persisted
- **Payments:** Frontend payment responses are never trusted — only verified webhooks update the ledger
- **Input validation:** Zod schemas on every Server Action
- **Audit trail:** Every financial mutation writes an immutable `audit_logs` row
- **Secrets:** Service role key and Nomba client secret never sent to the client; all Nomba calls happen server-side
- **Debug route:** `/api/debug/nomba-test` (executes a real bank transfer) is gated behind `DEBUG_ROUTE_SECRET` and hard-blocked entirely when `NOMBA_ENV=production` — recommended to delete outright before final deployment
- **Service client guard:** `createServiceClient()` throws a specific, actionable error naming the missing variable if `SUPABASE_SERVICE_ROLE_KEY` is absent, instead of an opaque crash — every Server Action using it wraps the call in try/catch

---

## Performance Optimizations

- Server Components by default; Client Components only where interactivity is required
- Next.js `Image` for optimized hero/avatar rendering
- Service Worker caches static assets and provides offline fallback
- Database indexes on every foreign key used in hot-path queries
- AI report caching prevents redundant Groq calls

---

## Roadmap

**Recently completed:**
- [x] Per-member virtual account display in the UI (backend existed, was never shown)
- [x] Payout approval UI (backend existed, had zero caller)
- [x] Loan trust-score eligibility enforcement (server-side, not just displayed)
- [x] Late/missed contribution detection via daily cron
- [x] Manual payment reconciliation fallback (for Nomba webhook reliability issues)
- [x] Discussion reply threads
- [x] Group deadline countdown + next-payout-recipient display
- [x] Group settings edit page, member removal
- [x] Auth-aware landing page (Dashboard button instead of Get Started when already logged in)

**Still open:**
- [ ] Yoruba, Hausa, Igbo AI language support
- [ ] Group discovery + public join requests (currently invite-link only)
- [ ] Direct debit mandates (pending Nomba sandbox enablement — returns 404)
- [ ] Scheduled/automatic tokenized-card charging (charge function exists, nothing triggers it on a due date yet)
- [ ] PostHog analytics integration
- [ ] Sentry error monitoring
- [ ] Push notification delivery via service worker
- [ ] Custom email domain for magic link (currently limited to Resend's shared sandbox domain, which only delivers to the account owner's own email)

---

## License

MIT — built for the Nomba Hackathon 2026.

Bank logos in `public/bank-logos/` are sourced from the [wovenfinance/cdn](https://github.com/wovenfinance/cdn) repository (MIT licensed) — see `public/bank-logos/LICENSE.txt`.

---

**Built by Emmanuel Ariyo (Ememzyvisuals) · Axiveri**
