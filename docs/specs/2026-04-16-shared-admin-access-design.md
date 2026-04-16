# Shared Admin Access — Design

**Date:** 2026-04-16
**Status:** Approved

## Problem

Every Supabase auth user currently sees and edits only the projects where `projects.owner_email` matches their login email. RLS policies on `projects`, `annotations`, and `replies` all join through `owner_email` for CRUD authorization.

We want multiple people to collaborate on the same projects without per-project ownership plumbing. Onboarding a second admin today would require either impersonating the first admin's account or manually rewriting `owner_email` on every project.

## Goal

Any authenticated Supabase user can read, create, update, and delete every project, annotation, and reply. Account creation remains gated by the Supabase dashboard — we trust whoever has an auth account.

## Non-goals

- No `admins` table, role column, or allowlist. Authenticated = admin.
- No per-project sharing, teams, or permissions.
- No changes to anonymous read paths (embed script, public annotation views).
- No changes to the write-proxy Edge Function.

## Design

### Schema

Keep `projects.owner_email` as-is: `text not null`, populated on insert from `auth.email()`. It becomes a historical "created by" record, no longer used for authorization. No migration needed for the column itself.

### RLS Policies

New migration: `supabase/migrations/002_shared_admin_access.sql`.

Drops seven email-scoped policies and recreates each one restricted to the `authenticated` role with an unconditional `using` / `with check`:

- `projects` — `admin_insert_project`, `admin_update_project`, `admin_delete_project`
- `annotations` — `admin_update_annotations`, `admin_delete_annotations`
- `replies` — `admin_update_replies`, `admin_delete_replies`

Each new policy is scoped `to authenticated`, matching the clause structure of the action it replaces:

- `INSERT` policies use `with check (true)` only.
- `UPDATE` policies use `using (true)` and `with check (true)`.
- `DELETE` policies use `using (true)` only.

The anon read policies (`anon_read_project`, `anon_read_annotations`, `anon_read_replies`, `anon_read_screenshots`) are not touched.

The migration is idempotent: each `create policy` is preceded by `drop policy if exists`, so it's safe to re-apply.

### Client Changes

One change: `admin/js/projects-list.js`.

- `loadProjects()` currently filters `.eq("owner_email", user.email)` (line 13). Remove that filter so the project list returns every project RLS lets the user see (which is now all of them).
- `createProject()` continues to set `owner_email: user.email` on insert (line 51). No change.

No other admin JS changes. `project-detail.js`, `collaborators.js`, `auth.js`, etc. either already work for any authenticated user or read by project ID.

### Unaffected

- **Write-proxy Edge Function** — authenticates with the service role key and bypasses RLS. Unchanged.
- **Embed script** (`dist/markux.js`) — anon reads only, governed by the unchanged anon policies.
- **Storage bucket** (`screenshots`) — anon-read policy only; writes go through the Edge Function. Unchanged.
- **Auth flow** — sign-in, session handling, and the admin-only sign-in page (`admin/index.html`) are unchanged. There's still no public sign-up.

## Testing

Verify via Playwright after deployment:

1. Create a second Supabase auth user via the dashboard.
2. Sign in as the second user at `https://jmayhugh.github.io/markux/admin/` — the project list shows every project, including those with `owner_email` set to the first user.
3. Open a project created by the first user, resolve an annotation and post an admin reply. Confirm both writes succeed.
4. On an installed site (e.g., one of the teachengineering.org wireframes), confirm anon reads (loading existing annotations/replies) still work with no regression.
5. Verify the embed script can still create new annotations via the Edge Function.

## Rollback

Revert `002_shared_admin_access.sql` by running a counter-migration that restores the original `auth.email() = owner_email` policies from `001_initial_schema.sql`. `owner_email` data was never lost, so rollback is clean.

## Open Questions

None.
