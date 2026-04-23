// tests/ui/visibility.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { isHidden, setHidden, createGhostDot } from "../../src/ui/visibility.js";

describe("visibility module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("isHidden", () => {
    it("returns false when key is absent", () => {
      expect(isHidden()).toBe(false);
    });

    it("returns true when markux:hidden === '1'", () => {
      localStorage.setItem("markux:hidden", "1");
      expect(isHidden()).toBe(true);
    });

    it("returns false for any non-'1' value", () => {
      localStorage.setItem("markux:hidden", "true");
      expect(isHidden()).toBe(false);
      localStorage.setItem("markux:hidden", "0");
      expect(isHidden()).toBe(false);
      localStorage.setItem("markux:hidden", "");
      expect(isHidden()).toBe(false);
    });

    it("returns false when localStorage throws", () => {
      const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      expect(isHidden()).toBe(false);
      spy.mockRestore();
    });
  });

  describe("setHidden", () => {
    it("writes '1' when given true", () => {
      setHidden(true);
      expect(localStorage.getItem("markux:hidden")).toBe("1");
    });

    it("removes the key when given false", () => {
      localStorage.setItem("markux:hidden", "1");
      setHidden(false);
      expect(localStorage.getItem("markux:hidden")).toBeNull();
    });

    it("swallows exceptions when localStorage throws", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      expect(() => setHidden(true)).not.toThrow();
      spy.mockRestore();
    });
  });

  describe("createGhostDot", () => {
    it("returns a button with the markux-ghost-dot class", () => {
      const dot = createGhostDot(() => {});
      expect(dot.tagName).toBe("BUTTON");
      expect(dot.classList.contains("markux-ghost-dot")).toBe(true);
    });

    it("has the 'Show MarkUX' aria-label", () => {
      const dot = createGhostDot(() => {});
      expect(dot.getAttribute("aria-label")).toBe("Show MarkUX");
    });

    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      const dot = createGhostDot(onClick);
      dot.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
