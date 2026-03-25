# MarkUX — Design Spec

**Date:** 2026-03-24
**Status:** Draft
**Repository:** Separate repo (not part of Claude Workflows)

## Overview

MarkUX is an embeddable website annotation tool for collecting visual design feedback. A single script tag added to any website lets reviewers pin comments to specific elements, draw on the page, and submit feedback identified by name and email. A companion admin app lets site owners create projects, review feedback, and export data.

## Goals

- Installable on any website via one script tag
- No login required for reviewers — just name and email
- Self-owned infrastructure (no SaaS dependency beyond Supabase free tier)
- Usable both for client work and as a standalone product others can adopt

## Architecture

Three components, no custom backend server:

```
[Host Website]                [Admin App]
     |                             |
     v                             v
 markux.js                    admin/index.html
     |                             |
     +----------+------------------+
                |
                v
           Supabase
      (Postgres + REST API
       + Realtime + Storage)
```

### 1. `markux.js` (Embeddable Script)

The script a site owner adds to their website. Handles all reviewer-facing UI and communicates directly with Supabase.

**Loading:**
```html
<script src="https://[host]/markux.js" data-project="[project-id]"></script>
```

The script initializes on DOMContentLoaded, validates the project ID against the current domain, and injects its UI inside a shadow DOM to avoid style conflicts with the host site.

### 2. Supabase (Backend)

Provides the entire backend:
- **Postgres** — stores projects, annotations, replies
- **REST API** — CRUD operations from both the script and admin app
- **Realtime** — live annotation updates (new pins appear without refresh)
- **Storage** — screenshot image uploads
- **Row-Level Security (RLS)** — policies scoped by project ID so one Supabase instance safely serves all projects
- **Edge Functions** — a thin write proxy for annotation/reply creation that validates the request Origin against `allowed_domains` before inserting

### 3. Admin App (Static Web App)

A standalone static HTML/JS application for project management and feedback review. Authenticated via Supabase email auth. Can be hosted anywhere (GitHub Pages, Netlify, own server).

## Data Model

### `projects`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated project ID |
| `name` | text | Project display name (e.g., "Acme Corp Redesign") |
| `allowed_domains` | text[] | Domains where the script is authorized to run |
| `owner_email` | text | Email of the project creator |
| `created_at` | timestamptz | Auto-set on creation |

### `annotations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `project_id` | uuid (FK) | References `projects.id` |
| `page_url` | text | Full URL where annotation was created |
| `author_name` | text | Reviewer's name |
| `author_email` | text | Reviewer's email |
| `comment` | text | The annotation text |
| `pin_x` | float | Horizontal position as percentage of the target element's bounding box |
| `pin_y` | float | Vertical position as percentage of the target element's bounding box |
| `pin_selector` | text | CSS selector of the clicked element (primary anchor for re-positioning) |
| `viewport_width` | integer | Viewport width at time of annotation (for context in visual replay) |
| `viewport_height` | integer | Viewport height at time of annotation |
| `screenshot_path` | text | Path in Supabase Storage (nullable — capture may fail on complex sites) |
| `drawings` | jsonb | Array of drawing objects — `null` in v1, schema defined in v2 spec |
| `status` | text | `"open"` or `"resolved"` |
| `created_at` | timestamptz | Auto-set on creation |
| `updated_at` | timestamptz | Auto-updated on modification (e.g., status change) |

### `replies`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `annotation_id` | uuid (FK) | References `annotations.id` |
| `author_email` | text | Replier's email |
| `author_name` | text | Replier's name |
| `body` | text | Reply text |
| `created_at` | timestamptz | Auto-set on creation |

## Security

### Row-Level Security Policies

