# Feedback Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third annotation status `feedback` (paused, waiting on reviewer) with a color-coded custom dropdown replacing the Resolve/Reopen button in both the admin and the embedded widget.

**Architecture:** Small DB migration expands the CHECK constraint. A shared `StatusSelect` pattern (two parallel implementations — one in `admin/js/components/`, one in `src/ui/`) replaces the static status badge + separate toggle button with a single clickable colored pill. Widget uses closed shadow DOM so the widget copy lives inside the shadow; admin copy lives at document.body. Palette shifts Open from amber to red so Feedback can own yellow; Resolved stays green.

**Tech Stack:** Vanilla JS (ES modules), esbuild (widget bundle → `dist/markux.js`), Supabase (Postgres, Deno edge functions), vitest + jsdom (tests), GitHub Pages (admin hosting).

**Spec:** `docs/specs/2026-04-21-feedback-status-design.md`

---

## File Structure

**Created:**
- `supabase/migrations/003_add_feedback_status.sql` — DB CHECK constraint update
- `src/ui/status-select.js` — widget dropdown component
- `admin/js/components/status-select.js` — admin dropdown component
- `tests/ui/status-select.test.js` — widget component tests
- `tests/ui/pin-marker.test.js` — pin marker dispatch tests (new file)
- `tests/admin/status-select.test.js` — admin component tests (new directory)

**Modified:**
- `supabase/functions/write-proxy/index.ts` — accept `'feedback'` in `update_annotation_status` validation
- `src/ui/pin-marker.js` — add `PIN_SVG_FEEDBACK`, extend status→SVG dispatch
- `src/ui/styles.js` — palette update + `.markux-status-feedback` + StatusSelect popup styles
- `src/ui/sidebar.js` — status badge + toggle button → StatusSelect
- `src/ui/thread-popover.js` — status span → StatusSelect, add `onStatusChange` prop
- `src/index.js` — filter `!= resolved`, three-way sort, pass `onStatusChange` to thread popover
- `admin/css/admin.css` — palette update + `.status-feedback`
- `admin/project.html` — add Feedback filter option, remove `sortable` class on Status, remove final action `<th>`
- `admin/js/project-detail.js` — `renderAnnotationRow` uses StatusSelect, drops the action-cell button; column count drops to 6
- `admin/js/projects-list.js` — add third count query and badge per project row
- `admin/js/visual-replay.js` — extend status pill color ternary

---

## Task 1: DB migration + write-proxy validation

**Files:**
- Create: `supabase/migrations/003_add_feedback_status.sql`
- Modify: `supabase/functions/write-proxy/index.ts:246`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/003_add_feedback_status.sql`:

```sql
-- 003_add_feedback_status.sql
-- Expands the annotations.status CHECK constraint to allow 'feedback'
-- as a third value alongside 'open' and 'resolved'.

alter table annotations drop constraint annotations_status_check;

alter table annotations add constraint annotations_status_check
  check (status in ('open', 'feedback', 'resolved'));
