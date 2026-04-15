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

export function handleDeepLink({ hash, sidebar, pinContainer, annotations, openSidebar, onSelect }) {
  const targetId = parseMarkuxHash(hash);
  if (!targetId) return false;

  const index = annotations.findIndex((a) => a.id === targetId);
  if (index === -1) {
    clearHash();
    return false;
  }

  openSidebar(sidebar);

  const item = sidebar.querySelector(
    `.markux-sidebar-item[data-annotation-id="${CSS.escape(targetId)}"]`,
  );
  if (item) {
    item.scrollIntoView({ behavior: "smooth", block: "center" });
    item.classList.add("markux-sidebar-item--highlight");
    item.addEventListener(
      "animationend",
      () => item.classList.remove("markux-sidebar-item--highlight"),
      { once: true },
    );
  }

  const pins = pinContainer.querySelectorAll(".markux-pin");
  const pin = pins[index];
  if (pin) {
    onSelect?.(annotations[index], index);
    pin.classList.add("markux-pin--pulse");
    pin.addEventListener(
      "animationend",
      () => pin.classList.remove("markux-pin--pulse"),
      { once: true },
    );
  }

  clearHash();
  return true;
}

function clearHash() {
  if (typeof history !== "undefined" && history.replaceState) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}
