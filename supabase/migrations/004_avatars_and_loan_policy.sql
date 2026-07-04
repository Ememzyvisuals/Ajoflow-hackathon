-- ============================================================
-- AjoFlow — 004: Avatar storage bucket + missing loan policy
-- Run AFTER 003_fix_group_memberships_recursion.sql
-- ============================================================

-- ── Avatars storage bucket ──────────────────────────────────────
-- profiles.avatar_url already exists in the schema, but no bucket
-- was ever created for it — that's why upload has never worked.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can view avatars (public bucket, needed to render other members' photos)
create policy "Avatars are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can only upload/update/delete a file inside a folder named after their own user id
-- (path convention: avatars/<user_id>/<filename>)
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Missing loan_requests UPDATE policy ─────────────────────────
-- Admins had no way to approve/reject loans — there was no UPDATE
-- policy on loan_requests at all before this.
create policy "Admins can decide loan requests"
  on loan_requests for update using (
    public.is_active_group_admin(group_id, auth.uid())
  );
