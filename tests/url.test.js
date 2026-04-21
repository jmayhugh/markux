import { describe, it, expect } from "vitest";
import { normalizeUrl } from "../src/url.js";

describe("normalizeUrl", () => {
  it("returns URL without changes when already clean", () => {
    expect(normalizeUrl("https://example.com/about")).toBe("https://example.com/about");
  });
  it("strips hash fragments", () => {
    expect(normalizeUrl("https://example.com/about#section")).toBe("https://example.com/about");
  });
  it("strips utm tracking parameters", () => {
    expect(normalizeUrl("https://example.com/about?utm_source=email&utm_medium=cpc")).toBe("https://example.com/about");
  });
  it("strips fbclid and gclid", () => {
    expect(normalizeUrl("https://example.com/?fbclid=abc123")).toBe("https://example.com/");
    expect(normalizeUrl("https://example.com/?gclid=xyz")).toBe("https://example.com/");
  });
  it("strips ref parameter", () => {
    expect(normalizeUrl("https://example.com/?ref=twitter")).toBe("https://example.com/");
  });
  it("strips all non-tracking query parameters too", () => {
    expect(normalizeUrl("https://example.com/search?q=test&page=2")).toBe("https://example.com/search");
  });
  it("strips a mix of tracking and non-tracking params", () => {
    expect(normalizeUrl("https://example.com/search?q=test&utm_source=email")).toBe("https://example.com/search");
  });
  it("strips empty query string (trailing ?)", () => {
    expect(normalizeUrl("https://example.com/search?")).toBe("https://example.com/search");
  });
  it("strips trailing slashes", () => {
    expect(normalizeUrl("https://example.com/about/")).toBe("https://example.com/about");
  });
  it("does not strip trailing slash from root path", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });
  it("lowercases the hostname", () => {
    expect(normalizeUrl("https://EXAMPLE.COM/About")).toBe("https://example.com/About");
  });
  it("preserves path case", () => {
    expect(normalizeUrl("https://example.com/About?q=X#h")).toBe("https://example.com/About");
  });
});
