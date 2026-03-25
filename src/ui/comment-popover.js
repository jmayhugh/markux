// src/ui/comment-popover.js

/**
 * Create a comment form popover for submitting a new annotation.
 * @param {{ x: number, y: number }} position - Where to show the popover
 * @param {(data: { name: string, email: string, comment: string }) => void} onSubmit
 * @param {() => void} onClose
 */
export function createCommentPopover(position, onSubmit, onClose) {
  const popover = document.createElement("div");
  popover.className = "markux-popover";

  // Position near the pin, but keep on screen
  const left = Math.min(position.x + 20, window.innerWidth - 340);
  const top = Math.min(position.y - 20, window.innerHeight - 350);
  popover.style.left = `${Math.max(10, left)}px`;
  popover.style.top = `${Math.max(10, top)}px`;

  const savedName = localStorage.getItem("markux-reviewer-name") || "";
  const savedEmail = localStorage.getItem("markux-reviewer-email") || "";

  // Build form using DOM API for safe value injection
  const header = document.createElement("div");
  header.className = "markux-popover-header";

  const headerLabel = document.createElement("span");
  headerLabel.textContent = "Add Annotation";
  header.appendChild(headerLabel);

  const closeBtn = document.createElement("button");
  closeBtn.className = "markux-popover-close";
  closeBtn.type = "button";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", onClose);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "markux-popover-body";

  const form = document.createElement("form");

  // Name field
  const nameField = createField("Name", "text", "name", "Your name", savedName, true);
  form.appendChild(nameField);

  // Email field
  const emailField = createField("Email", "email", "email", "your@email.com", savedEmail, true);
  form.appendChild(emailField);

  // Comment field
  const commentFieldWrapper = document.createElement("div");
  commentFieldWrapper.className = "markux-field";
  const commentLabel = document.createElement("label");
  commentLabel.className = "markux-label";
  commentLabel.textContent = "Comment";
  const commentTextarea = document.createElement("textarea");
  commentTextarea.className = "markux-textarea";
  commentTextarea.name = "comment";
  commentTextarea.required = true;
  commentTextarea.placeholder = "Describe the issue or suggestion...";
  commentFieldWrapper.appendChild(commentLabel);
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
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const comment = form.elements.comment.value.trim();

    if (!name || !email || !comment) return;

    // Save identity for next time
    localStorage.setItem("markux-reviewer-name", name);
    localStorage.setItem("markux-reviewer-email", email);

    // Disable button during submission
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    onSubmit({ name, email, comment });
  });

  body.appendChild(form);
  popover.appendChild(header);
  popover.appendChild(body);

  return popover;
}

function createField(labelText, type, name, placeholder, value, required) {
  const wrapper = document.createElement("div");
  wrapper.className = "markux-field";

  const label = document.createElement("label");
  label.className = "markux-label";
  label.textContent = labelText;

  const input = document.createElement("input");
  input.className = "markux-input";
  input.type = type;
  input.name = name;
  input.placeholder = placeholder;
  input.value = value;
  input.required = required;

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}
