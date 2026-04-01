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
    background: #dc2626;
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
    background: #b91c1c;
  }

  .markux-fab.active {
    background: black;
    border: 2px solid white;
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

  /* Annotation mode overlay */
  .markux-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    pointer-events: none;
  }

  .markux-overlay.active {
    pointer-events: auto;
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M4 2h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H10l-4 4V4c0-1.1.9-2 2-2z'/%3E%3C/svg%3E") 2 34, crosshair;
    border: 1px solid #dc2626;
    box-shadow: inset 0 0 60px rgba(220, 38, 38, 0.5);
  }

  .markux-mode-label {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: #dc2626;
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 16px;
    border-radius: 9999px;
    z-index: 2147483647;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    letter-spacing: 0.5px;
  }

  .markux-mode-label.visible {
    opacity: 1;
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
    width: 42px;
    height: 42px;
    margin-left: -21px;
    margin-top: -42px;
    cursor: pointer;
    z-index: 2147483644;
    filter: drop-shadow(0 1px 4px rgba(0,0,0,0.3));
    transition: transform 0.15s ease;
  }

  .markux-pin:hover {
    transform: scale(1.1);
  }

  .markux-pin svg {
    width: 42px;
    height: 42px;
  }

  .markux-pin .pin-number {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 14px;
    font-weight: 700;
    color: white;
  }

  .markux-pin .pin-initials {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 22px;
    height: 22px;
    border-radius: 11px;
    background: #1f2937;
    color: white;
    font-size: 9px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid white;
  }

  .markux-pin.markux-pin-resolved {
    opacity: 0.6;
  }

  .markux-pin.highlighted {
    transform: scale(1.3);
    filter: drop-shadow(0 4px 12px rgba(99,102,241,0.5));
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

  /* Sidebar drawer */
  .markux-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 360px;
    height: 100vh;
    background: white;
    box-shadow: -4px 0 24px rgba(0,0,0,0.12);
    z-index: 2147483647;
    transform: translateX(100%);
    transition: transform 0.25s ease;
    display: flex;
    flex-direction: column;
  }

  .markux-sidebar.open {
    transform: translateX(0);
  }

  .markux-sidebar-handle {
    position: absolute;
    top: 50%;
    left: -32px;
    transform: translateY(-50%);
    width: 32px;
    height: 64px;
    background: white;
    border-radius: 8px 0 0 8px;
    box-shadow: -3px 0 8px rgba(0,0,0,0.1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: none;
    color: black;
    font-size: 16px;
    padding: 4px 0;
  }

  .markux-sidebar-handle:hover {
    background: #f9fafb;
    color: #111827;
  }

  .markux-sidebar-handle svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
    transition: transform 0.25s ease;
  }

  .markux-sidebar.open .markux-sidebar-handle svg {
    transform: rotate(180deg);
  }

  .markux-sidebar-badge {
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: #dc2626;
    color: white;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    order: -1;
  }

  .markux-sidebar-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .markux-sidebar-header h3 {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  .markux-sidebar-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 20px;
    line-height: 1;
    padding: 4px;
  }

  .markux-sidebar-close:hover {
    color: #6b7280;
  }

  .markux-sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .markux-sidebar-item {
    padding: 12px 20px;
    cursor: pointer;
    border-bottom: 1px solid #f3f4f6;
    transition: background 0.1s;
  }

  .markux-sidebar-item:hover {
    background: #f9fafb;
  }

  .markux-sidebar-item.active {
    background: #eef2ff;
    border-left: 3px solid #6366f1;
  }

  .markux-sidebar-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .markux-sidebar-item-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #333333;
    color: white;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .markux-sidebar-item-author {
    font-weight: 600;
    font-size: 13px;
    color: #111827;
  }

  .markux-sidebar-item-time {
    font-size: 11px;
    color: #9ca3af;
    margin-left: auto;
  }

  .markux-sidebar-item-comment {
    font-size: 13px;
    color: #4b5563;
    margin-left: 32px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .markux-sidebar-empty {
    padding: 40px 20px;
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
  }

  .markux-sidebar-item-actions {
    display: flex;
    gap: 8px;
    margin-top: 6px;
    margin-left: 32px;
  }

  .markux-sidebar-item-status-btn {
    background: none;
    border: 1px solid #d1d5db;
    color: #374151;
    font-size: 11px;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .markux-sidebar-item-status-btn:hover {
    background: #f3f4f6;
  }

  .markux-sidebar-item-status-btn:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }

  .markux-sidebar-item-delete {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 11px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: auto;
  }

  .markux-sidebar-item-delete:hover {
    background: #fef2f2;
  }

  .markux-sidebar-item-delete:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }

  .markux-sidebar-item-replies {
    font-size: 11px;
    color: #6366f1;
    margin-top: 4px;
    margin-left: 32px;
  }

  .markux-sidebar-item-replies:empty {
    display: none;
  }

  .markux-sidebar-thread {
    margin-left: 32px;
  }

  .markux-sidebar-replies {
    margin-top: 8px;
    border-top: 1px solid #f3f4f6;
    padding-top: 8px;
  }

  .markux-sidebar-reply {
    padding: 6px 0;
  }

  .markux-sidebar-reply-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .markux-sidebar-reply-author {
    font-weight: 600;
    font-size: 12px;
    color: #374151;
  }

  .markux-sidebar-reply-time {
    font-size: 11px;
    color: #9ca3af;
  }

  .markux-sidebar-reply-body {
    font-size: 13px;
    color: #4b5563;
    margin-top: 2px;
  }

  .markux-sidebar-reply-form {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #f3f4f6;
  }

  .markux-sidebar-reply-identity {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }

  .markux-sidebar-reply-identity .markux-input {
    flex: 1;
    padding: 6px 8px;
    font-size: 12px;
  }

  .markux-sidebar-reply-row {
    display: flex;
    gap: 6px;
  }

  .markux-sidebar-reply-row .markux-input {
    flex: 1;
    padding: 6px 8px;
    font-size: 12px;
  }

  .markux-sidebar-reply-row .markux-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  /* Identity bar */
  .markux-identity-bar {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 8px;
    padding: 6px 0;
  }

  .markux-identity-bar strong {
    color: #111827;
  }

  .markux-identity-change {
    background: none;
    border: none;
    color: #6366f1;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  .markux-identity-change:hover {
    color: #4f46e5;
  }

  .markux-identity-fields {
    margin-bottom: 4px;
  }
`;
