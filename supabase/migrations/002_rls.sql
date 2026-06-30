-- ============================================================
-- AjoFlow – Row Level Security Policies
-- Run AFTER 001_schema.sql
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_virtual_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_cycles ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Group members can view member profiles"
  ON profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm1
      JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
        AND gm1.status = 'active' AND gm2.status = 'active'
    )
  );

-- ── Groups ────────────────────────────────────────────────────
CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = groups.id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update their groups"
  ON groups FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = groups.id AND user_id = auth.uid()
        AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- ── Group Memberships ─────────────────────────────────────────
CREATE POLICY "Users can view their own memberships"
  ON group_memberships FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Group admins can view all memberships"
  ON group_memberships FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
        AND gm.status = 'active'
    )
  );

CREATE POLICY "Admins can insert memberships"
  ON group_memberships FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
        AND gm.status = 'active'
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update memberships"
  ON group_memberships FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
        AND gm.status = 'active'
    )
  );

-- ── Group Wallets ─────────────────────────────────────────────
CREATE POLICY "Members can view their group wallets"
  ON group_wallets FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = group_wallets.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

-- ── Virtual Accounts ──────────────────────────────────────────
CREATE POLICY "Users can view their own virtual accounts"
  ON member_virtual_accounts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE id = member_virtual_accounts.membership_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can view all virtual accounts"
  ON member_virtual_accounts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm1
      JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
      WHERE gm2.id = member_virtual_accounts.membership_id
        AND gm1.user_id = auth.uid()
        AND gm1.role IN ('owner', 'admin')
        AND gm1.status = 'active'
    )
  );

-- ── Contributions ─────────────────────────────────────────────
CREATE POLICY "Members can view group contributions"
  ON contributions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = contributions.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create their own contributions"
  ON contributions FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE id = contributions.membership_id AND user_id = auth.uid()
    )
  );

-- ── Payout Accounts ───────────────────────────────────────────
CREATE POLICY "Users can manage their payout accounts"
  ON payout_accounts FOR ALL USING (user_id = auth.uid());

-- ── Payouts ───────────────────────────────────────────────────
CREATE POLICY "Members can view group payouts"
  ON payouts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = payouts.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage payouts"
  ON payouts FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = payouts.group_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

CREATE POLICY "Admins can update payouts"
  ON payouts FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = payouts.group_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- ── Loan Requests ─────────────────────────────────────────────
CREATE POLICY "Members can view group loan requests"
  ON loan_requests FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = loan_requests.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Members can create loan requests"
  ON loan_requests FOR INSERT WITH CHECK (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = loan_requests.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

-- ── Trust Scores ──────────────────────────────────────────────
CREATE POLICY "Members can view group trust scores"
  ON trust_scores FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm1
      JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
      WHERE gm2.id = trust_scores.membership_id
        AND gm1.user_id = auth.uid() AND gm1.status = 'active'
    )
  );

-- ── Group Posts ───────────────────────────────────────────────
CREATE POLICY "Members can view group posts"
  ON group_posts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = group_posts.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Members can create posts"
  ON group_posts FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = group_posts.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Authors and admins can update posts"
  ON group_posts FOR UPDATE USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = group_posts.group_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- ── Post Comments ─────────────────────────────────────────────
CREATE POLICY "Members can view comments"
  ON post_comments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_posts gp
      JOIN group_memberships gm ON gp.group_id = gm.group_id
      WHERE gp.id = post_comments.post_id
        AND gm.user_id = auth.uid() AND gm.status = 'active'
    )
  );

CREATE POLICY "Members can post comments"
  ON post_comments FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_posts gp
      JOIN group_memberships gm ON gp.group_id = gm.group_id
      WHERE gp.id = post_comments.post_id
        AND gm.user_id = auth.uid() AND gm.status = 'active'
    )
  );

-- ── Notifications ─────────────────────────────────────────────
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ── Group Invites ─────────────────────────────────────────────
CREATE POLICY "Admins can manage invites"
  ON group_invites FOR ALL USING (
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = group_invites.group_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

CREATE POLICY "Anyone can view invite by token"
  ON group_invites FOR SELECT USING (TRUE);

-- ── AI Reports ────────────────────────────────────────────────
CREATE POLICY "Members can view group AI reports"
  ON ai_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = ai_reports.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );

-- ── Payment Sessions ──────────────────────────────────────────
CREATE POLICY "Users can view their payment sessions"
  ON payment_sessions FOR SELECT USING (user_id = auth.uid());

-- ── Webhook Events – service role only ───────────────────────
-- Webhooks are processed server-side with service role, no user RLS needed
CREATE POLICY "Service role manages webhooks"
  ON webhook_events FOR ALL USING (auth.role() = 'service_role');

-- ── Audit Logs – service role only ────────────────────────────
CREATE POLICY "Service role manages audit logs"
  ON audit_logs FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their audit logs"
  ON audit_logs FOR SELECT USING (user_id = auth.uid());

-- ── Payment Cycles ────────────────────────────────────────────
CREATE POLICY "Members can view payment cycles"
  ON payment_cycles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = payment_cycles.group_id
        AND user_id = auth.uid() AND status = 'active'
    )
  );
