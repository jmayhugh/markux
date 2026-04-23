# Hide MarkUX overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let site owners hide the entire MarkUX overlay on a site with one click, persist that preference in `localStorage` on the embed origin, and restore with one click on a small ghost dot.

**Architecture:** Single new module (`src/ui/visibility.js`) owns the `markux:hidden` key and the ghost-dot factory. A second factory added to `src/ui/floating-button.js` produces the eye-off hide button. `src/index.js` branches at the top of `init()`: if hidden, it builds only the shadow host + style + ghost dot and returns; otherwise it runs the existing path plus the new hide button. Transitions in both directions use `window.location.reload()` to avoid teardown bugs.

**Tech Stack:** Vanilla JS (ES modules), esbuild bundler, Vitest + jsdom for unit tests, Playwright for end-to-end verification.

**Spec:** `docs/specs/2026-04-23-hide-overlay-design.md`

---

## File Structure

- **Create:** `src/ui/visibility.js` — `isHidden()`, `setHidden(bool)`, `createGhostDot(onClick)`. Sole owner of the `markux:hidden` localStorage key.
- **Create:** `tests/ui/visibility.test.js` — unit tests for the visibility module.
- **Modify:** `src/ui/floating-button.js` — add `createHideButton(onClick)` export alongside existing `createFloatingButton` / `updateBadge`.
- **Modify:** `tests/ui/floating-button.test.js` — add a `describe("createHideButton")` block.
- **Modify:** `src/ui/styles.js` — add `.markux-hide-btn` and `.markux-ghost-dot` rules below the existing `.markux-fab` rules.
- **Modify:** `src/index.js` — hidden-branch early return at the top of `init()`, plus appending the hide button after the FAB in the non-hidden branch.
- **Modify:** `dist/markux.js` — regenerated via `npm run build`.
- **Modify:** `README.md` — add a short "Hide MarkUX" section with the DevTools escape hatch.
- **Modify:** `docs/outstanding-work.md` — add a "Done 2026-04-23" entry.

No DB, admin, Supabase, or edge-function changes.

**Icon construction note:** The new `createHideButton` factory builds its SVG via `document.createElementNS` rather than assigning a markup string, so we don't introduce a new string-assignment pattern. The existing `createFloatingButton` uses a different pattern for its pen/close icons; leave that alone for this change.

---

## Task 1: Visibility module (TDD)

**Files:**
- Create: `src/ui/visibility.js`
- Test: `tests/ui/visibility.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/visibility.test.js`:

```js
// tests/ui/visibility.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { isHidden, setHidden, createGhostDot } from "../../src/ui/visibility.js";

describe("visibility module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("isHidden", () => {
    it("returns false when key is absent", () => {
      expect(isHidden()).toBe(false);
    });

    it("returns true when markux:hidden === '1'", () => {
      localStorage.setItem("markux:hidden", "1");
      expect(isHidden()).toBe(true);
    });

    it("returns false for any non-'1' value", () => {
      localStorage.setItem("markux:hidden", "true");
      expect(isHidden()).toBe(false);
      localStorage.setItem("markux:hidden", "0");
      expect(isHidden()).toBe(false);
      localStorage.setItem("markux:hidden", "");
      expect(isHidden()).toBe(false);
    });

    it("returns false when localStorage throws", () => {
      const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      expect(isHidden()).toBe(false);
      spy.mockRestore();
    });
  });

  describe("setHidden", () => {
    it("writes '1' when given true", () => {
      setHidden(true);
      expect(localStorage.getItem("markux:hidden")).toBe("1");
    });

    it("removes the key when given false", () => {
      localStorage.setItem("markux:hidden", "1");
      setHidden(false);
      expect(localStorage.getItem("markux:hidden")).toBeNull();
    });

    it("swallows exceptions when localStorage throws", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      expect(() => setHidden(true)).not.toThrow();
      spy.mockRestore();
    });
  });

  describe("createGhostDot", () => {
    it("returns a button with the markux-ghost-dot class", () => {
      const dot = createGhostDot(() => {});
      expect(dot.tagName).toBe("BUTTON");
      expect(dot.classList.contains("markux-ghost-dot")).toBe(true);
    });

    it("has the 'Show MarkUX' aria-label", () => {
      const dot = createGhostDot(() => {});
      expect(dot.getAttribute("aria-label")).toBe("Show MarkUX");
    });

    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      const dot = createGhostDot(onClick);
      dot.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/ui/visibility.test.js`