| Table | Operation | Policy |
|-------|-----------|--------|
| `projects` | SELECT | Anon can read a single project by ID (for script init validation) |
| `projects` | INSERT/UPDATE/DELETE | Authenticated admin only, where `auth.email() = owner_email` |
| `annotations` | SELECT | Anon can read where `project_id` matches a valid project |
| `annotations` | INSERT | Via Edge Function only (see domain validation below) |
| `annotations` | UPDATE | Authenticated admin only (for status changes) |
| `annotations` | DELETE | Authenticated admin only |
| `replies` | SELECT | Anon can read where parent annotation's `project_id` is valid |
| `replies` | INSERT | Via Edge Function only |
| `replies` | UPDATE/DELETE | Authenticated admin only |
| `storage` (screenshots bucket) | INSERT | Via Edge Function only |
| `storage` (screenshots bucket) | SELECT | Anon can read (screenshots are not sensitive — they show the public site) |

### Domain Validation (Edge Function)

The embeddable script does NOT write directly to Supabase tables. The anon role has no INSERT permission on `annotations`, `replies`, or the `screenshots` storage bucket. All writes go through a Supabase Edge Function that authenticates with the **service-role key** (server-side only, never exposed to the client) to bypass RLS and insert records.

The Edge Function:

1. Reads the `Origin` header from the request
2. Looks up the `allowed_domains` for the given `project_id`
3. Rejects the request if the origin does not match
4. Rate-limits: max 30 writes (annotations + replies combined) per IP per hour
5. Inserts the record using the service-role key and returns the result

This prevents spoofed annotations from unauthorized domains. The client-side domain check in `markux.js` is a convenience (fast fail), not a security boundary.

### Storage Structure

- Bucket: `screenshots`
- Path: `{project_id}/{annotation_id}.png`
- Scoped by project ID for organization and future cleanup

### Cascade Deletes

- Deleting a project cascades to its annotations and replies via Postgres `ON DELETE CASCADE` foreign keys
- Deleting an annotation cascades to its replies via `ON DELETE CASCADE`
- Storage cleanup: a Postgres trigger on annotation delete calls Supabase Storage delete for `screenshots/{project_id}/{annotation_id}.png`. Project-level cleanup iterates and deletes the `screenshots/{project_id}/` prefix.

## Pin Positioning Strategy

Pins are anchored to the element identified by `pin_selector`, not to absolute viewport coordinates. The placement algorithm:

1. **On annotation creation:** Record the CSS selector of the clicked element, plus the click position as a percentage of that element's bounding box. Also record viewport dimensions for context.
2. **On page load (re-rendering pins):** Find the element via `pin_selector`. If found, position the pin relative to the element's current bounding box using the stored percentages. If the selector match fails, fall back to absolute viewport percentage positioning.

This approach handles responsive layouts: as elements reflow, pins follow the element they were attached to.

**Selector generation:** Use a specificity-ordered approach: (1) if the element has an `id`, use `#id`, (2) otherwise, build a short `nth-child` chain from the nearest ancestor with an `id` or from `body`. Keep selectors under 4 levels deep to avoid fragility. A library like `finder` (or equivalent) can be evaluated during implementation.

## URL Normalization

When storing and querying `page_url`, the script normalizes URLs by:
- Stripping hash fragments (`#section`)
- Stripping known tracking parameters (`utm_*`, `fbclid`, `gclid`, `ref`)
- Normalizing trailing slashes (strip them)
- Lowercasing the hostname

This ensures annotations on `example.com/about` and `example.com/about?utm_source=email` are treated as the same page. Remaining query parameters (non-tracking) are preserved as-is without reordering.

## Screenshot Capture

Screenshots are captured via html2canvas. Known limitations:
- Cross-origin images may be blank (unless CORS headers are present)
- Some CSS features (`backdrop-filter`, `mix-blend-mode`) may not render
- `<iframe>`, `<canvas>`, and `<video>` content will not be captured

The `screenshot_path` column is nullable. If html2canvas fails, the annotation is still created without a screenshot. The admin's Visual Replay view shows a "screenshot unavailable" placeholder in this case.

## Embeddable Script — Behavior

### Floating Button

- Small circle positioned in the bottom-right corner (configurable via `data-position` attribute)
- Displays a pen/annotation icon
- Badge showing count of open annotations on the current page
- Clicking toggles annotation mode

### Annotation Mode

