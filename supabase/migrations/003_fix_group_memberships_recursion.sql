-- ============================================================
-- AjoFlow — Fix infinite recursion in group_memberships RLS
-- Run AFTER 002_rls.sql
--
-- Root cause: policies ON group_memberships were checking admin
-- status via "SELECT 1 FROM group_memberships gm WHERE ...".
-- That inner SELECT re-triggers RLS on group_memberships itself,
-- which re-runs the same policy → infinite recursion.
--
-- Fix: move the admin check into a SECURITY DEFINER function.
-- SECURITY DEFINER runs as the function owner and bypasses RLS
-- for its internal query, so the recursion loop is broken.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_group_admin(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_group_admin(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_group_admin(uuid, uuid) TO authenticated;

-- ── Drop the recursive policies ─────────────────────────────────
DROP POLICY IF EXISTS "Group admins can view all memberships" ON group_memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON group_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON group_memberships;

-- ── Recreate them using the SECURITY DEFINER function ───────────
CREATE POLICY "Group admins can view all memberships"
  ON group_memberships FOR SELECT USING (
    public.is_active_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Admins can insert memberships"
  ON group_memberships FOR INSERT WITH CHECK (
    public.is_active_group_admin(group_id, auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update memberships"
  ON group_memberships FOR UPDATE USING (
    public.is_active_group_admin(group_id, auth.uid())
  );

-- "Users can view their own memberships" (user_id = auth.uid()) is untouched —
-- it never referenced group_memberships internally, so it was never the problem.
