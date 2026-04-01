// src/ui/identity.js

/**
 * Get saved reviewer identity from localStorage.
 * Returns { name, email } or null if not set.
 */
export function getSavedIdentity() {
  const name = localStorage.getItem("markux-reviewer-name");
  const email = localStorage.getItem("markux-reviewer-email");
  if (name && email) return { name, email };
  return null;
}

export function saveIdentity(name, email) {
  localStorage.setItem("markux-reviewer-name", name);
  localStorage.setItem("markux-reviewer-email", email);
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Create a "Commenting as" identity bar with a change link.
 * Calls onChange() when user clicks "change".
 */
export function createIdentityBar(name, onChange) {
  const bar = document.createElement("div");
  bar.className = "markux-identity-bar";

  const label = document.createElement("span");
  label.textContent = "Commenting as ";

  const nameSpan = document.createElement("strong");
  nameSpan.textContent = name;

  const changeLink = document.createElement("button");
  changeLink.type = "button";
  changeLink.className = "markux-identity-change";
  changeLink.textContent = "change";
  changeLink.addEventListener("click", (e) => {
    e.stopPropagation();
    onChange();
  });

  bar.appendChild(label);
  bar.appendChild(nameSpan);
  bar.appendChild(document.createTextNode(" "));
  bar.appendChild(changeLink);

  return bar;
}

/**
 * Create name + email fields for first-time identity entry.
 */
export function createIdentityFields(savedName, savedEmail) {
  const container = document.createElement("div");
  container.className = "markux-identity-fields";

  const nameField = document.createElement("div");
  nameField.className = "markux-field";
  const nameLabel = document.createElement("label");
  nameLabel.className = "markux-label";
  nameLabel.textContent = "Name";
  const nameInput = document.createElement("input");
  nameInput.className = "markux-input";
  nameInput.type = "text";
  nameInput.name = "name";
  nameInput.placeholder = "Your name";
  nameInput.value = savedName || "";
  nameInput.required = true;
  nameField.appendChild(nameLabel);
  nameField.appendChild(nameInput);

  const emailField = document.createElement("div");
  emailField.className = "markux-field";
  const emailLabel = document.createElement("label");
  emailLabel.className = "markux-label";
  emailLabel.textContent = "Email";
  const emailInput = document.createElement("input");
  emailInput.className = "markux-input";
  emailInput.type = "email";
  emailInput.name = "email";
  emailInput.placeholder = "your@email.com";
  emailInput.value = savedEmail || "";
  emailInput.required = true;
  emailField.appendChild(emailLabel);
  emailField.appendChild(emailInput);

  container.appendChild(nameField);
  container.appendChild(emailField);

  return container;
}
