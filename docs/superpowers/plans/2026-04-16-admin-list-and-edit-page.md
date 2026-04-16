# Admin List Upgrades + Edit Project Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Edit Project to a dedicated full page (with Collaborators), relocate the annotations filter row under the table header, and make the five data columns sortable.

**Architecture:** Pure front-end changes to the admin SPA. A new `admin/edit-project.html` hosts project-field edits and the existing Collaborators UI, reachable via the Edit Project button that previously opened a modal. The annotations table on `admin/project.html` gains a filter row inside `<thead>` and clickable sort indicators on five column headers; sort state feeds through `loadAnnotations()` into a Supabase `.order()` call that replaces the hardcoded `created_at desc`.

**Tech Stack:** Vanilla JS (module scripts), static HTML pages, Supabase-js (browser). No build step for admin pages. Vitest covers `src/` (embed script) only; admin has no unit tests, so verification relies on `npm test` regression + Playwright browser checks against the deployed GitHub Pages admin.

**Spec:** `docs/specs/2026-04-16-admin-list-and-edit-page-design.md`

**Preconditions before starting:**
- Working on branch `main` (project convention).
- Repo root: `/Users/julia/Sites/markux`.
- The previous shared-admin-access work is merged and live on `main` (last commit: `5ab05a0`).
- GitHub Pages is configured to serve from `main` — pushing after each task makes the change live for browser verification.

**File structure after plan:**
- **New:** `admin/edit-project.html` — full-page editor (project name + domains + collaborators).
- **Modified:** `admin/project.html` — Edit button navigates; edit modal + collaborators card + collaborator modal removed; filter row rehomed inside `<thead>`; sort handlers on 5 column headers.
- **Modified:** `admin/js/project-detail.js` — `loadAnnotations` accepts `sort` parameter; `renderAnnotationRow` unchanged.
- **Modified:** `admin/css/admin.css` — `.filter-cell` rules for in-table filter controls; sortable header styles with arrow indicator.
- **Unchanged:** `admin/js/collaborators.js`, `admin/js/auth.js`, `admin/js/supabase-client.js`, `admin/js/projects-list.js`, `admin/js/csv-export.js`, `admin/js/embed-snippet.js`, `admin/js/visual-replay.js`, `admin/index.html`, `admin/projects.html`, everything in `src/`, `supabase/`, `dist/`.

**Verification strategy per task:** Each task ends with `npm test` (must remain 45/45 passing as a regression guard on the embed script) and a commit. Playwright browser verification is consolidated into a final Task 6 after the UI is fully reassembled, since partially-refactored states won't give useful screenshots.

---

### Task 1: Add `sort` parameter to `loadAnnotations`

Pure refactor. Default behavior must match the current `.order("created_at", { ascending: false })`. No other callers change in this task.

**Files:**
- Modify: `admin/js/project-detail.js:36-57`

- [ ] **Step 1: Replace `loadAnnotations` with sort-aware version**

Replace the existing function (lines 36–57) with:

```js
export async function loadAnnotations(projectId, filters = {}, sort = { column: "created_at", direction: "desc" }) {
  const supabase = getSupabase();
  const ascending = sort.direction === "asc";
  let query = supabase
    .from("annotations")
    .select("*")
    .eq("project_id", projectId)
    .order(sort.column, { ascending });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.pageUrl) {
    query = query.eq("page_url", filters.pageUrl);
  }
  if (filters.author) {
    query = query.ilike("author_name", `%${filters.author}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