```

- [ ] **Step 2: Update the write-proxy allowed-values list**

In `supabase/functions/write-proxy/index.ts`, find the `update_annotation_status` action (around line 244-251):

```typescript
} else if (action === "update_annotation_status") {
  const { annotation_id, status: newStatus } = data;
  if (!["open", "resolved"].includes(newStatus)) {
    return new Response(JSON.stringify({ error: "Invalid status" }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
```

Change the allowed list to include `"feedback"`:

```typescript
  if (!["open", "feedback", "resolved"].includes(newStatus)) {
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_add_feedback_status.sql \
        supabase/functions/write-proxy/index.ts
git commit -m "db: add feedback status (migration 003 + proxy validation)"
```

**Deploy note (do NOT do as part of this task):** migration tracking is out of sync (see `docs/outstanding-work.md`), so this migration will be applied via the Supabase dashboard SQL editor once all code tasks are complete. The write-proxy will be redeployed with `supabase functions deploy write-proxy` at the same point. See Task 13.

---

## Task 2: Palette updates in widget + admin CSS

**Files:**
- Modify: `src/ui/styles.js` (lines 324-331)
- Modify: `admin/css/admin.css` (lines 85-87)

- [ ] **Step 1: Update `src/ui/styles.js` status pill rules**

Find the existing block:

```js
  .markux-status-open {
    background: #fef3c7;
    color: #92400e;
  }

  .markux-status-resolved {
    background: #d1fae5;
    color: #065f46;
  }
```

Replace with:

```js
  .markux-status-open {
    background: #fee2e2;
    color: #991b1b;
  }

  .markux-status-feedback {
    background: #fef9c3;
    color: #854d0e;
  }

  .markux-status-resolved {
    background: #d1fae5;
    color: #065f46;
  }
```

- [ ] **Step 2: Update `admin/css/admin.css`**

Find:

```css
.status { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
.status-open { background: #fef3c7; color: #92400e; }
.status-resolved { background: #d1fae5; color: #065f46; }
```

Replace with:

```css
.status { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
.status-open { background: #fee2e2; color: #991b1b; }
.status-feedback { background: #fef9c3; color: #854d0e; }
.status-resolved { background: #d1fae5; color: #065f46; }
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/styles.js admin/css/admin.css
git commit -m "style: shift palette for traffic-light status colors (red/yellow/green)"
```

---

## Task 3: Pin marker — add feedback pin (TDD)

**Files:**
- Create: `tests/ui/pin-marker.test.js`
- Modify: `src/ui/pin-marker.js`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/pin-marker.test.js`:

```js
// tests/ui/pin-marker.test.js
import { describe, it, expect } from "vitest";
import { createPinMarker } from "../../src/ui/pin-marker.js";

describe("createPinMarker", () => {
  it("uses red fill for open pin", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice", "open");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#dc2626");
    expect(pin.classList.contains("markux-pin-resolved")).toBe(false);
    expect(pin.classList.contains("markux-pin-feedback")).toBe(false);
  });

  it("uses yellow fill for feedback pin", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice", "feedback");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#eab308");
    expect(pin.classList.contains("markux-pin-feedback")).toBe(true);
  });

  it("uses green fill for resolved pin", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice", "resolved");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#16a34a");
    expect(pin.classList.contains("markux-pin-resolved")).toBe(true);
  });

  it("defaults to open fill when status is undefined", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#dc2626");
  });
});
```

- [ ] **Step 2: Run the test — expect the feedback case to fail**

Run: `npx vitest run tests/ui/pin-marker.test.js`

Expected: `uses yellow fill for feedback pin` fails (the yellow SVG doesn't exist yet and the dispatch falls through to the open pin).

- [ ] **Step 3: Update `src/ui/pin-marker.js`**

Replace the SVG constants block and the dispatch:

```js
// src/ui/pin-marker.js

// Static trusted SVGs — safe for setting as markup (no user input)
const PIN_SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#dc2626" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"/>
</svg>`;
const PIN_SVG_FEEDBACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#eab308" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"/>
</svg>`;
const PIN_SVG_RESOLVED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#16a34a" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"/>
</svg>`;

const PIN_SVG_BY_STATUS = {
  open: PIN_SVG_OPEN,
  feedback: PIN_SVG_FEEDBACK,
  resolved: PIN_SVG_RESOLVED,
};
```

Update the jsdoc `@param` comment for `status` to read:

```js
 * @param {string} [status] - "open", "feedback", or "resolved"
```

Update the status handling inside `createPinMarker` — the existing code is:

```js
  if (status === "resolved") pin.classList.add("markux-pin-resolved");
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
  const svg = status === "resolved" ? PIN_SVG_RESOLVED : PIN_SVG_OPEN;
```

Change to:

```js
  if (status === "resolved") pin.classList.add("markux-pin-resolved");
  if (status === "feedback") pin.classList.add("markux-pin-feedback");
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
  const svg = PIN_SVG_BY_STATUS[status] || PIN_SVG_OPEN;
```

Leave the existing line that assigns the SVG markup to the pin element (`pin.innerHTML = svg;`) unchanged — the constants are trusted and it already has the lint-disable annotation.

- [ ] **Step 4: Run the test — expect pass**

Run: `npx vitest run tests/ui/pin-marker.test.js`

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/ui/pin-marker.test.js src/ui/pin-marker.js
git commit -m "widget: add yellow feedback pin variant"
```

---

## Task 4: Widget StatusSelect component (TDD)

**Files:**
- Create: `src/ui/status-select.js`
- Create: `tests/ui/status-select.test.js`
- Modify: `src/ui/styles.js` (append popup styles)

- [ ] **Step 1: Write the failing test**

Create `tests/ui/status-select.test.js`:

```js
// tests/ui/status-select.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatusSelect } from "../../src/ui/status-select.js";

describe("createStatusSelect (widget)", () => {
  let host;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  });

  it("renders a button with the current status label", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    expect(el.tagName).toBe("BUTTON");
    expect(el.textContent).toContain("open");
    expect(el.classList.contains("markux-status")).toBe(true);
    expect(el.classList.contains("markux-status-open")).toBe(true);
  });

  it("applies feedback class when value is feedback", () => {
    const el = createStatusSelect({ value: "feedback", onChange: () => {}, root: host });
    expect(el.classList.contains("markux-status-feedback")).toBe(true);
    expect(el.textContent).toContain("feedback");
  });

  it("opens popup with 3 options on click", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    host.appendChild(el);
    el.click();
    const popup = host.querySelector(".markux-status-select-popup");
    expect(popup).not.toBeNull();
    const opts = popup.querySelectorAll(".markux-status-select-option");
    expect(opts.length).toBe(3);
    expect([...opts].map(o => o.dataset.value)).toEqual(["open", "feedback", "resolved"]);
  });

  it("fires onChange and closes popup when an option is clicked", () => {
    const onChange = vi.fn();
    const el = createStatusSelect({ value: "open", onChange, root: host });
    host.appendChild(el);
    el.click();
    const opt = host.querySelector('.markux-status-select-option[data-value="feedback"]');
    opt.click();
    expect(onChange).toHaveBeenCalledWith("feedback");
    expect(host.querySelector(".markux-status-select-popup")).toBeNull();
  });

  it("closes popup on Escape", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    host.appendChild(el);
    el.click();
    expect(host.querySelector(".markux-status-select-popup")).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(host.querySelector(".markux-status-select-popup")).toBeNull();
  });

  it("closes popup on outside click", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    host.appendChild(el);
    el.click();
    expect(host.querySelector(".markux-status-select-popup")).not.toBeNull();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(host.querySelector(".markux-status-select-popup")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — expect all to fail (module doesn't exist)**

Run: `npx vitest run tests/ui/status-select.test.js`

Expected: FAIL with "Failed to resolve import" or similar — the module doesn't exist.

- [ ] **Step 3: Create `src/ui/status-select.js`**

```js
// src/ui/status-select.js

const STATUSES = ["open", "feedback", "resolved"];

/**
 * Create a clickable status pill that both displays and changes status.
 *
 * @param {object} opts
 * @param {"open"|"feedback"|"resolved"} opts.value - Current status
 * @param {(newStatus: string) => void} opts.onChange - Called when the user picks a new status
 * @param {Element|ShadowRoot} opts.root - Where the popup is appended (must share styles with the button)
 * @returns {HTMLButtonElement}
 */
export function createStatusSelect({ value, onChange, root }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `markux-status markux-status-select markux-status-${value}`;
  button.textContent = value;

  const chevron = document.createElement("span");
  chevron.className = "markux-status-select-chevron";
  chevron.textContent = "▾";
  button.appendChild(chevron);

  let popup = null;

  function closePopup() {
    if (!popup) return;
    popup.remove();
    popup = null;
    document.removeEventListener("keydown", handleKey);
    document.removeEventListener("mousedown", handleOutside, true);
  }

  function handleKey(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closePopup();
    }
  }

  function handleOutside(e) {
    if (popup && !popup.contains(e.target) && e.target !== button) {
      closePopup();
    }
  }

  function openPopup() {
    if (popup) return;
    popup = document.createElement("div");
    popup.className = "markux-status-select-popup";
    const rect = button.getBoundingClientRect();
    popup.style.position = "fixed";
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.left = `${rect.left}px`;
    popup.style.zIndex = "2147483647";

    STATUSES.forEach((s) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = `markux-status markux-status-${s} markux-status-select-option`;
      opt.dataset.value = s;
      opt.textContent = s;
      if (s === value) opt.classList.add("markux-status-select-option-current");
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        closePopup();
        if (s !== value) onChange(s);
      });
      popup.appendChild(opt);
    });

    root.appendChild(popup);
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleOutside, true);
  }

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popup) closePopup();
    else openPopup();
  });

  return button;
}
```

- [ ] **Step 4: Append popup styles to `src/ui/styles.js`**

Add the following rules at the end of the STYLES template (just before the closing backtick):

```css
  .markux-status-select {
    border: none;
    cursor: pointer;
    font: inherit;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .markux-status-select-chevron {
    font-size: 10px;
    opacity: 0.7;
  }
  .markux-status-select-popup {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 120px;
  }
  .markux-status-select-option {
    border: none;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }
  .markux-status-select-option-current {
    outline: 2px solid #111827;
    outline-offset: -2px;
  }
```

- [ ] **Step 5: Run the test — expect pass**

Run: `npx vitest run tests/ui/status-select.test.js`

Expected: all 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui/status-select.js tests/ui/status-select.test.js src/ui/styles.js
git commit -m "widget: StatusSelect dropdown component"
```

---

## Task 5: Wire StatusSelect into the widget sidebar

**Files:**
- Modify: `src/ui/sidebar.js` (lines 77, 107-109, 139-149)

- [ ] **Step 1: Import StatusSelect at the top of `src/ui/sidebar.js`**

At the top of the file, after the existing imports, add:

```js
import { createStatusSelect } from "./status-select.js";
```

- [ ] **Step 2: Replace the status badge and toggle button with StatusSelect**

In `updateSidebarList`, find the current status span creation:

```js
    const status = document.createElement("span");
    status.className = `markux-status ${annotation.status === "open" ? "markux-status-open" : "markux-status-resolved"}`;
    status.textContent = annotation.status;
```

Replace with:

```js
    const status = createStatusSelect({
      value: annotation.status,
      onChange: (newStatus) => onStatusChange(annotation, newStatus),
      root: sidebar,
    });
```

Then find the action-row block that creates `statusBtn`:

```js
    // Status toggle
    const statusBtn = document.createElement("button");
    statusBtn.className = "markux-sidebar-item-status-btn";
    statusBtn.textContent = annotation.status === "open" ? "Resolve" : "Reopen";
    statusBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      statusBtn.disabled = true;
      const newStatus = annotation.status === "open" ? "resolved" : "open";
      await onStatusChange(annotation, newStatus);
    });
    actions.appendChild(statusBtn);
```

Delete this entire block. The inline status pill in `itemHeader` now handles status changes; the action row no longer needs a status button.

- [ ] **Step 3: Run existing tests to confirm no regressions**

Run: `npx vitest run`

Expected: all tests pass. (No sidebar-specific tests exist; this step just confirms nothing else broke.)

- [ ] **Step 4: Commit**

```bash
git add src/ui/sidebar.js
git commit -m "widget: sidebar uses StatusSelect, drops separate Resolve button"
```

---

## Task 6: Wire StatusSelect into the widget thread popover

**Files:**
- Modify: `src/ui/thread-popover.js` (line 13 signature, lines 32-35)
- Modify: `src/index.js` (createThreadPopover call site)

- [ ] **Step 1: Import StatusSelect in thread-popover.js**

At the top of `src/ui/thread-popover.js`, after the existing import, add:

```js
import { createStatusSelect } from "./status-select.js";
```

- [ ] **Step 2: Add `onStatusChange` to the function signature and replace the status span**

Find the `createThreadPopover` signature:

```js
export function createThreadPopover(
  annotation,
  replies,
  position,
  onReply,
  onClose,
) {
```

Change to:

```js
export function createThreadPopover(
  annotation,
  replies,
  position,
  onReply,
  onClose,
  onStatusChange,
) {
```

Update the jsdoc block just above the function to add:

```js
 * @param {(newStatus: string) => void} onStatusChange - Called when status changes via the dropdown
```

Find the status span creation in the header:

```js
  const statusSpan = document.createElement("span");
  statusSpan.className = `markux-status ${annotation.status === "open" ? "markux-status-open" : "markux-status-resolved"}`;
  statusSpan.textContent = annotation.status;
  header.appendChild(statusSpan);
```

Replace with:

```js
  const statusSelect = createStatusSelect({
    value: annotation.status,
    onChange: onStatusChange,
    root: popover,
  });
  header.appendChild(statusSelect);
```

- [ ] **Step 3: Find and update the `createThreadPopover` call site in `src/index.js`**

Run: `grep -n "createThreadPopover" /Users/julia/Sites/markux/src/index.js`

At the call site, read the surrounding lines to identify the existing status-change handler already wired for the sidebar (look for an `onStatusChange` or `handleSidebarStatusChange` in the same file). Add a sixth argument to the `createThreadPopover` call that wires status changes through that same handler. Conceptual pattern (use the actual handler name from the file):

```js
const popover = createThreadPopover(
  annotation,
  replies,
  { x, y },
  (replyData) => /* existing reply handler */,
  closePopover,
  (newStatus) => handleSidebarStatusChange(annotation, newStatus),
);
```

The goal: the popover dispatches status changes through the same path as the sidebar does — which updates the DB, reloads annotations, and re-renders.

- [ ] **Step 4: Run tests**

Run: `npx vitest run`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/thread-popover.js src/index.js
git commit -m "widget: thread popover uses StatusSelect with onStatusChange"
```

---

## Task 7: Widget badge count + sort order

**Files:**
- Modify: `src/index.js` (filter call sites near lines 212-213 and 365, sort comparator near lines 327-330)

- [ ] **Step 1: Update the sort comparator**

Find:

```js
      // Sort: open first, resolved at bottom
      const annotations = (data || []).sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "open" ? -1 : 1;
      });
```

Replace with:

```js
      // Sort: open → feedback → resolved
      const statusOrder = { open: 0, feedback: 1, resolved: 2 };
      const annotations = (data || []).sort((a, b) => {
        return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      });
```

- [ ] **Step 2: Update the three filter call sites**

Find (inside the post-create handler, around line 212-213):

```js
            updateSidebarBadge(sidebar, getAnnotations().filter((a) => a.status === "open").length);
            updateSidebarList(sidebar, getAnnotations().filter((a) => a.status === "open"), sidebarCallbacks);
```

Replace with:

```js
            updateSidebarBadge(sidebar, getAnnotations().filter((a) => a.status !== "resolved").length);
            updateSidebarList(sidebar, getAnnotations().filter((a) => a.status !== "resolved"), sidebarCallbacks);
```

Find (around line 365, inside `loadAnnotations`):

```js
      updateSidebarBadge(sidebar, annotations.filter((a) => a.status === "open").length);
```

Replace with:

```js
      updateSidebarBadge(sidebar, annotations.filter((a) => a.status !== "resolved").length);
```

Note: the `updateSidebarList(sidebar, annotations, sidebarCallbacks)` call immediately after passes all annotations (not filtered) — no change needed there.

- [ ] **Step 3: Run tests**

Run: `npx vitest run`

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/index.js
git commit -m "widget: include feedback in active count and sort order"
```

---

## Task 8: Admin StatusSelect component (TDD)

**Files:**
- Create: `admin/js/components/status-select.js`
- Create: `tests/admin/status-select.test.js`
- Modify: `admin/css/admin.css` (append popup styles)

- [ ] **Step 1: Write the failing test**

Create `tests/admin/status-select.test.js`:

```js
// tests/admin/status-select.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatusSelect } from "../../admin/js/components/status-select.js";

function clearBody() {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
}

describe("createStatusSelect (admin)", () => {
  beforeEach(() => clearBody());
  afterEach(() => clearBody());

  it("renders a button with the current status label and class", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {} });
    expect(el.tagName).toBe("BUTTON");
    expect(el.textContent).toContain("open");
    expect(el.classList.contains("status")).toBe(true);
    expect(el.classList.contains("status-open")).toBe(true);
  });

  it("applies status-feedback when value is feedback", () => {
    const el = createStatusSelect({ value: "feedback", onChange: () => {} });
    expect(el.classList.contains("status-feedback")).toBe(true);
  });

  it("opens popup with 3 options on click", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {} });
    document.body.appendChild(el);
    el.click();
    const popup = document.querySelector(".status-select-popup");
    expect(popup).not.toBeNull();
    const opts = popup.querySelectorAll(".status-select-option");
    expect(opts.length).toBe(3);
  });

  it("fires onChange and closes popup on option click", () => {
    const onChange = vi.fn();
    const el = createStatusSelect({ value: "open", onChange });
    document.body.appendChild(el);
    el.click();
    const opt = document.querySelector('.status-select-option[data-value="feedback"]');
    opt.click();
    expect(onChange).toHaveBeenCalledWith("feedback");
    expect(document.querySelector(".status-select-popup")).toBeNull();
  });

  it("closes popup on Escape", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {} });
    document.body.appendChild(el);
    el.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector(".status-select-popup")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

Run: `npx vitest run tests/admin/status-select.test.js`

Expected: FAIL with import resolution error (module doesn't exist yet).

- [ ] **Step 3: Create `admin/js/components/status-select.js`**

```js
// admin/js/components/status-select.js

const STATUSES = ["open", "feedback", "resolved"];

/**
 * Create a clickable status pill that both displays and changes status.
 *
 * @param {object} opts
 * @param {"open"|"feedback"|"resolved"} opts.value - Current status
 * @param {(newStatus: string) => void} opts.onChange - Called when the user picks a new status
 * @returns {HTMLButtonElement}
 */
export function createStatusSelect({ value, onChange }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `status status-select status-${value}`;
  button.textContent = value;

  const chevron = document.createElement("span");
  chevron.className = "status-select-chevron";
  chevron.textContent = "▾";
  button.appendChild(chevron);

  let popup = null;

  function closePopup() {
    if (!popup) return;
    popup.remove();
    popup = null;
    document.removeEventListener("keydown", handleKey);
    document.removeEventListener("mousedown", handleOutside, true);
  }

  function handleKey(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closePopup();
    }
  }

  function handleOutside(e) {
    if (popup && !popup.contains(e.target) && e.target !== button) {
      closePopup();
    }
  }

  function openPopup() {
    if (popup) return;
    popup = document.createElement("div");
    popup.className = "status-select-popup";
    const rect = button.getBoundingClientRect();
    popup.style.position = "fixed";
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.left = `${rect.left}px`;
    popup.style.zIndex = "9999";

    STATUSES.forEach((s) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = `status status-${s} status-select-option`;
      opt.dataset.value = s;
      opt.textContent = s;
      if (s === value) opt.classList.add("status-select-option-current");
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        closePopup();
        if (s !== value) onChange(s);
      });
      popup.appendChild(opt);
    });

    document.body.appendChild(popup);
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleOutside, true);
  }

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popup) closePopup();
    else openPopup();
  });

  return button;
}
```

- [ ] **Step 4: Append popup styles to `admin/css/admin.css`**

Add at the end of the file:

```css
.status-select { border: none; cursor: pointer; font: inherit; display: inline-flex; align-items: center; gap: 4px; }
.status-select-chevron { font-size: 10px; opacity: 0.7; }
.status-select-popup { background: white; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); padding: 4px; display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
.status-select-option { border: none; cursor: pointer; font: inherit; text-align: left; }
.status-select-option-current { outline: 2px solid #111827; outline-offset: -2px; }
```

- [ ] **Step 5: Run the test — expect pass**

Run: `npx vitest run tests/admin/status-select.test.js`

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add admin/js/components/status-select.js tests/admin/status-select.test.js admin/css/admin.css
git commit -m "admin: StatusSelect dropdown component"
```

---

## Task 9: Admin table — use StatusSelect, remove toggle column, remove sort on Status

**Files:**
- Modify: `admin/project.html` (lines 34-45, 49-54)
- Modify: `admin/js/project-detail.js` (`renderAnnotationRow`, lines 108-184)

- [ ] **Step 1: Update `admin/project.html` thead**

Find the header row:

```html
          <tr>
            <th class="sortable" data-sort="page_url"><span class="sort-label">Page</span><span class="sort-indicator"></span></th>
            <th>Comment</th>
            <th class="sortable" data-sort="status"><span class="sort-label">Status</span><span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="author_name"><span class="sort-label">Author</span><span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="created_at"><span class="sort-label">Date</span><span class="sort-indicator"></span></th>
            <th></th>
            <th></th>
          </tr>
```

Replace with:

```html
          <tr>
            <th class="sortable" data-sort="page_url"><span class="sort-label">Page</span><span class="sort-indicator"></span></th>
            <th>Comment</th>
            <th>Status</th>
            <th class="sortable" data-sort="author_name"><span class="sort-label">Author</span><span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="created_at"><span class="sort-label">Date</span><span class="sort-indicator"></span></th>
            <th></th>
          </tr>
```

(Status is no longer sortable — no `sortable` class, no `data-sort`, no indicator. One fewer `<th></th>` at the end because the Reopen/Resolve action column is gone.)

Find the filter row:

```html
          <tr class="filter-row">
            <td class="filter-cell">
              <select id="filter-page"><option value="">All pages</option></select>
            </td>
            <td class="filter-cell"></td>
            <td class="filter-cell">
              <select id="filter-status">
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </td>
            <td class="filter-cell">
              <select id="filter-author"><option value="">All authors</option></select>
            </td>
            <td class="filter-cell"></td>
            <td class="filter-cell"></td>
            <td class="filter-cell"></td>
          </tr>
```

Replace with:

```html
          <tr class="filter-row">
            <td class="filter-cell">
              <select id="filter-page"><option value="">All pages</option></select>
            </td>
            <td class="filter-cell"></td>
            <td class="filter-cell">
              <select id="filter-status">
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="feedback">Feedback</option>
                <option value="resolved">Resolved</option>
              </select>
            </td>
            <td class="filter-cell">
              <select id="filter-author"><option value="">All authors</option></select>
            </td>
            <td class="filter-cell"></td>
            <td class="filter-cell"></td>
          </tr>
```

(Added the Feedback option; dropped one trailing `<td class="filter-cell"></td>` to match the 6-column header.)

- [ ] **Step 2: Update `renderAnnotationRow` in `admin/js/project-detail.js`**

At the top of the file, after the existing import, add:

```js
import { createStatusSelect } from "./components/status-select.js";
```

Replace the entire `renderAnnotationRow` function (lines 108-184) with:

```js
export function renderAnnotationRow(annotation, onExpand, onStatusToggle) {
  const tr = document.createElement("tr");

  // Page URL cell
  const pageCell = document.createElement("td");
  pageCell.textContent = truncateUrl(annotation.page_url);
  pageCell.title = annotation.page_url;

  // Author cell
  const authorCell = document.createElement("td");
  const authorName = document.createElement("span");
  authorName.textContent = annotation.author_name;
  const authorEmail = document.createElement("small");
  authorEmail.className = "text-muted";
  authorEmail.textContent = annotation.author_email;
  authorCell.appendChild(authorName);
  authorCell.appendChild(document.createElement("br"));
  authorCell.appendChild(authorEmail);

  // Comment cell
  const commentCell = document.createElement("td");
  commentCell.textContent =
    annotation.comment.length > 60
      ? annotation.comment.slice(0, 60) + "..."
      : annotation.comment;

  // Status cell (interactive dropdown)
  const statusCell = document.createElement("td");
  const statusSelect = createStatusSelect({
    value: annotation.status,
    onChange: (newStatus) => onStatusToggle(annotation.id, newStatus),
  });
  statusCell.appendChild(statusSelect);

  // Date cell
  const dateCell = document.createElement("td");
  dateCell.textContent = new Date(annotation.created_at).toLocaleDateString();

  // View-in-context cell
  const viewCell = document.createElement("td");
  const viewLink = document.createElement("a");
  viewLink.href = `${annotation.page_url}#markux=${annotation.id}`;
  viewLink.target = "_blank";
  viewLink.rel = "noopener noreferrer";
  viewLink.textContent = "View";
  viewLink.className = "btn btn-sm btn-secondary";
  viewLink.addEventListener("click", (e) => e.stopPropagation());
  viewCell.appendChild(viewLink);

  tr.appendChild(pageCell);
  tr.appendChild(commentCell);
  tr.appendChild(statusCell);
  tr.appendChild(authorCell);
  tr.appendChild(dateCell);
  tr.appendChild(viewCell);

  tr.addEventListener("click", (e) => {
    if (e.target.closest(".status-select") || e.target.closest(".status-select-popup")) return;
    onExpand(annotation);
  });

  return tr;
}
```

Key changes vs. the old version:
- Static status span → `createStatusSelect`
- Action cell (toggle button) removed entirely — one fewer `<td>` appended
- Row click handler excludes clicks on the status dropdown so the row doesn't expand while changing status

- [ ] **Step 3: Run tests**

Run: `npx vitest run`

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add admin/project.html admin/js/project-detail.js
git commit -m "admin: annotations table uses StatusSelect, drops action column, Status no longer sortable"
```

