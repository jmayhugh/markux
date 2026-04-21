# Feedback status — design spec

**Date:** 2026-04-21
**Scope:** Add a third annotation status, `feedback`, alongside the existing `open` and `resolved`. Replace the binary Resolve/Reopen button with a color-coded custom dropdown that both displays and changes status, in the admin and the embedded widget.

---

## Motivation

Today an annotation is either `open` (needs attention) or `resolved` (done). There's no way to mark an annotation as paused — "I've looked at this and now I'm waiting on the reviewer before I can make further progress." Admins currently work around this by leaving annotations open, which overstates the actionable queue.

`feedback` captures the paused state: **progress is waiting on reviewer input.**

---

## Status semantics

| Status | Meaning |
|---|---|
| **Open** | Needs admin attention. (Default on create.) |
| **Feedback** | Admin is waiting on reviewer input. Paused from the admin's side. |
| **Resolved** | Done, no action needed. |

**Transitions:** all six are allowed (any → any). The dropdown never disables an option. Both admins (in the admin table) and reviewers (in the embedded widget) can change status — matching today's behavior for Resolve/Reopen.

**Reply behavior:** posting a reply does **not** auto-change status. Status changes are explicit clicks only.

---

## Color palette

The feedback addition prompts a small repaletting so each status gets its own color family (red / yellow / green — informally "traffic light"). Open's pill shifts from amber to red so yellow can belong to Feedback exclusively.

| Status | Pill background | Pill text | Pin |
|---|---|---|---|
| **Open** | `#fee2e2` (pale red) | `#991b1b` | `#dc2626` red (unchanged) |
| **Feedback** *(new)* | `#fef9c3` (pale yellow) | `#854d0e` | `#eab308` yellow |
| **Resolved** | `#d1fae5` green (unchanged) | `#065f46` (unchanged) | `#16a34a` green (unchanged) |

Pills use the existing `.status` shape: `display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500;`.

---

## Data model

New migration: `supabase/migrations/003_add_feedback_status.sql`.

```sql
alter table annotations drop constraint annotations_status_check;
alter table annotations add constraint annotations_status_check
  check (status in ('open', 'feedback', 'resolved'));
```

Default stays `'open'`. No data migration — existing rows keep their current values. RLS policies do not reference `status` and need no change.

**Deploy path:** apply via the Supabase dashboard SQL editor (migration tracking is still out of sync — tracked in `docs/outstanding-work.md`).

**Backend validation:** `supabase/functions/write-proxy/index.ts`'s `update_annotation_status` action already rejects unknown values — add `'feedback'` to its allowed-values list and redeploy with `supabase functions deploy write-proxy`.

---

## Custom dropdown: `StatusSelect`

A shared control used in both the admin and the widget. Replaces the static status badge + separate Resolve/Reopen button with a single clickable pill.

**Closed state:** pill-shaped button using the same shape and typography as today's `.status` badge. Background + text colors reflect the current status. Small chevron on the right edge indicates interactivity.

**Open state:** popover anchored below the button, 3 colored pill options stacked with a 4px gap. Current value is marked (subtle outline or check mark).

**Interaction:**
- Click pill → popover opens. Click outside / Esc / pick option → popover closes.
- Keyboard: Enter/Space to open, ↑/↓ to move selection, Enter to pick, Esc to cancel.
- On pick: fires an `onChange(newStatus)` callback. Caller updates the DB (via existing `updateAnnotationStatus` in admin, or existing write-proxy call in widget) and re-renders optimistically.

**Implementation note:** two copies of the component, not a shared module — one for the admin, one for the widget — matching the existing split between `admin/js/*` (served directly) and `src/ui/*` (bundled via esbuild into `dist/markux.js` with `markux-` scoping).

- `admin/js/components/status-select.js` — admin version
- `admin/css/admin.css` — admin styles (extends existing `.status` rules)
- `src/ui/status-select.js` — widget version
- `src/ui/styles.js` — widget styles (scoped with `markux-` prefix)

---

## Admin UI changes

### Annotations table (`admin/project.html`, `admin/js/project-detail.js`)

