# AjoFlow — System Architecture

## High-Level System Diagram

```mermaid
graph TD
    A[Member - Mobile/PWA] -->|HTTPS| B[Next.js App Router]
    B --> C[Server Actions]
    B --> D[Route Handlers]
    C --> E[(Supabase PostgreSQL)]
    D --> F[Nomba API]
    F -->|Webhook| G[/api/webhooks/nomba]
    G --> H[HMAC Verify]
    H --> I[Idempotency Check]
    I --> E
    E --> J[Trust Engine]
    E --> K[Notification System]
    K --> L[Resend Email]
    B --> M[Groq AI Router]
    M --> N[Primary Endpoint]
    M --> O[Secondary Endpoint]
    M --> P[Tertiary Endpoint]
```

## Frontend Architecture

Next.js 15 App Router with three route groups:
- `(auth)` — public login/signup, no sidebar
- `(dashboard)` — authenticated shell with Sidebar (desktop) / MobileNav (mobile)
- Root-level `onboarding`, `invite/[token]` — special-case flows outside the dashboard shell

Server Components fetch data directly via Supabase server client. Client Components (`"use client"`) are used only for forms, modals, and the AI chat interface.

## Backend Architecture

No separate backend service — Next.js Server Actions (`features/*/actions.ts`) and Route Handlers (`app/api/*`) form the entire backend. This eliminates a network hop between frontend and backend logic while keeping all secrets server-side.

```
Client Component
  → Server Action (features/payments/actions.ts)
    → Zod validation
    → Supabase service client (bypasses RLS for trusted server logic)
    → Nomba API call
    → Database write
    → revalidatePath()
  → Client re-renders with fresh data
```

## Database Architecture

PostgreSQL via Supabase. 20 tables, full RLS coverage. See `docs/database.md` for table-by-table detail.

Auto-provisioning triggers:
- `handle_new_user()` — `auth.users` insert → `profiles` row
- `create_trust_score_on_membership()` — `group_memberships` insert → `trust_scores` row (score: 100)
- `create_group_wallet_on_group()` — `groups` insert → `group_wallets` row (balance: 0)

## Authentication Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant S as Supabase Auth
    participant M as Middleware
    participant D as Dashboard

    U->>S: signUp() / signInWithOAuth() / signInWithOtp()
    S-->>U: Session cookie set
    U->>M: Request /dashboard
    M->>S: getUser()
    S-->>M: user object
    M->>S: SELECT phone FROM profiles
    alt phone is null
        M-->>U: Redirect /onboarding
    else phone exists
        M-->>D: Allow request
    end
```

## Group Membership Flow Diagram

```mermaid
sequenceDiagram
    participant A as Admin
    participant S as Server Action
    participant N as Nomba API
    participant DB as Supabase

    A->>S: generateInviteLink(groupId)
    S->>DB: INSERT group_invites
    DB-->>A: invite URL

    participant Inv as Invitee
    Inv->>S: acceptGroupInvite(token)
    S->>DB: INSERT group_memberships
    S->>N: createVirtualAccount(accountRef)
    N-->>S: VA details
    S->>DB: INSERT member_virtual_accounts
    S->>DB: INSERT notifications (for admins)
```

## Contribution Flow Diagram (Virtual Account)

```mermaid
sequenceDiagram
    participant M as Member
    participant Bank as Member's Bank
    participant N as Nomba
    participant W as Webhook Handler
    participant DB as Supabase

    M->>Bank: Transfer to Virtual Account
    Bank->>N: Settle funds
    N->>W: POST virtual_account.funded
    W->>W: Verify HMAC signature
    W->>DB: Check webhook_events.request_id
    alt already processed
        W-->>N: 200 OK (no-op)
    else new event
        W->>DB: Lookup VA → membership → group
        W->>DB: INSERT contributions
        W->>DB: UPDATE group_wallets.balance
        W->>DB: UPDATE trust_scores
        W->>DB: INSERT notifications
        W->>DB: INSERT audit_logs
        W-->>N: 200 OK
    end
```

## Webhook Processing Flow

```mermaid
flowchart TD
    A[Webhook POST received] --> B[Read raw body as text]
    B --> C{Signature valid?}
    C -->|No| D[401 Unauthorized]
    C -->|Yes| E[Parse JSON]
    E --> F{request_id seen before?}
    F -->|Yes, processed| G[200 OK - no-op]
    F -->|No| H[Store raw event, processed=false]
    H --> I{event_type}
    I -->|virtual_account.funded| J[Reconcile contribution]
    I -->|payment_success| K[Reconcile checkout]
    I -->|transfer.success| L[Mark payout paid]
    J --> M[Mark processed=true]
    K --> M
    L --> M
    M --> N[200 OK]
```

## Trust Score Engine Flow

```mermaid
flowchart LR
    A[Contribution Event] --> B{On time?}
    B -->|Yes| C[+3 score, +1 streak]
    B -->|Late| D[-5 score, streak=0]
    B -->|Missed| E[-10 score, streak=0]
    C --> F[Clamp 0-100]
    D --> F
    E --> F
    F --> G[UPDATE trust_scores]
    G --> H{Delta >= 5?}
    H -->|Yes| I[Create notification]
    H -->|No| J[Silent update]
```

## Loan Approval Flow

```mermaid
sequenceDiagram
    participant M as Member
    participant A as Admin
    participant DB as Supabase

    M->>DB: requestLoan(groupId, amount, reason)
    DB-->>A: Visible in loan_requests (pending)
    A->>DB: decideLoan(loanId, approved/rejected)
    DB->>DB: UPDATE loan_requests.status
    DB->>DB: INSERT notifications (member)
    DB->>DB: INSERT audit_logs
```

## Payout Flow Diagram

```mermaid
sequenceDiagram
    participant A as Admin
    participant DB as Supabase
    participant N as Nomba

    A->>DB: approvePayout(payoutId)
    DB->>DB: Check group_wallets.balance >= amount
    DB->>N: POST /transfers/bank/lookup
    N-->>DB: Verified account name
    DB->>N: POST /transfers/bank (merchantTxRef=payoutId)
    N-->>DB: transactionId
    DB->>DB: UPDATE payouts.status=processing
    N->>DB: Webhook transfer.success
    DB->>DB: UPDATE payouts.status=paid
    DB->>DB: UPDATE group_wallets.balance -= amount
    DB->>DB: Email + in-app notification
```

## Security Layer Diagram

```mermaid
graph TD
    A[Request] --> B{Has session cookie?}
    B -->|No| C[Redirect /login]
    B -->|Yes| D[Supabase getUser]
    D --> E{Route requires RLS?}
    E -->|Yes| F[Postgres RLS policy check]
    E -->|No, Server Action| G[Service role - server-only secret]
    F --> H[Query executes if policy passes]
    G --> H
    H --> I[Response]

    J[Incoming Webhook] --> K[HMAC-SHA256 verify]
    K -->|Fail| L[401]
    K -->|Pass| M[Idempotency check]
    M --> H
```

## Infrastructure / Deployment Architecture

```
GitHub Repo (Ememzyvisuals/Ajoflow-hackathon)
        │
        ▼
   Vercel (build + deploy on push to main)
        │
        ├── Edge Middleware (session refresh, onboarding gate)
        ├── Server Components / Actions (Node.js runtime)
        └── Static assets (icons, manifest, service worker)
        │
        ▼
   Supabase (managed Postgres + Auth + RLS)
        │
        ▼
   Nomba API (sandbox/production via NOMBA_ENV)
        │
        ▼
   Groq API (3-key failover pool)
   Resend API (transactional email)
```
