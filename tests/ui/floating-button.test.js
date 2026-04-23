// tests/ui/floating-button.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFloatingButton, createHideButton } from "../../src/ui/floating-button.js";

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

describe("createHideButton", () => {
  let button;
  let onClick;

  beforeEach(() => {
    onClick = vi.fn();
    button = createHideButton(onClick);
  });

  it("creates a button element with markux-hide-btn class", () => {
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("markux-hide-btn")).toBe(true);
  });

  it("contains an SVG icon", () => {
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("has 'Hide MarkUX' aria-label", () => {
    expect(button.getAttribute("aria-label")).toBe("Hide MarkUX");
  });

  it("calls onClick when clicked", () => {
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
