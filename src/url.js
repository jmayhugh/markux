const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "ref",
]);

export function normalizeUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  const params = new URLSearchParams(url.search);
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key)) params.delete(key);
  }
  url.search = params.toString();
  let result = url.toString();
  if (result.endsWith("/") && new URL(result).pathname !== "/") {
    result = result.slice(0, -1);
  }
  return result;
}
