// src/ui/pin-marker.js

// Static trusted SVGs — safe for innerHTML (no user input)
const PIN_SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#dc2626" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"/>
</svg>`;
const PIN_SVG_RESOLVED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#16a34a" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"/>
</svg>`;

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Create a numbered pin marker element with author initials.
 * @param {number} number - The pin number to display
 * @param {number} x - Absolute X position (viewport px)
 * @param {number} y - Absolute Y position (viewport px)
 * @param {() => void} onClick - Called when pin is clicked
 * @param {string} [authorName] - Author name for initials badge
 * @param {string} [status] - "open" or "resolved"
 */
export function createPinMarker(number, x, y, onClick, authorName, status) {
  const pin = document.createElement("div");
  pin.className = "markux-pin";
  if (status === "resolved") pin.classList.add("markux-pin-resolved");
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
  const svg = status === "resolved" ? PIN_SVG_RESOLVED : PIN_SVG_OPEN;
  pin.innerHTML = svg; // eslint-disable-line no-unsanitized/property — static constant, not user input

  const label = document.createElement("span");
  label.className = "pin-number";
  label.textContent = number;
  pin.appendChild(label);

  if (authorName) {
    const initials = document.createElement("span");
    initials.className = "pin-initials";
    initials.textContent = getInitials(authorName);
    pin.appendChild(initials);
  }

  pin.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });

  return pin;
}

/**
 * Update the position of an existing pin marker.
 */
export function updatePinPosition(pin, x, y) {
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
}
