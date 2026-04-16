# Admin List Upgrades + Edit Project Page — Design

**Date:** 2026-04-16
**Status:** Approved

## Problem

The admin project detail page does too much. The Collaborators editor, the filter bar, and the annotations table all share the same screen, and the filter controls sit in their own row above the table where their link to specific columns isn't obvious (Julia didn't notice the existing Status/Author filters). Meanwhile, editing the project itself (name, domains) happens in a modal that's too small to also host collaborator management.

We want to restructure around the primary job — reviewing and triaging comments — and move project configuration onto its own screen.

## Goals

1. Make the project detail page focus purely on the comments list.
2. Give the annotations table first-class filtering and sorting UX, attached to the table itself.
3. Consolidate all project configuration (name, domains, collaborators) on a dedicated full-page editor.

## Non-goals

- Multi-column sort or Shift-click behavior.
- Pagination or virtual scrolling.
- A comment-body filter (current behavior filters by author only; that stays).
- Any change to RLS, the Edge Function, the embed script, CSV export, or how collaborators are persisted. This is a UI restructure only.
- Changing the `/projects.html` list screen.

## Design

### 1. Edit Project full-page view

New file: `admin/edit-project.html`. Route: `admin/edit-project.html?id=<project_id>`.

Layout (top to bottom):
- Header matching the rest of the admin: `MarkUX` link back to `projects.html`, plus `Sign Out`. No Embed/Export/Delete buttons here — those stay on `project.html`.
- `<h2>` showing `Editing: <project name>`.
- **Project fields form** (unchanged logic, rehomed from the current `#edit-modal` in `project.html`):
  - Name (`required`)
  - Allowed Domains (comma-separated)
  - Save button (inline error div for failures)
  - "Back to project" link (href `project.html?id=<project_id>`)
- **Collaborators section** (the same card rendered today by `renderCollaboratorsSection`), placed below the form with a horizontal rule between.

Navigation:
- The existing `Edit Project` button in `project.html`'s header changes behavior: instead of opening the modal, it navigates to `edit-project.html?id=<project_id>`.
- Saving the project fields stays on the page (so collaborator edits can follow without a round-trip). A successful save updates the `<h2>` heading and shows a light "Saved" confirmation, then clears it after ~2 seconds.
- Navigating back is done via the "Back to project" link or the `MarkUX` / project-name breadcrumb.

Script organization: `edit-project.html` follows the same pattern as `project.html` — an inline `<script type="module">` at the bottom that imports `requireAuth`, `signOut`, `loadProject`, `updateProject`, and `renderCollaboratorsSection`. No new JS module file. Keeps symmetry with the rest of the admin pages and avoids introducing a one-page-helper file.

Sub-interactions:
- The existing Collaborator add/edit modal (currently in `project.html:104-124`) moves verbatim to `edit-project.html`. It remains a modal inside this page — it's a sub-interaction within the collaborators list and doesn't need to be flattened.
- `admin/js/collaborators.js` is imported from `edit-project.html` instead of `project.html`. Its exported API stays the same; no changes required in the module.

Clean-up in `project.html`:
- Remove `#edit-modal` and its event handlers.
- Remove the `#collaborators-section` card and the `#collaborator-modal`.
- Remove the `renderCollaboratorsSection` import and call.
- Remove `updateProject` and `deleteProject` imports from `project-detail.js` **only if** `project.html` no longer uses them. Delete stays on `project.html` (the Delete button in the header). Update moves to `edit-project.html`. Adjust imports per actual usage after the edit.

### 2. Filter row under the table header

In `project.html`, the filter controls move into the table:

- Delete the existing `.filters` div (`project.html:40-48`).
- The annotations `<table>` gets a second `<tr>` inside `<thead>`, directly below the column-labels row. That row contains a `<td>` (or `<th class="filter-cell">` — whichever is cleaner with existing table CSS) per column:
  - Page: existing page-URL `<select id="filter-page">`.
  - Author: existing `<input id="filter-author">` (text, substring filter).
  - Comment: empty cell (no comment filter, per non-goals).
  - Status: existing `<select id="filter-status">`.
  - Date: empty cell.
  - Action + View: empty cells.