```

Nothing else in the file changes.

- [ ] **Step 2: Verify existing callers still work by default**

Run: `grep -n "loadAnnotations" admin`
Expected output includes callers in `admin/project.html` (approximately lines 165, 191). Confirm by reading each call site that they pass only `(projectId)` or `(projectId, filters)` — both cases will now use the new default `sort` of `{ column: "created_at", direction: "desc" }`, which is byte-equivalent to the previous behavior.

- [ ] **Step 3: Run regression tests**

Run: `cd /Users/julia/Sites/markux && npm test`
Expected: `Test Files 10 passed (10)`, `Tests 45 passed (45)`.

- [ ] **Step 4: Commit**

```bash
cd /Users/julia/Sites/markux
git add admin/js/project-detail.js
git commit -m "admin: loadAnnotations accepts sort parameter (default created_at desc)"
```

---

### Task 2: Create the Edit Project full-page view

New standalone page. Keeps its own inline script module, same pattern as `project.html`. Not yet reachable from nav — Task 3 wires the Edit button to it.

**Files:**
- Create: `admin/edit-project.html`

- [ ] **Step 1: Write `admin/edit-project.html`**

Create the file with exactly this content:

```html
<!-- admin/edit-project.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit Project — MarkUX Admin</title>
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>
  <div class="header">
    <h1><a href="projects.html" style="color:inherit;text-decoration:none">MarkUX</a></h1>
    <div class="header-actions">
      <button id="logout-btn" class="btn btn-secondary">Sign Out</button>
    </div>
  </div>

  <div class="container">
    <div class="flex justify-between items-center mb-4 mt-4">
      <h2 id="edit-heading">Editing</h2>
      <a id="back-link" class="btn btn-sm btn-secondary" href="#">Back to project</a>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">Project details</h3>
      <form id="edit-form">
        <div class="form-group">
          <label class="form-label">Project Name</label>
          <input class="form-input" type="text" id="edit-name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Allowed Domains (comma-separated)</label>
          <input class="form-input" type="text" id="edit-domains" placeholder="localhost, example.com">
        </div>
        <div id="edit-error" class="error-msg" style="display:none"></div>
        <div id="edit-saved" class="text-muted" style="display:none;margin-top:8px">Saved.</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>

    <div class="card collaborators" id="collaborators-section" style="margin-bottom:16px">
      <div class="flex justify-between items-center" style="margin-bottom:8px">
        <h3 id="collaborators-title">Collaborators</h3>
        <button type="button" id="collaborators-toggle" class="btn btn-sm btn-secondary">Collapse</button>
      </div>
      <div id="collaborators-list"></div>
      <div id="collaborators-empty" class="empty-state" style="display:none">No collaborators yet.</div>
    </div>
  </div>

  <!-- Edit Collaborator Modal -->
  <div id="collaborator-modal" class="modal-backdrop" style="display:none">
    <div class="modal">
      <h3>Edit Collaborator</h3>
      <form id="collaborator-form">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="form-input" type="text" id="collab-name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" id="collab-email" required>
        </div>
        <div id="collab-error" class="error-msg" style="display:none"></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button type="submit" class="btn btn-primary" id="collab-save" disabled>Save</button>
          <button type="button" id="collab-cancel" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script type="module">
    import { requireAuth, signOut } from './js/auth.js';
    import { loadProject, updateProject } from './js/project-detail.js';
    import { renderCollaboratorsSection } from './js/collaborators.js';

    const session = await requireAuth();
    if (!session) throw new Error('Not authenticated');

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    if (!projectId) { window.location.href = 'projects.html'; throw new Error('No project ID'); }

    const project = await loadProject(projectId);
    document.getElementById('edit-heading').textContent = `Editing: ${project.name}`;
    document.title = `Edit ${project.name} — MarkUX Admin`;
    document.getElementById('back-link').href = `project.html?id=${projectId}`;
    document.getElementById('logout-btn').addEventListener('click', signOut);

    // Prefill form
    document.getElementById('edit-name').value = project.name;
    document.getElementById('edit-domains').value = project.allowed_domains.join(', ');

    // Save project fields (stay on page so collaborator edits can follow)
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-name').value.trim();
      const domainsStr = document.getElementById('edit-domains').value.trim();
      const domains = domainsStr.split(',').map(d => d.trim()).filter(Boolean);
      const errEl = document.getElementById('edit-error');
      const savedEl = document.getElementById('edit-saved');
      errEl.style.display = 'none';
      savedEl.style.display = 'none';

      if (!name) return;

      try {
        const updated = await updateProject(projectId, { name, allowed_domains: domains });
        project.name = updated.name;
        project.allowed_domains = updated.allowed_domains;
        document.getElementById('edit-heading').textContent = `Editing: ${updated.name}`;
        document.title = `Edit ${updated.name} — MarkUX Admin`;
        savedEl.style.display = 'block';
        setTimeout(() => { savedEl.style.display = 'none'; }, 2000);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });

    // Collaborators section
    await renderCollaboratorsSection(projectId);
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify the file is well-formed and imports resolve**

