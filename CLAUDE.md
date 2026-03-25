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
