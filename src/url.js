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
