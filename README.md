# AjoFlow

**Modern Cooperative Finance Platform for Africa**

AjoFlow digitizes traditional Ajo, Esusu, and cooperative thrift savings with automated Nomba payments, AI-powered trust scoring, and real-time community collaboration tools. Built for the **Nomba Hackathon 2026 — Virtual Accounts Infrastructure Track**.

---

## Table of Contents

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

## Project Overview

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
  → member_virtual_accounts row (Nomba VA created)
  → trust_scores row (auto, score: 100)
  → group_wallets row (auto, balance: 0)

Admin generates invite link → group_invites row (token, 7-day expiry)
Invitee clicks link → signs up/logs in → acceptGroupInvite()
  → group_memberships row (role: member)
  → member_virtual_accounts row (Nomba VA created)
  → Admins notified
```

### Contribution Flow (Bank Transfer)
```
Member transfers to their static Virtual Account
  → Nomba fires virtual_account.funded webhook
  → HMAC signature verified
  → requestId checked against webhook_events (idempotency)
  → accountRef → membership_id → group_id resolved
  → contributions row created (status: paid)
  → group_wallets.balance incremented
  → trust_scores recalculated (+3 on-time, +1 streak)
  → notifications row created
  → audit_logs row created
```

### Contribution Flow (Card / Checkout)
```
Member taps "Pay Now"
  → Server Action creates payment_sessions row
  → Nomba checkout order created (amount in Kobo)
  → Member redirected to Nomba hosted checkout
  → Nomba fires payment_success webhook
  → Same reconciliation pipeline as above
```

### Payout Flow
```
Admin reviews payout queue → approves
  → group_wallets.balance checked (must cover amount)
  → Nomba bank lookup verifies recipient account name
  → Nomba transfer initiated (merchantTxRef = payout_id)
  → transfer.success webhook confirms
  → payouts.status = paid
  → group_wallets.balance decremented
  → Recipient notified + emailed
```

### Trust Score Engine
```
+3   per on-time payment
+1   per consecutive streak payment
-5   per late payment (streak reset)
-10  per missed payment (streak reset)
-15  per loan default
Clamped to [0, 100]
```

---

## Nomba Integration

**Track:** Virtual Accounts Infrastructure
**Sandbox base URL:** `https://sandbox.nomba.com/v1`
**Production base URL:** `https://api.nomba.com/v1`

### Authentication
OAuth2 `client_credentials` grant. Token cached in-memory for 55 minutes (valid 60). Every request requires the `accountId` header set to the **Parent Account ID**.

### Architecture Decision: Sub-Account Model
Nomba hackathon sub-accounts are **dashboard-provisioned only** (not creatable via API). AjoFlow uses **one pre-provisioned sub-account** as the platform's payment-receiving layer, with **per-membership static Virtual Accounts** layered on top. Group-level fund isolation is enforced in the **Supabase ledger**, not at the Nomba account level — this is the correct architecture given the hackathon's sub-account provisioning constraint.

### APIs Used

| API | Purpose | Sandbox Status |
|---|---|---|
| `POST /auth/token/issue` | OAuth token | ✅ Working |
| `POST /accounts/virtual` | Create static member VA | ✅ Working |
| `POST /checkout/order` | Card/transfer checkout | ✅ Working |
| `POST /checkout/order` (`tokenizeCard: true`) | Recurring card tokenization | ✅ Working (test card `5434621074252808`, PIN `0000`, OTP `000000`) |
| `POST /checkout/tokenized-card-payment` | Charge stored token | ✅ Working |
| `POST /transfers/bank/lookup` | Verify payout account name | ✅ Working |
| `POST /transfers/bank` | Send payout | ✅ Working |
| `POST /direct-debits` | Recurring mandate | ⚠️ Returns 404 in sandbox — implemented against documented contract, flagged for production enablement |
| Webhooks | `virtual_account.funded`, `payment_success`, `transfer.success` | ✅ Working — HMAC-SHA256 verified |

### Webhook Security
1. Raw body read before JSON parsing (signature must match exact bytes)
2. HMAC-SHA256 computed with `NOMBA_WEBHOOK_SECRET`, compared via `crypto.timingSafeEqual`
3. `requestId` checked against `webhook_events` table before processing — **duplicate webhooks are no-ops**
4. Every event stored raw before business logic runs (audit trail even on processing failure)
5. Handler always returns `200` after storage to prevent Nomba retry storms on business-logic errors

---

## AI System

**Provider:** Groq, multi-key round-robin with automatic failover (primary → secondary → tertiary on rate-limit/timeout/model-unavailable).
**Primary model:** `llama-3.3-70b-versatile` — strong financial reasoning + Nigerian Pidgin comprehension.
**Fallback model:** `llama-3.1-8b-instant` — used if the primary model errors mid-request.

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

NEXT_PUBLIC_APP_URL=
```

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
GET /api/debug/nomba-test
```

This runs one real token request, one real virtual account creation, and one real bank lookup against the configured Nomba environment, returning the raw response shapes. Use it to confirm field names like `data.access_token` and `data.bankAccountNumber` match what `src/lib/nomba/` expects — these were implemented against documented/team-confirmed contracts but have not been executed against a live response from this environment.

**⚠️ Delete `src/app/api/debug/nomba-test/route.ts` before any public/production deployment** — it is intentionally unauthenticated for quick manual verification only.

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

---

## Performance Optimizations

- Server Components by default; Client Components only where interactivity is required
- Next.js `Image` for optimized hero/avatar rendering
- Service Worker caches static assets and provides offline fallback
- Database indexes on every foreign key used in hot-path queries
- AI report caching prevents redundant Groq calls

---

## Roadmap

- [ ] Yoruba, Hausa, Igbo AI language support
- [ ] Group discovery + public join requests
- [ ] Direct debit mandates (pending Nomba sandbox enablement)
- [ ] PostHog analytics integration
- [ ] Sentry error monitoring
- [ ] Push notification delivery via service worker

---

## License

MIT — built for the Nomba Hackathon 2026.

Bank logos in `public/bank-logos/` are sourced from the [wovenfinance/cdn](https://github.com/wovenfinance/cdn) repository (MIT licensed) — see `public/bank-logos/LICENSE.txt`.

---

**Built by Emmanuel Ariyo (Ememzyvisuals) · Axiveri**