Run: `grep -n "import " admin/edit-project.html`
Expected: three import lines for `./js/auth.js`, `./js/project-detail.js`, `./js/collaborators.js`. Each target file already exists (confirm with `ls admin/js/`).

Run: `grep -c "renderCollaboratorsSection" admin/edit-project.html`
Expected: `2` (one import, one call).

- [ ] **Step 3: Run regression tests**

Run: `cd /Users/julia/Sites/markux && npm test`
Expected: `Tests 45 passed (45)`.

- [ ] **Step 4: Commit**

```bash
cd /Users/julia/Sites/markux
git add admin/edit-project.html
git commit -m "admin: add edit-project full-page view"
```

---

### Task 3: Rewire Edit button + remove modal/collaborators from project.html

Change the Edit Project button from "open modal" to "navigate to edit-project.html". Remove the edit-project modal, the collaborators card, and the collaborator add/edit modal — those now live on the edit page.

**Files:**
- Modify: `admin/project.html` (multiple blocks)

- [ ] **Step 1: Change the Edit Project button handler**

In `admin/project.html`, locate the existing handler block that begins:

```js
    // Edit project
    document.getElementById('edit-btn').addEventListener('click', () => {
      document.getElementById('edit-name').value = project.name;
      document.getElementById('edit-domains').value = project.allowed_domains.join(', ');
      document.getElementById('edit-error').style.display = 'none';
      document.getElementById('edit-modal').style.display = 'flex';
    });

    document.getElementById('close-edit').addEventListener('click', () => {
      document.getElementById('edit-modal').style.display = 'none';
    });

    document.getElementById('edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-name').value.trim();
      const domainsStr = document.getElementById('edit-domains').value.trim();
      const domains = domainsStr.split(',').map(d => d.trim()).filter(Boolean);

      if (!name) return;

      try {
        const updated = await updateProject(projectId, { name, allowed_domains: domains });
        project.name = updated.name;
        project.allowed_domains = updated.allowed_domains;
        document.getElementById('project-name').textContent = updated.name;
        document.getElementById('edit-modal').style.display = 'none';
      } catch (err) {
        const errEl = document.getElementById('edit-error');
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });
```

Replace that entire block with:

```js
    // Edit project → navigate to full-page editor
    document.getElementById('edit-btn').addEventListener('click', () => {
      window.location.href = `edit-project.html?id=${projectId}`;
    });
```

- [ ] **Step 2: Remove the Edit Project modal markup**

In `admin/project.html`, delete the entire `<!-- Edit Modal -->` block (the `<div id="edit-modal" class="modal-backdrop" ...>` element and its contents — currently lines 83–102).

- [ ] **Step 3: Remove the Collaborators card**

Delete the entire `<div class="card collaborators" id="collaborators-section" ...>` block (currently lines 31–38) from `admin/project.html`.

- [ ] **Step 4: Remove the Collaborator Modal markup**

Delete the entire `<!-- Edit Collaborator Modal -->` block (the `<div id="collaborator-modal" ...>` element and its contents — currently lines 104–124).

- [ ] **Step 5: Remove the Collaborators JS wiring**

In `admin/project.html`, remove this import:

```js
    import { renderCollaboratorsSection } from './js/collaborators.js';
```

And remove this call (currently ~line 328):

```js
    // Render Collaborators section (refreshes annotations when a collaborator edit happens)
    await renderCollaboratorsSection(projectId, { onChange: () => render() });
```

- [ ] **Step 6: Prune now-unused imports from project-detail.js**

In `admin/project.html`'s inline script, the imports list currently reads:

```js
    import {
      loadProject, loadAnnotations, loadReplies,
      updateAnnotationStatus, getPageUrls, renderAnnotationRow,
      updateProject, deleteProject
    } from './js/project-detail.js';
```

Remove `updateProject` (its only caller was the deleted edit-form submit handler). Keep `deleteProject` — the Delete button in `project.html`'s header still uses it. Result:

