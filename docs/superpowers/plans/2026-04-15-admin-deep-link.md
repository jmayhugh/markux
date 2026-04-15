# Admin Deep-Link to Comment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "View" link from each row in the MarkUX admin annotations table that opens the target page with the sidebar open, the matching thread highlighted, and the pin pulsing in context.

**Architecture:** Admin adds a link column producing `<page_url>#markux=<annotation_id>`. Embed script parses the hash on initial load, opens the sidebar, scrolls the matching sidebar item and pin into view, applies transient CSS animations, then clears the hash via `history.replaceState`. A pure `parseMarkuxHash()` helper makes the parsing unit-testable.

**Tech Stack:** Vanilla JS (ES modules), esbuild (IIFE bundle to `dist/markux.js`), vitest+jsdom for unit tests, Playwright for end-to-end verification.

**Spec:** `docs/superpowers/specs/2026-04-15-admin-deep-link-design.md`

---

## File Structure

**Create**
- `src/deep-link.js` — pure hash parser + `handleDeepLink(sidebar, pinContainer, annotations)` orchestrator
- `tests/deep-link.test.js` — unit tests for `parseMarkuxHash`

**Modify**
- `admin/project.html` — add "View" column header
- `admin/js/project-detail.js` — add View link cell in `renderAnnotationRow`
- `src/index.js` — call `handleDeepLink` after first `loadAnnotations()`
- `src/ui/styles.js` — add `.markux-pin--pulse` and `.markux-sidebar-item--highlight` CSS
- `dist/markux.js` — rebuilt via `npm run build`

---

## Task 1: Admin — add "View" column header

**Files:**
- Modify: `admin/project.html:44`

- [ ] **Step 1: Update table header**

In `admin/project.html` line 44, change:

```html
<tr><th>Page</th><th>Author</th><th>Comment</th><th>Status</th><th>Date</th><th></th></tr>
```

to:

```html
<tr><th>Page</th><th>Author</th><th>Comment</th><th>Status</th><th>Date</th><th></th><th></th></tr>
```

(One additional empty `<th>` at the end for the View link column.)

- [ ] **Step 2: Commit**

```bash
git add admin/project.html
git commit -m "admin: add View column header to annotations table"
```

---

## Task 2: Admin — render View link in each row

**Files:**
- Modify: `admin/js/project-detail.js:89-153` (the `renderAnnotationRow` function)

- [ ] **Step 1: Add a View link cell to `renderAnnotationRow`**

In `admin/js/project-detail.js`, inside `renderAnnotationRow`, after the `actionCell` block (around line 138, before `tr.appendChild(pageCell);`), add:

```javascript
  // View-in-context cell
  const viewCell = document.createElement("td");
  const viewLink = document.createElement("a");
  viewLink.href = `${annotation.page_url}#markux=${annotation.id}`;
  viewLink.target = "_blank";
  viewLink.rel = "noopener noreferrer";
  viewLink.textContent = "View";
  viewLink.className = "btn btn-sm btn-link";
  viewLink.addEventListener("click", (e) => e.stopPropagation());
  viewCell.appendChild(viewLink);
```

Then append it after `actionCell` in the row. Replace the existing append block:

```javascript
  tr.appendChild(pageCell);
  tr.appendChild(authorCell);
  tr.appendChild(commentCell);
  tr.appendChild(statusCell);
  tr.appendChild(dateCell);
  tr.appendChild(actionCell);
```

with:

```javascript
  tr.appendChild(pageCell);
  tr.appendChild(authorCell);
  tr.appendChild(commentCell);
  tr.appendChild(statusCell);
  tr.appendChild(dateCell);
  tr.appendChild(actionCell);
  tr.appendChild(viewCell);
```

The `click` handler on the row (line 147) already returns early if the click target matches `.toggle-status`. The anchor's `stopPropagation` prevents row-expand on link click.

- [ ] **Step 2: Manual verify in browser**

Open `admin/project.html` for a project with annotations. Confirm a "View" link appears in each row. Hover: href should be `<page_url>#markux=<uuid>`. Click: opens new tab. Clicking the link should NOT expand the thread panel in the admin.

- [ ] **Step 3: Commit**

