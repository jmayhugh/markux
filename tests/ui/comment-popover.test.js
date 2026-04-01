// tests/ui/comment-popover.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCommentPopover } from "../../src/ui/comment-popover.js";

describe("createCommentPopover", () => {
  let popover;
  let onSubmit;
  let onClose;

  beforeEach(() => {
    onSubmit = vi.fn();
    onClose = vi.fn();
    popover = createCommentPopover({ x: 100, y: 200 }, onSubmit, onClose);
  });

  it("creates a form with name, email, and comment fields", () => {
    const inputs = popover.querySelectorAll("input, textarea");
    expect(inputs.length).toBe(3);
  });

  it("has a submit button", () => {
    const btn = popover.querySelector("button[type='submit']");
    expect(btn).toBeTruthy();
  });

  it("has a close button that calls onClose", () => {
    const closeBtn = popover.querySelector(".markux-popover-close");
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows identity bar when localStorage has saved identity", () => {
    localStorage.setItem("markux-reviewer-name", "Alice");
    localStorage.setItem("markux-reviewer-email", "alice@test.com");

    const p = createCommentPopover({ x: 100, y: 200 }, onSubmit, onClose);
    const identityBar = p.querySelector(".markux-identity-bar");
    expect(identityBar).toBeTruthy();
    expect(identityBar.textContent).toContain("Alice");
    // Name/email inputs should not be present
    expect(p.querySelector('input[name="name"]')).toBeNull();
  });
});
