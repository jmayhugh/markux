// tests/ui/floating-button.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFloatingButton } from "../../src/ui/floating-button.js";

describe("createFloatingButton", () => {
  let button;
  let onToggle;

  beforeEach(() => {
    onToggle = vi.fn();
    button = createFloatingButton(onToggle);
  });

  it("creates a button element with markux-fab class", () => {
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("markux-fab")).toBe(true);
  });

  it("contains an SVG icon", () => {
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("calls onToggle when clicked", () => {
    button.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("toggles active class on click", () => {
    button.click();
    expect(button.classList.contains("active")).toBe(true);
    button.click();
    expect(button.classList.contains("active")).toBe(false);
  });
});
