# MarkUX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an embeddable website annotation tool (markux.js) with Supabase backend and a static admin app for managing projects and reviewing feedback.

**Architecture:** Three components sharing a Supabase backend — (1) an embeddable script that injects annotation UI via shadow DOM, (2) Supabase for all persistence (Postgres + REST + Realtime + Storage + Edge Functions), (3) a static admin app for project/feedback management. No custom backend server.

**Tech Stack:** Vanilla JS (ES modules), esbuild (bundling markux.js), Supabase JS client (@supabase/supabase-js), html2canvas (screenshots), Vitest + jsdom (testing), Deno (Edge Functions)

**Spec:** `docs/superpowers/specs/2026-03-24-markux-design.md`

---

## File Structure

```
markux/
├── CLAUDE.md                          # Project conventions
├── package.json                       # Dependencies & scripts
├── vitest.config.js                   # Test configuration
├── esbuild.config.js                  # Build config for markux.js
├── .gitignore
├── .env.example                       # Required env vars template
├── src/                               # markux.js embeddable script source
│   ├── index.js                       # Entry point — init, shadow DOM, orchestration
│   ├── supabase-client.js             # Supabase client init (anon key, project URL)
│   ├── url.js                         # URL normalization
│   ├── selector.js                    # CSS selector generation
│   ├── pin.js                         # Pin positioning (place & restore)
│   ├── screenshot.js                  # html2canvas wrapper
│   ├── api.js                         # Edge Function calls (create annotation/reply, upload screenshot)
│   ├── state.js                       # Shared state (reviewer identity, annotation mode, annotations list)
│   ├── ui/
│   │   ├── styles.js                  # CSS string for shadow DOM injection
│   │   ├── floating-button.js         # Floating action button component
│   │   ├── annotation-mode.js         # Crosshair overlay, element highlighting, click handler
│   │   ├── comment-popover.js         # Comment form popover (name, email, comment, submit)
│   │   ├── pin-marker.js              # Numbered pin marker element
│   │   └── thread-popover.js          # View existing annotation + reply thread
│   └── realtime.js                    # Supabase Realtime subscription for live updates
├── tests/
│   ├── url.test.js
│   ├── selector.test.js
│   ├── pin.test.js
│   ├── api.test.js
│   ├── state.test.js
│   ├── ui/
│   │   ├── floating-button.test.js
│   │   ├── annotation-mode.test.js
│   │   └── comment-popover.test.js
│   └── integration/
│       └── annotation-flow.test.js    # End-to-end annotation creation flow (mocked Supabase)
├── admin/
│   ├── index.html                     # Login page
│   ├── projects.html                  # Projects list
│   ├── project.html                   # Project detail (list + visual replay + export + snippet)
│   ├── css/
│   │   └── admin.css                  # Admin app styles
│   └── js/
│       ├── supabase-client.js         # Supabase client init (authenticated)
│       ├── auth.js                    # Login/logout, session management
│       ├── projects-list.js           # Render project cards, create project form
│       ├── project-detail.js          # Annotation table, filters, resolve/reopen
│       ├── visual-replay.js           # Screenshot overlay with pin + thread
│       ├── csv-export.js              # Export annotations as CSV
│       └── embed-snippet.js           # Show copy-able script tag
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql     # Tables, RLS policies, triggers, storage bucket
│   └── functions/
│       └── write-proxy/
│           └── index.ts               # Edge Function: domain-validated writes
└── dist/                              # Build output (gitignored)
    └── markux.js                      # Bundled embeddable script
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `CLAUDE.md`, `vitest.config.js`, `esbuild.config.js`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/julia/Sites/markux
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
node_modules/
dist/
.env
.DS_Store
```

- [ ] **Step 3: Create package.json**

```json
{
  "name": "markux",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node esbuild.config.js",
    "dev": "node esbuild.config.js --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "esbuild": "^0.25.0",
    "vitest": "^3.1.0",
    "jsdom": "^26.0.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "html2canvas": "^1.4.1"
  }
}
```

- [ ] **Step 4: Create esbuild.config.js**

```js
import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "iife",
  outfile: "dist/markux.js",
  target: ["es2020"],
  minify: !isWatch,
  sourcemap: isWatch,
};

if (isWatch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(options);
  console.log("Built dist/markux.js");
}
```

- [ ] **Step 5: Create vitest.config.js**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 6: Create .env.example**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 7: Create CLAUDE.md**

```markdown
# MarkUX

Embeddable website annotation tool. See `docs/superpowers/specs/2026-03-24-markux-design.md` for full spec.

## Architecture

- `src/` — embeddable script (vanilla JS, bundled with esbuild to `dist/markux.js`)
- `admin/` — static admin app (plain HTML/CSS/JS, no build step)
- `supabase/` — database migrations and Edge Functions

## Commands

- `npm run build` — bundle markux.js to dist/
- `npm run dev` — watch mode with sourcemaps
- `npm test` — run tests (vitest + jsdom)
- `npm run test:watch` — watch mode tests

## Conventions

- Vanilla JS, ES modules, no frameworks
- All embeddable script UI lives in shadow DOM (style isolation)
- Tests use vitest with jsdom environment
- Supabase client from CDN in admin app, bundled in markux.js
- All dynamic content rendered into HTML must be escaped via escapeHtml() (textContent-based sanitization) to prevent XSS
```

- [ ] **Step 8: Install dependencies**

```bash
npm install
```

- [ ] **Step 9: Verify build and test scripts work**

```bash
mkdir -p src && echo "// placeholder" > src/index.js
npm run build
npm test
```
Expected: build produces `dist/markux.js`, tests pass (no tests yet is OK)

- [ ] **Step 10: Commit**

```bash
git add .gitignore package.json package-lock.json esbuild.config.js vitest.config.js .env.example CLAUDE.md docs/
git commit -m "chore: project setup with esbuild, vitest, and supabase deps"
```

---

## Task 2: Supabase Schema & Security

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- MarkUX initial schema
-- ============================================================

-- 1. Tables
-- ------------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  allowed_domains text[] not null default '{}',
  owner_email text not null,
  created_at timestamptz not null default now()
);

create table annotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  page_url text not null,
  author_name text not null,
  author_email text not null,
  comment text not null,
  pin_x float not null,
  pin_y float not null,
  pin_selector text not null,
  viewport_width integer not null,
  viewport_height integer not null,
  screenshot_path text,
  drawings jsonb,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table replies (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references annotations(id) on delete cascade,
  author_email text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_annotations_project_id on annotations(project_id);
create index idx_annotations_page_url on annotations(project_id, page_url);
create index idx_replies_annotation_id on replies(annotation_id);

-- Auto-update updated_at on annotations
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger annotations_updated_at
  before update on annotations
  for each row execute function update_updated_at();

-- 2. Row-Level Security
-- ------------------------------------------------------------

alter table projects enable row level security;
alter table annotations enable row level security;
alter table replies enable row level security;

-- Projects: anon can read by ID (for script init), admin CRUD by owner_email
create policy "anon_read_project" on projects
  for select using (true);

create policy "admin_insert_project" on projects
  for insert with check (auth.email() = owner_email);

create policy "admin_update_project" on projects
  for update using (auth.email() = owner_email);

create policy "admin_delete_project" on projects
  for delete using (auth.email() = owner_email);

-- Annotations: anon can read, only admin can update/delete, NO anon insert (Edge Function)
create policy "anon_read_annotations" on annotations
  for select using (true);

create policy "admin_update_annotations" on annotations
  for update using (
    exists (
      select 1 from projects
      where projects.id = annotations.project_id
        and projects.owner_email = auth.email()
    )
  );

create policy "admin_delete_annotations" on annotations
  for delete using (
    exists (
      select 1 from projects
      where projects.id = annotations.project_id
        and projects.owner_email = auth.email()
    )
  );

-- Replies: anon can read, only admin can update/delete, NO anon insert (Edge Function)
create policy "anon_read_replies" on replies
  for select using (true);

create policy "admin_update_replies" on replies
  for update using (
    exists (
      select 1 from annotations
      join projects on projects.id = annotations.project_id
      where annotations.id = replies.annotation_id
        and projects.owner_email = auth.email()
    )
  );

create policy "admin_delete_replies" on replies
  for delete using (
    exists (
      select 1 from annotations
      join projects on projects.id = annotations.project_id
      where annotations.id = replies.annotation_id
        and projects.owner_email = auth.email()
    )
  );

-- 3. Storage
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true);

-- Anon can read screenshots (they show public sites), no anon writes
create policy "anon_read_screenshots" on storage.objects
  for select using (bucket_id = 'screenshots');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: add initial Supabase schema with tables, RLS, and storage"
```

> **Note:** This migration is applied manually via the Supabase dashboard SQL editor or `supabase db push` if using the Supabase CLI.

---

## Task 3: Supabase Edge Function (Write Proxy)

**Files:**
- Create: `supabase/functions/write-proxy/index.ts`

- [ ] **Step 1: Write the Edge Function**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// In-memory rate limit store (resets on cold start — acceptable for v1)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action, project_id, data } = body;

    if (!project_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing project_id or action" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate origin against project's allowed_domains
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("allowed_domains")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    // Check origin matches allowed domains
    let originHost: string;
    try {
      originHost = new URL(origin).hostname;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid origin" }), {
        status: 403,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const domainAllowed = project.allowed_domains.some(
      (domain: string) =>
        originHost === domain || originHost.endsWith(`.${domain}`),
    );

    if (!domainAllowed) {
      return new Response(JSON.stringify({ error: "Domain not authorized" }), {
        status: 403,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    let result;

    if (action === "create_annotation") {
      const { error, data: annotation } = await supabase
        .from("annotations")
        .insert({ ...data, project_id })
        .select()
        .single();
      if (error) throw error;
      result = annotation;
    } else if (action === "create_reply") {
      // Validate that the annotation belongs to this project
      const { data: parentAnnotation, error: annError } = await supabase
        .from("annotations")
        .select("id")
        .eq("id", data.annotation_id)
        .eq("project_id", project_id)
        .single();
      if (annError || !parentAnnotation) {
        return new Response(JSON.stringify({ error: "Annotation not found in this project" }), {
          status: 404,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
      const { error, data: reply } = await supabase
        .from("replies")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      result = reply;
    } else if (action === "upload_screenshot") {
      const { path, base64 } = data;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error } = await supabase.storage
        .from("screenshots")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (error) throw error;
      result = { path };
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add write-proxy Edge Function with domain validation and rate limiting"
```

> **Deployment:** Deploy via `supabase functions deploy write-proxy` or the Supabase dashboard. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Edge Function secrets.

---

## Task 4: URL Normalization