```js
    import {
      loadProject, loadAnnotations, loadReplies,
      updateAnnotationStatus, getPageUrls, renderAnnotationRow,
      deleteProject
    } from './js/project-detail.js';
```

- [ ] **Step 7: Verify no leftover references**

Run: `grep -n "edit-modal\|edit-name\|edit-domains\|edit-form\|edit-error\|renderCollaboratorsSection\|collaborators-section\|collaborator-modal\|collab-name\|collab-email\|close-edit\|updateProject" admin/project.html`
Expected: no output (empty). If any line matches, audit and remove.

- [ ] **Step 8: Run regression tests**

Run: `cd /Users/julia/Sites/markux && npm test`
Expected: `Tests 45 passed (45)`.

- [ ] **Step 9: Commit**

```bash
cd /Users/julia/Sites/markux
git add admin/project.html
git commit -m "admin: move Edit Project + Collaborators to dedicated page"
```

---

### Task 4: Move the filter row into the table header

Delete the `.filters` div and add a filter row as a second `<tr>` inside `<thead>`. Preserve all filter control IDs and behavior.

**Files:**
- Modify: `admin/project.html`
- Modify: `admin/css/admin.css`

- [ ] **Step 1: Remove the standalone filter bar**

In `admin/project.html`, delete this block (currently lines 40–48):

```html
    <div class="filters" id="filters">
      <select id="filter-status">
        <option value="">All statuses</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
      </select>
      <select id="filter-page"><option value="">All pages</option></select>
      <input id="filter-author" type="text" placeholder="Filter by author...">
    </div>
```

- [ ] **Step 2: Add the filter row inside `<thead>`**

Locate the `<thead>` block inside `#list-view`. Currently it reads:

```html
        <thead>
          <tr><th>Page</th><th>Author</th><th>Comment</th><th>Status</th><th>Date</th><th></th><th></th></tr>
        </thead>
```

Replace with:

```html
        <thead>
          <tr><th>Page</th><th>Author</th><th>Comment</th><th>Status</th><th>Date</th><th></th><th></th></tr>
          <tr class="filter-row">
            <td class="filter-cell">
              <select id="filter-page"><option value="">All pages</option></select>
            </td>
            <td class="filter-cell">
              <input id="filter-author" type="text" placeholder="Filter by author...">
            </td>
            <td class="filter-cell"></td>
            <td class="filter-cell">
              <select id="filter-status">
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </td>
            <td class="filter-cell"></td>
            <td class="filter-cell"></td>
            <td class="filter-cell"></td>
          </tr>
        </thead>
```

Note: the filter cells line up under their columns in this order — Page / Author / Comment / Status / Date / Action / View — matching the header row exactly.

- [ ] **Step 3: Add CSS for the filter row**

In `admin/css/admin.css`, find the existing `.filters` rules (currently lines 90–91):

```css
.filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.filters select, .filters input { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
```

Replace those two lines with:

```css
.filter-row td.filter-cell { background: #f9fafb; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
.filter-cell select, .filter-cell input { width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
```

The old `.filters` rules are no longer referenced (the container is gone), so removing them avoids dead CSS.

- [ ] **Step 4: Verify no leftover `.filters` references in admin HTML**

Run: `grep -n "class=\"filters\"\|id=\"filters\"" admin/*.html`
Expected: no output.

- [ ] **Step 5: Run regression tests**

Run: `cd /Users/julia/Sites/markux && npm test`
Expected: `Tests 45 passed (45)`.

- [ ] **Step 6: Commit**

```bash
cd /Users/julia/Sites/markux
git add admin/project.html admin/css/admin.css
git commit -m "admin: move annotation filters into table header row"
```

---

### Task 5: Make the five data column headers sortable

Wire click handlers on Page / Author / Comment / Status / Date header cells. Track sort state; feed it into `loadAnnotations`. Arrow indicator on active column.

**Files:**
- Modify: `admin/project.html`
- Modify: `admin/css/admin.css`

- [ ] **Step 1: Give the sortable headers IDs and a shared class**

In `admin/project.html`, the first `<thead>` row currently reads:

```html
          <tr><th>Page</th><th>Author</th><th>Comment</th><th>Status</th><th>Date</th><th></th><th></th></tr>
```

Replace with:

