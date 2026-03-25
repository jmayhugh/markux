import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAnnotation, createReply, uploadScreenshot } from "../src/api.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("api", () => {
  const edgeFunctionUrl = "https://test.supabase.co/functions/v1/write-proxy";

  beforeEach(() => { mockFetch.mockReset(); });

  describe("createAnnotation", () => {
    it("sends POST to edge function with annotation data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "ann-1", comment: "test" } }),
      });
      const result = await createAnnotation(edgeFunctionUrl, "proj-1", {
        comment: "test", pin_x: 0.5, pin_y: 0.5, pin_selector: "#hero",
        page_url: "https://example.com", author_name: "Alice",
        author_email: "alice@test.com", viewport_width: 1440, viewport_height: 900,
      });
      expect(mockFetch).toHaveBeenCalledWith(edgeFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"action":"create_annotation"'),
      });
      expect(result.id).toBe("ann-1");
    });
  });

  describe("createReply", () => {
    it("sends POST with reply data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "reply-1" } }),
      });
      const result = await createReply(edgeFunctionUrl, "proj-1", {
        annotation_id: "ann-1", author_name: "Bob",
        author_email: "bob@test.com", body: "Noted!",
      });
      expect(result.id).toBe("reply-1");
    });
  });

  describe("uploadScreenshot", () => {
    it("sends base64 screenshot data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { path: "proj-1/ann-1.png" } }),
      });
      const result = await uploadScreenshot(edgeFunctionUrl, "proj-1", "proj-1/ann-1.png", "iVBOR...");
      expect(result.path).toBe("proj-1/ann-1.png");
    });
  });
});
