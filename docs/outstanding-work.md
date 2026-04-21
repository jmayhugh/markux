# MarkUX — Outstanding Work

Snapshot taken 2026-04-16, amended 2026-04-21 with the feedback-status work. Groups open items by priority. Links point to specs/plans where they exist.

---

## Done 2026-04-21

Reference only — shipped on `main` and live.

- **URL normalization drops all query params.** `normalizeUrl` now clears `url.search` unconditionally; annotations on `/foo?q=x`, `/foo?q=y`, and `/foo` all group onto a single `/foo` thread. One-shot SQL backfill (`update annotations set page_url = split_part(page_url, '?', 1) where page_url like '%?%'`) migrated historical rows so old comments surface on the base URL.
  - Spec: `docs/specs/2026-04-21-drop-query-params-in-url-normalize-design.md`
  - Plan: `docs/superpowers/plans/2026-04-21-drop-query-params-in-url-normalize.md`

- **Third annotation status: Feedback.** Added `feedback` to the `annotations.status` CHECK constraint (migration 003, applied via dashboard). Replaced the static status badge + separate Resolve/Reopen button with a custom colored-pill dropdown (`StatusSelect`) in both the admin and the embedded widget. Admin table loses the Reopen/Resolve action column, gains a Feedback filter option, and the Status header is no longer sortable. Widget gets a yellow pin variant for Feedback; sidebar badge counts Feedback as active. Palette shifted Open from amber to red to form a red/yellow/green traffic light with Resolved unchanged.
  - Spec: `docs/specs/2026-04-21-feedback-status-design.md`
  - Plan: `docs/superpowers/plans/2026-04-21-feedback-status.md`
  - Migration: `supabase/migrations/003_add_feedback_status.sql` (applied via dashboard — same migration-tracking workaround as 002)

---

## Done 2026-04-16

Reference only — these are shipped on `main` and live.

- **Shared admin access.** Any authenticated Supabase user has full CRUD on every project/annotation/reply. `owner_email` kept as a created-by record only.
  - Spec: `docs/specs/2026-04-16-shared-admin-access-design.md`
  - Plan: `docs/superpowers/plans/2026-04-16-shared-admin-access.md`
  - Migration: `supabase/migrations/002_shared_admin_access.sql` (applied via dashboard SQL editor — see migration-tracking item below)
- **Admin UI restructure.** Edit Project moved to a dedicated full page (`admin/edit-project.html`) that also hosts Collaborators. Filter row relocated into the annotations table `<thead>`. Four sortable columns (Page, Status, Author, Date) with caret indicators. Column order is now Page / Comment / Status / Author / Date / Reopen-Resolve / View. Custom-chevron filter selects with 6px radius + padding tuning; table body text at 14px; View link now a secondary button.
  - Spec: `docs/specs/2026-04-16-admin-list-and-edit-page-design.md`
  - Plan: `docs/superpowers/plans/2026-04-16-admin-list-and-edit-page.md`

---

## High priority

### Visual Replay / screenshot capture is broken

**Symptom:** Visual Replay view renders blank or "Screenshot unavailable" placeholders. Screenshots aren't being uploaded for new annotations.

**Likely root cause:** `src/screenshot.js` uses `html2canvas(document.body, { useCORS: true })`. On real content sites (e.g. teachengineering.org), cross-origin images paint into the canvas and taint it — `toDataURL()` then throws a `SecurityError`. `captureScreenshot()` silently swallows it with a generic warning, so the annotation still saves but with `screenshot_path = null`.

**Pick-up steps:**

1. **Diagnose first (1 min).** Change the `catch` in `src/screenshot.js` from `console.warn("MarkUX: screenshot capture failed")` to log the actual error:
   ```js
   } catch (err) {
     console.warn("MarkUX: screenshot capture failed", err);
     return null;
   }
   ```
   Rebuild (`npm run build`), deploy, reload an installed site, submit a test annotation, check console. Confirms or disproves the tainted-canvas theory.
