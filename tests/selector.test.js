import { describe, it, expect } from "vitest";
import { generateSelector } from "../src/selector.js";

describe("generateSelector", () => {
  it("returns #id for element with id", () => {
    document.body.innerHTML = '<div id="hero"><p>Hello</p></div>';
    const el = document.getElementById("hero");
    expect(generateSelector(el)).toBe("#hero");
  });
  it("builds nth-child chain from nearest ancestor with id", () => {
    document.body.innerHTML = '<div id="main"><ul><li>A</li><li>B</li></ul></div>';
    const li = document.querySelectorAll("li")[1];
    const sel = generateSelector(li);
    expect(document.querySelector(sel)).toBe(li);
  });
  it("falls back to chain from body if no id ancestor", () => {
    document.body.innerHTML = "<div><span>X</span></div>";
    const span = document.querySelector("span");
    const sel = generateSelector(span);
    expect(document.querySelector(sel)).toBe(span);
  });
  it("keeps selectors at most 4 levels deep", () => {
    document.body.innerHTML = "<div><div><div><div><div><div><span>Deep</span></div></div></div></div></div></div>";
    const span = document.querySelector("span");
    const sel = generateSelector(span);
    const parts = sel.split(" > ");
    expect(parts.length).toBeLessThanOrEqual(4);
  });
  it("generated selector resolves to the original element", () => {
    document.body.innerHTML = '<nav><a href="/">Home</a><a href="/about">About</a></nav><main><section><h2>Title</h2><p>Content</p></section></main>';
    const p = document.querySelector("p");
    const sel = generateSelector(p);
    expect(document.querySelector(sel)).toBe(p);
  });
});
