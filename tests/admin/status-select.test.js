// tests/admin/status-select.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatusSelect } from "../../admin/js/components/status-select.js";

function clearBody() {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
}

describe("createStatusSelect (admin)", () => {
  beforeEach(() => clearBody());
  afterEach(() => clearBody());

  it("renders a button with the current status label and class", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {} });
    expect(el.tagName).toBe("BUTTON");
    expect(el.textContent).toContain("open");
    expect(el.classList.contains("status")).toBe(true);
    expect(el.classList.contains("status-open")).toBe(true);
  });

  it("applies status-feedback when value is feedback", () => {
    const el = createStatusSelect({ value: "feedback", onChange: () => {} });
    expect(el.classList.contains("status-feedback")).toBe(true);
  });

  it("opens popup with 3 options on click", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {} });
    document.body.appendChild(el);
    el.click();
    const popup = document.querySelector(".status-select-popup");
    expect(popup).not.toBeNull();
    const opts = popup.querySelectorAll(".status-select-option");
    expect(opts.length).toBe(3);
  });

  it("fires onChange and closes popup on option click", () => {
    const onChange = vi.fn();
    const el = createStatusSelect({ value: "open", onChange });
    document.body.appendChild(el);
    el.click();
    const opt = document.querySelector('.status-select-option[data-value="feedback"]');
    opt.click();
    expect(onChange).toHaveBeenCalledWith("feedback");
    expect(document.querySelector(".status-select-popup")).toBeNull();
  });

  it("closes popup on Escape", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {} });
    document.body.appendChild(el);
    el.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector(".status-select-popup")).toBeNull();
  });
});