1. Cursor changes to crosshair
2. Hovering highlights page elements with a subtle outline (helps target specific components)
3. Clicking a spot pins a numbered marker at that location
4. A comment popover appears next to the pin:
   - Name field (required, remembered in localStorage)
   - Email field (required, remembered in localStorage)
   - Comment text area
   - Submit button
5. On submit:
   - html2canvas captures the viewport with the pin visible
   - Screenshot uploads to Supabase Storage
   - Annotation record is created in Supabase with pin coordinates, CSS selector, screenshot path, and comment
6. Pin remains visible; annotation mode stays active for additional annotations

### Viewing Existing Annotations

- On page load, the script fetches all open annotations for the current page URL
- Renders numbered pin markers at their stored positions
- Clicking a pin shows the comment and reply thread in a popover
- Supabase Realtime subscription keeps annotations updated live (new pins from other reviewers appear without refresh)

### Style Isolation

All injected UI (button, popovers, pins, overlays) lives inside a shadow DOM attached to a container element. This prevents host site CSS from affecting MarkUX and vice versa.

### Reviewer Identity

- Name and email are required on the first annotation
- Both values are stored in localStorage (`markux-reviewer-name`, `markux-reviewer-email`)
- Subsequent annotations pre-fill from localStorage; reviewer can edit if needed

## Drawing Tools (v2)

A small toolbar appears at the top of the viewport when annotation mode is active:

- **Arrow tool** — click and drag to draw an arrow
- **Box tool** — click and drag to draw a rectangle outline
- **Freehand tool** — draw freely

Drawings render on a transparent canvas overlay above the page content. On submit, drawing data is serialized as JSON (array of {type, points, color}) and stored in the `drawings` column. The screenshot captures drawings as rendered.

This is a v2 feature — the initial release ships with pin comments only.

## Admin App

### Authentication

Supabase email+password auth. For v1, a single admin user. The admin's email must match `owner_email` on projects they create. Future: team member support.

### Projects List (Landing Page)

- Card grid showing each project: name, domain(s), open/resolved annotation counts, created date
- "New Project" button opens a form: project name, allowed domains
- On creation: generates project ID, displays the embed snippet ready to copy

### Project Detail — List View (Default)

- Table of all annotations for the project
- Columns: page URL, author name/email, comment preview, status (open/resolved pill), timestamp
- Filterable by: page URL, author, status
- Click a row to expand the reply thread inline
- Resolve/reopen buttons per annotation

### Project Detail — Visual Replay

- Click into any annotation to see the captured screenshot displayed full-width
- Pin marker overlaid at the original position on the screenshot
- Viewport dimensions displayed for context (e.g., "Captured at 1440x900")
- "Screenshot unavailable" placeholder if capture failed
- Comment thread shown alongside the screenshot
- Arrow navigation to step through annotations sequentially

### Embed Snippet Panel

- Accessible from project detail
- Shows the `<script>` tag with project ID, ready to copy
- Displays allowed domains and project ID

## Export

### v1 — CSV Export

- "Export" button on the project detail page
- Exports all annotations (with replies) for the project as CSV
- Columns: page URL, author name, author email, comment, status, reply count, replies (concatenated text), viewport width, created date
- CSV is directly importable into Google Sheets

### Future — Webhooks

- Per-project webhook URL configuration
- Each new annotation or reply fires a POST request to the configured URL with the full record as JSON
- Enables integration with Zapier, n8n, Slack, Linear, GitHub Issues, etc. without building each integration individually

## Hosting

- `markux.js` — hosted as a static file (CDN, GitHub Pages, Netlify, or own server)
- Admin app — hosted as static files (same options)
- Supabase — managed service (free tier: 500MB database, 1GB storage, 50K monthly active users)
- No custom server to deploy or maintain

## Open Questions

- Custom branding (colors, logo) on the floating button — configurable via data attributes or project settings? (Defer to v2)

## Non-Goals (v1)

- Video or screen recording
- Direct CSS editing / redlining
- Multi-user admin teams
- Notification system (email alerts on new annotations)
- Mobile-specific annotation interface
