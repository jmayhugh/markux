// src/ui/styles.js

export const STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1a1a1a;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Floating Button */
  .markux-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #6366f1;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 2147483647;
    transition: transform 0.15s ease, background 0.15s ease;
  }

  .markux-fab:hover {
    transform: scale(1.08);
    background: #4f46e5;
  }

  .markux-fab.active {
    background: #ef4444;
  }

  .markux-fab svg {
    width: 22px;
    height: 22px;
    fill: white;
  }

  .markux-fab .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #ef4444;
    color: white;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
  }

  .markux-fab.active .badge {
    background: #6366f1;
  }

  /* Crosshair overlay */
  .markux-overlay {
    position: fixed;
    inset: 0;
    cursor: crosshair;
    z-index: 2147483646;
    pointer-events: none;
  }

  .markux-overlay.active {
    pointer-events: auto;
  }

  /* Element highlight */
  .markux-highlight {
    position: fixed;
    border: 2px solid #6366f1;
    background: rgba(99, 102, 241, 0.08);
    pointer-events: none;
    z-index: 2147483645;
    transition: all 0.1s ease;
  }

  /* Pin marker */
  .markux-pin {
    position: fixed;
    width: 28px;
    height: 28px;
    margin-left: -14px;
    margin-top: -28px;
    cursor: pointer;
    z-index: 2147483644;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
    transition: transform 0.15s ease;
  }

  .markux-pin:hover {
    transform: scale(1.15);
  }

  .markux-pin svg {
    width: 28px;
    height: 28px;
  }

  .markux-pin .pin-number {
    position: absolute;
    top: 3px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    font-weight: 700;
    color: white;
  }

  /* Popover (shared base for comment form and thread view) */
  .markux-popover {
    position: fixed;
    width: 320px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    z-index: 2147483647;
    overflow: hidden;
  }

  .markux-popover-header {
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    font-size: 13px;
    color: #6b7280;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .markux-popover-body {
    padding: 16px;
  }

  .markux-popover-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 18px;
    line-height: 1;
    padding: 0;
  }

  .markux-popover-close:hover {
    color: #6b7280;
  }

  /* Form elements */
  .markux-input, .markux-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }

  .markux-input:focus, .markux-textarea:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .markux-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .markux-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .markux-field {
    margin-bottom: 12px;
  }

  .markux-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    border: none;
    transition: background 0.15s;
  }

  .markux-btn-primary {
    background: #6366f1;
    color: white;
  }

  .markux-btn-primary:hover {
    background: #4f46e5;
  }

  .markux-btn-primary:disabled {
    background: #c7d2fe;
    cursor: not-allowed;
  }

  /* Thread / reply styles */
  .markux-thread {
    max-height: 300px;
    overflow-y: auto;
  }

  .markux-comment {
    padding: 12px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .markux-comment:last-child {
    border-bottom: none;
  }

  .markux-comment-author {
    font-weight: 600;
    font-size: 13px;
  }

  .markux-comment-time {
    font-size: 11px;
    color: #9ca3af;
    margin-left: 8px;
  }

  .markux-comment-body {
    margin-top: 4px;
    font-size: 13px;
    color: #374151;
  }

  .markux-status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 500;
  }

  .markux-status-open {
    background: #fef3c7;
    color: #92400e;
  }

  .markux-status-resolved {
    background: #d1fae5;
    color: #065f46;
  }
`;
