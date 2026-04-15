# Collaborators + Reply Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add (1) a Collaborators section on the admin project page that lets you edit a reviewer's name/email and propagate the change to every annotation + reply they authored in that project, and (2) an email to the annotation author whenever someone replies to their annotation.

**Architecture:** Feature 1 is pure admin: new module `admin/js/collaborators.js` plus markup and a modal in `project.html`. Updates go through the admin's authenticated Supabase session — no edge function change. Feature 2 is a narrow extension of `supabase/functions/write-proxy/index.ts`: refactor `sendNotificationEmail` to take a `to` parameter, extend the annotation lookup in `create_reply`, and send a second email to the annotation author.

**Tech Stack:** Vanilla JS ES modules, Supabase JS SDK (UMD in the admin), Supabase Edge Functions (Deno/TypeScript), AgentMail REST API for email delivery.

**Spec:** `docs/superpowers/specs/2026-04-15-collaborators-and-reply-notifications-design.md`

---

## File Structure

**Create**
- `admin/js/collaborators.js` — exports `loadCollaborators(projectId)`, `updateCollaborator({projectId, oldEmail, newName, newEmail})`, `renderCollaboratorsSection(container, projectId, onChange)`

**Modify**
- `admin/project.html` — add Collaborators section container + edit modal markup + import wire-up
- `admin/css/admin.css` — styles for `.collaborators`, `.collaborator-row`, modal reuse
- `supabase/functions/write-proxy/index.ts` — refactor `sendNotificationEmail` signature; extend `create_reply` branch

---

## Task 1: Admin — `loadCollaborators` data loader

**Files:**
- Create: `admin/js/collaborators.js`

- [ ] **Step 1: Create the module with `loadCollaborators`**

Create `admin/js/collaborators.js`:

```javascript
// admin/js/collaborators.js
import { getSupabase } from "./supabase-client.js";

export async function loadCollaborators(projectId) {
  const supabase = getSupabase();

  // Fetch all annotations for this project (just the identity + id columns)
  const { data: annotations, error: annErr } = await supabase
    .from("annotations")
    .select("id, author_name, author_email, created_at")
    .eq("project_id", projectId);
  if (annErr) throw annErr;

  const annotationIds = (annotations || []).map((a) => a.id);

  // Fetch replies scoped to those annotations
  let replies = [];
  if (annotationIds.length > 0) {
    const { data, error: repErr } = await supabase
      .from("replies")
      .select("annotation_id, author_name, author_email")
      .in("annotation_id", annotationIds);
    if (repErr) throw repErr;
    replies = data || [];
  }

  // Group by lowercased email. Most-recent annotation author_name wins for display.
  const groups = new Map();
  const sortedAnnotations = [...(annotations || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  for (const a of sortedAnnotations) {
    const key = (a.author_email || "").toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        email: key,
        displayEmail: a.author_email,
        name: a.author_name,
        annotationCount: 0,
        replyCount: 0,
      });
    }
    groups.get(key).annotationCount++;
  }
  for (const r of replies) {
    const key = (r.author_email || "").toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        email: key,
        displayEmail: r.author_email,
        name: r.author_name,
        annotationCount: 0,
        replyCount: 0,
      });
    }
    groups.get(key).replyCount++;
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 2: Manual smoke check**

From the admin page JS console after this module is imported, call `loadCollaborators("<a real project id>")` and confirm a sensible array comes back. Don't skip this — verifies the query shapes before building UI on top.

- [ ] **Step 3: Commit**

```bash
git add admin/js/collaborators.js
git commit -m "admin: add loadCollaborators data loader"
```

---

## Task 2: Admin — `updateCollaborator` writer

**Files:**
- Modify: `admin/js/collaborators.js`

- [ ] **Step 1: Append `updateCollaborator` to the module**

In `admin/js/collaborators.js`, after `loadCollaborators`, add:

```javascript
export async function updateCollaborator({ projectId, oldEmail, newName, newEmail }) {
  const supabase = getSupabase();
  const oldEmailLower = (oldEmail || "").toLowerCase();
  const newEmailLower = (newEmail || "").toLowerCase();

  // 1. Update annotations in this project
  const { error: annErr } = await supabase
    .from("annotations")
    .update({ author_name: newName, author_email: newEmailLower })
    .eq("project_id", projectId)
    .ilike("author_email", oldEmailLower);
  if (annErr) throw annErr;

  // 2. Get all annotation ids in this project, then update matching replies
  const { data: annotations, error: listErr } = await supabase
    .from("annotations")
    .select("id")
    .eq("project_id", projectId);
  if (listErr) throw listErr;

  const ids = (annotations || []).map((a) => a.id);
  if (ids.length > 0) {
    const { error: repErr } = await supabase
      .from("replies")
      .update({ author_name: newName, author_email: newEmailLower })
      .in("annotation_id", ids)
      .ilike("author_email", oldEmailLower);
    if (repErr) throw repErr;
  }
}
```

Note: we use `ilike` for case-insensitive matching against `oldEmail`, and we lowercase `newEmail` before writing so future lookups normalize. Email format is validated client-side before this is called.

- [ ] **Step 2: Commit**

```bash
git add admin/js/collaborators.js
git commit -m "admin: add updateCollaborator to bulk-update annotations and replies"
```

---

## Task 3: Admin — HTML markup for Collaborators section + edit modal

**Files:**
- Modify: `admin/project.html`

- [ ] **Step 1: Insert Collaborators section above the filters**

In `admin/project.html`, locate the line (around line 31):
```html
    <div class="filters" id="filters">
