import { describe, it, expect, vi } from "vitest";
import { calculatePinPosition, restorePinPosition } from "../src/pin.js";

describe("calculatePinPosition", () => {
  it("returns percentages relative to element bounding box", () => {
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      left: 100, top: 200, width: 400, height: 300, right: 500, bottom: 500, x: 100, y: 200, toJSON() {},
    });
    const result = calculatePinPosition(el, 200, 350);
    expect(result.pinX).toBeCloseTo(0.25);
    expect(result.pinY).toBeCloseTo(0.5);
  });
});

describe("restorePinPosition", () => {
  it("returns absolute coordinates from selector and percentages", () => {
    document.body.innerHTML = '<div id="target">Hello</div>';
    const el = document.getElementById("target");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      left: 50, top: 100, width: 200, height: 150, right: 250, bottom: 250, x: 50, y: 100, toJSON() {},
    });
    const result = restorePinPosition("#target", 0.5, 0.5);
    expect(result).toEqual({ x: 150, y: 175, found: true });
  });
  it("falls back to viewport percentages if selector not found", () => {
    const result = restorePinPosition("#nonexistent", 0.5, 0.5);
    expect(result.found).toBe(false);
    expect(result.x).toBeDefined();
    expect(result.y).toBeDefined();
  });
});
