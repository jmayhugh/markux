// src/ui/comment-popover.js

import { getSavedIdentity, saveIdentity, createIdentityBar, createIdentityFields } from "./identity.js";

/**
 * Create a comment form popover for submitting a new annotation.
 * @param {{ x: number, y: number }} position - Where to show the popover
 * @param {(data: { name: string, email: string, comment: string }) => void} onSubmit
 * @param {() => void} onClose
 */
export function createCommentPopover(position, onSubmit, onClose) {
  const popover = document.createElement("div");
  popover.className = "markux-popover";

  const left = Math.min(position.x + 20, window.innerWidth - 340);
  const top = Math.min(position.y - 20, window.innerHeight - 350);
  popover.style.left = `${Math.max(10, left)}px`;
  popover.style.top = `${Math.max(10, top)}px`;

  // Header
  const header = document.createElement("div");
  header.className = "markux-popover-header";

  const headerLabel = document.createElement("span");
  headerLabel.textContent = "Add Comment";
  header.appendChild(headerLabel);

  const closeBtn = document.createElement("button");
  closeBtn.className = "markux-popover-close";
  closeBtn.type = "button";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", onClose);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "markux-popover-body";

  const form = document.createElement("form");

  // Identity section
  const identityContainer = document.createElement("div");
  const identity = getSavedIdentity();

  function showIdentityBar() {
    const id = getSavedIdentity();
    if (!id) return;
    identityContainer.replaceChildren();
    identityContainer.appendChild(createIdentityBar(id.name, showIdentityFields));
  }

  function showIdentityFields() {
    identityContainer.replaceChildren();
    const id = getSavedIdentity();
    identityContainer.appendChild(createIdentityFields(id ? id.name : "", id ? id.email : ""));
  }

  if (identity) {
    showIdentityBar();
  } else {
    showIdentityFields();
  }

  form.appendChild(identityContainer);

  // Comment field
  const commentFieldWrapper = document.createElement("div");
  commentFieldWrapper.className = "markux-field";
  const commentTextarea = document.createElement("textarea");
  commentTextarea.className = "markux-textarea";
  commentTextarea.name = "comment";
  commentTextarea.required = true;
  commentTextarea.placeholder = "Describe the issue or suggestion...";
  commentFieldWrapper.appendChild(commentTextarea);
  form.appendChild(commentFieldWrapper);

  // Submit button
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "markux-btn markux-btn-primary";
  submitBtn.style.width = "100%";
  submitBtn.textContent = "Submit";
  form.appendChild(submitBtn);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get identity from fields or saved
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

    const comment = form.elements.comment.value.trim();
    if (!name || !email || !comment) return;

    saveIdentity(name, email);
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    onSubmit({ name, email, comment });
  });

  body.appendChild(form);
  popover.appendChild(header);
  popover.appendChild(body);

  return popover;
}