2. **Pick a fix path.** Options discussed:
   - **A.** Swap to `html2canvas-pro` — community fork with better cross-origin handling. Drop-in replacement via `npm install`. Lowest effort.
   - **B.** Use the browser's `navigator.mediaDevices.getDisplayMedia` — reliable but prompts the user each time. Worse UX, better coverage.
   - **C.** Server-side capture — have the Edge Function (or a new one) visit the URL with headless Chrome and grab a screenshot. Most reliable, biggest change.

**Files:** `src/screenshot.js`, `src/index.js` (around line 173 where capture is invoked), `supabase/functions/write-proxy/index.ts` (`upload_screenshot` action) is unchanged.

---

## Medium priority

### Supabase migration tracking is out of sync with the remote

**Symptom:** `supabase db push` tries to re-apply `001_initial_schema.sql` and errors on `relation "projects" already exists`. The remote's `supabase_migrations.schema_migrations` table has no rows — the original schema was applied manually (via dashboard), not through the CLI, so the CLI thinks nothing has been pushed.

**Workaround used today:** Applied `002_shared_admin_access.sql` directly via the Supabase dashboard SQL editor.

**Pick-up steps:**

1. In the Supabase SQL editor, backfill the tracking table with both existing migrations:
   ```sql
   insert into supabase_migrations.schema_migrations (version)
   values ('001'), ('002')
   on conflict do nothing;
   ```
   (Adjust the `version` values to whatever the CLI expects — likely the timestamp prefix the CLI uses when it renames migrations. Inspect a fresh project to confirm the expected format.)
2. Run `supabase db push` locally; it should report "nothing to apply." From there, future migrations flow through the CLI normally.

---

### Shared-admin access — cross-user verification never run

**Symptom:** The RLS change is live, but the cross-admin Playwright test was skipped (credentials weren't shared). When Julia next creates a second admin account via the dashboard, a quick sanity check:

- Sign into the second account at `https://jmayhugh.github.io/markux/admin/`.
- Confirm the projects list shows every project, including ones owned by `julia.mayhugh@gmail.com`.
- Click into one of those projects, resolve or reopen an annotation, post an admin reply — confirm the writes succeed (no RLS-denied errors).

If any step fails, pull `supabase/migrations/002_shared_admin_access.sql` and confirm it actually applied (should see 7 policies on `projects`/`annotations`/`replies` scoped to `authenticated`).

---

## Low priority

### Code polish flagged during review but not applied

Minor suggestions from code reviewers during the session. All are safe to leave; track only if the underlying area is being touched again.

- `loadAnnotations` in `admin/js/project-detail.js` — if a caller passes `sort = {}`, `sort.column` is undefined. Current callers always pass a fully-populated object, so it's a latent footgun, not a bug. Trivial fix: `const column = sort.column || "created_at";` plus `sort = {}` in the signature.
- `allowed_domains.join` in `admin/edit-project.html` and `admin/project.html` — if a project row's `allowed_domains` is ever `null`, this throws with no visible error. DB column is `NOT NULL DEFAULT '{}'`, so it's inert today.
- `<a id="back-link" href="#">` on `admin/edit-project.html` is briefly wrong during the `loadProject` round-trip. Set the href before the await if you care.
- `.sort-label` span in sortable `<th>`s is unused in CSS/JS — could be a bare text node. Harmless.
- `captureScreenshot`'s generic warning — addressed as part of the Visual Replay diagnostic above.

---

## Future ideas (not scoped)

Things mentioned in passing or implied by the broader product direction. No design or plan yet.

- Magic-link auth for reviewers (so people don't have to create Supabase accounts).
- Drawing tools (v2 annotation experience — freehand markup over the captured screenshot).
- Pagination / search for projects with many annotations.
- Persisting filter + sort state in URL query params.
- Multi-column sort, Shift-click support.