- **Status column** renders `StatusSelect` instead of a static `<span>` badge. The dropdown is both display and control.
- **Reopen-Resolve column removed.** Redundant with the interactive Status column.
- **Status column is no longer sortable** — clicking the header does nothing. (Sort by status isn't useful given only three values; the filter does the job.) Remove the `sortable` class, the sort caret, and the sort handler for this column.
- **Status filter dropdown** (in `<thead>`) gains a third option: `All / Open / Feedback / Resolved`. Default stays "All".

Column order (before → after):

- **Before:** Page / Comment / Status / Author / Date / Reopen-Resolve / View
- **After:** Page / Comment / Status (interactive) / Author / Date / View

### Projects list (`admin/js/projects-list.js`)

- Each project row shows **three count badges**: `X open / Y feedback / Z resolved`, each in its status color (pale red / pale yellow / pale green).
- Adds a third `select count` query per project (the function currently runs two). **Known cost:** N projects × 3 round-trips. Acceptable at current scale. If it becomes noticeable, collapse to a single `group by status` query. Flag, not a blocker.

### CSS updates

- `admin/css/admin.css`: update `.status-open` from amber (`#fef3c7` / `#92400e`) to pale red (`#fee2e2` / `#991b1b`). Add `.status-feedback` (pale yellow, `#fef9c3` / `#854d0e`).
- `src/ui/styles.js`: equivalent updates to `.markux-status-open` and new `.markux-status-feedback`. These styles are injected into the widget's shadow DOM.

### CSV export (`admin/js/csv-export.js`)

No code changes — the raw `a.status` value flows through. Feedback rows will export the literal `feedback` string.

### Visual Replay (`admin/js/visual-replay.js`)

The inline status pill next to each annotation currently uses a binary ternary. Extend to cover all three values so Feedback annotations render with the correct color.

---

## Widget (embedded) UI changes

### Sidebar (`src/ui/sidebar.js`)

- Each annotation row's status badge + toggle button → single `StatusSelect` dropdown (widget version).
- **Badge count** at the top of the sidebar changes from `status === "open"` to `status !== "resolved"`. Open + Feedback both count as "active" — the number reflects "things still in flight."
- **Annotation sort order** becomes Open → Feedback → Resolved (today: Open → Resolved).

### Pin markers (`src/ui/pin-marker.js`)

- Add a third pin SVG: `PIN_SVG_FEEDBACK`, same shape as open (filled pin, no check), fill `#eab308` (yellow).
- Update the status→SVG dispatch to cover all three values.

### Thread popover (`src/ui/thread-popover.js`)

- Status display becomes the `StatusSelect` dropdown. Changing status from inside the popover works the same as from the sidebar.

### `src/index.js`

- Two `.filter(a => a.status === "open")` call sites (badge count and sidebar list on status-change) become `.filter(a => a.status !== "resolved")`.
- The sort comparator that orders open before resolved becomes a three-way comparator (Open → Feedback → Resolved).

---

## Build and deploy

- `npm run build` regenerates `dist/markux.js`. Commit the rebuilt bundle; GitHub Pages serves `main`.
- `supabase functions deploy write-proxy` deploys the updated validation.
- Apply migration `003` via the dashboard SQL editor.

---

## Testing

**Playwright (`tests/integration/annotation-flow.test.js`):**

- From the admin, cycle an annotation Open → Feedback → Resolved → Open using the dropdown; assert pill color and DB status update.
- From the embedded widget, set status to Feedback; reload; assert it persists and the pin renders yellow.
- Assert the admin filter dropdown's "Feedback" option filters the table correctly.
- Assert the widget sidebar badge counts Feedback annotations as active (`status !== "resolved"`).

**Manual sanity:**

- Load on an installed site (e.g. teachengineering.org) after deploy. Confirm existing `open`/`resolved` annotations still render correctly (no broken ternaries, no JS errors).

---

## Backwards compatibility and rollback

- **Existing rows** stay `open`/`resolved` — no data migration.
- **Cached old client bundles** on installed sites will render Feedback annotations through their fallback "open" styling until the page refreshes and picks up the new bundle. Acceptable.
- **Rollback:** reversing the CHECK constraint back to two values is safe *only if no rows are yet `'feedback'`*. Otherwise such rows would need to be remapped to `'open'` first. Not expected to matter in practice.

---

## Out of scope

- Auto-transition on reply (explicitly rejected — manual only).
- Reviewer-only vs admin-only status changes (both can change status, same as today).
- More than three statuses, or custom per-project statuses.
- Reordering / multi-column sort for the admin table.
