// src/ui/thread-popover.js

import { getSavedIdentity, saveIdentity, createIdentityBar } from "./identity.js";

/**
 * Create a popover showing an existing annotation's comment thread.
 * @param {object} annotation - The annotation record
 * @param {object[]} replies - Array of reply records
 * @param {{ x: number, y: number }} position
 * @param {(replyData: { name: string, email: string, body: string }) => void} onReply
 * @param {() => void} onClose
 */
export function createThreadPopover(
  annotation,
  replies,
  position,
  onReply,
  onClose,
) {
  const popover = document.createElement("div");
  popover.className = "markux-popover";

  const left = Math.min(position.x + 20, window.innerWidth - 340);
  const top = Math.min(position.y - 20, window.innerHeight - 450);
  popover.style.left = `${Math.max(10, left)}px`;
  popover.style.top = `${Math.max(10, top)}px`;

  // Header
  const header = document.createElement("div");
  header.className = "markux-popover-header";

  const statusSpan = document.createElement("span");
  statusSpan.className = `markux-status ${annotation.status === "open" ? "markux-status-open" : "markux-status-resolved"}`;
  statusSpan.textContent = annotation.status;
  header.appendChild(statusSpan);

  const closeBtn = document.createElement("button");
  closeBtn.className = "markux-popover-close";
  closeBtn.type = "button";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", onClose);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "markux-popover-body";

  // Thread container
  const thread = document.createElement("div");
  thread.className = "markux-thread";

  // Original comment
  thread.appendChild(createCommentEl(annotation.author_name, annotation.created_at, annotation.comment));

  // Replies
  replies.forEach((r) => {
    thread.appendChild(createCommentEl(r.author_name, r.created_at, r.body));
  });

  body.appendChild(thread);

  // Reply form
  const formWrapper = document.createElement("div");
  formWrapper.style.cssText = "border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;";

  const form = document.createElement("form");
  const identity = getSavedIdentity();

  const identityContainer = document.createElement("div");

  function showBar() {
    const id = getSavedIdentity();
    if (!id) return;
    identityContainer.replaceChildren();
    identityContainer.appendChild(createIdentityBar(id.name, showFields));
  }

  function showFields() {
    identityContainer.replaceChildren();
    const id = getSavedIdentity();
    const row = document.createElement("div");
    row.className = "markux-field";
    row.style.cssText = "display:flex;gap:8px;";

    const nameInput = document.createElement("input");
    nameInput.className = "markux-input";
    nameInput.type = "text";
    nameInput.name = "name";
    nameInput.placeholder = "Name";
    nameInput.value = id ? id.name : "";
    nameInput.required = true;
    nameInput.style.flex = "1";

    const emailInput = document.createElement("input");
    emailInput.className = "markux-input";
    emailInput.type = "email";
    emailInput.name = "email";
    emailInput.placeholder = "Email";
    emailInput.value = id ? id.email : "";
    emailInput.required = true;
    emailInput.style.flex = "1";

    row.appendChild(nameInput);
    row.appendChild(emailInput);
    identityContainer.appendChild(row);
  }

  if (identity) {
    showBar();
  } else {
    showFields();
  }

  form.appendChild(identityContainer);

  const replyRow = document.createElement("div");
  replyRow.className = "markux-field";
  replyRow.style.cssText = "display:flex;gap:8px;";

  const bodyInput = document.createElement("input");
  bodyInput.className = "markux-input";
  bodyInput.type = "text";
  bodyInput.name = "body";
  bodyInput.placeholder = "Reply...";
  bodyInput.required = true;
  bodyInput.style.flex = "1";

  const replyBtn = document.createElement("button");
  replyBtn.type = "submit";
  replyBtn.className = "markux-btn markux-btn-primary";
  replyBtn.textContent = "Reply";

  replyRow.appendChild(bodyInput);
  replyRow.appendChild(replyBtn);
  form.appendChild(replyRow);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let name, email;
    const nameInput = form.elements.name;
    const emailInput = form.elements.email;

    if (nameInput && emailInput) {
      name = nameInput.value.trim();
      email = emailInput.value.trim();
    } else {
      const saved = getSavedIdentity();
      if (!saved) return;
      name = saved.name;
      email = saved.email;
    }

    const replyBody = bodyInput.value.trim();
    if (!name || !email || !replyBody) return;

    saveIdentity(name, email);
    onReply({ name, email, body: replyBody });
    bodyInput.value = "";
  });

  formWrapper.appendChild(form);
  body.appendChild(formWrapper);

  popover.appendChild(header);
  popover.appendChild(body);

  return popover;
}

function createCommentEl(authorName, createdAt, text) {
  const el = document.createElement("div");
  el.className = "markux-comment";

  const author = document.createElement("span");
  author.className = "markux-comment-author";
  author.textContent = authorName;

  const time = document.createElement("span");
  time.className = "markux-comment-time";
  time.textContent = formatTime(createdAt);

  const bodyEl = document.createElement("div");
  bodyEl.className = "markux-comment-body";
  bodyEl.textContent = text;

  el.appendChild(author);
  el.appendChild(time);
  el.appendChild(bodyEl);
  return el;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}
