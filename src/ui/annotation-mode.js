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
  overlay.style.pointerEvents = "";
}

/**
 * Set up mousemove handler on the document to highlight elements under cursor.
 * The overlay is pointer-events:none during highlight detection, then re-enabled.
 * @param {HTMLElement} overlay - The annotation mode overlay
 * @param {HTMLElement} highlight - The highlight box element
 * @param {HTMLElement} shadowHost - The markux container (to exclude from highlighting)
 */
export function setupHighlighting(overlay, highlight, shadowHost) {
  // Highlighting disabled — kept for element detection on click only
  return () => {};
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
