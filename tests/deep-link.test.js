import { describe, it, expect } from "vitest";
import { parseMarkuxHash } from "../src/deep-link.js";

describe("parseMarkuxHash", () => {
  it("returns the annotation id for a valid hash", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseMarkuxHash(`#markux=${id}`)).toBe(id);
  });

  it("returns null for an empty hash", () => {
    expect(parseMarkuxHash("")).toBeNull();
  });

  it("returns null when hash does not start with #markux=", () => {
    expect(parseMarkuxHash("#other=abc")).toBeNull();
  });

  it("returns null when id portion is empty", () => {
    expect(parseMarkuxHash("#markux=")).toBeNull();
  });

  it("returns null when id is not a valid uuid", () => {
    expect(parseMarkuxHash("#markux=not-a-uuid")).toBeNull();
  });
});