**Files:**
- Create: `src/url.js`, `tests/url.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/url.test.js
import { describe, it, expect } from "vitest";
import { normalizeUrl } from "../src/url.js";

describe("normalizeUrl", () => {
  it("returns URL without changes when already clean", () => {
    expect(normalizeUrl("https://example.com/about")).toBe(
      "https://example.com/about",
    );
  });

  it("strips hash fragments", () => {
    expect(normalizeUrl("https://example.com/about#section")).toBe(
      "https://example.com/about",
    );
  });

  it("strips utm tracking parameters", () => {
    expect(
      normalizeUrl("https://example.com/about?utm_source=email&utm_medium=cpc"),
    ).toBe("https://example.com/about");
  });

  it("strips fbclid and gclid", () => {
    expect(normalizeUrl("https://example.com/?fbclid=abc123")).toBe(
      "https://example.com/",
    );
    expect(normalizeUrl("https://example.com/?gclid=xyz")).toBe(
      "https://example.com/",
    );
  });

  it("strips ref parameter", () => {
    expect(normalizeUrl("https://example.com/?ref=twitter")).toBe(
      "https://example.com/",
    );
  });

  it("preserves non-tracking query parameters", () => {
    expect(normalizeUrl("https://example.com/search?q=test&page=2")).toBe(
      "https://example.com/search?q=test&page=2",
    );
  });

  it("strips tracking params but preserves others", () => {
    expect(
      normalizeUrl("https://example.com/search?q=test&utm_source=email"),
    ).toBe("https://example.com/search?q=test");
  });

  it("strips trailing slashes", () => {
    expect(normalizeUrl("https://example.com/about/")).toBe(
      "https://example.com/about",
    );
  });

  it("does not strip trailing slash from root path", () => {
    expect(normalizeUrl("https://example.com/")).toBe(
      "https://example.com/",
    );
  });

  it("lowercases the hostname", () => {
    expect(normalizeUrl("https://EXAMPLE.COM/About")).toBe(
      "https://example.com/About",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/url.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```js
// src/url.js
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
]);