```html
          <tr>
            <th class="sortable" data-sort="page_url"><span class="sort-label">Page</span><span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="author_name"><span class="sort-label">Author</span><span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="comment"><span class="sort-label">Comment</span><span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="status"><span class="sort-label">Status</span><span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="created_at"><span class="sort-label">Date</span><span class="sort-indicator"></span></th>
            <th></th>
            <th></th>
          </tr>
```

- [ ] **Step 2: Add CSS for sortable headers**

In `admin/css/admin.css`, directly after the existing `.table th { ... }` rule (line 76), add:

```css
.table th.sortable { cursor: pointer; user-select: none; }
.table th.sortable:hover { color: #374151; }
.table th .sort-indicator { display: inline-block; margin-left: 6px; font-size: 10px; color: #9ca3af; min-width: 8px; }
.table th.sortable.active .sort-indicator { color: #6366f1; }
```

- [ ] **Step 3: Add sort state + render integration in the inline script**

In `admin/project.html`'s inline `<script type="module">`, locate the existing `render()` function. It currently reads:

```js
    async function render() {
      const filters = {
        status: document.getElementById('filter-status').value,
        pageUrl: document.getElementById('filter-page').value,
        author: document.getElementById('filter-author').value,
      };
      const annotations = await loadAnnotations(projectId, filters);
      tbody.replaceChildren();
      if (annotations.length === 0) {
        listEmpty.style.display = 'block';
      } else {
        listEmpty.style.display = 'none';
        annotations.forEach(a => {
          tbody.appendChild(renderAnnotationRow(a, expandThread, async (id, status) => {
            await updateAnnotationStatus(id, status);
            await render();
          }));
        });
      }
    }
```

Replace with:

```js
    let sortState = { column: 'created_at', direction: 'desc' };

    async function render() {
      const filters = {
        status: document.getElementById('filter-status').value,
        pageUrl: document.getElementById('filter-page').value,
        author: document.getElementById('filter-author').value,
      };
      const annotations = await loadAnnotations(projectId, filters, sortState);
      tbody.replaceChildren();
      if (annotations.length === 0) {
        listEmpty.style.display = 'block';
      } else {
        listEmpty.style.display = 'none';
        annotations.forEach(a => {
          tbody.appendChild(renderAnnotationRow(a, expandThread, async (id, status) => {
            await updateAnnotationStatus(id, status);
            await render();
          }));
        });
      }
      updateSortIndicators();
    }

    function updateSortIndicators() {
      document.querySelectorAll('th.sortable').forEach(th => {
        const col = th.getAttribute('data-sort');
        const indicator = th.querySelector('.sort-indicator');
        if (col === sortState.column) {
          th.classList.add('active');
          indicator.textContent = sortState.direction === 'asc' ? '▲' : '▼';
        } else {
          th.classList.remove('active');
          indicator.textContent = '';
        }
      });
    }

    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (sortState.column === col) {
          sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
          sortState = { column: col, direction: 'asc' };
        }
        render();
      });
    });
```

Nothing else in the script changes. The existing filter event listeners on `filter-status`, `filter-page`, `filter-author` continue to call `render()` unchanged.

- [ ] **Step 4: Verify no stray references to the old hardcoded ordering**