```

Immediately BEFORE that line, insert:

```html
    <div class="card collaborators" id="collaborators-section" style="margin-bottom:16px">
      <div class="flex justify-between items-center" style="margin-bottom:8px">
        <h3 id="collaborators-title">Collaborators</h3>
        <button type="button" id="collaborators-toggle" class="btn btn-sm btn-secondary">Collapse</button>
      </div>
      <div id="collaborators-list"></div>
      <div id="collaborators-empty" class="empty-state" style="display:none">No collaborators yet.</div>
    </div>

```

- [ ] **Step 2: Insert the Edit-Collaborator modal near the other modals**

In `admin/project.html`, find the existing `<!-- Edit Modal -->` block (around line 73). Immediately AFTER its closing `</div></div>` (after the edit-project modal), insert:

```html

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
```

- [ ] **Step 3: Commit**

```bash
git add admin/project.html
git commit -m "admin: add Collaborators section and edit modal markup"
```

---

## Task 4: Admin — CSS for Collaborators list

**Files:**
- Modify: `admin/css/admin.css`

- [ ] **Step 1: Append styles to the end of `admin/css/admin.css`**

Append:

```css

/* Collaborators section */
.collaborators .collaborator-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f1f1f1;
}
.collaborators .collaborator-row:last-child { border-bottom: none; }
.collaborators .collaborator-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.collaborators .collaborator-name { font-weight: 600; }
.collaborators .collaborator-email { color: #6b7280; font-size: 13px; }
.collaborators .collaborator-counts { color: #6b7280; font-size: 13px; }
.collaborators.collapsed #collaborators-list,
.collaborators.collapsed #collaborators-empty { display: none; }
```

- [ ] **Step 2: Commit**

```bash
git add admin/css/admin.css
git commit -m "admin: styles for Collaborators section"
```

---

## Task 5: Admin — render + wire the section

**Files:**
- Modify: `admin/js/collaborators.js` (add `renderCollaboratorsSection`)
- Modify: `admin/project.html` (inline script: import and call)

- [ ] **Step 1: Add `renderCollaboratorsSection` to `admin/js/collaborators.js`**

Append to `admin/js/collaborators.js`:

```javascript
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function renderCollaboratorsSection(projectId, { onChange } = {}) {
  const section = document.getElementById("collaborators-section");
  const list = document.getElementById("collaborators-list");
  const empty = document.getElementById("collaborators-empty");
  const title = document.getElementById("collaborators-title");
  const toggle = document.getElementById("collaborators-toggle");

  const collaborators = await loadCollaborators(projectId);

  list.replaceChildren();
  title.textContent = `Collaborators (${collaborators.length})`;

  if (collaborators.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    collaborators.forEach((c) => list.appendChild(renderRow(c)));
  }

  // Initial collapse state: collapsed if > 10
  if (collaborators.length > 10) {
    section.classList.add("collapsed");
    toggle.textContent = "Expand";
  } else {
    section.classList.remove("collapsed");
    toggle.textContent = "Collapse";
  }

  toggle.onclick = () => {
    const isCollapsed = section.classList.toggle("collapsed");
    toggle.textContent = isCollapsed ? "Expand" : "Collapse";
  };

  function renderRow(c) {
    const row = document.createElement("div");
    row.className = "collaborator-row";

    const info = document.createElement("div");
    info.className = "collaborator-info";
    const nameEl = document.createElement("span");
    nameEl.className = "collaborator-name";
    nameEl.textContent = c.name || "(no name)";
    const emailEl = document.createElement("span");
    emailEl.className = "collaborator-email";
    emailEl.textContent = c.displayEmail;
    info.appendChild(nameEl);
    info.appendChild(emailEl);

    const counts = document.createElement("span");
    counts.className = "collaborator-counts";
    counts.textContent = `${c.annotationCount} comment${c.annotationCount === 1 ? "" : "s"} · ${c.replyCount} repl${c.replyCount === 1 ? "y" : "ies"}`;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-sm btn-secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditModal(c));

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "12px";
    right.style.alignItems = "center";
    right.appendChild(counts);
    right.appendChild(editBtn);

    row.appendChild(info);
    row.appendChild(right);
    return row;
  }

  function openEditModal(c) {
    const modal = document.getElementById("collaborator-modal");
    const nameInput = document.getElementById("collab-name");
    const emailInput = document.getElementById("collab-email");
    const saveBtn = document.getElementById("collab-save");
    const cancelBtn = document.getElementById("collab-cancel");
    const errorEl = document.getElementById("collab-error");
    const form = document.getElementById("collaborator-form");

    nameInput.value = c.name || "";
    emailInput.value = c.displayEmail;
    errorEl.style.display = "none";
    errorEl.textContent = "";
    saveBtn.disabled = true;

    function validate() {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const valid =
        name.length > 0 &&
        EMAIL_RE.test(email) &&
        (name !== (c.name || "") || email.toLowerCase() !== c.email);
      saveBtn.disabled = !valid;
    }

    nameInput.oninput = validate;
    emailInput.oninput = validate;

    function close() {
      modal.style.display = "none";
      form.onsubmit = null;
      cancelBtn.onclick = null;
    }

    cancelBtn.onclick = close;

    form.onsubmit = async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      errorEl.style.display = "none";
      try {
        await updateCollaborator({
          projectId,
          oldEmail: c.email,
          newName: nameInput.value.trim(),
          newEmail: emailInput.value.trim(),
        });
        close();
        await renderCollaboratorsSection(projectId, { onChange });
        if (onChange) await onChange();
      } catch (err) {
        errorEl.textContent = err.message || "Failed to save.";
        errorEl.style.display = "block";
        saveBtn.disabled = false;
      }
    };

    modal.style.display = "flex";
  }
}
```

- [ ] **Step 2: Wire it into `admin/project.html`**

In `admin/project.html`, find the imports block (around line 99-106). Add `renderCollaboratorsSection`:

```javascript
    import { renderCollaboratorsSection } from './js/collaborators.js';
