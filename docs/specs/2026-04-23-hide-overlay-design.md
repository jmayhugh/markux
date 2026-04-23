# Hide the MarkUX overlay from the frontend — design spec

**Date:** 2026-04-23
**Scope:** Give site owners a one-click way to turn off the MarkUX overlay on any site where it's embedded, persistent across reloads in the same browser, with a one-click restore.

---

## Motivation

The only UI today for quieting MarkUX is the pen FAB, which toggles comment mode but always leaves the FAB, pins, sidebar badge, and mode label on the page. A site owner who wants a clean screenshot, a stakeholder walkthrough, or a quick demo has no way to hide MarkUX without removing the embed script itself.

The use case is: site owner hides the overlay for a screenshot/demo, restores it when they're done. Not a session-only hide (they don't want to re-hide after every reload), and not a global/synced setting (they don't need it to follow them across devices). localStorage on the embed's origin is the right scope.

---

## Behavior

### Visible states

**ON (default).** Current UI plus one new element: a small "eye-off" button stacked directly above the pen FAB in the bottom-right corner. Circular like the FAB (which is 48×48 at `bottom: 100px; right: 34px`), smaller at 32×32, muted gray so it doesn't compete with the FAB's red.

**HIDDEN.** Every MarkUX-owned element is gone — no pen FAB, no eye-off button, no pins, no sidebar badge, no mode label, no popovers. In its place, a single 10×10 translucent dot (≈30% opacity, neutral gray, no label) sits near the FAB's former anchor (`bottom: 119px; right: 53px` — centered where the FAB's center was). One click on the dot restores the ON state.

### Transitions

- **ON → HIDDEN.** Click the eye-off button. Writes `markux:hidden = "1"` to `localStorage` and calls `window.location.reload()`. The reload rebuilds from scratch in the hidden branch.
- **HIDDEN → ON.** Click the ghost dot. Removes the `markux:hidden` key and calls `window.location.reload()`. The reload runs the full init path.

Reload-on-toggle is a deliberate simplification: tearing down the shadow-DOM subtree, Supabase real-time subscriptions, and pin positioning cache in-place is a bigger surface area for bugs than we need. A full reload costs a few hundred ms for a transition users perform rarely.

### Persistence

- Stored in `localStorage` under the key `markux:hidden`, value `"1"` when hidden, key absent otherwise.
- localStorage is per-origin, so hiding on `teachengineering.org` doesn't affect another site that embeds the widget.
- No sync across browsers or devices — acceptable for the screenshot/demo use case.

---

## Change

### New module `src/ui/visibility.js`

Single source of truth for the key and the ghost dot:

```js
const HIDDEN_KEY = "markux:hidden";

export function isHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false; // Private mode, storage disabled, etc. — default to showing UI.
  }
}

export function setHidden(hidden) {
  try {
    if (hidden) localStorage.setItem(HIDDEN_KEY, "1");
    else localStorage.removeItem(HIDDEN_KEY);
  } catch {
    // Non-fatal; the reload still happens, state just doesn't persist.
  }
}

export function createGhostDot(onClick) {
  const dot = document.createElement("button");
  dot.className = "markux-ghost-dot";
  dot.setAttribute("aria-label", "Show MarkUX");
  dot.addEventListener("click", onClick);
  return dot;
}
```

Any non-exact-match value for `markux:hidden` is treated as "not hidden" — safe default.

### `src/ui/floating-button.js`

Export a second factory `createHideButton(onClick)` that returns a smaller circular button with an `eye-off` SVG icon, `aria-label="Hide MarkUX"`. One click calls `onClick`, which is wired in `index.js` to `setHidden(true)` followed by `window.location.reload()`.

Existing `createFloatingButton` and `updateBadge` exports are unchanged. The hide button is a sibling of the FAB, not a child — positioned via CSS rather than DOM parenting so it can be hidden independently (e.g. during comment mode, if we decide to — see "Out of scope" below).

### `src/ui/styles.js`

Two new rule sets:

- `.markux-hide-btn` — same circular treatment as `.markux-fab` but 32×32, muted gray fill (e.g. `#6b7280`), white 2px border, positioned `bottom: 158px; right: 42px` (above the FAB's 48×48 at `bottom: 100px; right: 34px`, with an 8px horizontal shift to stay visually centered with the FAB and a 10px gap between them). Same `z-index: 2147483647` as the FAB.
- `.markux-ghost-dot` — 10×10, `border-radius: 50%`, `rgba(0, 0, 0, 0.3)` fill, no border, no shadow, positioned `bottom: 119px; right: 53px` (centered on the FAB's former center). `cursor: pointer`. Same `z-index` as the FAB. `:focus-visible` bumps opacity to 100% and adds a focus ring so keyboard users can find it.

### `src/index.js` init flow

At the top of `init()`:

```js
import { isHidden, setHidden, createGhostDot } from "./ui/visibility.js";
// ...
if (isHidden()) {
  const host = document.createElement("div");
  host.id = "markux-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);

  const dot = createGhostDot(() => {
    setHidden(false);
    window.location.reload();
  });
  shadow.appendChild(dot);
  return;
}
// ... existing init path continues
```

The hidden branch skips `validateProject()`, the Supabase client init, `loadAnnotations()`, and the real-time subscription. A hidden site pays roughly zero MarkUX runtime cost beyond parsing the bundle and rendering one dot.

In the non-hidden branch, after `shadow.appendChild(fab)` add:

```js
const hideBtn = createHideButton(() => {
  setHidden(true);
  window.location.reload();
});
shadow.appendChild(hideBtn);
```

### Tests

- **`tests/visibility.test.js` (new).**
  - `isHidden()` returns `false` when `markux:hidden` is absent.
  - `isHidden()` returns `true` when `markux:hidden === "1"`.
  - `isHidden()` returns `false` for any other value (e.g. `"0"`, `"true"`, `""`).
  - `setHidden(true)` writes `"1"`; `setHidden(false)` removes the key.
  - Both `isHidden` and `setHidden` swallow exceptions when `localStorage` throws (mock a throwing storage).

- **`tests/integration/hidden-init.test.js` (new, matching existing integration pattern).**
  - When `markux:hidden = "1"` is pre-seeded, after init the shadow DOM contains exactly one `.markux-ghost-dot` and zero `.markux-fab`, `.markux-pin`, `.markux-sidebar`, or `.markux-mode-label` elements. No Supabase fetch is issued.
  - When the key is absent, the ON branch runs and an eye-off button (`.markux-hide-btn`) is present alongside the FAB.

### Widget bundle

`npm run build` regenerates `dist/markux.js`. Commit and push; GitHub Pages picks it up.

### No admin / DB changes

This is a client-side preference stored per-browser. No migration, no Supabase policies, no admin UI change.

---

## Accessibility

- `aria-label="Hide MarkUX"` on the eye-off button; `aria-label="Show MarkUX"` on the ghost dot.
- Both are `<button>` elements, keyboard-focusable, trigger on Enter/Space.
- The ghost dot's `:focus-visible` state bumps opacity to 100% and adds a focus ring so keyboard users can see it.

---

## Edge cases

- **Comment mode active when hide is clicked.** The reload-on-hide path resets all state; no explicit teardown needed.
- **Deep links while hidden.** A visitor hitting `site.com/foo#markux-annotation-abc` with `markux:hidden` set sees only the ghost dot — the hash is preserved in the URL. One click on the dot clears the key and reloads; the full init path then runs `handleDeepLink` normally. No special handling required.
- **localStorage unavailable (private mode, disabled).** `isHidden()` and `setHidden()` swallow the exception and default to showing UI. Hide would be a no-op in that environment, which is acceptable — the site owner can still remove the embed script if they really need MarkUX gone.
- **Stuck hidden state with no ghost dot rendering.** Escape hatch: DevTools → `localStorage.removeItem('markux:hidden')`. Document in `README.md`.
- **Pending popover or comment in flight at hide time.** Reload cancels in-flight requests. If a comment submission was mid-flight, the annotation may or may not have been written — no worse than the user closing the tab. Acceptable.

---

## Backwards compatibility

- Existing embeds pick up the new behavior the next time their browser cache refreshes `dist/markux.js`. Until then, users see the old FAB-only UI — no broken behavior.
- No DB, no admin, no migration. A fully additive client change.

## Rollback

- `git revert` the code change and rebuild. Any site owner who had set `markux:hidden = "1"` would be stuck with a ghost dot that doesn't do anything — worth noting but extremely rare. They can clear the key via DevTools, or we include a `localStorage.removeItem("markux:hidden")` in a follow-up build.

## Out of scope

- **Hide button auto-disappearing during comment mode.** The eye-off button sits above the FAB in both modes today. If it turns out to be visually cluttered when the overlay is active, we can CSS-hide it on `.markux-overlay.active`. Punt until we see it in practice.
- **Per-page vs per-site hide.** localStorage gives us per-origin; finer scoping (e.g. hide on `/pricing` only) isn't requested.
- **Syncing hidden state across a site owner's devices.** Would need Supabase storage keyed by the current admin session, which is a bigger change; the screenshot/demo use case doesn't need it.
- **Auto-expiring hide ("hide for 1 hour").** Explicitly rejected during brainstorm — site owners want it sticky until they actively restore.
- **Admin toggle ("hide this project's overlay everywhere").** This is a per-browser preference, not a project-level setting. A project-level kill-switch is a different feature.