---

## Task 10: Admin projects list — three count badges

**Files:**
- Modify: `admin/js/projects-list.js` (lines 14-29, 70-79)

- [ ] **Step 1: Read the current file**

Run: `sed -n '1,90p' /Users/julia/Sites/markux/admin/js/projects-list.js`

This grounds the edits below in the actual current structure (the file has a project-enrichment loop and a render function that appends status badges to a row container).

- [ ] **Step 2: Add the feedback count query**

Find:

```js
      const { count: openCount } = await supabase
        .from("annotations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "open");

      const { count: resolvedCount } = await supabase
        .from("annotations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "resolved");

      return { ...project, openCount: openCount || 0, resolvedCount: resolvedCount || 0 };
```

Replace with:

```js
      const { count: openCount } = await supabase
        .from("annotations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "open");

      const { count: feedbackCount } = await supabase
        .from("annotations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "feedback");

      const { count: resolvedCount } = await supabase
        .from("annotations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "resolved");

      return {
        ...project,
        openCount: openCount || 0,
        feedbackCount: feedbackCount || 0,
        resolvedCount: resolvedCount || 0,
      };
```

- [ ] **Step 3: Render the third badge**

Find the badge rendering block around lines 70-79:

```js
  const openStatus = document.createElement("span");
  openStatus.className = "status status-open";
  openStatus.textContent = `${project.openCount} open`;
```

