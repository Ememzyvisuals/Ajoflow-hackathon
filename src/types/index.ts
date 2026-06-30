// ============================================================
// AjoFlow – Database Types
// Generated from Supabase schema
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type GroupType = "rotational" | "target_savings" | "cooperative" | "investment";
export type ContributionFrequency = "daily" | "weekly" | "monthly";
export type GroupStatus = "active" | "paused" | "completed" | "cancelled";
export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "active" | "inactive" | "suspended";
export type ContributionStatus = "pending" | "paid" | "late" | "failed";
export type PayoutStatus = "pending" | "approved" | "processing" | "paid" | "failed";
export type LoanStatus = "pending" | "approved" | "rejected" | "disbursed" | "repaid" | "defaulted";
export type NotificationType =
  | "contribution_due"
  | "contribution_paid"
  | "contribution_missed"
  | "invitation_received"
  | "payout_received"
  | "loan_approved"
  | "loan_rejected"
  | "announcement_posted"
  | "trust_score_changed"
  | "member_joined"
  | "payout_approved";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type WebhookEventType = "payment_success" | "virtual_account.funded" | "transfer.success";

// ── Profile ──────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  language: "en" | "pidgin";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

// ── Group ─────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  type: GroupType;
  contribution_amount: number;
  contribution_frequency: ContributionFrequency;
  start_date: string | null;
  status: GroupStatus;
  admin_id: string;
  payout_mode: "auto" | "manual_approval";
  invite_code: string;
  created_at: string;
  updated_at: string;
}

// ── Group Membership ─────────────────────────────────────────
export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  status: MemberStatus;
  position: number | null;
  created_at: string;
}

// ── Member Virtual Account ────────────────────────────────────
export interface MemberVirtualAccount {
  id: string;
  membership_id: string;
  account_number: string;
  bank_name: string;
  account_reference: string;
  account_name: string;
  status: "active" | "suspended";
  created_at: string;
}

// ── Group Wallet ─────────────────────────────────────────────
export interface GroupWallet {
  id: string;
  group_id: string;
  balance: number;
  total_received: number;
  total_paid_out: number;
  nomba_account_ref: string | null;
  last_updated: string;
  created_at: string;
}

// ── Contribution ─────────────────────────────────────────────
export interface Contribution {
  id: string;
  membership_id: string;
  group_id: string;
  amount: number;
  status: ContributionStatus;
  due_date: string | null;
  paid_at: string | null;
  transaction_reference: string | null;
  payment_method: "card" | "transfer" | null;
  cycle_id: string | null;
  nomba_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Payout Account ────────────────────────────────────────────
export interface PayoutAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_code: string;
  is_default: boolean;
  created_at: string;
}

// ── Payout ────────────────────────────────────────────────────
export interface Payout {
  id: string;
  group_id: string;
  cycle_id: string | null;
  recipient_id: string;
  amount: number;
  status: PayoutStatus;
  payout_account_id: string | null;
  nomba_transfer_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  reference: string;
  created_at: string;
}

// ── Loan Request ──────────────────────────────────────────────
export interface LoanRequest {
  id: string;
  group_id: string;
  member_id: string;
  amount: number;
  reason: string | null;
  status: LoanStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

// ── Trust Score ───────────────────────────────────────────────
export interface TrustScore {
  id: string;
  membership_id: string;
  score: number;
  on_time_count: number;
  late_count: number;
  missed_count: number;
  streak: number;
  last_updated: string;
}

// ── Group Post ────────────────────────────────────────────────
export interface GroupPost {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  type: "announcement" | "post";
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

// ── Post Comment ──────────────────────────────────────────────
export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

// ── Notification ──────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data: Json | null;
  created_at: string;
}

// ── Group Invite ──────────────────────────────────────────────
export interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  email: string | null;
  token: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

// ── Webhook Event ─────────────────────────────────────────────
export interface WebhookEvent {
  id: string;
  request_id: string;
  event_type: string;
  payload: Json;
  signature: string;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

// ── Audit Log ─────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Json | null;
  ip_address: string | null;
  created_at: string;
}

// ── AI Report ─────────────────────────────────────────────────
export interface AiReport {
  id: string;
  group_id: string;
  type: "trust_report" | "health_report" | "payout_recommendation" | "risk_alert";
  content: string;
  language: "en" | "pidgin";
  generated_at: string;
  cached_until: string;
}

// ── Payment Session ───────────────────────────────────────────
export interface PaymentSession {
  id: string;
  user_id: string;
  group_id: string;
  membership_id: string;
  order_reference: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "expired";
  checkout_url: string | null;
  nomba_order_ref: string | null;
  created_at: string;
  expires_at: string;
}

// ── Settings ──────────────────────────────────────────────────
export interface Settings {
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
}

// ── Nomba Token Cache (in-memory) ─────────────────────────────
export interface NombaTokenCache {
  access_token: string;
  expires_at: number; // Unix ms
}

// ── Extended types (with joins) ───────────────────────────────
export interface GroupWithMembership extends Group {
  membership?: GroupMembership;
  wallet?: GroupWallet;
  member_count?: number;
}

export interface MembershipWithProfile extends GroupMembership {
  profile: Profile;
  trust_score?: TrustScore;
  virtual_account?: MemberVirtualAccount;
}

export interface ContributionWithMember extends Contribution {
  membership: {
    user_id: string;
    profile: Pick<Profile, "id" | "full_name" | "avatar_url" | "email">;
  };
}