export function normalizeUrl(rawUrl) {
  const url = new URL(rawUrl);

  // Lowercase hostname
  url.hostname = url.hostname.toLowerCase();

  // Strip hash
  url.hash = "";

  // Strip tracking params
  const params = new URLSearchParams(url.search);
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key)) {
      params.delete(key);
    }
  }
  url.search = params.toString();

  let result = url.toString();

  // Strip trailing slash (but not root "/")
  if (result.endsWith("/") && new URL(result).pathname !== "/") {
    result = result.slice(0, -1);
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/url.test.js
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/url.js tests/url.test.js
git commit -m "feat: add URL normalization with tracking param stripping"
```

---

## Task 5: CSS Selector Generation

**Files:**
- Create: `src/selector.js`, `tests/selector.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/selector.test.js
import { describe, it, expect } from "vitest";
import { generateSelector } from "../src/selector.js";

describe("generateSelector", () => {
  it("returns #id for element with id", () => {
    document.body.innerHTML = '<div id="hero"><p>Hello</p></div>';
    const el = document.getElementById("hero");
    expect(generateSelector(el)).toBe("#hero");
  });

  it("builds nth-child chain from nearest ancestor with id", () => {
    document.body.innerHTML =
      '<div id="main"><ul><li>A</li><li>B</li></ul></div>';
    const li = document.querySelectorAll("li")[1];
    const sel = generateSelector(li);
    expect(document.querySelector(sel)).toBe(li);
  });

  it("falls back to chain from body if no id ancestor", () => {
    document.body.innerHTML = "<div><span>X</span></div>";
    const span = document.querySelector("span");
    const sel = generateSelector(span);
    expect(document.querySelector(sel)).toBe(span);
  });

  it("keeps selectors at most 4 levels deep", () => {
    document.body.innerHTML =
      "<div><div><div><div><div><div><span>Deep</span></div></div></div></div></div></div>";
    const span = document.querySelector("span");
    const sel = generateSelector(span);
    const parts = sel.split(" > ");
    expect(parts.length).toBeLessThanOrEqual(4);
  });

  it("generated selector resolves to the original element", () => {
    document.body.innerHTML = `
      <nav><a href="/">Home</a><a href="/about">About</a></nav>
      <main><section><h2>Title</h2><p>Content</p></section></main>
    `;
    const p = document.querySelector("p");
    const sel = generateSelector(p);
    expect(document.querySelector(sel)).toBe(p);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/selector.test.js
```
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/selector.js

/**
 * Generate a CSS selector for an element.
 * Strategy: use #id if available, otherwise build an nth-child chain
 * from the nearest ancestor with an id (or body). Max 4 levels deep.
 */
export function generateSelector(el) {
  if (el.id) return `#${el.id}`;

  const parts = [];
  let current = el;
  const MAX_DEPTH = 4;

  while (current && current !== document.body && parts.length < MAX_DEPTH) {
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }

    const parent = current.parentElement;
    if (!parent) break;

    const index = Array.from(parent.children).indexOf(current) + 1;
    const tag = current.tagName.toLowerCase();
    parts.unshift(`${tag}:nth-child(${index})`);
    current = parent;
  }

  // If we didn't reach an element with an id, anchor from body
  if (!parts[0]?.startsWith("#")) {
    // Build from body downward — find path from body
    const fullPath = [];
    let node = el;
    while (node && node !== document.body) {
      const parent = node.parentElement;
      if (!parent) break;
      const index = Array.from(parent.children).indexOf(node) + 1;
      const tag = node.tagName.toLowerCase();
      fullPath.unshift(`${tag}:nth-child(${index})`);
      node = parent;
    }
    // Take last MAX_DEPTH parts for specificity without fragility
    const trimmed = fullPath.slice(-MAX_DEPTH);
    return `body ${trimmed.join(" > ")}`;
  }

  return parts.join(" > ");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/selector.test.js
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/selector.js tests/selector.test.js
git commit -m "feat: add CSS selector generation for pin anchoring"
```

---

## Task 6: Pin Positioning

**Files:**
- Create: `src/pin.js`, `tests/pin.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/pin.test.js
import { describe, it, expect, vi } from "vitest";
import { calculatePinPosition, restorePinPosition } from "../src/pin.js";

describe("calculatePinPosition", () => {
  it("returns percentages relative to element bounding box", () => {
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 200,
      width: 400,
      height: 300,
      right: 500,
      bottom: 500,
      x: 100,
      y: 200,
      toJSON() {},
    });

    const result = calculatePinPosition(el, 200, 350);
    // (200-100)/400 = 0.25, (350-200)/300 = 0.5
    expect(result.pinX).toBeCloseTo(0.25);
    expect(result.pinY).toBeCloseTo(0.5);
  });
});

describe("restorePinPosition", () => {
  it("returns absolute coordinates from selector and percentages", () => {
    document.body.innerHTML = '<div id="target">Hello</div>';
    const el = document.getElementById("target");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      left: 50,
      top: 100,
      width: 200,
      height: 150,
      right: 250,
      bottom: 250,
      x: 50,
      y: 100,
      toJSON() {},
    });

    const result = restorePinPosition("#target", 0.5, 0.5);
    // 50 + 200*0.5 = 150, 100 + 150*0.5 = 175
    expect(result).toEqual({ x: 150, y: 175, found: true });
  });

  it("falls back to viewport percentages if selector not found", () => {
    const result = restorePinPosition("#nonexistent", 0.5, 0.5);
    expect(result.found).toBe(false);
    // Falls back to viewport-based positioning
    expect(result.x).toBeDefined();
    expect(result.y).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pin.test.js
```
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/pin.js

/**
 * Calculate pin position as percentages of the target element's bounding box.
 * @param {Element} element - The clicked element
 * @param {number} clientX - Click X coordinate (viewport-relative)
 * @param {number} clientY - Click Y coordinate (viewport-relative)
 * @returns {{ pinX: number, pinY: number }}
 */
export function calculatePinPosition(element, clientX, clientY) {
  const rect = element.getBoundingClientRect();
  return {
    pinX: (clientX - rect.left) / rect.width,
    pinY: (clientY - rect.top) / rect.height,
  };
}

/**
 * Restore a pin's absolute position from its selector and stored percentages.
 * Falls back to viewport percentage if selector match fails.
 * @param {string} selector - CSS selector of the target element
 * @param {number} pinX - Horizontal percentage (0-1)
 * @param {number} pinY - Vertical percentage (0-1)
 * @returns {{ x: number, y: number, found: boolean }}
 */
export function restorePinPosition(selector, pinX, pinY) {
  const el = document.querySelector(selector);
  if (el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width * pinX,
      y: rect.top + rect.height * pinY,
      found: true,
    };
  }
  // Fallback: treat as viewport percentages
  return {
    x: window.innerWidth * pinX,
    y: window.innerHeight * pinY,
    found: false,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/pin.test.js
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/pin.js tests/pin.test.js
git commit -m "feat: add pin positioning with element-relative percentages"
```

---

## Task 7: Shared State Module

**Files:**
- Create: `src/state.js`, `tests/state.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/state.test.js
import { describe, it, expect, beforeEach } from "vitest";
import {
  getReviewerIdentity,
  setReviewerIdentity,
  getAnnotationMode,
  setAnnotationMode,
  getAnnotations,
  addAnnotation,
  clearAnnotations,
} from "../src/state.js";

describe("state", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAnnotations();
    setAnnotationMode(false);
  });

  describe("reviewer identity", () => {
    it("reads from localStorage", () => {
      localStorage.setItem("markux-reviewer-name", "Alice");
      localStorage.setItem("markux-reviewer-email", "alice@test.com");
      const id = getReviewerIdentity();
      expect(id.name).toBe("Alice");
      expect(id.email).toBe("alice@test.com");
    });

    it("saves to localStorage", () => {
      setReviewerIdentity("Bob", "bob@test.com");
      expect(localStorage.getItem("markux-reviewer-name")).toBe("Bob");
      expect(localStorage.getItem("markux-reviewer-email")).toBe("bob@test.com");
    });
  });

  describe("annotation mode", () => {
    it("defaults to false", () => {
      expect(getAnnotationMode()).toBe(false);
    });

    it("toggles on and off", () => {
      setAnnotationMode(true);
      expect(getAnnotationMode()).toBe(true);
      setAnnotationMode(false);
      expect(getAnnotationMode()).toBe(false);
    });
  });

  describe("annotations list", () => {
    it("starts empty", () => {
      expect(getAnnotations()).toEqual([]);
    });

    it("adds annotations", () => {
      const ann = { id: "1", comment: "test" };
      addAnnotation(ann);
      expect(getAnnotations()).toEqual([ann]);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/state.test.js
```
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/state.js

let annotationMode = false;
let annotations = [];

export function getReviewerIdentity() {
  return {
    name: localStorage.getItem("markux-reviewer-name") || "",
    email: localStorage.getItem("markux-reviewer-email") || "",
  };
}

export function setReviewerIdentity(name, email) {
  localStorage.setItem("markux-reviewer-name", name);
  localStorage.setItem("markux-reviewer-email", email);
}

export function getAnnotationMode() {
  return annotationMode;
}

export function setAnnotationMode(active) {
  annotationMode = active;
}

export function getAnnotations() {
  return annotations;
}

export function addAnnotation(annotation) {
  annotations.push(annotation);
}

export function removeAnnotation(id) {
  annotations = annotations.filter((a) => a.id !== id);
}

export function updateAnnotation(id, updates) {
  const idx = annotations.findIndex((a) => a.id === id);
  if (idx !== -1) {
    annotations[idx] = { ...annotations[idx], ...updates };
  }
}

export function clearAnnotations() {
  annotations = [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/state.test.js
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/state.js tests/state.test.js
git commit -m "feat: add shared state module for reviewer identity and annotations"
```

---

## Task 8: Supabase Client & API Module

**Files:**
- Create: `src/supabase-client.js`, `src/api.js`, `tests/api.test.js`

- [ ] **Step 1: Write the Supabase client initializer**

```js
// src/supabase-client.js
import { createClient } from "@supabase/supabase-js";

let client = null;

export function initSupabase(url, anonKey) {
  client = createClient(url, anonKey);
  return client;
}

export function getSupabase() {
  if (!client) throw new Error("Supabase client not initialized");
  return client;
}
```

- [ ] **Step 2: Write the failing API tests**

```js
// tests/api.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAnnotation, createReply, uploadScreenshot } from "../src/api.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("api", () => {
  const edgeFunctionUrl = "https://test.supabase.co/functions/v1/write-proxy";

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("createAnnotation", () => {
    it("sends POST to edge function with annotation data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { id: "ann-1", comment: "test" } }),
      });

      const result = await createAnnotation(edgeFunctionUrl, "proj-1", {
        comment: "test",
        pin_x: 0.5,
        pin_y: 0.5,
        pin_selector: "#hero",
        page_url: "https://example.com",
        author_name: "Alice",
        author_email: "alice@test.com",
        viewport_width: 1440,
        viewport_height: 900,
      });

      expect(mockFetch).toHaveBeenCalledWith(edgeFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"action":"create_annotation"'),
      });
      expect(result.id).toBe("ann-1");
    });
  });

  describe("createReply", () => {
    it("sends POST with reply data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "reply-1" } }),
      });

      const result = await createReply(edgeFunctionUrl, "proj-1", {
        annotation_id: "ann-1",
        author_name: "Bob",
        author_email: "bob@test.com",
        body: "Noted!",
      });

      expect(result.id).toBe("reply-1");
    });
  });

  describe("uploadScreenshot", () => {
    it("sends base64 screenshot data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { path: "proj-1/ann-1.png" } }),
      });

      const result = await uploadScreenshot(
        edgeFunctionUrl,
        "proj-1",
        "proj-1/ann-1.png",
        "iVBOR...",
      );

      expect(result.path).toBe("proj-1/ann-1.png");
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/api.test.js
```
Expected: FAIL

- [ ] **Step 4: Write the API implementation**

```js
// src/api.js

async function callEdgeFunction(edgeFunctionUrl, payload) {
  const res = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export async function createAnnotation(edgeFunctionUrl, projectId, data) {
  return callEdgeFunction(edgeFunctionUrl, {
    action: "create_annotation",
    project_id: projectId,
    data,
  });
}

export async function createReply(edgeFunctionUrl, projectId, data) {
  return callEdgeFunction(edgeFunctionUrl, {
    action: "create_reply",
    project_id: projectId,
    data,
  });
}

export async function uploadScreenshot(
  edgeFunctionUrl,
  projectId,
  path,
  base64,
) {
  return callEdgeFunction(edgeFunctionUrl, {
    action: "upload_screenshot",
    project_id: projectId,
    data: { path, base64 },
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/api.test.js
```
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/supabase-client.js src/api.js tests/api.test.js
git commit -m "feat: add Supabase client and Edge Function API wrapper"
```

---

## Task 9: Screenshot Capture

**Files:**
- Create: `src/screenshot.js`

- [ ] **Step 1: Write the screenshot wrapper**

```js
// src/screenshot.js
import html2canvas from "html2canvas";

/**
 * Capture a screenshot of the current viewport.
 * Returns base64-encoded PNG string, or null if capture fails.
 */
export async function captureScreenshot() {
  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      logging: false,
      width: window.innerWidth,
      height: window.innerHeight,
      x: window.scrollX,
      y: window.scrollY,
    });
    // Remove the "data:image/png;base64," prefix
    return canvas.toDataURL("image/png").split(",")[1];
  } catch {
    console.warn("MarkUX: screenshot capture failed");
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screenshot.js
git commit -m "feat: add html2canvas screenshot capture wrapper"
```

> **Note:** html2canvas relies on DOM APIs not available in jsdom, so this module is tested via integration tests rather than unit tests.

---

## Task 10: Shadow DOM Styles

**Files:**
- Create: `src/ui/styles.js`

- [ ] **Step 1: Write the styles module**

This defines all CSS for the embeddable UI. Everything lives inside shadow DOM so it won't conflict with host site styles.

```js
// src/ui/styles.js

export const STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1a1a1a;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Floating Button */
  .markux-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #6366f1;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 2147483647;
    transition: transform 0.15s ease, background 0.15s ease;
  }

  .markux-fab:hover {
    transform: scale(1.08);
    background: #4f46e5;
  }

  .markux-fab.active {
    background: #ef4444;
  }

  .markux-fab svg {
    width: 22px;
    height: 22px;
    fill: white;
  }

  .markux-fab .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #ef4444;
    color: white;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
  }

  .markux-fab.active .badge {
    background: #6366f1;
  }

  /* Crosshair overlay */
  .markux-overlay {
    position: fixed;
    inset: 0;
    cursor: crosshair;
    z-index: 2147483646;
    pointer-events: none;
  }

  .markux-overlay.active {
    pointer-events: auto;
  }

  /* Element highlight */
  .markux-highlight {
    position: fixed;
    border: 2px solid #6366f1;
    background: rgba(99, 102, 241, 0.08);
    pointer-events: none;
    z-index: 2147483645;
    transition: all 0.1s ease;
  }

  /* Pin marker */
  .markux-pin {
    position: fixed;
    width: 28px;
    height: 28px;
    margin-left: -14px;
    margin-top: -28px;
    cursor: pointer;
    z-index: 2147483644;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
    transition: transform 0.15s ease;
  }

  .markux-pin:hover {
    transform: scale(1.15);
  }

  .markux-pin svg {
    width: 28px;
    height: 28px;
  }

  .markux-pin .pin-number {
    position: absolute;
    top: 3px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    font-weight: 700;
    color: white;
  }

  /* Popover (shared base for comment form and thread view) */
  .markux-popover {
    position: fixed;
    width: 320px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    z-index: 2147483647;
    overflow: hidden;
  }

  .markux-popover-header {
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    font-size: 13px;
    color: #6b7280;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .markux-popover-body {
    padding: 16px;
  }

  .markux-popover-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 18px;
    line-height: 1;
    padding: 0;
  }

  .markux-popover-close:hover {
    color: #6b7280;
  }

  /* Form elements */
  .markux-input, .markux-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }

  .markux-input:focus, .markux-textarea:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .markux-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .markux-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .markux-field {
    margin-bottom: 12px;
  }

  .markux-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    border: none;
    transition: background 0.15s;
  }

  .markux-btn-primary {
    background: #6366f1;
    color: white;
  }

  .markux-btn-primary:hover {
    background: #4f46e5;
  }

  .markux-btn-primary:disabled {
    background: #c7d2fe;
    cursor: not-allowed;
  }

  /* Thread / reply styles */
  .markux-thread {
    max-height: 300px;
    overflow-y: auto;
  }

  .markux-comment {
    padding: 12px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .markux-comment:last-child {
    border-bottom: none;
  }

  .markux-comment-author {
    font-weight: 600;
    font-size: 13px;
  }

  .markux-comment-time {
    font-size: 11px;
    color: #9ca3af;
    margin-left: 8px;
  }

  .markux-comment-body {
    margin-top: 4px;
    font-size: 13px;
    color: #374151;
  }

  .markux-status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 500;
  }

  .markux-status-open {
    background: #fef3c7;
    color: #92400e;
  }

  .markux-status-resolved {
    background: #d1fae5;
    color: #065f46;
  }
`;
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/ui
git add src/ui/styles.js
git commit -m "feat: add shadow DOM styles for embeddable UI"
```

---

## Task 11: Floating Action Button

**Files:**
- Create: `src/ui/floating-button.js`, `tests/ui/floating-button.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/ui/floating-button.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFloatingButton } from "../../src/ui/floating-button.js";

describe("createFloatingButton", () => {
  let button;
  let onToggle;

  beforeEach(() => {
    onToggle = vi.fn();
    button = createFloatingButton(onToggle);
  });

  it("creates a button element with markux-fab class", () => {
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("markux-fab")).toBe(true);
  });

  it("contains an SVG icon", () => {
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("calls onToggle when clicked", () => {
    button.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("toggles active class on click", () => {
    button.click();
    expect(button.classList.contains("active")).toBe(true);
    button.click();
    expect(button.classList.contains("active")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/ui/floating-button.test.js
```
Expected: FAIL

- [ ] **Step 3: Write the implementation**

Note: SVG icons are static trusted content, not user input, so setting them via innerHTML is safe.

```js
// src/ui/floating-button.js

const PEN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z"/>
</svg>`;

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"/>
</svg>`;

export function createFloatingButton(onToggle) {
  const button = document.createElement("button");
  button.className = "markux-fab";
  // Static SVG icon — safe to set via innerHTML (no user input)
  button.innerHTML = PEN_ICON;
  button.setAttribute("aria-label", "Toggle MarkUX annotations");

  let isActive = false;

  button.addEventListener("click", () => {
    isActive = !isActive;
    button.classList.toggle("active", isActive);
    // Static SVG icon — safe to set via innerHTML (no user input)
    button.innerHTML = isActive ? CLOSE_ICON : PEN_ICON;

    // Re-add badge if exists
    if (button._badgeCount > 0) {
      updateBadge(button, button._badgeCount);
    }

    onToggle(isActive);
  });

  button._badgeCount = 0;
  return button;
}

export function updateBadge(button, count) {
  button._badgeCount = count;
  const existing = button.querySelector(".badge");
  if (existing) existing.remove();

  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = count;
    button.appendChild(badge);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/ui/floating-button.test.js
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/floating-button.js tests/ui/floating-button.test.js
git commit -m "feat: add floating action button component"
```

---

## Task 12: Annotation Mode (Overlay + Element Highlighting)

**Files:**
- Create: `src/ui/annotation-mode.js`, `tests/ui/annotation-mode.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/ui/annotation-mode.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOverlay,
  createHighlight,
  activateAnnotationMode,
  deactivateAnnotationMode,
} from "../../src/ui/annotation-mode.js";

describe("annotation mode", () => {
  describe("createOverlay", () => {
    it("creates a div with markux-overlay class", () => {
      const overlay = createOverlay(vi.fn());
      expect(overlay.classList.contains("markux-overlay")).toBe(true);
    });
  });

  describe("createHighlight", () => {
    it("creates a div with markux-highlight class", () => {
      const highlight = createHighlight();
      expect(highlight.classList.contains("markux-highlight")).toBe(true);
    });
  });

  describe("activateAnnotationMode", () => {
    it("adds active class to overlay", () => {
      const overlay = createOverlay(vi.fn());
      activateAnnotationMode(overlay);
      expect(overlay.classList.contains("active")).toBe(true);
    });
  });

  describe("deactivateAnnotationMode", () => {
    it("removes active class from overlay", () => {
      const overlay = createOverlay(vi.fn());
      activateAnnotationMode(overlay);
      deactivateAnnotationMode(overlay);
      expect(overlay.classList.contains("active")).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/ui/annotation-mode.test.js
```
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/ui/annotation-mode.js

/**
 * Create the transparent overlay that intercepts clicks during annotation mode.
 * @param {(e: MouseEvent) => void} onClick - Called when the overlay is clicked
 */
export function createOverlay(onClick) {
  const overlay = document.createElement("div");
  overlay.className = "markux-overlay";
  overlay.addEventListener("click", onClick);
  return overlay;
}

/**
 * Create the element highlight box (follows hovered elements).
 */
export function createHighlight() {
  const highlight = document.createElement("div");
  highlight.className = "markux-highlight";
  highlight.style.display = "none";
  return highlight;
}

export function activateAnnotationMode(overlay) {
  overlay.classList.add("active");
}

export function deactivateAnnotationMode(overlay) {
  overlay.classList.remove("active");
}

/**
 * Set up mousemove handler on the document to highlight elements under cursor.
 * The overlay is pointer-events:none during highlight detection, then re-enabled.
 * @param {HTMLElement} overlay - The annotation mode overlay
 * @param {HTMLElement} highlight - The highlight box element
 * @param {HTMLElement} shadowHost - The markux container (to exclude from highlighting)
 */
export function setupHighlighting(overlay, highlight, shadowHost) {
  let lastTarget = null;

  const onMouseMove = (e) => {
    if (!overlay.classList.contains("active")) return;

    // Temporarily disable overlay to find element underneath
    overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = "auto";

    // Don't highlight our own elements
    if (!target || target === document.body || shadowHost.contains(target)) {
      highlight.style.display = "none";
      lastTarget = null;
      return;
    }

    if (target !== lastTarget) {
      lastTarget = target;
      const rect = target.getBoundingClientRect();
      highlight.style.display = "block";
      highlight.style.left = `${rect.left}px`;
      highlight.style.top = `${rect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
    }
  };

  // Store handler reference for cleanup
  overlay._onMouseMove = onMouseMove;
  document.addEventListener("mousemove", onMouseMove);

  return () => {
    document.removeEventListener("mousemove", onMouseMove);
    highlight.style.display = "none";
    lastTarget = null;
  };
}

/**
 * Get the real element under the click point (looking through the overlay).
 */
export function getElementUnderClick(overlay, clientX, clientY) {
  overlay.style.pointerEvents = "none";
  const target = document.elementFromPoint(clientX, clientY);
  overlay.style.pointerEvents = "auto";
  return target;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/ui/annotation-mode.test.js
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/annotation-mode.js tests/ui/annotation-mode.test.js
git commit -m "feat: add annotation mode with overlay and element highlighting"
```

---

## Task 13: Pin Marker Component

**Files:**
- Create: `src/ui/pin-marker.js`

- [ ] **Step 1: Write the pin marker component**

```js
// src/ui/pin-marker.js

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#6366f1" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"/>
</svg>`;

/**
 * Create a numbered pin marker element.
 * @param {number} number - The pin number to display
 * @param {number} x - Absolute X position (viewport px)
 * @param {number} y - Absolute Y position (viewport px)
 * @param {() => void} onClick - Called when pin is clicked
 */
export function createPinMarker(number, x, y, onClick) {
  const pin = document.createElement("div");
  pin.className = "markux-pin";
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
  // Static SVG — safe to set via innerHTML (no user input)
  pin.innerHTML = PIN_SVG;

  const label = document.createElement("span");
  label.className = "pin-number";
  label.textContent = number;
  pin.appendChild(label);

  pin.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });

  return pin;
}

/**
 * Update the position of an existing pin marker.
 */
export function updatePinPosition(pin, x, y) {
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/pin-marker.js
git commit -m "feat: add pin marker component"
```

---

## Task 14: Comment Popover (New Annotation Form)

**Files:**
- Create: `src/ui/comment-popover.js`, `tests/ui/comment-popover.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/ui/comment-popover.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCommentPopover } from "../../src/ui/comment-popover.js";

describe("createCommentPopover", () => {
  let popover;
  let onSubmit;
  let onClose;

  beforeEach(() => {
    onSubmit = vi.fn();
    onClose = vi.fn();
    popover = createCommentPopover({ x: 100, y: 200 }, onSubmit, onClose);
  });

  it("creates a form with name, email, and comment fields", () => {
    const inputs = popover.querySelectorAll("input, textarea");
    expect(inputs.length).toBe(3);
  });

  it("has a submit button", () => {
    const btn = popover.querySelector("button[type='submit']");
    expect(btn).toBeTruthy();
  });

  it("has a close button that calls onClose", () => {
    const closeBtn = popover.querySelector(".markux-popover-close");
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("pre-fills name and email from localStorage", () => {
    localStorage.setItem("markux-reviewer-name", "Alice");
    localStorage.setItem("markux-reviewer-email", "alice@test.com");

    const p = createCommentPopover({ x: 100, y: 200 }, onSubmit, onClose);
    const nameInput = p.querySelector('input[name="name"]');
    const emailInput = p.querySelector('input[name="email"]');
    expect(nameInput.value).toBe("Alice");
    expect(emailInput.value).toBe("alice@test.com");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/ui/comment-popover.test.js
```
Expected: FAIL

- [ ] **Step 3: Write the implementation**

All user-provided values are escaped via `escapeHtml()` (textContent-based) before insertion into HTML templates.

```js
// src/ui/comment-popover.js

/**
 * Create a comment form popover for submitting a new annotation.
 * @param {{ x: number, y: number }} position - Where to show the popover
 * @param {(data: { name: string, email: string, comment: string }) => void} onSubmit
 * @param {() => void} onClose
 */
export function createCommentPopover(position, onSubmit, onClose) {
  const popover = document.createElement("div");
  popover.className = "markux-popover";

  // Position near the pin, but keep on screen
  const left = Math.min(position.x + 20, window.innerWidth - 340);
  const top = Math.min(position.y - 20, window.innerHeight - 350);
  popover.style.left = `${Math.max(10, left)}px`;
  popover.style.top = `${Math.max(10, top)}px`;

  const savedName = localStorage.getItem("markux-reviewer-name") || "";
  const savedEmail = localStorage.getItem("markux-reviewer-email") || "";

  // Build form using DOM API for safe value injection
  const header = document.createElement("div");
  header.className = "markux-popover-header";

  const headerLabel = document.createElement("span");
  headerLabel.textContent = "Add Annotation";
  header.appendChild(headerLabel);

  const closeBtn = document.createElement("button");
  closeBtn.className = "markux-popover-close";
  closeBtn.type = "button";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", onClose);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "markux-popover-body";

  const form = document.createElement("form");

  // Name field
  const nameField = createField("Name", "text", "name", "Your name", savedName, true);
  form.appendChild(nameField);

  // Email field
  const emailField = createField("Email", "email", "email", "your@email.com", savedEmail, true);
  form.appendChild(emailField);

  // Comment field
  const commentFieldWrapper = document.createElement("div");
  commentFieldWrapper.className = "markux-field";
  const commentLabel = document.createElement("label");
  commentLabel.className = "markux-label";
  commentLabel.textContent = "Comment";
  const commentTextarea = document.createElement("textarea");
  commentTextarea.className = "markux-textarea";
  commentTextarea.name = "comment";
  commentTextarea.required = true;
  commentTextarea.placeholder = "Describe the issue or suggestion...";
  commentFieldWrapper.appendChild(commentLabel);
  commentFieldWrapper.appendChild(commentTextarea);
  form.appendChild(commentFieldWrapper);

  // Submit button
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "markux-btn markux-btn-primary";
  submitBtn.style.width = "100%";
  submitBtn.textContent = "Submit";
  form.appendChild(submitBtn);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const comment = form.elements.comment.value.trim();

    if (!name || !email || !comment) return;

    // Save identity for next time
    localStorage.setItem("markux-reviewer-name", name);
    localStorage.setItem("markux-reviewer-email", email);

    // Disable button during submission
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    onSubmit({ name, email, comment });
  });

  body.appendChild(form);
  popover.appendChild(header);
  popover.appendChild(body);

  return popover;
}

function createField(labelText, type, name, placeholder, value, required) {
  const wrapper = document.createElement("div");
  wrapper.className = "markux-field";

  const label = document.createElement("label");
  label.className = "markux-label";
  label.textContent = labelText;

  const input = document.createElement("input");
  input.className = "markux-input";
  input.type = type;
  input.name = name;
  input.placeholder = placeholder;
  input.value = value;
  input.required = required;

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/ui/comment-popover.test.js
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/comment-popover.js tests/ui/comment-popover.test.js
git commit -m "feat: add comment popover form for new annotations"
```

---

## Task 15: Thread Popover (View Existing Annotation + Replies)

**Files:**
- Create: `src/ui/thread-popover.js`

- [ ] **Step 1: Write the thread popover component**

All user-provided values (author names, comment bodies, etc.) are escaped via `escapeHtml()` (textContent-based) before insertion into HTML.

```js
// src/ui/thread-popover.js

/**
 * Create a popover showing an existing annotation's comment thread.
 * @param {object} annotation - The annotation record
 * @param {object[]} replies - Array of reply records
 * @param {{ x: number, y: number }} position
 * @param {(replyData: { name: string, email: string, body: string }) => void} onReply
 * @param {() => void} onClose
 */
export function createThreadPopover(
  annotation,
  replies,
  position,
  onReply,
  onClose,
) {
  const popover = document.createElement("div");
  popover.className = "markux-popover";

  const left = Math.min(position.x + 20, window.innerWidth - 340);
  const top = Math.min(position.y - 20, window.innerHeight - 450);
  popover.style.left = `${Math.max(10, left)}px`;
  popover.style.top = `${Math.max(10, top)}px`;

  // Header
  const header = document.createElement("div");
  header.className = "markux-popover-header";

  const statusSpan = document.createElement("span");
  statusSpan.className = `markux-status ${annotation.status === "open" ? "markux-status-open" : "markux-status-resolved"}`;
  statusSpan.textContent = annotation.status;
  header.appendChild(statusSpan);

  const closeBtn = document.createElement("button");
  closeBtn.className = "markux-popover-close";
  closeBtn.type = "button";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", onClose);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "markux-popover-body";

  // Thread container
  const thread = document.createElement("div");
  thread.className = "markux-thread";

  // Original comment
  thread.appendChild(createCommentEl(annotation.author_name, annotation.created_at, annotation.comment));

  // Replies
  replies.forEach((r) => {
    thread.appendChild(createCommentEl(r.author_name, r.created_at, r.body));
  });

  body.appendChild(thread);

  // Reply form
  const formWrapper = document.createElement("div");
  formWrapper.style.cssText = "border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;";

  const savedName = localStorage.getItem("markux-reviewer-name") || "";
  const savedEmail = localStorage.getItem("markux-reviewer-email") || "";

  const form = document.createElement("form");

  const identityRow = document.createElement("div");
  identityRow.className = "markux-field";
  identityRow.style.cssText = "display:flex;gap:8px;";

  const nameInput = document.createElement("input");
  nameInput.className = "markux-input";
  nameInput.type = "text";
  nameInput.name = "name";
  nameInput.placeholder = "Name";
  nameInput.value = savedName;
  nameInput.required = true;
  nameInput.style.flex = "1";

  const emailInput = document.createElement("input");
  emailInput.className = "markux-input";
  emailInput.type = "email";
  emailInput.name = "email";
  emailInput.placeholder = "Email";
  emailInput.value = savedEmail;
  emailInput.required = true;
  emailInput.style.flex = "1";

  identityRow.appendChild(nameInput);
  identityRow.appendChild(emailInput);
  form.appendChild(identityRow);

  const replyRow = document.createElement("div");
  replyRow.className = "markux-field";
  replyRow.style.cssText = "display:flex;gap:8px;";

  const bodyInput = document.createElement("input");
  bodyInput.className = "markux-input";
  bodyInput.type = "text";
  bodyInput.name = "body";
  bodyInput.placeholder = "Reply...";
  bodyInput.required = true;
  bodyInput.style.flex = "1";

  const replyBtn = document.createElement("button");
  replyBtn.type = "submit";
  replyBtn.className = "markux-btn markux-btn-primary";
  replyBtn.textContent = "Reply";

  replyRow.appendChild(bodyInput);
  replyRow.appendChild(replyBtn);
  form.appendChild(replyRow);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const replyBody = bodyInput.value.trim();
    if (!name || !email || !replyBody) return;

    localStorage.setItem("markux-reviewer-name", name);
    localStorage.setItem("markux-reviewer-email", email);

    onReply({ name, email, body: replyBody });
    bodyInput.value = "";
  });

  formWrapper.appendChild(form);
  body.appendChild(formWrapper);

  popover.appendChild(header);
  popover.appendChild(body);

  return popover;
}

function createCommentEl(authorName, createdAt, text) {
  const el = document.createElement("div");
  el.className = "markux-comment";

  const author = document.createElement("span");
  author.className = "markux-comment-author";
  author.textContent = authorName;

  const time = document.createElement("span");
  time.className = "markux-comment-time";
  time.textContent = formatTime(createdAt);

  const bodyEl = document.createElement("div");
  bodyEl.className = "markux-comment-body";
  bodyEl.textContent = text;

  el.appendChild(author);
  el.appendChild(time);
  el.appendChild(bodyEl);
  return el;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/thread-popover.js
git commit -m "feat: add thread popover for viewing annotations and replies"
```

---

## Task 16: Realtime Subscription

**Files:**
- Create: `src/realtime.js`

- [ ] **Step 1: Write the realtime module**

```js
// src/realtime.js
import { getSupabase } from "./supabase-client.js";

let channel = null;

/**
 * Subscribe to realtime annotation changes for a project.
 * @param {string} projectId
 * @param {(annotation: object) => void} onInsert - Called when a new annotation is created
 * @param {(annotation: object) => void} onUpdate - Called when an annotation is updated
 * @param {(annotation: object) => void} onDelete - Called when an annotation is deleted
 */
export function subscribeToAnnotations(
  projectId,
  { onInsert, onUpdate, onDelete },
) {
  const supabase = getSupabase();

  channel = supabase
    .channel(`annotations:${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "annotations",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onInsert(payload.new),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "annotations",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onUpdate(payload.new),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "annotations",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onDelete(payload.old),
    )
    .subscribe();
}

export function unsubscribe() {
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/realtime.js
git commit -m "feat: add Supabase Realtime subscription for live annotation updates"
```

---

## Task 17: Main Entry Point (Orchestration)

**Files:**
- Create: `src/index.js`

- [ ] **Step 1: Write the main entry point**

This is the orchestration module that ties everything together — shadow DOM setup, init flow, and event coordination.

```js
// src/index.js
import { initSupabase, getSupabase } from "./supabase-client.js";
import { normalizeUrl } from "./url.js";
import { generateSelector } from "./selector.js";
import { calculatePinPosition, restorePinPosition } from "./pin.js";
import {
  getAnnotations,
  addAnnotation,
  clearAnnotations,
  setAnnotationMode,
} from "./state.js";
import { createAnnotation, createReply, uploadScreenshot } from "./api.js";
import { captureScreenshot } from "./screenshot.js";
import { STYLES } from "./ui/styles.js";
import { createFloatingButton, updateBadge } from "./ui/floating-button.js";
import {
  createOverlay,
  createHighlight,
  activateAnnotationMode,
  deactivateAnnotationMode,
  setupHighlighting,
  getElementUnderClick,
} from "./ui/annotation-mode.js";
import { createPinMarker, updatePinPosition } from "./ui/pin-marker.js";
import { createCommentPopover } from "./ui/comment-popover.js";
import { createThreadPopover } from "./ui/thread-popover.js";
import { subscribeToAnnotations } from "./realtime.js";

(function () {
  // Find our script tag — cannot use document.currentScript inside esbuild IIFE
  // as it becomes null after the script finishes parsing
  const scriptTag = document.querySelector("script[data-project]");
  if (!scriptTag) {
    console.error("MarkUX: could not find script tag with data-project attribute");
    return;
  }

  const projectId = scriptTag.getAttribute("data-project");
  if (!projectId) {
    console.error("MarkUX: missing data-project attribute");
    return;
  }

  // Supabase config — these are embedded at build time or read from data attributes
  const supabaseUrl =
    scriptTag.getAttribute("data-supabase-url") || "__SUPABASE_URL__";
  const supabaseAnonKey =
    scriptTag.getAttribute("data-supabase-anon-key") || "__SUPABASE_ANON_KEY__";
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/write-proxy`;

  const pageUrl = normalizeUrl(window.location.href);

  function init() {
    const supabase = initSupabase(supabaseUrl, supabaseAnonKey);

    // Create shadow DOM container
    const host = document.createElement("div");
    host.id = "markux-host";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "closed" });

    // Inject styles
    const style = document.createElement("style");
    style.textContent = STYLES;
    shadow.appendChild(style);

    // Create UI elements
    const highlight = createHighlight();
    const overlay = createOverlay(handleOverlayClick);
    const fab = createFloatingButton(handleToggle);

    shadow.appendChild(highlight);
    shadow.appendChild(overlay);
    shadow.appendChild(fab);

    // Pin container (within shadow DOM)
    const pinContainer = document.createElement("div");
    shadow.appendChild(pinContainer);

    // Popover container
    const popoverContainer = document.createElement("div");
    shadow.appendChild(popoverContainer);

    let cleanupHighlighting = null;
    let currentPopover = null;

    function handleToggle(isActive) {
      setAnnotationMode(isActive);
      if (isActive) {
        activateAnnotationMode(overlay);
        cleanupHighlighting = setupHighlighting(overlay, highlight, host);
      } else {
        deactivateAnnotationMode(overlay);
        if (cleanupHighlighting) {
          cleanupHighlighting();
          cleanupHighlighting = null;
        }
        closePopover();
      }
    }

    function closePopover() {
      if (currentPopover) {
        currentPopover.remove();
        currentPopover = null;
      }
    }

    function handleOverlayClick(e) {
      closePopover();
      highlight.style.display = "none";

      const target = getElementUnderClick(overlay, e.clientX, e.clientY);
      if (!target || target === document.body || host.contains(target)) return;

      const selector = generateSelector(target);
      const { pinX, pinY } = calculatePinPosition(target, e.clientX, e.clientY);
      const pinNumber = getAnnotations().length + 1;

      // Create pin at click position
      const pin = createPinMarker(pinNumber, e.clientX, e.clientY, () => {});
      pinContainer.appendChild(pin);

      // Show comment form
      const popover = createCommentPopover(
        { x: e.clientX, y: e.clientY },
        async ({ name, email, comment }) => {
          try {
            // Capture screenshot
            const screenshotBase64 = await captureScreenshot();

            // Create annotation via Edge Function (without screenshot path initially)
            const annotation = await createAnnotation(
              edgeFunctionUrl,
              projectId,
              {
                page_url: pageUrl,
                author_name: name,
                author_email: email,
                comment,
                pin_x: pinX,
                pin_y: pinY,
                pin_selector: selector,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
              },
            );

            // Upload screenshot using annotation ID per spec: {project_id}/{annotation_id}.png
            if (screenshotBase64) {
              const screenshotPath = `${projectId}/${annotation.id}.png`;
              await uploadScreenshot(
                edgeFunctionUrl,
                projectId,
                screenshotPath,
                screenshotBase64,
              ).then(() => {
                annotation.screenshot_path = screenshotPath;
              }).catch(() => {
                // Screenshot upload failure is non-critical
                console.warn("MarkUX: screenshot upload failed");
              });
            }

            addAnnotation(annotation);
            updateBadge(fab, getAnnotations().filter((a) => a.status === "open").length);

            // Update pin click handler to show thread
            pin.onclick = () => showThread(annotation, pin);

            closePopover();
          } catch (err) {
            console.error("MarkUX: failed to create annotation", err);
            const btn = popover.querySelector('button[type="submit"]');
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Retry";
            }
          }
        },
        () => {
          closePopover();
          pin.remove();
        },
      );

      currentPopover = popover;
      popoverContainer.appendChild(popover);
    }

    async function showThread(annotation, pinEl) {
      closePopover();
      const rect = pinEl.getBoundingClientRect();

      // Fetch replies
      const { data: replies } = await supabase
        .from("replies")
        .select("*")
        .eq("annotation_id", annotation.id)
        .order("created_at", { ascending: true });

      const popover = createThreadPopover(
        annotation,
        replies || [],
        { x: rect.left, y: rect.bottom },
        async ({ name, email, body }) => {
          try {
            await createReply(edgeFunctionUrl, projectId, {
              annotation_id: annotation.id,
              author_name: name,
              author_email: email,
              body,
            });
            // Refresh thread
            showThread(annotation, pinEl);
          } catch (err) {
            console.error("MarkUX: failed to create reply", err);
          }
        },
        closePopover,
      );

      currentPopover = popover;
      popoverContainer.appendChild(popover);
    }

    // Load existing annotations for this page
    async function loadAnnotations() {
      const { data, error } = await supabase
        .from("annotations")
        .select("*")
        .eq("project_id", projectId)
        .eq("page_url", pageUrl)
        .eq("status", "open")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("MarkUX: failed to load annotations", error);
        return;
      }

      clearAnnotations();
      // Remove existing pins using DOM API
      while (pinContainer.firstChild) {
        pinContainer.removeChild(pinContainer.firstChild);
      }

      (data || []).forEach((annotation, index) => {
        addAnnotation(annotation);

        const { x, y } = restorePinPosition(
          annotation.pin_selector,
          annotation.pin_x,
          annotation.pin_y,
        );

        const pin = createPinMarker(index + 1, x, y, () =>
          showThread(annotation, pin),
        );
        pinContainer.appendChild(pin);
      });

      updateBadge(fab, data?.length || 0);
    }

    // Validate project exists and domain is allowed
    async function validateProject() {
      const { data: project, error } = await supabase
        .from("projects")
        .select("allowed_domains")
        .eq("id", projectId)
        .single();

      if (error || !project) {
        console.error("MarkUX: project not found");
        host.remove();
        return false;
      }

      const currentDomain = window.location.hostname;
      const allowed = project.allowed_domains.some(
        (d) => currentDomain === d || currentDomain.endsWith(`.${d}`),
      );

      if (!allowed) {
        console.error("MarkUX: domain not authorized for this project");
        host.remove();
        return false;
      }

      return true;
    }

    // Initialize
    validateProject().then((valid) => {
      if (!valid) return;
      loadAnnotations();
      subscribeToAnnotations(projectId, {
        onInsert: (ann) => {
          if (ann.page_url !== pageUrl) return;
          addAnnotation(ann);
          const { x, y } = restorePinPosition(
            ann.pin_selector,
            ann.pin_x,
            ann.pin_y,
          );
          const pin = createPinMarker(
            getAnnotations().length,
            x,
            y,
            () => showThread(ann, pin),
          );
          pinContainer.appendChild(pin);
          updateBadge(fab, getAnnotations().filter((a) => a.status === "open").length);
        },
        onUpdate: () => loadAnnotations(),
        onDelete: () => loadAnnotations(),
      });
    });

    // Re-position pins on scroll/resize
    function repositionPins() {
      const annotations = getAnnotations();
      const pins = pinContainer.querySelectorAll(".markux-pin");
      annotations.forEach((ann, i) => {
        if (pins[i]) {
          const { x, y } = restorePinPosition(
            ann.pin_selector,
            ann.pin_x,
            ann.pin_y,
          );
          updatePinPosition(pins[i], x, y);
        }
      });
    }

    window.addEventListener("scroll", repositionPins, { passive: true });
    window.addEventListener("resize", repositionPins, { passive: true });
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Verify the build works**

```bash
npm run build
```
Expected: `dist/markux.js` is created without errors

- [ ] **Step 3: Commit**

```bash
git add src/index.js
git commit -m "feat: add main entry point with full annotation flow orchestration"
```

---

## Task 18: Integration Test

**Files:**
- Create: `tests/integration/annotation-flow.test.js`

- [ ] **Step 1: Write the integration test**

```js
// tests/integration/annotation-flow.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeUrl } from "../../src/url.js";
import { generateSelector } from "../../src/selector.js";
import { calculatePinPosition, restorePinPosition } from "../../src/pin.js";
import {
  getAnnotations,
  addAnnotation,
  clearAnnotations,
} from "../../src/state.js";

describe("annotation flow integration", () => {
  beforeEach(() => {
    clearAnnotations();
    document.body.innerHTML = `
      <header id="header">
        <nav><a href="/">Home</a></nav>
      </header>
      <main id="main">
        <section>
          <h1>Welcome</h1>
          <p id="target">Click here to annotate</p>
        </section>
      </main>
    `;
  });

  it("full flow: normalize URL, generate selector, calculate position, restore position", () => {
    // 1. Normalize URL
    const url = normalizeUrl(
      "https://Example.COM/page?utm_source=email&q=test#section",
    );
    expect(url).toBe("https://example.com/page?q=test");

    // 2. Generate selector for target element
    const target = document.getElementById("target");
    const selector = generateSelector(target);
    expect(selector).toBe("#target");

    // 3. Calculate pin position
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 200,
      width: 400,
      height: 50,
      right: 500,
      bottom: 250,
      x: 100,
      y: 200,
      toJSON() {},
    });

    const { pinX, pinY } = calculatePinPosition(target, 300, 225);
    expect(pinX).toBeCloseTo(0.5);
    expect(pinY).toBeCloseTo(0.5);

    // 4. Store annotation
    const annotation = {
      id: "test-1",
      project_id: "proj-1",
      page_url: url,
      pin_x: pinX,
      pin_y: pinY,
      pin_selector: selector,
      comment: "This looks great",
      author_name: "Alice",
      author_email: "alice@test.com",
      status: "open",
      viewport_width: 1440,
      viewport_height: 900,
    };
    addAnnotation(annotation);
    expect(getAnnotations()).toHaveLength(1);

    // 5. Restore pin position (simulates page reload)
    const { x, y, found } = restorePinPosition(selector, pinX, pinY);
    expect(found).toBe(true);
    expect(x).toBeCloseTo(300);
    expect(y).toBeCloseTo(225);
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/
git commit -m "test: add integration test for annotation flow"
```

---

## Task 19: Admin App — Supabase Client & Auth

**Files:**
- Create: `admin/js/supabase-client.js`, `admin/js/auth.js`, `admin/index.html`, `admin/css/admin.css`

- [ ] **Step 1: Create the admin Supabase client**

```js
// admin/js/supabase-client.js

// Loaded via CDN import map in HTML
const SUPABASE_URL = "__SUPABASE_URL__"; // Replace with actual URL
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__"; // Replace with actual key

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

export function getSupabaseUrl() {
  return SUPABASE_URL;
}
```

- [ ] **Step 2: Create the auth module**

```js
// admin/js/auth.js
import { getSupabase } from "./supabase-client.js";

export async function signIn(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

export async function getSession() {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}
```

- [ ] **Step 3: Create the admin CSS**

```css
/* admin/css/admin.css */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f9fafb;
  color: #1a1a1a;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 { font-size: 20px; font-weight: 700; color: #6366f1; }
.header-actions { display: flex; gap: 12px; align-items: center; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.btn-primary { background: #6366f1; color: white; }
.btn-primary:hover { background: #4f46e5; }
.btn-secondary { background: white; color: #374151; border-color: #d1d5db; }
.btn-secondary:hover { background: #f9fafb; }
.btn-danger { background: white; color: #dc2626; border-color: #fecaca; }
.btn-sm { padding: 4px 10px; font-size: 13px; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px; }
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }

.card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 24px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

.login-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.login-card { width: 100%; max-width: 400px; }
.login-card h2 { text-align: center; margin-bottom: 24px; color: #6366f1; }

.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
.table th { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; background: #f9fafb; }
.table tr:hover td { background: #f9fafb; }
.table tr { cursor: pointer; }

.status { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
.status-open { background: #fef3c7; color: #92400e; }
.status-resolved { background: #d1fae5; color: #065f46; }

.project-card { cursor: pointer; transition: box-shadow 0.15s; }
.project-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.project-card h3 { font-size: 16px; margin-bottom: 8px; }
.project-card .meta { font-size: 13px; color: #6b7280; }
.project-card .counts { display: flex; gap: 16px; margin-top: 12px; font-size: 13px; }

.filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.filters select, .filters input { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }

.replay-container { position: relative; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
.replay-container img { width: 100%; display: block; }
.replay-pin { position: absolute; width: 24px; height: 24px; margin-left: -12px; margin-top: -24px; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5)); }
.replay-nav { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-top: 1px solid #e5e7eb; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; }
.modal h3 { margin-bottom: 16px; }

.snippet-box { background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px; font-family: "SF Mono", Monaco, Consolas, monospace; font-size: 13px; overflow-x: auto; position: relative; }
.snippet-box .copy-btn { position: absolute; top: 8px; right: 8px; background: #45475a; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }

.error-msg { color: #dc2626; font-size: 13px; margin-top: 8px; }
.empty-state { text-align: center; padding: 48px; color: #9ca3af; }
.text-muted { color: #6b7280; }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.flex { display: flex; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
```

- [ ] **Step 4: Create the login page**

```html
<!-- admin/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MarkUX Admin</title>
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>
  <div class="login-wrapper">
    <div class="card login-card">
      <h2>MarkUX</h2>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input class="form-input" type="email" id="email" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input class="form-input" type="password" id="password" required>
        </div>
        <div id="error" class="error-msg" style="display:none"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">
          Sign In
        </button>
      </form>
    </div>
  </div>

  <script src="https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script type="module">
    import { getSupabase } from './js/supabase-client.js';
    import { signIn, getSession } from './js/auth.js';

    // Redirect if already logged in
    const session = await getSession();
    if (session) {
      window.location.href = 'projects.html';
    }

    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        await signIn(email, password);
        window.location.href = 'projects.html';
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 5: Commit**

```bash
git add admin/
git commit -m "feat: add admin app foundation with auth, styles, and login page"
```

---

## Task 20: Admin App — Projects List

**Files:**
- Create: `admin/projects.html`, `admin/js/projects-list.js`

- [ ] **Step 1: Create the projects list module**

```js
// admin/js/projects-list.js
import { getSupabase } from "./supabase-client.js";

export async function loadProjects() {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_email", user.email)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch annotation counts for each project
  const projectsWithCounts = await Promise.all(
    (projects || []).map(async (project) => {
      const { count: openCount } = await supabase
        .from("annotations")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "open");

      const { count: resolvedCount } = await supabase
        .from("annotations")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "resolved");

      return { ...project, openCount: openCount || 0, resolvedCount: resolvedCount || 0 };
    }),
  );

  return projectsWithCounts;
}

export async function createProject(name, domains) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      allowed_domains: domains,
      owner_email: user.email,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function renderProjectCard(project) {
  const card = document.createElement("div");
  card.className = "card project-card";

  const title = document.createElement("h3");
  title.textContent = project.name;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = project.allowed_domains.join(", ");

  const counts = document.createElement("div");
  counts.className = "counts";

  const openSpan = document.createElement("span");
  const openStatus = document.createElement("span");
  openStatus.className = "status status-open";
  openStatus.textContent = `${project.openCount} open`;
  openSpan.appendChild(openStatus);

  const resolvedSpan = document.createElement("span");
  const resolvedStatus = document.createElement("span");
  resolvedStatus.className = "status status-resolved";
  resolvedStatus.textContent = `${project.resolvedCount} resolved`;
  resolvedSpan.appendChild(resolvedStatus);

  counts.appendChild(openSpan);
  counts.appendChild(resolvedSpan);

  const dateMeta = document.createElement("div");
  dateMeta.className = "meta mt-4";
  dateMeta.textContent = `Created ${new Date(project.created_at).toLocaleDateString()}`;

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(counts);
  card.appendChild(dateMeta);

  card.addEventListener("click", () => {
    window.location.href = `project.html?id=${project.id}`;
  });
  return card;
}
```

- [ ] **Step 2: Create the projects page**

```html
<!-- admin/projects.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Projects — MarkUX Admin</title>
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>
  <div class="header">
    <h1>MarkUX</h1>
    <div class="header-actions">
      <span id="user-email" class="text-muted"></span>
      <button id="new-project-btn" class="btn btn-primary">New Project</button>
      <button id="logout-btn" class="btn btn-secondary">Sign Out</button>
    </div>
  </div>

  <div class="container">
    <div id="projects-grid" class="card-grid mt-4"></div>
    <div id="empty" class="empty-state" style="display:none">
      <p>No projects yet. Create one to get started.</p>
    </div>
  </div>

  <!-- New Project Modal -->
  <div id="modal" class="modal-backdrop" style="display:none">
    <div class="modal">
      <h3>New Project</h3>
      <form id="new-project-form">
        <div class="form-group">
          <label class="form-label" for="proj-name">Project Name</label>
          <input class="form-input" type="text" id="proj-name" required
            placeholder="Acme Corp Redesign">
        </div>
        <div class="form-group">
          <label class="form-label" for="proj-domains">Allowed Domains</label>
          <input class="form-input" type="text" id="proj-domains" required
            placeholder="example.com, staging.example.com">
          <small class="text-muted">Comma-separated list of domains</small>
        </div>
        <div id="create-error" class="error-msg" style="display:none"></div>
        <div class="flex gap-2" style="margin-top:16px">
          <button type="submit" class="btn btn-primary">Create</button>
          <button type="button" id="cancel-btn" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script src="https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script type="module">
    import { requireAuth, signOut } from './js/auth.js';
    import { loadProjects, createProject, renderProjectCard } from './js/projects-list.js';

    const session = await requireAuth();
    if (!session) throw new Error('Not authenticated');

    document.getElementById('user-email').textContent = session.user.email;
    document.getElementById('logout-btn').addEventListener('click', signOut);

    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('empty');
    const modal = document.getElementById('modal');

    async function render() {
      const projects = await loadProjects();
      grid.replaceChildren();
      if (projects.length === 0) {
        empty.style.display = 'block';
      } else {
        empty.style.display = 'none';
        projects.forEach(p => grid.appendChild(renderProjectCard(p)));
      }
    }

    document.getElementById('new-project-btn').addEventListener('click', () => {
      modal.style.display = 'flex';
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('new-project-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('create-error');
      errorEl.style.display = 'none';

      const name = document.getElementById('proj-name').value.trim();
      const domains = document.getElementById('proj-domains').value
        .split(',')
        .map(d => d.trim())
        .filter(Boolean);

      try {
        await createProject(name, domains);
        modal.style.display = 'none';
        e.target.reset();
        await render();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });

    await render();
  </script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add admin/projects.html admin/js/projects-list.js
git commit -m "feat: add admin projects list with create project modal"
```

---

## Task 21: Admin App — Project Detail (List View + Filters)

**Files:**
- Create: `admin/project.html`, `admin/js/project-detail.js`

- [ ] **Step 1: Create the project detail module**

```js
// admin/js/project-detail.js
import { getSupabase } from "./supabase-client.js";

export async function loadProject(projectId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function loadAnnotations(projectId, filters = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from("annotations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

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

export async function loadReplies(annotationId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("replies")
    .select("*")
    .eq("annotation_id", annotationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateAnnotationStatus(annotationId, status) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("annotations")
    .update({ status })
    .eq("id", annotationId);
  if (error) throw error;
}

export async function getPageUrls(projectId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("annotations")
    .select("page_url")
    .eq("project_id", projectId);
  if (error) throw error;
  return [...new Set((data || []).map((a) => a.page_url))];
}

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

  // Status cell
  const statusCell = document.createElement("td");
  const statusSpan = document.createElement("span");
  statusSpan.className = `status ${annotation.status === "open" ? "status-open" : "status-resolved"}`;
  statusSpan.textContent = annotation.status;
  statusCell.appendChild(statusSpan);

  // Date cell
  const dateCell = document.createElement("td");
  dateCell.textContent = new Date(annotation.created_at).toLocaleDateString();

  // Action cell
  const actionCell = document.createElement("td");
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "btn btn-sm btn-secondary toggle-status";
  toggleBtn.textContent = annotation.status === "open" ? "Resolve" : "Reopen";
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onStatusToggle(
      annotation.id,
      annotation.status === "open" ? "resolved" : "open",
    );
  });
  actionCell.appendChild(toggleBtn);

  tr.appendChild(pageCell);
  tr.appendChild(authorCell);
  tr.appendChild(commentCell);
  tr.appendChild(statusCell);
  tr.appendChild(dateCell);
  tr.appendChild(actionCell);

  tr.addEventListener("click", (e) => {
    if (e.target.closest(".toggle-status")) return;
    onExpand(annotation);
  });

  return tr;
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}
```

- [ ] **Step 2: Create the project detail page**

```html
<!-- admin/project.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project — MarkUX Admin</title>
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>
  <div class="header">
    <h1><a href="projects.html" style="color:inherit;text-decoration:none">MarkUX</a></h1>
    <div class="header-actions">
      <button id="snippet-btn" class="btn btn-secondary">Embed Snippet</button>
      <button id="export-btn" class="btn btn-secondary">Export CSV</button>
      <button id="logout-btn" class="btn btn-secondary">Sign Out</button>
    </div>
  </div>

  <div class="container">
    <div class="flex justify-between items-center mb-4 mt-4">
      <h2 id="project-name"></h2>
      <div class="flex gap-2">
        <button id="list-view-btn" class="btn btn-sm btn-primary">List</button>
        <button id="visual-view-btn" class="btn btn-sm btn-secondary">Visual Replay</button>
      </div>
    </div>

    <div class="filters" id="filters">
      <select id="filter-status">
        <option value="">All statuses</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
      </select>
      <select id="filter-page"><option value="">All pages</option></select>
      <input id="filter-author" type="text" placeholder="Filter by author...">
    </div>

    <div id="list-view" class="card">
      <table class="table">
        <thead>
          <tr><th>Page</th><th>Author</th><th>Comment</th><th>Status</th><th>Date</th><th></th></tr>
        </thead>
        <tbody id="annotations-body"></tbody>
      </table>
      <div id="list-empty" class="empty-state" style="display:none">No annotations yet.</div>
    </div>

    <div id="visual-view" style="display:none">
      <div id="replay-content"></div>
    </div>

    <div id="thread-panel" style="display:none" class="card mt-4">
      <div class="flex justify-between items-center mb-4">
        <h3>Thread</h3>
        <button id="close-thread" class="btn btn-sm btn-secondary">Close</button>
      </div>
      <div id="thread-content"></div>
    </div>
  </div>

  <!-- Snippet Modal -->
  <div id="snippet-modal" class="modal-backdrop" style="display:none">
    <div class="modal">
      <h3>Embed Snippet</h3>
      <div id="snippet-content"></div>
      <button id="close-snippet" class="btn btn-secondary mt-4">Close</button>
    </div>
  </div>

  <script src="https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script type="module">
    import { requireAuth, signOut } from './js/auth.js';
    import { getSupabaseUrl } from './js/supabase-client.js';
    import {
      loadProject, loadAnnotations, loadReplies,
      updateAnnotationStatus, getPageUrls, renderAnnotationRow
    } from './js/project-detail.js';
    import { renderVisualReplay } from './js/visual-replay.js';
    import { exportCsv } from './js/csv-export.js';
    import { renderSnippet } from './js/embed-snippet.js';

    const session = await requireAuth();
    if (!session) throw new Error('Not authenticated');

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    if (!projectId) { window.location.href = 'projects.html'; throw new Error('No project ID'); }

    const project = await loadProject(projectId);
    document.getElementById('project-name').textContent = project.name;
    document.getElementById('logout-btn').addEventListener('click', signOut);

    // View toggle
    const listView = document.getElementById('list-view');
    const visualView = document.getElementById('visual-view');
    const listBtn = document.getElementById('list-view-btn');
    const visualBtn = document.getElementById('visual-view-btn');

    listBtn.addEventListener('click', () => {
      listView.style.display = 'block'; visualView.style.display = 'none';
      listBtn.className = 'btn btn-sm btn-primary'; visualBtn.className = 'btn btn-sm btn-secondary';
    });

    visualBtn.addEventListener('click', async () => {
      listView.style.display = 'none'; visualView.style.display = 'block';
      listBtn.className = 'btn btn-sm btn-secondary'; visualBtn.className = 'btn btn-sm btn-primary';
      const annotations = await loadAnnotations(projectId);
      renderVisualReplay(document.getElementById('replay-content'), annotations, getSupabaseUrl());
    });

    // Populate page URL filter
    const pageUrls = await getPageUrls(projectId);
    const pageSelect = document.getElementById('filter-page');
    pageUrls.forEach(url => {
      const opt = document.createElement('option');
      opt.value = url;
      opt.textContent = url.replace(/^https?:\/\/[^/]+/, '');
      pageSelect.appendChild(opt);
    });

    // Render annotations
    const tbody = document.getElementById('annotations-body');
    const listEmpty = document.getElementById('list-empty');
    const threadPanel = document.getElementById('thread-panel');
    const threadContent = document.getElementById('thread-content');

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

    async function expandThread(annotation) {
      threadPanel.style.display = 'block';
      const replies = await loadReplies(annotation.id);
      threadContent.replaceChildren();

      // Original annotation
      const annDiv = document.createElement('div');
      annDiv.style.marginBottom = '12px';
      const annAuthor = document.createElement('strong');
      annAuthor.textContent = annotation.author_name;
      const annEmail = document.createElement('span');
      annEmail.className = 'text-muted';
      annEmail.style.marginLeft = '8px';
      annEmail.textContent = annotation.author_email;
      const annBody = document.createElement('p');
      annBody.style.marginTop = '4px';
      annBody.textContent = annotation.comment;
      const annDate = document.createElement('small');
      annDate.className = 'text-muted';
      annDate.textContent = new Date(annotation.created_at).toLocaleString();
      annDiv.appendChild(annAuthor);
      annDiv.appendChild(annEmail);
      annDiv.appendChild(annBody);
      annDiv.appendChild(annDate);
      threadContent.appendChild(annDiv);

      // Separator
      const hr = document.createElement('hr');
      hr.style.cssText = 'border:none;border-top:1px solid #e5e7eb;margin:12px 0';
      threadContent.appendChild(hr);

      // Replies
      replies.forEach(r => {
        const replyDiv = document.createElement('div');
        replyDiv.style.cssText = 'margin-bottom:12px;padding-left:16px;border-left:2px solid #e5e7eb';
        const rAuthor = document.createElement('strong');
        rAuthor.textContent = r.author_name;
        const rEmail = document.createElement('span');
        rEmail.className = 'text-muted';
        rEmail.style.marginLeft = '8px';
        rEmail.textContent = r.author_email;
        const rBody = document.createElement('p');
        rBody.style.marginTop = '4px';
        rBody.textContent = r.body;
        const rDate = document.createElement('small');
        rDate.className = 'text-muted';
        rDate.textContent = new Date(r.created_at).toLocaleString();
        replyDiv.appendChild(rAuthor);
        replyDiv.appendChild(rEmail);
        replyDiv.appendChild(rBody);
        replyDiv.appendChild(rDate);
        threadContent.appendChild(replyDiv);
      });
    }

    document.getElementById('close-thread').addEventListener('click', () => {
      threadPanel.style.display = 'none';
    });

    // Filters
    ['filter-status', 'filter-page', 'filter-author'].forEach(id => {
      document.getElementById(id).addEventListener('change', render);
      document.getElementById(id).addEventListener('input', render);
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', () => exportCsv(projectId, project.name));

    // Snippet
    document.getElementById('snippet-btn').addEventListener('click', () => {
      document.getElementById('snippet-modal').style.display = 'flex';
      renderSnippet(document.getElementById('snippet-content'), project);
    });
    document.getElementById('close-snippet').addEventListener('click', () => {
      document.getElementById('snippet-modal').style.display = 'none';
    });

    await render();
  </script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add admin/project.html admin/js/project-detail.js
git commit -m "feat: add admin project detail page with annotations table and filters"
```

---

## Task 22: Admin App — Visual Replay

**Files:**
- Create: `admin/js/visual-replay.js`

- [ ] **Step 1: Write the visual replay module**

```js
// admin/js/visual-replay.js

let currentIndex = 0;

export function renderVisualReplay(container, annotations, supabaseUrl) {
  if (annotations.length === 0) {
    // Clear and show empty state using DOM API
    while (container.firstChild) container.removeChild(container.firstChild);
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No annotations to replay.";
    container.appendChild(empty);
    return;
  }

  currentIndex = 0;
  renderAnnotation(container, annotations, supabaseUrl);
}

function renderAnnotation(container, annotations, supabaseUrl) {
  const ann = annotations[currentIndex];
  const screenshotUrl = ann.screenshot_path
    ? `${supabaseUrl}/storage/v1/object/public/screenshots/${ann.screenshot_path}`
    : null;

  // Build DOM using safe methods
  while (container.firstChild) container.removeChild(container.firstChild);

  const card = document.createElement("div");
  card.className = "card";

  // Replay container
  const replayBox = document.createElement("div");
  replayBox.className = "replay-container";

  if (screenshotUrl) {
    const img = document.createElement("img");
    img.src = screenshotUrl;
    img.alt = "Screenshot";
    replayBox.appendChild(img);

    // Pin overlay on screenshot
    const pinEl = document.createElement("div");
    pinEl.className = "replay-pin";
    pinEl.style.left = `${ann.pin_x * 100}%`;
    pinEl.style.top = `${ann.pin_y * 100}%`;
    const pinSvgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(pinSvgNs, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    const path = document.createElementNS(pinSvgNs, "path");
    path.setAttribute("fill", "#6366f1");
    path.setAttribute("d", "M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z");
    svg.appendChild(path);
    pinEl.appendChild(svg);
    replayBox.appendChild(pinEl);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "empty-state";
    placeholder.style.cssText = "padding:80px;background:#f3f4f6";
    placeholder.textContent = "Screenshot unavailable";
    replayBox.appendChild(placeholder);
  }

  card.appendChild(replayBox);

  // Navigation
  const nav = document.createElement("div");
  nav.className = "replay-nav";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn-sm btn-secondary";
  prevBtn.textContent = "Previous";
  prevBtn.disabled = currentIndex === 0;

  const info = document.createElement("span");
  info.className = "text-muted";
  info.textContent = `${currentIndex + 1} / ${annotations.length} \u2014 Captured at ${ann.viewport_width}x${ann.viewport_height}`;

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-sm btn-secondary";
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentIndex === annotations.length - 1;

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderAnnotation(container, annotations, supabaseUrl);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex < annotations.length - 1) {
      currentIndex++;
      renderAnnotation(container, annotations, supabaseUrl);
    }
  });

  nav.appendChild(prevBtn);
  nav.appendChild(info);
  nav.appendChild(nextBtn);
  card.appendChild(nav);

  // Annotation details
  const details = document.createElement("div");
  details.style.padding = "16px";

  const authorLine = document.createElement("div");
  const authorStrong = document.createElement("strong");
  authorStrong.textContent = ann.author_name;
  const authorEmail = document.createElement("span");
  authorEmail.className = "text-muted";
  authorEmail.style.marginLeft = "8px";
  authorEmail.textContent = ann.author_email;
  const statusEl = document.createElement("span");
  statusEl.className = `status ${ann.status === "open" ? "status-open" : "status-resolved"}`;
  statusEl.style.marginLeft = "8px";
  statusEl.textContent = ann.status;
  authorLine.appendChild(authorStrong);
  authorLine.appendChild(authorEmail);
  authorLine.appendChild(statusEl);

  const commentP = document.createElement("p");
  commentP.style.marginTop = "8px";
  commentP.textContent = ann.comment;

  const dateSmall = document.createElement("small");
  dateSmall.className = "text-muted";
  dateSmall.textContent = new Date(ann.created_at).toLocaleString();

  const pageDiv = document.createElement("div");
  pageDiv.className = "text-muted";
  pageDiv.style.marginTop = "4px";
  pageDiv.textContent = `Page: ${ann.page_url}`;

  details.appendChild(authorLine);
  details.appendChild(commentP);
  details.appendChild(dateSmall);
  details.appendChild(pageDiv);
  card.appendChild(details);

  container.appendChild(card);
}
```

- [ ] **Step 2: Commit**

```bash
git add admin/js/visual-replay.js
git commit -m "feat: add visual replay view for admin screenshot review"
```

---

## Task 23: Admin App — CSV Export

**Files:**
- Create: `admin/js/csv-export.js`

- [ ] **Step 1: Write the CSV export module**

```js
// admin/js/csv-export.js
import { getSupabase } from "./supabase-client.js";

export async function exportCsv(projectId, projectName) {
  const supabase = getSupabase();

  // Fetch all annotations with their replies
  const { data: annotations, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Fetch replies for all annotations
  const annotationIds = (annotations || []).map((a) => a.id);
  const { data: allReplies } = await supabase
    .from("replies")
    .select("*")
    .in("annotation_id", annotationIds)
    .order("created_at", { ascending: true });

  // Group replies by annotation
  const repliesByAnnotation = {};
  (allReplies || []).forEach((r) => {
    if (!repliesByAnnotation[r.annotation_id]) {
      repliesByAnnotation[r.annotation_id] = [];
    }
    repliesByAnnotation[r.annotation_id].push(r);
  });

  // Build CSV
  const headers = [
    "Page URL",
    "Author Name",
    "Author Email",
    "Comment",
    "Status",
    "Reply Count",
    "Replies",
    "Viewport Width",
    "Created Date",
  ];

  const rows = (annotations || []).map((a) => {
    const replies = repliesByAnnotation[a.id] || [];
    const repliesText = replies
      .map((r) => `${r.author_name}: ${r.body}`)
      .join(" | ");

    return [
      a.page_url,
      a.author_name,
      a.author_email,
      a.comment,
      a.status,
      replies.length,
      repliesText,
      a.viewport_width,
      new Date(a.created_at).toISOString(),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName.replace(/[^a-z0-9]/gi, "-")}-annotations.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(str) {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

- [ ] **Step 2: Commit**

```bash
git add admin/js/csv-export.js
git commit -m "feat: add CSV export for project annotations"
```

---

## Task 24: Admin App — Embed Snippet Panel

**Files:**
- Create: `admin/js/embed-snippet.js`

- [ ] **Step 1: Write the embed snippet module**

```js
// admin/js/embed-snippet.js

export function renderSnippet(container, project) {
  const scriptTag = `<script src="https://YOUR_HOST/markux.js" data-project="${project.id}"><\/script>`;

  // Build DOM safely
  while (container.firstChild) container.removeChild(container.firstChild);

  // Project ID
  const idDiv = document.createElement("div");
  idDiv.style.marginBottom = "16px";
  const idLabel = document.createElement("strong");
  idLabel.textContent = "Project ID: ";
  const idCode = document.createElement("code");
  idCode.textContent = project.id;
  idDiv.appendChild(idLabel);
  idDiv.appendChild(idCode);

  // Allowed domains
  const domainsDiv = document.createElement("div");
  domainsDiv.style.marginBottom = "16px";
  const domainsLabel = document.createElement("strong");
  domainsLabel.textContent = "Allowed Domains: ";
  domainsDiv.appendChild(domainsLabel);
  domainsDiv.appendChild(document.createTextNode(project.allowed_domains.join(", ")));

  // Snippet
  const snippetLabel = document.createElement("strong");
  snippetLabel.textContent = "Add this to your website:";

  const snippetBox = document.createElement("div");
  snippetBox.className = "snippet-box";
  snippetBox.style.marginTop = "8px";

  const codeEl = document.createElement("code");
  codeEl.textContent = scriptTag;
  snippetBox.appendChild(codeEl);

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(scriptTag).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 2000);
    });
  });
  snippetBox.appendChild(copyBtn);

  container.appendChild(idDiv);
  container.appendChild(domainsDiv);
  container.appendChild(snippetLabel);
  container.appendChild(snippetBox);
}
```

- [ ] **Step 2: Commit**

```bash
git add admin/js/embed-snippet.js
git commit -m "feat: add embed snippet panel with copy button"
```

---

## Task 25: Final Build Verification & Cleanup

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS

- [ ] **Step 2: Build the embeddable script**

```bash
npm run build
```
Expected: `dist/markux.js` built without errors

- [ ] **Step 3: Verify all files are tracked**

```bash
git status
```
Expected: clean working tree

- [ ] **Step 4: Final commit (if any untracked changes)**

```bash
git add -A
git commit -m "chore: final build verification and cleanup"
```

---

## Summary

| Component | Tasks | Description |
|-----------|-------|-------------|
| Setup | 1 | Git, package.json, build config, CLAUDE.md |
| Supabase | 2-3 | Schema, RLS, Edge Function |
| Core Utils | 4-7 | URL normalization, selector gen, pin positioning, state |
| API Layer | 8-9 | Supabase client, Edge Function calls, screenshots |
| UI Components | 10-15 | Styles, FAB, annotation mode, pins, popovers |
| Realtime | 16 | Live annotation updates |
| Orchestration | 17-18 | Main entry point, integration test |
| Admin App | 19-24 | Auth, projects, detail, visual replay, CSV, snippet |
| Verification | 25 | Final build & test pass |