- IDs are preserved so the existing `render()` event wiring keeps working unchanged.
- `admin/css/admin.css` gets a small tweak: controls inside the filter row need to fit their column, so set `.filter-cell select`, `.filter-cell input` to `width: 100%`, and give the filter row a subtle background (e.g., same as `.table th` background) so it reads as table-chrome.

No JS behavior change — the filter `change` / `input` handlers in `project.html:265-269` keep firing and call `render()` the same way.

### 3. Sortable columns

Five data columns are sortable: Page, Author, Comment, Status, Date. Action + View are not.

**Interaction:**
- Clicking a sortable column header toggles sort on that column.
  - First click on a new column: sort ascending.
  - Second click on the same column: flip to descending.
  - Clicking a different column switches to that column, ascending.
- Visual indicator: ` ▲` appended to the active column's header label when ascending, ` ▼` when descending. Inactive sortable columns show no arrow but their headers are styled as clickable (cursor pointer, slightly bolder on hover).
- Default sort on page load: **Date descending**, matching the current behavior.

**Data:**
- `loadAnnotations(projectId, filters)` gains a sort parameter: `loadAnnotations(projectId, filters, sort)` where `sort = { column, direction }`. `column` is one of the five DB fields; `direction` is `'asc'` or `'desc'`.
- Column → DB field map:
  - Page → `page_url`
  - Author → `author_name`
  - Comment → `comment`
  - Status → `status`
  - Date → `created_at`
- The function's hardcoded `.order("created_at", { ascending: false })` is replaced with `.order(sort.column, { ascending: sort.direction === 'asc' })`. If `sort` is not provided, it defaults to `{ column: 'created_at', direction: 'desc' }` (preserves current behavior for any other caller).
- Filters and sort compose: both modify the same Supabase query builder chain.

**State:**
- Current sort lives in a local `sortState` variable in the `project.html` inline script, alongside the existing filter state.
- Each column header's click handler updates `sortState` and calls `render()`.
- No persistence across reloads (URL params / localStorage) — that's out of scope.

## Files

New:
- `admin/edit-project.html` (full-page editor)

Modified:
- `admin/project.html` — remove edit-project modal, collaborators section, collaborator modal, renderCollaboratorsSection wiring; change Edit button to navigate; move filter controls into a `<thead>` row; wire sort-on-click for 5 headers.
- `admin/js/project-detail.js` — `loadAnnotations` accepts `sort` parameter and uses it; `renderAnnotationRow` unchanged.
- `admin/css/admin.css` — filter-row styles (`.filter-cell` width/background), sortable-header styles (cursor, hover, arrow indicator).

Unchanged:
- `admin/js/collaborators.js`, `admin/js/supabase-client.js`, `admin/js/auth.js`, `admin/js/projects-list.js`, `admin/js/csv-export.js`, `admin/js/embed-snippet.js`, `admin/js/visual-replay.js`.
- `admin/index.html`, `admin/projects.html`.
- Everything under `src/` (embed script), `supabase/`, and `dist/`.

## Testing

Verified manually in the deployed admin after each commit, using Playwright MCP where automation is useful:

1. From a project detail page, click Edit Project → navigates to `edit-project.html?id=X`. Editing name saves and stays on the page. Going back to `project.html` via the Back link shows the updated name.
2. On `edit-project.html`, the Collaborators section loads, add/edit collaborator modal still opens and saves.
3. On `project.html`, the filter row renders inside the table below the header row. Status dropdown, page dropdown, and author text input all still filter the list.
4. Sort: click each of the five headers. Arrow indicator appears, direction toggles on re-click, rows reorder. Sort + filter compose (e.g., filter by Status = open, sort by Author asc — both hold).
5. Nothing on the `projects.html` list screen regressed.
6. No console errors from `project-detail.js`, `collaborators.js`, or the inline scripts.

## Rollback

Each change is a separate commit. Reverting all three commits restores the previous UI exactly. No schema changes, no data migration.

## Open Questions

None.
