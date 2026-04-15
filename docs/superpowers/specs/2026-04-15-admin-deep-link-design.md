# Admin Deep-Link to Comment in Context

**Date:** 2026-04-15
**Status:** Design approved, ready for implementation plan

## Goal

Add a "View" link from each row in the admin annotations table that opens the target page with the corresponding comment already surfaced (sidebar open, thread highlighted, pin pulsing).

## Motivation

Today the admin shows comments in a table but there is no way to jump back to where a comment lives on the page. To reply with full context, the reviewer has to manually open the URL and hunt for the pin.

## Scope

**In scope**
- Admin: new "View" link column in the annotations table on `admin/project.html`
- Embed (`src/` → built into `dist/markux.js`): recognize a `#markux=<annotation_id>` URL hash on load and surface that annotation

**Out of scope**
- Deep-links to replies (only top-level annotations)
- Search/filter changes in admin
- Any auth changes

## Design

### Admin change — `admin/js/project-detail.js`

The annotations table row currently shows page, text, status, author, date. Add a new trailing cell with an `<a>` that:
- `href = annotation.page_url + "#markux=" + annotation.id`
- `target = "_blank"`, `rel = "noopener noreferrer"`
- Label: "View"

No other admin logic changes. Link is always rendered (every annotation has `page_url` + `id`).

### Embed change — deep-link handler

On embed init, after annotations are loaded and pins are rendered:

1. Parse `location.hash`. If it matches `#markux=<uuid>`, capture `<uuid>` as `targetId`.
2. Look up the annotation by `targetId` in the loaded set.
3. If found:
   - Open the sidebar drawer.
   - Scroll the thread element for `targetId` into view within the drawer and apply a transient highlight class (~2s).
   - Scroll the pin marker on the page into view and apply a pulse animation class (~2s).
4. If not found (unknown/deleted id, or annotation belongs to a different URL so no pin exists): no-op, page loads normally.
5. After handling, strip the hash from the URL via `history.replaceState(null, "", location.pathname + location.search)` so a refresh doesn't re-trigger the animation.

### Styling

Two new CSS classes in the embed stylesheet:
- `.markux-thread--highlight` — brief background flash on the sidebar thread card
- `.markux-pin--pulse` — scale + glow pulse animation on the pin marker

Both auto-remove after their animation via `animationend` listener or a `setTimeout` matching the animation duration.

## Error handling

- Malformed hash (e.g., `#markux=` with no id, or non-uuid) → treated as "not found", no-op.
- Annotation fetch fails → existing error path; deep-link simply won't fire.
- Pin not in DOM yet when handler runs → handler runs *after* pin render, so this shouldn't occur; if it does, treat as not-found.

## Testing

Manual (Playwright) verification:
- Admin: click "View" on an annotation → new tab opens with correct URL + hash.
- Target page loads with sidebar open, correct thread highlighted, pin pulsing.
- Hash is removed from URL after animation settles.
- Invalid id in hash → page loads normally, no errors in console.
- Annotation from a different page (url mismatch) → page loads normally.

## Files touched

- `admin/js/project-detail.js` — add View link cell
- `admin/project.html` — add table header if headers are static
- `src/` (embed source) + rebuild to `dist/markux.js` — hash handler + scroll/highlight/pulse logic
- `src/styles` (or wherever embed CSS lives) — two new animation classes
