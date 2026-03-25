// src/ui/pin-marker.js

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#6366f1" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"/>
</svg>`;

/**
 * Create a numbered pin marker element.
 * @param {number} number - The pin number to display
 * @param {number} x - Absolute X position (viewport px)
 * @param {number} y - Absolute Y position (viewport px)
 * @param {() => void} onClick - Called when pin is clicked
 */
export function createPinMarker(number, x, y, onClick) {
  const pin = document.createElement("div");
  pin.className = "markux-pin";
  pin.style.left = `${x}px`;
  pin.style.top = `${y}px`;
  // SECURITY NOTE: PIN_SVG is a static constant defined above — not user input.
  // This is safe to assign via innerHTML as it contains only trusted SVG markup.
  pin.innerHTML = PIN_SVG; // eslint-disable-line no-unsanitized/property

  const label = document.createElement("span");
  label.className = "pin-number";
  label.textContent = number;
  pin.appendChild(label);

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
