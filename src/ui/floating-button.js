// src/ui/floating-button.js

const PEN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  <line x1="8" y1="9.5" x2="16" y2="9.5"/>
  <line x1="8" y1="13.5" x2="13" y2="13.5"/>
</svg>`;

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"/>
</svg>`;

export function createFloatingButton(onToggle) {
  const button = document.createElement("button");
  button.className = "markux-fab";
  // Static SVG icon — safe to set via innerHTML (no user input)
  button.innerHTML = PEN_ICON; // eslint-disable-line no-unsanitized/property -- static trusted SVG, not user input
  button.setAttribute("aria-label", "Toggle MarkUX annotations");

  let isActive = false;

  button.addEventListener("click", () => {
    isActive = !isActive;
    button.classList.toggle("active", isActive);
    // Static SVG icon — safe to set via innerHTML (no user input)
    button.innerHTML = isActive ? CLOSE_ICON : PEN_ICON; // eslint-disable-line no-unsanitized/property -- static trusted SVG, not user input

    // Re-add badge if exists
    if (button._badgeCount > 0) {
      updateBadge(button, button._badgeCount);
    }

    onToggle(isActive);
  });

  button._badgeCount = 0;
  return button;
}

export function updateBadge(button, count) {
  button._badgeCount = count;
  const existing = button.querySelector(".badge");
  if (existing) existing.remove();

  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = count;
    button.appendChild(badge);
  }
}
