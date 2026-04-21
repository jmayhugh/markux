// tests/ui/pin-marker.test.js
import { describe, it, expect } from "vitest";
import { createPinMarker } from "../../src/ui/pin-marker.js";

describe("createPinMarker", () => {
  it("uses red fill for open pin", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice", "open");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#dc2626");
    expect(pin.classList.contains("markux-pin-resolved")).toBe(false);
    expect(pin.classList.contains("markux-pin-feedback")).toBe(false);
  });

  it("uses yellow fill for feedback pin", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice", "feedback");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#eab308");
    expect(pin.classList.contains("markux-pin-feedback")).toBe(true);
  });

  it("uses green fill for resolved pin", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice", "resolved");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#16a34a");
    expect(pin.classList.contains("markux-pin-resolved")).toBe(true);
  });

  it("defaults to open fill when status is undefined", () => {
    const pin = createPinMarker(1, 10, 20, () => {}, "Alice");
    const path = pin.querySelector("path");
    expect(path.getAttribute("fill")).toBe("#dc2626");
  });
});
