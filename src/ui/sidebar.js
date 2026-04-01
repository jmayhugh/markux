// src/ui/sidebar.js

import { getSavedIdentity, saveIdentity, createIdentityBar, createIdentityFields } from "./identity.js";

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
}

// Static trusted SVG — chevron left arrow for the handle (no user input)
const CHEVRON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;

export function createSidebar(onSelectAnnotation, onClose) {
  const sidebar = document.createElement("div");
  sidebar.className = "markux-sidebar";

  // Pull-out handle on the left edge
  const handle = document.createElement("button");
  handle.className = "markux-sidebar-handle";
  handle.setAttribute("aria-label", "Toggle comments panel");
  // Static SVG constant — safe for innerHTML
  handle.innerHTML = CHEVRON_SVG; // eslint-disable-line no-unsanitized/property
  handle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    if (!isOpen) onClose();
  });
  sidebar.appendChild(handle);

  const header = document.createElement("div");
  header.className = "markux-sidebar-header";

  const title = document.createElement("h3");
  title.textContent = "Comments";

  const closeBtn = document.createElement("button");
  closeBtn.className = "markux-sidebar-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("open");
    onClose();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);
  sidebar.appendChild(header);

  const list = document.createElement("div");
  list.className = "markux-sidebar-list";
  sidebar.appendChild(list);

  sidebar._list = list;
  sidebar._handle = handle;
  sidebar._onSelect = onSelectAnnotation;

  return sidebar;
}

export function updateSidebarBadge(sidebar, count) {
  const handle = sidebar._handle;
  let badge = handle.querySelector(".markux-sidebar-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "markux-sidebar-badge";
    handle.appendChild(badge);
  }
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
}

export function updateSidebarList(sidebar, annotations, { loadReplies, onReply }) {
  const list = sidebar._list;
  const onSelect = sidebar._onSelect;

  while (list.firstChild) list.removeChild(list.firstChild);

  if (annotations.length === 0) {
    const empty = document.createElement("div");
    empty.className = "markux-sidebar-empty";
    empty.textContent = "No comments on this page yet.";
    list.appendChild(empty);
    return;
  }

  annotations.forEach((annotation, index) => {
    const item = document.createElement("div");
    item.className = "markux-sidebar-item";
    item.dataset.annotationId = annotation.id;

    const itemHeader = document.createElement("div");
    itemHeader.className = "markux-sidebar-item-header";

    const num = document.createElement("span");
    num.className = "markux-sidebar-item-number";
    num.textContent = index + 1;

    const author = document.createElement("span");
    author.className = "markux-sidebar-item-author";
    author.textContent = annotation.author_name;

    const status = document.createElement("span");
    status.className = `markux-status ${annotation.status === "open" ? "markux-status-open" : "markux-status-resolved"}`;
    status.textContent = annotation.status;

    const time = document.createElement("span");
    time.className = "markux-sidebar-item-time";
    time.textContent = formatTime(annotation.created_at);

    itemHeader.appendChild(num);
    itemHeader.appendChild(author);
    itemHeader.appendChild(status);
    itemHeader.appendChild(time);

    const comment = document.createElement("div");
    comment.className = "markux-sidebar-item-comment";
    comment.textContent = annotation.comment;

    // Reply count
    if (annotation._replyCount > 0) {
      const replyCount = document.createElement("span");
      replyCount.className = "markux-sidebar-item-replies";
      replyCount.textContent = `${annotation._replyCount} ${annotation._replyCount === 1 ? "reply" : "replies"}`;
      comment.appendChild(replyCount);
    }

    // Expandable thread area
    const threadArea = document.createElement("div");
    threadArea.className = "markux-sidebar-thread";

    item.appendChild(itemHeader);
    item.appendChild(comment);
    item.appendChild(threadArea);

    item.addEventListener("click", async (e) => {
      // Don't toggle if clicking inside the reply form
      if (e.target.closest(".markux-sidebar-reply-form")) return;

      const wasActive = item.classList.contains("active");

      // Remove active state from all items
      list.querySelectorAll(".markux-sidebar-item").forEach((el) => {
        el.classList.remove("active");
        el.querySelector(".markux-sidebar-thread").replaceChildren();
      });

      if (wasActive) return; // collapse

      item.classList.add("active");
      onSelect(annotation, index);

      // Load and show thread
      const replies = await loadReplies(annotation.id);
      renderThread(threadArea, annotation, replies, onReply, loadReplies);
    });

    list.appendChild(item);
  });
}

function renderThread(container, annotation, replies, onReply, loadReplies) {
  container.replaceChildren();

  // Replies list
  if (replies.length > 0) {
    const repliesList = document.createElement("div");
    repliesList.className = "markux-sidebar-replies";

    replies.forEach((r) => {
      const reply = document.createElement("div");
      reply.className = "markux-sidebar-reply";

      const replyHeader = document.createElement("div");
      replyHeader.className = "markux-sidebar-reply-header";

      const replyAuthor = document.createElement("span");
      replyAuthor.className = "markux-sidebar-reply-author";
      replyAuthor.textContent = r.author_name;

      const replyTime = document.createElement("span");
      replyTime.className = "markux-sidebar-reply-time";
      replyTime.textContent = formatTime(r.created_at);

      replyHeader.appendChild(replyAuthor);
      replyHeader.appendChild(replyTime);

      const replyBody = document.createElement("div");
      replyBody.className = "markux-sidebar-reply-body";
      replyBody.textContent = r.body;

      reply.appendChild(replyHeader);
      reply.appendChild(replyBody);
      repliesList.appendChild(reply);
    });

    container.appendChild(repliesList);
  }

  // Reply form
  const form = document.createElement("form");
  form.className = "markux-sidebar-reply-form";

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
    row.className = "markux-sidebar-reply-identity";
    const nameInput = document.createElement("input");
    nameInput.className = "markux-input";
    nameInput.type = "text";
    nameInput.name = "name";
    nameInput.placeholder = "Name";
    nameInput.value = id ? id.name : "";
    nameInput.required = true;
    const emailInput = document.createElement("input");
    emailInput.className = "markux-input";
    emailInput.type = "email";
    emailInput.name = "email";
    emailInput.placeholder = "Email";
    emailInput.value = id ? id.email : "";
    emailInput.required = true;
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
  replyRow.className = "markux-sidebar-reply-row";

  const bodyInput = document.createElement("input");
  bodyInput.className = "markux-input";
  bodyInput.type = "text";
  bodyInput.name = "body";
  bodyInput.placeholder = "Reply...";
  bodyInput.required = true;

  const replyBtn = document.createElement("button");
  replyBtn.type = "submit";
  replyBtn.className = "markux-btn markux-btn-primary";
  replyBtn.textContent = "Reply";

  replyRow.appendChild(bodyInput);
  replyRow.appendChild(replyBtn);
  form.appendChild(replyRow);

  form.addEventListener("submit", async (e) => {
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

    const body = bodyInput.value.trim();
    if (!name || !email || !body) return;

    saveIdentity(name, email);
    replyBtn.disabled = true;
    replyBtn.textContent = "Sending...";

    await onReply(annotation, { name, email, body });

    const updatedReplies = await loadReplies(annotation.id);
    renderThread(container, annotation, updatedReplies, onReply, loadReplies);
  });

  container.appendChild(form);
}

export function openSidebar(sidebar) {
  sidebar.classList.add("open");
}

export function closeSidebar(sidebar) {
  sidebar.classList.remove("open");
}
