// src/ui/floating-button.js

const PEN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z"/>
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