(Note the parent container — read the surrounding ~10 lines to see what variable the append is using, e.g. `statusContainer.appendChild(openStatus)` or similar.)

Immediately after the `openStatus` creation-and-append block, insert:

```js
  const feedbackStatus = document.createElement("span");
  feedbackStatus.className = "status status-feedback";
  feedbackStatus.textContent = `${project.feedbackCount} feedback`;
  // append feedbackStatus to the same parent element that openStatus was appended to
```

Replace the `// append feedbackStatus to the same parent element...` comment with the actual append statement matching the surrounding code's pattern (e.g. `statusContainer.appendChild(feedbackStatus);`). Order in the DOM: open → feedback → resolved.

- [ ] **Step 4: Run tests**

Run: `npx vitest run`

Expected: pass (no tests cover this file, but regressions are checked).

- [ ] **Step 5: Commit**

```bash
git add admin/js/projects-list.js
git commit -m "admin: projects list shows feedback count alongside open and resolved"
```

---

## Task 11: Admin Visual Replay — extend status pill ternary

**Files:**
- Modify: `admin/js/visual-replay.js` (line 117)

- [ ] **Step 1: Update the status pill ternary**

Find:

```js
  const statusEl = document.createElement("span");
  statusEl.className = `status ${ann.status === "open" ? "status-open" : "status-resolved"}`;
```

