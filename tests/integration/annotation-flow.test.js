// tests/integration/annotation-flow.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeUrl } from "../../src/url.js";
import { generateSelector } from "../../src/selector.js";
import { calculatePinPosition, restorePinPosition } from "../../src/pin.js";
import {
  getAnnotations,
  addAnnotation,
  clearAnnotations,
} from "../../src/state.js";

describe("annotation flow integration", () => {
  beforeEach(() => {
    clearAnnotations();
    document.body.innerHTML = `
      <header id="header">
        <nav><a href="/">Home</a></nav>
      </header>
      <main id="main">
        <section>
          <h1>Welcome</h1>
          <p id="target">Click here to annotate</p>
        </section>
      </main>
    `;
  });

  it("full flow: normalize URL, generate selector, calculate position, restore position", () => {
    // 1. Normalize URL
    const url = normalizeUrl(
      "https://Example.COM/page?utm_source=email&q=test#section",
    );
    expect(url).toBe("https://example.com/page?q=test");

    // 2. Generate selector for target element
    const target = document.getElementById("target");
    const selector = generateSelector(target);
    expect(selector).toBe("#target");

    // 3. Calculate pin position
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 200,
      width: 400,
      height: 50,
      right: 500,
      bottom: 250,
      x: 100,
      y: 200,
      toJSON() {},
    });

    const { pinX, pinY } = calculatePinPosition(target, 300, 225);
    expect(pinX).toBeCloseTo(0.5);
    expect(pinY).toBeCloseTo(0.5);

    // 4. Store annotation
    const annotation = {
      id: "test-1",
      project_id: "proj-1",
      page_url: url,
      pin_x: pinX,
      pin_y: pinY,
      pin_selector: selector,
      comment: "This looks great",
      author_name: "Alice",
      author_email: "alice@test.com",
      status: "open",
      viewport_width: 1440,
      viewport_height: 900,
    };
    addAnnotation(annotation);
    expect(getAnnotations()).toHaveLength(1);

    // 5. Restore pin position (simulates page reload)
    const { x, y, found } = restorePinPosition(selector, pinX, pinY);
    expect(found).toBe(true);
    expect(x).toBeCloseTo(300);
    expect(y).toBeCloseTo(225);
  });
});
