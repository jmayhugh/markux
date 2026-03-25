import { describe, it, expect, beforeEach } from "vitest";
import {
  getReviewerIdentity, setReviewerIdentity,
  getAnnotationMode, setAnnotationMode,
  getAnnotations, addAnnotation, clearAnnotations,
} from "../src/state.js";

describe("state", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAnnotations();
    setAnnotationMode(false);
  });

  describe("reviewer identity", () => {
    it("reads from localStorage", () => {
      localStorage.setItem("markux-reviewer-name", "Alice");
      localStorage.setItem("markux-reviewer-email", "alice@test.com");
      const id = getReviewerIdentity();
      expect(id.name).toBe("Alice");
      expect(id.email).toBe("alice@test.com");
    });
    it("saves to localStorage", () => {
      setReviewerIdentity("Bob", "bob@test.com");
      expect(localStorage.getItem("markux-reviewer-name")).toBe("Bob");
      expect(localStorage.getItem("markux-reviewer-email")).toBe("bob@test.com");
    });
  });

  describe("annotation mode", () => {
    it("defaults to false", () => {
      expect(getAnnotationMode()).toBe(false);
    });
    it("toggles on and off", () => {
      setAnnotationMode(true);
      expect(getAnnotationMode()).toBe(true);
      setAnnotationMode(false);
      expect(getAnnotationMode()).toBe(false);
    });
  });

  describe("annotations list", () => {
    it("starts empty", () => {
      expect(getAnnotations()).toEqual([]);
    });
    it("adds annotations", () => {
      const ann = { id: "1", comment: "test" };
      addAnnotation(ann);
      expect(getAnnotations()).toEqual([ann]);
    });
  });
});
