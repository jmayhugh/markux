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