Expected: All tests FAIL with "Cannot find module '../../src/ui/visibility.js'".

- [ ] **Step 3: Write the minimal implementation**

Create `src/ui/visibility.js`:

```js
// src/ui/visibility.js

const HIDDEN_KEY = "markux:hidden";

export function isHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHidden(hidden) {
  try {
    if (hidden) {
      localStorage.setItem(HIDDEN_KEY, "1");
    } else {
      localStorage.removeItem(HIDDEN_KEY);
    }
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/ui/visibility.test.js`

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/visibility.js tests/ui/visibility.test.js
git commit -m "feat(widget): add visibility module for hide/show overlay state"
```

---

## Task 2: `createHideButton` factory (TDD)

**Files:**
- Modify: `src/ui/floating-button.js`
- Modify: `tests/ui/floating-button.test.js`

- [ ] **Step 1: Write the failing tests**

Change the import line at the top of `tests/ui/floating-button.test.js` from:

```js
import { createFloatingButton } from "../../src/ui/floating-button.js";
```

to:

```js
import { createFloatingButton, createHideButton } from "../../src/ui/floating-button.js";
```

Then append this block to the end of the file:

```js
describe("createHideButton", () => {
  let button;
  let onClick;

  beforeEach(() => {
    onClick = vi.fn();
    button = createHideButton(onClick);
  });

  it("creates a button element with markux-hide-btn class", () => {
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("markux-hide-btn")).toBe(true);
  });

  it("contains an SVG icon", () => {
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("has 'Hide MarkUX' aria-label", () => {
    expect(button.getAttribute("aria-label")).toBe("Hide MarkUX");
  });

  it("calls onClick when clicked", () => {
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/ui/floating-button.test.js`

Expected: The existing `createFloatingButton` tests PASS. The four new `createHideButton` tests FAIL with `createHideButton is not a function`.

- [ ] **Step 3: Implement `createHideButton`**

Edit `src/ui/floating-button.js`. At the bottom of the file (after the existing `updateBadge` function), add:

```js
export function createHideButton(onClick) {
  const button = document.createElement("button");
  button.className = "markux-hide-btn";
  button.setAttribute("aria-label", "Hide MarkUX");

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "currentColor");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute(
    "d",
    "M3.28 2.22a.75.75 0 00-1.06 1.06l2.14 2.14A10.45 10.45 0 001 12s3.5 7 11 7c1.89 0 3.58-.41 5.04-1.08l3.68 3.68a.75.75 0 101.06-1.06L3.28 2.22zm6.07 7.13l5.3 5.3a3 3 0 01-5.3-5.3zM12 5c-1.2 0-2.32.16-3.34.44l2.1 2.1A3 3 0 0114.46 10.7l2.77 2.77c1.06-.78 1.97-1.76 2.77-2.97-1.42-2.2-4.21-5.5-8-5.5z"
  );
  svg.appendChild(path);
  button.appendChild(svg);

  button.addEventListener("click", onClick);
  return button;
}
```

The path data draws a slashed-eye icon (eye with a diagonal line through it), the standard visual metaphor for "hide".

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run tests/ui/floating-button.test.js`

Expected: All tests (existing 4 + new 4) PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/floating-button.js tests/ui/floating-button.test.js
git commit -m "feat(widget): add createHideButton factory for eye-off button"
```

---

## Task 3: Styles for hide button and ghost dot

**Files:**
- Modify: `src/ui/styles.js`

No unit tests — this file is a CSS string with no existing test precedent. Visual verification happens in Task 5 via Playwright.

- [ ] **Step 1: Add CSS rules for `.markux-hide-btn` and `.markux-ghost-dot`**

Open `src/ui/styles.js`. Find the end of the `.markux-fab.active .badge` rule (around line 72). Immediately after its closing `}`, insert:

```css
  /* Hide button — sits above the FAB */
  .markux-hide-btn {
    position: fixed;
    bottom: 158px;
    right: 42px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #6b7280;
    border: 2px solid white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 2147483647;
    transition: transform 0.15s ease, background 0.15s ease;
    padding: 0;
  }

  .markux-hide-btn:hover {
    transform: scale(1.08);
    background: #4b5563;
  }

  .markux-hide-btn svg {
    width: 16px;
    height: 16px;
    fill: white;
  }

  /* Ghost dot — only element shown when overlay is hidden */
  .markux-ghost-dot {
    position: fixed;
    bottom: 119px;
    right: 53px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    padding: 0;
    cursor: pointer;
    z-index: 2147483647;
  }

  .markux-ghost-dot:focus-visible {
    background: rgba(0, 0, 0, 1);
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

Run: `npm test`

Expected: All tests (including the new ones from Tasks 1 and 2) PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui/styles.js
git commit -m "feat(widget): style hide button and ghost dot"
```

---

## Task 4: Wire hide/show into `src/index.js`

**Files:**
- Modify: `src/index.js`

No unit test — `src/index.js` is an IIFE entry point with no existing test harness. Playwright verification in Task 5 covers both branches end-to-end.

- [ ] **Step 1: Update the imports**

Open `src/index.js`. Find this line:

```js
import { createFloatingButton } from "./ui/floating-button.js";
```

Replace with:

```js
import { createFloatingButton, createHideButton } from "./ui/floating-button.js";
import { isHidden, setHidden, createGhostDot } from "./ui/visibility.js";
```

- [ ] **Step 2: Add the hidden-branch early return at the top of `init()`**

The `function init()` body currently starts with:

```js
  function init() {
    setApiKey(supabaseAnonKey);
    const supabase = initSupabase(supabaseUrl, supabaseAnonKey);
```

Insert the hidden-branch between `function init() {` and `setApiKey(...)`:

```js
  function init() {
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

    setApiKey(supabaseAnonKey);
    const supabase = initSupabase(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Append the hide button after the FAB in the non-hidden branch**

Find this block in `src/index.js`:

```js
    const fab = createFloatingButton(handleToggle);

    shadow.appendChild(highlight);
    shadow.appendChild(overlay);
    shadow.appendChild(fab);
```

Immediately after `shadow.appendChild(fab);`, add:

```js
    const hideBtn = createHideButton(() => {
      setHidden(true);
      window.location.reload();
    });
    shadow.appendChild(hideBtn);
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: All tests PASS. (No new tests added here; existing tests continue to pass.)

- [ ] **Step 5: Commit**

```bash
git add src/index.js
git commit -m "feat(widget): hide/show overlay from bottom-right FAB area"
```

---

## Task 5: Build bundle and verify end-to-end with Playwright

**Files:**
- Modify: `dist/markux.js` (regenerated)

- [ ] **Step 1: Rebuild the widget bundle**

Run: `npm run build`

Expected: esbuild writes a fresh `dist/markux.js`. No errors.

- [ ] **Step 2: Start a local HTTP server**

The widget validates `window.location.hostname` against the project's `allowed_domains`. `file://` won't work; serve the repo over HTTP and ensure the domain is authorized on the project you test with.

Run in the `markux/` repo root (background task):

```bash
python3 -m http.server 8000
```

- [ ] **Step 3: Create a temporary demo page**

Write `dist/hide-demo.html` (will be deleted in Step 6, not committed):

```html
<!doctype html>
<html>
  <head><title>MarkUX hide demo</title></head>
  <body>
    <h1>Hide overlay demo</h1>
    <p>You should see the red pen FAB at the bottom-right and a smaller gray hide button above it.</p>
    <script src="./markux.js" data-project="REPLACE_WITH_PROJECT_ID"></script>
  </body>
</html>
```

Replace `REPLACE_WITH_PROJECT_ID` with a real project UUID from the Supabase `projects` table. Ensure that project's `allowed_domains` array contains `localhost` — edit it through the admin UI (`https://jmayhugh.github.io/markux/admin/`) or the Supabase dashboard if not. If the user can't supply a project ID, ask them for one before running the verification steps.

- [ ] **Step 4: Playwright smoke test — hide flow**

Using the Playwright MCP tools:

1. `browser_navigate` → `http://localhost:8000/dist/hide-demo.html`
2. `browser_evaluate` — assert `document.getElementById("markux-host")` is present. (Its shadow root is `closed`, so DOM queries can't cross it from the page. Skip shadow-DOM internals for assertions here; rely on visual + localStorage + host-presence checks.)
3. `browser_take_screenshot` — visually confirm both the red pen FAB and the smaller gray hide button above it are present in the bottom-right.
4. `browser_click` the hide button. (Use a coordinate-based click at approximately `(viewport_width - 58, viewport_height - 174)` since the closed shadow DOM prevents selector-based click through the Playwright accessibility tree.)
5. Wait for reload (`browser_wait_for` for the page title to be present again).
6. `browser_take_screenshot` — the overlay should be gone; only a tiny gray dot in the bottom-right remains.
7. `browser_evaluate` `localStorage.getItem("markux:hidden")` → should return `"1"`.

Expected: both the screenshot and the localStorage assertion confirm hidden state.

- [ ] **Step 5: Playwright smoke test — show flow**

Continuing from the hidden state:

1. `browser_click` the ghost dot at approximately `(viewport_width - 58, viewport_height - 124)`.
2. Wait for reload.
3. `browser_take_screenshot` — the full overlay (pen FAB + hide button) is back; no ghost dot.
4. `browser_evaluate` `localStorage.getItem("markux:hidden")` → should return `null`.

Expected: both the screenshot and the localStorage assertion confirm the ON state is restored.

- [ ] **Step 6: Clean up**

Delete the demo file:

```bash
rm dist/hide-demo.html
```

Stop the local HTTP server (kill the background task).

- [ ] **Step 7: Commit the rebuilt bundle**

```bash
git add dist/markux.js
git commit -m "build: rebuild widget bundle with hide-overlay support"
```

---

## Task 6: Document the feature and the escape hatch

**Files:**
- Modify: `README.md`
- Modify: `docs/outstanding-work.md`

- [ ] **Step 1: Add a "Hide MarkUX" section to `README.md`**

Open `README.md`. Find a reasonable spot after the "Features" bullet list but before "Quick Start". Insert:

```markdown
## Hide MarkUX on a site

Once installed, MarkUX can be hidden from a site by clicking the small gray "eye-off" button directly above the pen FAB. The entire overlay — FAB, pins, sidebar, mode label — disappears and is replaced by a small translucent dot in the bottom-right corner. Click the dot to restore.

The preference lives in `localStorage` on the site's origin, so it persists across reloads until you restore it. It's per-browser — other browsers and devices still see the full overlay.

If MarkUX ever gets stuck hidden and the ghost dot doesn't render for some reason, open DevTools on the site and run:

~~~js
localStorage.removeItem("markux:hidden");
~~~

Then reload.
```

(Note: the inner fenced block uses `~~~` so it nests inside the outer Markdown block cleanly. Convert both to triple-backtick in the actual README if your editor prefers; the fencing just needs to not conflict with the surrounding doc fences.)

- [ ] **Step 2: Add a "Done 2026-04-23" entry to `docs/outstanding-work.md`**

Open `docs/outstanding-work.md`. Add a new block directly above the existing `## Done 2026-04-21` block:

```markdown
## Done 2026-04-23

Reference only — shipped on `main` and live.

- **Hide MarkUX overlay from the frontend.** Site owners can hide the entire overlay on any site with one click on a small gray eye-off button above the pen FAB. Hidden state persists in `localStorage` on the embed origin. A 10px translucent ghost dot in the bottom-right restores the full overlay with one click (reload-on-toggle keeps state management trivial).
  - Spec: `docs/specs/2026-04-23-hide-overlay-design.md`
  - Plan: `docs/superpowers/plans/2026-04-23-hide-overlay.md`

---
```

- [ ] **Step 3: Commit docs**

```bash
git add README.md docs/outstanding-work.md
git commit -m "docs: hide-overlay usage and outstanding-work entry"
```

- [ ] **Step 4: Push to `main` (explicit user approval required)**

Pushing goes live on GitHub Pages and updates the widget bundle every currently-installed site will start serving. Do NOT push without Julia's explicit go-ahead.

When approved:

```bash
git push origin main
```

Expected: push succeeds; GitHub Pages picks up `dist/markux.js` within a minute or two.

---

## Post-execution verification checklist

After pushing, verify on a live install (e.g. `teachengineering.org` once GitHub Pages has refreshed):

- [ ] FAB visible, hide button visible above it.
- [ ] Click hide button → overlay disappears, ghost dot appears.
- [ ] Reload the page → ghost dot still shown, no FAB.
- [ ] Click ghost dot → full overlay restored.
- [ ] DevTools → Application → Local Storage → confirm the `markux:hidden` key toggles correctly.
