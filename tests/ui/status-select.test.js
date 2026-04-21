// tests/ui/status-select.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatusSelect } from "../../src/ui/status-select.js";

describe("createStatusSelect (widget)", () => {
  let host;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  });

  it("renders a button with the current status label", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    expect(el.tagName).toBe("BUTTON");
    expect(el.textContent).toContain("open");
    expect(el.classList.contains("markux-status")).toBe(true);
    expect(el.classList.contains("markux-status-open")).toBe(true);
  });

  it("applies feedback class when value is feedback", () => {
    const el = createStatusSelect({ value: "feedback", onChange: () => {}, root: host });
    expect(el.classList.contains("markux-status-feedback")).toBe(true);
    expect(el.textContent).toContain("feedback");
  });

  it("opens popup with 3 options on click", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    host.appendChild(el);
    el.click();
    const popup = host.querySelector(".markux-status-select-popup");
    expect(popup).not.toBeNull();
    const opts = popup.querySelectorAll(".markux-status-select-option");
    expect(opts.length).toBe(3);
    expect([...opts].map(o => o.dataset.value)).toEqual(["open", "feedback", "resolved"]);
  });

  it("fires onChange and closes popup when an option is clicked", () => {
    const onChange = vi.fn();
    const el = createStatusSelect({ value: "open", onChange, root: host });
    host.appendChild(el);
    el.click();
    const opt = host.querySelector('.markux-status-select-option[data-value="feedback"]');
    opt.click();
    expect(onChange).toHaveBeenCalledWith("feedback");
    expect(host.querySelector(".markux-status-select-popup")).toBeNull();
  });

  it("closes popup on Escape", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    host.appendChild(el);
    el.click();
    expect(host.querySelector(".markux-status-select-popup")).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(host.querySelector(".markux-status-select-popup")).toBeNull();
  });

  it("closes popup on outside click", () => {
    const el = createStatusSelect({ value: "open", onChange: () => {}, root: host });
    host.appendChild(el);
    el.click();
    expect(host.querySelector(".markux-status-select-popup")).not.toBeNull();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(host.querySelector(".markux-status-select-popup")).toBeNull();
  });
});
