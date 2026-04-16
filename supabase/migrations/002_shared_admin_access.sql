-- ============================================================
-- 002_shared_admin_access.sql
-- Any authenticated user is an admin; drop owner_email scoping.
-- owner_email column is preserved as a "created by" record.
-- ============================================================

-- Projects ----------------------------------------------------
drop policy if exists "admin_insert_project" on projects;
drop policy if exists "admin_update_project" on projects;
drop policy if exists "admin_delete_project" on projects;

create policy "admin_insert_project" on projects
  as permissive
  for insert
  to authenticated
  with check (true);

create policy "admin_update_project" on projects
  as permissive
  for update
  to authenticated
  using (true)
  with check (true);

create policy "admin_delete_project" on projects
  as permissive
  for delete
  to authenticated
  using (true);

-- Annotations -------------------------------------------------
drop policy if exists "admin_update_annotations" on annotations;
drop policy if exists "admin_delete_annotations" on annotations;

create policy "admin_update_annotations" on annotations
  as permissive
  for update
  to authenticated
  using (true)
  with check (true);

create policy "admin_delete_annotations" on annotations
  as permissive
  for delete
  to authenticated
  using (true);

-- Replies -----------------------------------------------------
drop policy if exists "admin_update_replies" on replies;
drop policy if exists "admin_delete_replies" on replies;

create policy "admin_update_replies" on replies
  as permissive
  for update
  to authenticated
  using (true)
  with check (true);

create policy "admin_delete_replies" on replies
  as permissive
  for delete
  to authenticated
  using (true);
