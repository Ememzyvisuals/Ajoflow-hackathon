-- ============================================================
-- AjoFlow — 006: Payment issue reports with receipt upload
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_issue_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES group_memberships(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  receipt_path TEXT,             -- path in the private 'receipts' storage bucket; nulled out after decision
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_issue_reports_group ON payment_issue_reports(group_id);
CREATE INDEX IF NOT EXISTS idx_payment_issue_reports_status ON payment_issue_reports(status);

ALTER TABLE payment_issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter can view own reports"
  ON payment_issue_reports FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Group admins can view reports"
  ON payment_issue_reports FOR SELECT USING (
    public.is_active_group_admin(group_id, auth.uid())
  );

-- All writes go through service-role Server Actions (file upload handling,
-- signed URL generation, deletion) — no direct client insert/update policy needed.

-- ── Private receipts bucket ──────────────────────────────────────
-- Unlike avatars, this is NOT public — receipts contain private financial
-- info and must only ever be accessed via short-lived signed URLs
-- generated server-side after an admin-permission check.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- No storage.objects policies for 'receipts' — all access (upload, signed
-- URL, delete) goes through service-role Server Actions in
-- src/features/payments/reconciliation.ts, which enforce group-admin
-- permission checks in application code before touching the bucket.
