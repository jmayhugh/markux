// tests/ui/annotation-mode.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOverlay,
  createHighlight,
  activateAnnotationMode,
  deactivateAnnotationMode,
} from "../../src/ui/annotation-mode.js";

describe("annotation mode", () => {
  describe("createOverlay", () => {
    it("creates a div with markux-overlay class", () => {
      const overlay = createOverlay(vi.fn());
      expect(overlay.classList.contains("markux-overlay")).toBe(true);
    });
  });

  describe("createHighlight", () => {
    it("creates a div with markux-highlight class", () => {
      const highlight = createHighlight();
      expect(highlight.classList.contains("markux-highlight")).toBe(true);
    });
  });

  describe("activateAnnotationMode", () => {
    it("adds active class to overlay", () => {
      const overlay = createOverlay(vi.fn());
      activateAnnotationMode(overlay);
      expect(overlay.classList.contains("active")).toBe(true);
    });
  });

  describe("deactivateAnnotationMode", () => {
    it("removes active class from overlay", () => {
      const overlay = createOverlay(vi.fn());
      activateAnnotationMode(overlay);
      deactivateAnnotationMode(overlay);
      expect(overlay.classList.contains("active")).toBe(false);
    });
  });
});
