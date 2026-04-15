// src/deep-link.js
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMarkuxHash(hash) {
  if (!hash) return null;
  const prefix = "#markux=";
  if (!hash.startsWith(prefix)) return null;
  const id = hash.slice(prefix.length);
  if (!id || !UUID_RE.test(id)) return null;
  return id;
}
