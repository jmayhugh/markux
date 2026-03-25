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
  if (!parts[0]?.startsWith("#")) {
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
    const trimmed = fullPath.slice(-MAX_DEPTH);
    return `body ${trimmed.join(" > ")}`;
  }
  return parts.join(" > ");
}
