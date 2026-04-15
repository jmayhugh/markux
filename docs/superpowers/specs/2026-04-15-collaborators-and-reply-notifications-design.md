# Collaborators Management + Reply Email Notifications

**Date:** 2026-04-15
**Status:** Design approved, ready for implementation plan

## Goals

1. Let project admins edit a reviewer's name and email in one place — the change propagates to every annotation and reply that reviewer has left **in the current project**.
2. When someone replies to an annotation, email the annotation's original author so they know there's a new response.

## Motivation

Today:
- Admins cannot correct a typo'd reviewer email or update a reviewer's name after the fact. The only way to fix identity is to manually edit rows in the database.
- The only email notification sent on a reply goes to Julia (the admin inbox); the person whose comment was replied to is never told.

## Scope

**In scope**
- New "Collaborators" section on `admin/project.html` showing unique reviewers (by email) for that project, with counts and an Edit action
- Bulk update of `annotations` + `replies` for that project when a collaborator's name/email is edited
- Email to the annotation author whenever a reply to their annotation is created (including self-replies)
- Small refactor to `sendNotificationEmail` to accept a `to` parameter

**Out of scope**
- Cross-project collaborator management (explicitly scoped per-project per user decision)
- Notifying other reply participants in the thread
- An unsubscribe flow for reply emails
- A dedicated collaborator detail page

## Feature 1: Collaborators Section

### Data source

Unique collaborators are derived by querying the `annotations` table for `project_id = X`, then grouping by `author_email` (case-insensitive, lowercased for grouping). For each group, keep the most recent `author_name` as the display name. Counts: number of annotations in the group, plus count of replies whose `author_email` matches and whose `annotation_id` belongs to this project.

### UI

New section on `admin/project.html`, placed between the project header/stats area and the existing filters/annotations table. Layout:

```
Collaborators (4)                                    [▾ collapse]
──────────────────────────────────────────────────────────────────
Jane Doe            jane@example.com          3 comments · 7 replies   [Edit]
Taylor Smith        tsmith@x.com              2 comments · 0 replies   [Edit]
...
```

Section starts expanded if there are ≤ 10 collaborators, collapsed otherwise.

### Edit flow

Clicking Edit opens a modal with:
- Name input (required, non-empty)
- Email input (required, basic format check: matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Save and Cancel buttons
- Save is disabled until both fields are valid and at least one has changed

On Save:
1. Capture `oldEmail` (lowercased), `newName`, `newEmail` (lowercased)
2. Update `annotations` where `project_id = X` and `author_email ILIKE oldEmail` → set `author_name = newName`, `author_email = newEmail`
3. Fetch `id`s of all annotations in this project, then update `replies` where `annotation_id IN (ids)` and `author_email ILIKE oldEmail` → set `author_name = newName`, `author_email = newEmail`
4. Close modal, reload collaborators list + annotations list

Both updates use the admin's authenticated Supabase session (admin has service-level write access already — this is how `updateAnnotationStatus` and `deleteProject` work today). No write-proxy change.

### Merge behavior

If `newEmail` already belongs to another collaborator in the project, the edit effectively merges the two reviewers — all rows with `oldEmail` now have `newEmail`, and the next load of collaborators will show one combined row. This is acceptable; treat it as an intentional capability, not an error. No confirmation prompt for v1.

### Error handling

- Update errors surface as an inline error message in the modal; modal stays open
- Network failure → same; user can retry
- Empty or malformed input → Save stays disabled

## Feature 2: Reply Email Notifications to Annotation Author

### Current state

`supabase/functions/write-proxy/index.ts` — the `create_reply` action already:
1. Verifies the annotation belongs to this project (fetches `annotations` row with `id` only)
2. Inserts the reply
3. Sends an admin email via `sendNotificationEmail(subject, html, text)` with hardcoded recipient `julia.mayhugh@ncwit.org`

### Change

1. **Refactor `sendNotificationEmail`** to accept `to: string` as its first argument. All existing call sites pass the existing admin address; the new call site passes the annotation author's email.

2. **Extend the annotation lookup** in `create_reply` to also select `author_email`, `author_name`, `page_url`, `comment` (not just `id`).

3. **After the reply insert**, send a second email to the annotation author:
   - Skip if `annotation.author_email` is missing/empty (defensive)
   - Subject: `[${projectName}] New reply to your comment`
   - Body (text + HTML), including:
     - Who replied: `reply.author_name`
     - Original comment snippet (first 200 chars)
     - Reply body
     - Deep link: `${page_url}#markux=${annotation.id}` as a clickable link in HTML, plain URL in text
   - Both emails use the same `fetch` + `try/catch` non-blocking pattern

Self-replies (annotation author replies to their own annotation) DO fire the email — user chose option B only, not A.

### Error handling

Same as today: email failure is swallowed inside `sendNotificationEmail` and does not block the reply write.

## Files touched

**Feature 1**
- `admin/project.html` — add Collaborators section markup + modal template
- `admin/js/project-detail.js` — add `loadCollaborators(projectId)`, `updateCollaborator(projectId, oldEmail, newName, newEmail)`, and `renderCollaboratorRow(...)` helpers
- `admin/css/admin.css` — styles for the section and modal

**Feature 2**
- `supabase/functions/write-proxy/index.ts` — refactor `sendNotificationEmail(to, subject, html, text)`, extend `create_reply` lookup, send second email to annotation author

## Testing

**Feature 1 — manual**
- Edit a collaborator's name only → all their annotations + replies show new name in the table and sidebar
- Edit a collaborator's email → rows reassign; old email disappears from the Collaborators list; new email appears with merged counts if it existed
- Invalid email format → Save disabled
- Cancel → no change

**Feature 2**
- Post a reply to an annotation from a different email → annotation author (different inbox) receives email with correct subject, original comment snippet, reply body, and deep link
- Post a reply to your own annotation → you (annotation author) receive the email (confirmed: user chose to include self-replies)
- Admin notification email to Julia still fires on every reply
- If AgentMail API is down, the reply still writes successfully (existing non-blocking pattern)

## Deployment

- Admin changes: GitHub Pages auto-deploys on push to `main`
- Edge Function: `supabase functions deploy write-proxy` after the code change lands
