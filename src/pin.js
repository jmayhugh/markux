export function calculatePinPosition(element, clientX, clientY) {
  const rect = element.getBoundingClientRect();
  return {
    pinX: (clientX - rect.left) / rect.width,
    pinY: (clientY - rect.top) / rect.height,
  };
}

export function restorePinPosition(selector, pinX, pinY) {
  const el = document.querySelector(selector);
  if (el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width * pinX,
      y: rect.top + rect.height * pinY,
      found: true,
    };
  }
  return {
    x: window.innerWidth * pinX,
    y: window.innerHeight * pinY,
    found: false,
  };
}
