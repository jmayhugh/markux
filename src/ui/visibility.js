// src/ui/visibility.js

const HIDDEN_KEY = "markux:hidden";

export function isHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHidden(hidden) {
  try {
    if (hidden) {
      localStorage.setItem(HIDDEN_KEY, "1");
    } else {
      localStorage.removeItem(HIDDEN_KEY);
    }
  } catch {
    // Non-fatal; the reload still happens, state just doesn't persist.
  }
}

export function createGhostDot(onClick) {
  const dot = document.createElement("button");
  dot.className = "markux-ghost-dot";
  dot.setAttribute("aria-label", "Show MarkUX");
  dot.addEventListener("click", onClick);
  return dot;
}