Replace with:

```js
  const statusEl = document.createElement("span");
  statusEl.className = `status status-${ann.status}`;
```

(This dispatches to whichever status CSS class exists — `status-open`, `status-feedback`, or `status-resolved` — all of which are defined by Task 2.)

- [ ] **Step 2: Run tests**

Run: `npx vitest run`

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add admin/js/visual-replay.js
git commit -m "admin: visual replay supports feedback status color"
```

---

## Task 12: Rebuild widget bundle

**Files:**
- Modify: `dist/markux.js` (regenerated)

- [ ] **Step 1: Build**

Run: `npm run build`

Expected: `dist/markux.js` is regenerated with the new StatusSelect component and palette.

- [ ] **Step 2: Sanity-check the bundle**

Run: `grep -c "markux-status-feedback" dist/markux.js`

Expected: at least 1 (the new class appears in the bundle).

Run: `grep -c "#eab308" dist/markux.js`

Expected: at least 1 (the feedback pin SVG color is bundled).

- [ ] **Step 3: Commit the bundle**

```bash
git add dist/markux.js
git commit -m "build: rebuild widget bundle with feedback status"
```

---

## Task 13: Manual verification (no code commits for steps 1-5)

No code changes — this is the deploy-and-verify step. Do these in order.

- [ ] **Step 1: Apply the DB migration via Supabase dashboard**

- Open the Supabase dashboard for project `fcqywjpdjcsbcpnnfckw`.
- Open the SQL editor.
- Paste the contents of `supabase/migrations/003_add_feedback_status.sql` and run it.
- Expected: success, no errors.

Verify:

```sql
select constraint_name, check_clause
from information_schema.check_constraints
where constraint_name = 'annotations_status_check';
```

Expected output: the `check_clause` mentions all three values (`'open'`, `'feedback'`, `'resolved'`).

- [ ] **Step 2: Deploy the write-proxy**

Run: `supabase functions deploy write-proxy`

Expected: success.

- [ ] **Step 3: Push `main`**

```bash
git push origin main
```

GitHub Pages will serve the updated admin + widget bundle within ~1 minute.

- [ ] **Step 4: Admin sanity check**

- Load https://jmayhugh.github.io/markux/admin/ in a browser with cache disabled (or hard-refresh).
- Pick a project with annotations.
- Verify the Status column shows colored pills (red for open, green for resolved — no amber any more).
- Click an open pill → popup shows three options (open/feedback/resolved) with colored pills; Open is marked current.
- Pick Feedback → pill turns yellow, row remains visible.
- Verify the filter dropdown has a Feedback option that filters correctly.
- Verify there is no sort caret on the Status column header, and clicking it does nothing.
- Verify the Reopen/Resolve action column is gone.

- [ ] **Step 5: Widget sanity check**

- Load a live site with the widget installed (e.g. a teachengineering.org page with an annotation).
- Open the sidebar → status pill is now a dropdown. Click it → popup with 3 options.
- Pick Feedback → pill turns yellow, pin on the page turns yellow.
- Reload the page → the yellow pin + feedback pill persist.
- Confirm the sidebar badge count includes the feedback annotation (not just open ones).

- [ ] **Step 6: Update outstanding-work.md and commit**

If everything works, add an entry under "Done" for today's date in `docs/outstanding-work.md` referencing this plan and the spec. Commit and push:

```bash
git add docs/outstanding-work.md
git commit -m "docs: mark feedback status shipped"
git push origin main
```

---

## Rollback

If Task 13 step 4 or 5 reveals a blocker:

- **Code:** `git revert` the merge range for this work.
- **DB:** if no rows have `status = 'feedback'` yet, run this in the dashboard SQL editor:

```sql
alter table annotations drop constraint annotations_status_check;
alter table annotations add constraint annotations_status_check
  check (status in ('open', 'resolved'));
```

If any rows already use `'feedback'`, first remap them: `update annotations set status = 'open' where status = 'feedback';`, then run the constraint rollback.
