# MarkUX

Embeddable website annotation tool for collecting visual design feedback. Add one script tag to any website and let reviewers pin comments directly on the page.

## Features

- **One script tag** to install on any website
- **Pin comments** to specific elements on the page
- **Sidebar drawer** to browse, reply to, and manage all comments
- **Status tracking** — resolve and reopen issues
- **Screenshot capture** on each annotation
- **Realtime updates** — see new comments appear without refreshing
- **Remembered identity** — reviewers enter name/email once
- **Admin app** for project management, filtering, CSV export, and visual replay
- **Self-hosted** — runs on Supabase free tier, no SaaS dependency

## Hide MarkUX on a site

Once installed, MarkUX can be hidden from a site by clicking the small gray "eye-off" button directly above the pen FAB. The entire overlay — FAB, pins, sidebar, mode label — disappears and is replaced by a small translucent dot in the bottom-right corner. Click the dot to restore.

The preference lives in `localStorage` on the site's origin, so it persists across reloads until you restore it. It's per-browser — other browsers and devices still see the full overlay.

If MarkUX ever gets stuck hidden and the ghost dot doesn't render for some reason, open DevTools on the site and run:

```js
localStorage.removeItem("markux:hidden");
```

Then reload.

## Quick Start

### 1. Set up Supabase

Create a [Supabase](https://supabase.com) project, then run the migration in the SQL Editor:

```sql
-- paste contents of supabase/migrations/001_initial_schema.sql
```

Deploy the Edge Function:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy write-proxy
```

### 2. Configure credentials

Update the Supabase URL and anon key (JWT format) in:

- `src/index.js` (lines 46-48)
- `admin/js/supabase-client.js` (lines 4-5)

Then build:

```bash
npm run build
```

### 3. Create a project

Open the admin app (`admin/index.html`), sign in with your Supabase auth user, and create a project with your website's domain in the allowed domains list.

### 4. Install on your website

Add the script tag to any HTML page:

```html
<script src="https://your-host.com/dist/markux.js"
        data-project="your-project-id"></script>
```

## Architecture

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

- **`src/`** — Embeddable script (vanilla JS, bundled with esbuild to `dist/markux.js`). All UI lives in shadow DOM for style isolation.
- **`admin/`** — Static admin app (plain HTML/CSS/JS, no build step). Login, project management, annotation review, CSV export, visual replay.
- **`supabase/`** — Database migration and `write-proxy` Edge Function (handles annotation creation, replies, status updates, and deletions with domain validation and rate limiting).

## Development

```bash
npm install
npm run dev       # watch mode with sourcemaps
npm test          # run tests (vitest + jsdom)
npm run build     # production build
```

## License

MIT
