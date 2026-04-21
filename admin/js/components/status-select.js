// admin/js/components/status-select.js

const STATUSES = ["open", "feedback", "resolved"];

/**
 * Create a clickable status pill that both displays and changes status.
 *
 * @param {object} opts
 * @param {"open"|"feedback"|"resolved"} opts.value - Current status
 * @param {(newStatus: string) => void} opts.onChange - Called when the user picks a new status
 * @returns {HTMLButtonElement}
 */
export function createStatusSelect({ value, onChange }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `status status-select status-${value}`;
  button.textContent = value;

  const chevron = document.createElement("span");
  chevron.className = "status-select-chevron";
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
    popup.className = "status-select-popup";
    const rect = button.getBoundingClientRect();
    popup.style.position = "fixed";
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.left = `${rect.left}px`;
    popup.style.zIndex = "9999";

    STATUSES.forEach((s) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = `status status-${s} status-select-option`;
      opt.dataset.value = s;
      opt.textContent = s;
      if (s === value) opt.classList.add("status-select-option-current");
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        closePopup();
        if (s !== value) onChange(s);
      });
      popup.appendChild(opt);
    });

    document.body.appendChild(popup);
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