```bash
git add admin/js/project-detail.js
git commit -m "admin: add View link to annotation rows for deep-link to comment"
```

---

## Task 3: Embed — unit-test hash parser (TDD)

**Files:**
- Create: `tests/deep-link.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/deep-link.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { parseMarkuxHash } from "../src/deep-link.js";

describe("parseMarkuxHash", () => {
  it("returns the annotation id for a valid hash", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseMarkuxHash(`#markux=${id}`)).toBe(id);
  });

  it("returns null for an empty hash", () => {
    expect(parseMarkuxHash("")).toBeNull();
  });

  it("returns null when hash does not start with #markux=", () => {
    expect(parseMarkuxHash("#other=abc")).toBeNull();
  });

  it("returns null when id portion is empty", () => {
    expect(parseMarkuxHash("#markux=")).toBeNull();
  });

  it("returns null when id is not a valid uuid", () => {
    expect(parseMarkuxHash("#markux=not-a-uuid")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/deep-link.test.js`
Expected: FAIL — "Cannot find module '../src/deep-link.js'" (module does not exist yet).

- [ ] **Step 3: Create `src/deep-link.js` with minimal implementation**

Create `src/deep-link.js`:

```javascript
// src/deep-link.js
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMarkuxHash(hash) {
  if (!hash) return null;
  const prefix = "#markux=";
  if (!hash.startsWith(prefix)) return null;
  const id = hash.slice(prefix.length);
  if (!id || !UUID_RE.test(id)) return null;
  return id;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/deep-link.test.js`
Expected: PASS — all 5 cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/deep-link.js tests/deep-link.test.js
git commit -m "embed: add parseMarkuxHash helper with unit tests"
```

---

## Task 4: Embed — add `handleDeepLink` orchestrator

**Files:**
- Modify: `src/deep-link.js`

- [ ] **Step 1: Extend `src/deep-link.js` with the orchestrator**

Append to `src/deep-link.js`:

```javascript
export function handleDeepLink({ hash, sidebar, pinContainer, annotations, openSidebar, onSelect }) {
  const targetId = parseMarkuxHash(hash);
  if (!targetId) return false;

  const index = annotations.findIndex((a) => a.id === targetId);
  if (index === -1) {
    clearHash();
    return false;
  }

  openSidebar(sidebar);

  // Highlight the sidebar item
  const item = sidebar.querySelector(
    `.markux-sidebar-item[data-annotation-id="${CSS.escape(targetId)}"]`,
  );
  if (item) {
    item.scrollIntoView({ behavior: "smooth", block: "center" });
    item.classList.add("markux-sidebar-item--highlight");
    item.addEventListener(
      "animationend",
      () => item.classList.remove("markux-sidebar-item--highlight"),
      { once: true },
    );
  }

  // Pulse the matching pin (annotations are rendered in array order, so
  // pin at `index` in pinContainer matches the annotation at that index).
  const pins = pinContainer.querySelectorAll(".markux-pin");
  const pin = pins[index];
  if (pin) {
    onSelect?.(annotations[index], index);
    pin.classList.add("markux-pin--pulse");
    pin.addEventListener(
      "animationend",
      () => pin.classList.remove("markux-pin--pulse"),
      { once: true },
    );
  }

  clearHash();
  return true;
}

function clearHash() {
  if (typeof history !== "undefined" && history.replaceState) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}
```

- [ ] **Step 2: Quick sanity run of existing tests**

Run: `npx vitest run tests/deep-link.test.js`
Expected: PASS — the 5 parser tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/deep-link.js
git commit -m "embed: add handleDeepLink to open sidebar, scroll, and pulse pin"
```

---

## Task 5: Embed — add pulse + highlight CSS

**Files:**
- Modify: `src/ui/styles.js`

- [ ] **Step 1: Locate the styles string**

Open `src/ui/styles.js`. Find the exported `STYLES` template literal. Scroll to the end (just before the closing backtick).

- [ ] **Step 2: Append the two animation classes**

Just before the closing backtick of `STYLES`, add:

```css

@keyframes markux-pin-pulse {
  0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
  50%  { transform: scale(1.35); box-shadow: 0 0 0 14px rgba(220, 38, 38, 0); }
  100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
}
.markux-pin.markux-pin--pulse {
  animation: markux-pin-pulse 2s ease-out 2;
}

@keyframes markux-sidebar-item-highlight {
  0%   { background-color: rgba(220, 38, 38, 0.18); }
  100% { background-color: transparent; }
}
.markux-sidebar-item.markux-sidebar-item--highlight {
  animation: markux-sidebar-item-highlight 2s ease-out 1;
}
```

Note the `2s ... 2` (iteration count 2) on the pin so the pulse plays twice (~4s total), then the `animationend` listener removes the class.

- [ ] **Step 3: Commit**

```bash
git add src/ui/styles.js
git commit -m "embed: add pulse + highlight animations for deep-linked comments"
```

---

## Task 6: Embed — wire `handleDeepLink` into initial load

**Files:**
- Modify: `src/index.js:27` (import), `src/index.js:395-406` (init block), `src/index.js:304-364` (`loadAnnotations`)

- [ ] **Step 1: Add the import**

In `src/index.js`, after line 28 (`import { subscribeToAnnotations } from "./realtime.js";`), add:

```javascript
import { handleDeepLink } from "./deep-link.js";
```

- [ ] **Step 2: Gate deep-link handling to the first load**

The realtime subscription calls `loadAnnotations()` on every change; we only want to fire the deep-link handler once. Introduce a flag.

Immediately before the `async function loadAnnotations() {` declaration (around line 304), add:

```javascript
    let deepLinkHandled = false;
```

At the end of `loadAnnotations` (after the final `updateSidebarList(sidebar, annotations, sidebarCallbacks);` on line 363), add:

```javascript
      if (!deepLinkHandled) {
        deepLinkHandled = true;
        handleDeepLink({
          hash: window.location.hash,
          sidebar,
          pinContainer,
          annotations,
          openSidebar,
          onSelect: handleSidebarSelect,
        });
      }
```

(This runs after pins and the sidebar list have been rendered, so DOM lookups in `handleDeepLink` will succeed.)

- [ ] **Step 3: Rebuild the bundle**

Run: `npm run build`
Expected: no errors, `dist/markux.js` is regenerated.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the 5 new parser tests.

- [ ] **Step 5: Commit**

```bash
git add src/index.js dist/markux.js
git commit -m "embed: handle #markux=<id> deep-link on initial page load"
```

---

## Task 7: End-to-end verification (Playwright)

**Files:** none

- [ ] **Step 1: Manual Playwright walkthrough**

Use Playwright (via MCP) against a test page that has the embed installed (e.g. a local copy of the teachengineering wireframe):

1. Navigate to the admin: `https://jmayhugh.github.io/markux/admin/`
2. Open a project with existing annotations.
3. Click "View" on a row. Confirm a new tab opens to `<page_url>#markux=<uuid>`.
4. On the target page, confirm:
   - Sidebar drawer auto-opens.
   - The matching thread item is scrolled into view and briefly flashes with a red-tinted background.
   - The matching pin pulses (scale + red glow) for ~4s.
   - After the animation settles, `location.hash` is empty (check via devtools).
5. Reload the page. Confirm the sidebar does NOT re-open and the pin does NOT pulse (hash was cleared).

- [ ] **Step 2: Invalid-id test**

Manually visit `<page_url>#markux=00000000-0000-0000-0000-000000000000` (a uuid not in the DB). Confirm the page loads normally with no console errors and the hash is cleared.

- [ ] **Step 3: Wrong-page test**

Grab an annotation id that belongs to a *different* page_url. Manually visit `<current_page>#markux=<that_id>`. Confirm no errors; page renders normally (annotation isn't loaded for this URL so nothing to highlight).

- [ ] **Step 4: Report results**

If all three scenarios pass, feature is complete. If any fail, file findings and revise the relevant task.

---

## Rollout

After Task 7 passes:

1. Tag and push `main`: `git push origin main`
2. GitHub Pages auto-deploys the admin + the new `dist/markux.js`.
3. Embedded host pages (teachengineering.org) pick up the new bundle on next page load — no action needed on those hosts.
