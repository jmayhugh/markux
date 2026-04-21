// src/ui/status-select.js

const STATUSES = ["open", "feedback", "resolved"];

/**
 * Create a clickable status pill that both displays and changes status.
 *
 * @param {object} opts
 * @param {"open"|"feedback"|"resolved"} opts.value - Current status
 * @param {(newStatus: string) => void} opts.onChange - Called when the user picks a new status
 * @param {Element|ShadowRoot} opts.root - Where the popup is appended (must share styles with the button)
 * @returns {HTMLButtonElement}
 */
export function createStatusSelect({ value, onChange, root }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `markux-status markux-status-select markux-status-${value}`;
  button.textContent = value;

  const chevron = document.createElement("span");
  chevron.className = "markux-status-select-chevron";
  chevron.textContent = "▾";
  button.appendChild(chevron);

  let popup = null;

  function closePopup() {
    if (!popup) return;
    popup.remove();
    popup = null;
    document.removeEventListener("keydown", handleKey);
    document.removeEventListener("mousedown", handleOutside, true);
  }

  function handleKey(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closePopup();
    }
  }

  function handleOutside(e) {
    if (popup && !popup.contains(e.target) && e.target !== button) {
      closePopup();
    }
  }

  function openPopup() {
    if (popup) return;
    popup = document.createElement("div");
    popup.className = "markux-status-select-popup";
    const rect = button.getBoundingClientRect();
    popup.style.position = "fixed";
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.left = `${rect.left}px`;
    popup.style.zIndex = "2147483647";

    STATUSES.forEach((s) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = `markux-status markux-status-${s} markux-status-select-option`;
      opt.dataset.value = s;
      opt.textContent = s;
      if (s === value) opt.classList.add("markux-status-select-option-current");
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        closePopup();
        if (s !== value) onChange(s);
      });
      popup.appendChild(opt);
    });

    root.appendChild(popup);
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleOutside, true);
  }

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popup) closePopup();
    else openPopup();
  });

  return button;
}