```

Then find the `render()` helper / place where annotations are loaded (around line 147-170). Immediately AFTER the `const project = await loadProject(projectId);` line (around line 115), add:

```javascript
    // Render Collaborators section (refreshes annotations when a collaborator edit happens)
    await renderCollaboratorsSection(projectId, { onChange: () => render() });
```

If `render` isn't defined at that point in the script, move this call to AFTER the `render` function is defined but BEFORE the first call to `render()`. Read the surrounding code carefully before placing it.

- [ ] **Step 3: Build-free manual verify**

Open `admin/project.html` locally for a project with multiple annotations from different reviewers. Confirm:
- Collaborators section renders with correct names, emails, counts
- Edit opens modal populated with current values
- Save is disabled until something changes AND email is valid
- Saving updates all rows for that reviewer in the annotations table below
- After save, the Collaborators list reflects the new name/email
- Cancel closes without changes

- [ ] **Step 4: Commit**

```bash
git add admin/js/collaborators.js admin/project.html
git commit -m "admin: render Collaborators section with edit modal"
```

---

## Task 6: Edge Function — refactor `sendNotificationEmail` to accept recipient

**Files:**
- Modify: `supabase/functions/write-proxy/index.ts`

- [ ] **Step 1: Change the function signature**

In `supabase/functions/write-proxy/index.ts`, find (around line 13):

```typescript
async function sendNotificationEmail(subject: string, html: string, text: string) {
  if (!agentmailApiKey) return;
  try {
    await fetch(
      `https://api.agentmail.to/v0/inboxes/${AGENTMAIL_INBOX}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agentmailApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: NOTIFY_EMAIL, subject, html, text }),
      },
    );
  } catch {
    // Email failure should not block the annotation write
  }
}
```

Replace with:

```typescript
async function sendNotificationEmail(to: string, subject: string, html: string, text: string) {
  if (!agentmailApiKey) return;
  if (!to) return;
  try {
    await fetch(
      `https://api.agentmail.to/v0/inboxes/${AGENTMAIL_INBOX}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agentmailApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, html, text }),
      },
    );
  } catch {
    // Email failure should not block the annotation write
  }
}
```

- [ ] **Step 2: Update existing call sites to pass `NOTIFY_EMAIL`**

There are two existing calls (lines ~159 and ~188). Change each from:

```typescript
      sendNotificationEmail(
        `${projectName} -- New UX comment`,
        ...
      );