Run: `grep -n "created_at.*ascending" admin/`
Expected: no matches in `admin/project.html`. (The only remaining reference lives in `admin/js/project-detail.js` inside `loadAnnotations`, which is correct — it's the default now.)

- [ ] **Step 5: Run regression tests**

Run: `cd /Users/julia/Sites/markux && npm test`
Expected: `Tests 45 passed (45)`.

- [ ] **Step 6: Commit**

```bash
cd /Users/julia/Sites/markux
git add admin/project.html admin/css/admin.css
git commit -m "admin: make Page/Author/Comment/Status/Date columns sortable"
```

---

### Task 6: Push and verify in the browser

After all code commits, push to `main` (triggers GitHub Pages deploy) and verify the flow end-to-end via Playwright MCP.

**Files:** None modified.

- [ ] **Step 1: Push all commits**

```bash
cd /Users/julia/Sites/markux
git push origin main
```

Expected: five commits pushed (Tasks 1 through 5). Confirm with `git log --oneline origin/main | head -6`.

- [ ] **Step 2: Wait for GitHub Pages deploy**

Wait ~60 seconds or confirm via `https://github.com/jmayhugh/markux/actions` that the `pages-build-deployment` run has completed.

- [ ] **Step 3: Browser verification — Edit Project flow**

Using Playwright MCP:

1. `browser_navigate` to `https://jmayhugh.github.io/markux/admin/`.
2. Sign in as `julia.mayhugh@gmail.com` (password from the user — prompt if missing).
3. Click into any project card.
4. Click **Edit Project** in the header — expect navigation to `https://jmayhugh.github.io/markux/admin/edit-project.html?id=<uuid>`.
5. `browser_snapshot`: confirm the page shows **Editing: \<project name\>**, a Project details form pre-filled with the current name + domains, and a Collaborators section.
6. Change the project name to `<original> (edited)`, submit. Expect a "Saved." message and the heading updates.
7. Revert by editing back to the original name and saving.
8. Click **Back to project** — expect navigation back to `project.html?id=<uuid>`.
9. `browser_console_messages` — confirm no errors.

Expected: all steps succeed; no console errors.

- [ ] **Step 4: Browser verification — Collaborators on the edit page**

Continuing the same session, on the edit page:

1. Confirm the Collaborators section renders a list (or the "No collaborators yet." empty state if this project has none).
2. If any collaborators exist, click one to open the modal, confirm prefilled Name/Email, close via Cancel.
3. `browser_console_messages` — confirm no errors from `collaborators.js`.

Expected: collaborators UI behaves identically to its previous location.

- [ ] **Step 5: Browser verification — Filter row inside the table**

Back on `project.html?id=<uuid>`:

1. `browser_snapshot` — confirm there is no standalone filter bar above the table. The filter controls (page dropdown, author input, status dropdown) appear **inside the table**, in a row directly beneath the column-header row, visually associated with Page / Author / Status columns respectively.
2. Use the Status dropdown to filter to "Open" — the list updates.
3. Type a substring into Author — the list updates.
4. Use the Page dropdown to filter to a specific page — the list updates.
5. Clear all three — the list restores.
6. `browser_console_messages` — no errors.

Expected: filters behave identically to before; only the visual placement changed.

- [ ] **Step 6: Browser verification — Sortable columns**

Still on `project.html`:

1. Confirm default sort is Date descending — the Date header shows `▼` and rows are newest-first.
2. Click **Page** header — `▲` appears on Page, `▼` disappears from Date, rows reorder by page_url ascending.
3. Click **Page** again — `▼` appears, rows flip.
4. Click **Author** — sort switches to Author ascending, `▲` on Author, no indicator on Page.
5. Repeat for **Comment**, **Status**, **Date** to confirm all five work.
6. Apply a filter (e.g., Status = open) while sorting by Author ascending — confirm both effects hold (filtered rows, sorted alphabetically).
7. `browser_console_messages` — no errors.

Expected: all five columns sort; indicator is correct; filter + sort compose.

- [ ] **Step 7: Anon-read regression check**

1. `browser_navigate` to a page with the embed script installed (e.g., `https://www.teachengineering.org/` or another installed wireframe).
2. Wait for the MarkUX floating button to appear.
3. `browser_snapshot` and confirm existing annotation pins render.
4. `browser_console_messages` — no new errors from `markux.js`.

Expected: no regression in the anon path.

- [ ] **Step 8: Report results**

Summarize pass/fail for each step to the user. If any failed, surface the failure — do not mark the plan complete.

---

## Out of scope

- Multi-column sort, Shift-click behavior.
- Pagination or virtual scroll.
- A comment-body filter.
- Persisting sort/filter state in URL or localStorage.
- Any change to `admin/js/collaborators.js`, the Edge Function, the embed script, RLS, or the storage bucket.
- Restyling the admin beyond the specific rules in Tasks 4 and 5.
- Adding tests for admin JS (no existing unit test coverage for `admin/js/*`; Task 6 covers browser verification instead).

## Rollback

Each task is a separate commit. Revert the five feature commits (Tasks 1–5) in reverse order to restore the previous UI exactly. No schema changes, no data migration, no infrastructure changes.
