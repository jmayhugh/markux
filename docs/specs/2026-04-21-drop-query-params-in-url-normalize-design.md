# Drop all query params in URL normalization — design spec

**Date:** 2026-04-21
**Scope:** Make `normalizeUrl` drop every query string so annotations group by base path, not by URL with params. Backfill existing rows so historical comments also migrate.

---

## Motivation

Today `normalizeUrl` strips a hard-coded list of tracking params (`utm_*`, `fbclid`, `gclid`, `ref`) but preserves everything else — so `/site-search.html`, `/site-search.html?q=`, and `/site-search.html?q=rice+university` each get their own `page_url` in the DB, and annotations on one don't appear on the others. Reviewers don't see a single unified thread for the page, which defeats the product expectation.

Desired behavior: comments on a page show up on the page regardless of query string.

---

## Change

### `src/url.js`

Replace the tracking-params filter with unconditional clearing of `url.search`:

```js
export function normalizeUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  url.search = "";
  let result = url.toString();
  if (result.endsWith("/") && new URL(result).pathname !== "/") {
    result = result.slice(0, -1);
  }
  return result;
}
```

The `TRACKING_PARAMS` constant is deleted. All other behavior (lowercase host, hash strip, trailing-slash trim) is preserved.

### DB backfill

One-time SQL run via the Supabase dashboard (migration tracking is still out of sync — same workaround as 002 and 003):

```sql
update annotations
set page_url = split_part(page_url, '?', 1)
where page_url like '%?%';
```

Strips `?...` from every row that has one. Rows without `?` are untouched. No trailing-slash adjustment needed because existing rows were already trailing-slash-trimmed at write time.

### Tests

- `tests/url.test.js` — existing case expecting `q=test` to survive must flip: after the change, `normalizeUrl("https://example.com/page?q=test")` → `"https://example.com/page"`. Add explicit cases for (a) query dropped entirely, (b) `utm_*` still dropped (subsumed by "all params dropped"), (c) hash still dropped, (d) trailing-slash trim still applied, (e) no-query URL unchanged.
- `tests/integration/annotation-flow.test.js` — the fixture URL `https://Example.COM/page?utm_source=email&q=test#section` currently normalizes to `https://example.com/page?q=test`. Update the assertion to expect `https://example.com/page`.

### Widget bundle

`npm run build` regenerates `dist/markux.js`. Commit and push. GitHub Pages picks it up.

### No admin code changes

The admin reads `page_url` but never normalizes it or matches on it — the filter dropdown populates from distinct values that come from `getPageUrls()` which is already just `select distinct page_url`. After the backfill, the admin's page filter will naturally show the collapsed set (one entry per base URL).

---

## Backwards compatibility

- After the backfill, duplicate rows aren't created — the `page_url` column has no unique constraint; multiple annotations on the same page_url is the normal case.
- Old cached widget bundles on visitor pages will still compute `page_url` with query params preserved, and will therefore not find any matches (because the DB rows have been backfilled to the stripped form). Affected users will stop seeing annotations until their browser picks up the new bundle. Acceptable — the cache churn is minutes, and the feature was broken for those users already.
- New writes from the new bundle land with the stripped form, matching the backfilled rows.

## Rollback

- **Code:** `git revert` the change.
- **DB:** no clean rollback — the original URLs with query params aren't recoverable after the backfill. Roll forward instead (the backfilled paths are still the correct base URLs).

## Out of scope

- Per-project opt-out of query-param collapsing. If a future project wants distinct per-query-string threads, add a project-level setting at that point. No infrastructure for that today.
- Normalizing path case (e.g. `/About` vs `/about`) — still case-sensitive on path as today.