```

to:

```typescript
      sendNotificationEmail(
        NOTIFY_EMAIL,
        `${projectName} -- New UX comment`,
        ...
      );
```

Apply to BOTH the `create_annotation` and `create_reply` branches. Leave the subject, html, text arguments unchanged.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/write-proxy/index.ts
git commit -m "edge: refactor sendNotificationEmail to accept recipient"
```

---

## Task 7: Edge Function — notify annotation author on reply

**Files:**
- Modify: `supabase/functions/write-proxy/index.ts`

- [ ] **Step 1: Extend the annotation lookup in `create_reply`**

In the `create_reply` branch (around line 164-177), find:

```typescript
      const { data: parentAnnotation, error: annError } = await supabase
        .from("annotations")
        .select("id")
        .eq("id", data.annotation_id)
        .eq("project_id", project_id)
        .single();
```

Change the `.select("id")` to:

```typescript
        .select("id, author_email, author_name, page_url, comment")
```

- [ ] **Step 2: Send the author-notification email after the reply insert**

In the same branch, after the existing admin `sendNotificationEmail(...)` call (around line 188-192), add:

```typescript
      const authorEmail = parentAnnotation.author_email;
      if (authorEmail) {
        const originalAuthor = parentAnnotation.author_name || "the author";
        const snippet =
          (parentAnnotation.comment || "").length > 200
            ? parentAnnotation.comment.slice(0, 200) + "…"
            : parentAnnotation.comment || "";
        const deepLink = `${parentAnnotation.page_url}#markux=${parentAnnotation.id}`;
        sendNotificationEmail(
          authorEmail,
          `[${projectName}] New reply to your comment`,
          `<p>Hi ${originalAuthor},</p>
           <p><strong>${replyAuthor}</strong> replied to your comment on <a href="${parentAnnotation.page_url}">${parentAnnotation.page_url}</a>.</p>
           <p><em>Your comment:</em></p>
           <blockquote>${snippet}</blockquote>
           <p><em>${replyAuthor}'s reply:</em></p>
           <blockquote>${reply.body}</blockquote>
           <p><a href="${deepLink}">View in context →</a></p>`,
          `Hi ${originalAuthor},\n\n${replyAuthor} replied to your comment on ${parentAnnotation.page_url}.\n\nYour comment: "${snippet}"\n\n${replyAuthor}'s reply: "${reply.body}"\n\nView in context: ${deepLink}`,
        );
      }
```

- [ ] **Step 3: Deploy the function**

Run from the repo root:

```bash
supabase functions deploy write-proxy --project-ref fcqywjpdjcsbcpnnfckw
```

Expected: deploy succeeds. If the CLI prompts for login, run `supabase login` first.

- [ ] **Step 4: End-to-end verify**

Using any host page with the embed installed:
1. Post an annotation as `userA@example.com` (use a real inbox you control).
2. Post a reply from a different browser/incognito as `userB@example.com`.
3. Confirm `userA@example.com` receives the email with subject `[<project name>] New reply to your comment`, including the deep link `<page_url>#markux=<id>`.
4. Confirm the existing admin notification to `julia.mayhugh@ncwit.org` also fires.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/write-proxy/index.ts
git commit -m "edge: email annotation author when their comment gets a reply"
```

---

## Task 8: Deploy & verify admin

**Files:** none

- [ ] **Step 1: Push to origin**

```bash
git push origin main
```

Expected: GitHub Pages auto-deploys; admin is live within ~1 minute.

- [ ] **Step 2: Verify in production**

1. Open `https://jmayhugh.github.io/markux/admin/` and sign in.
2. Navigate to a project. Confirm the Collaborators section renders.
3. Edit a test reviewer's name only. Refresh. Confirm the annotation rows now show the new name.
4. Edit a test reviewer's email. Confirm the row in Collaborators updates and the annotations table reflects the new email.

- [ ] **Step 3: Report results**

If Steps 2-4 + Task 7 Step 4 all pass, the feature is complete. If any step fails, file specific findings (screenshot / console error) for triage.
