// admin/js/embed-snippet.js

export function renderSnippet(container, project) {
  const scriptTag = `<script src="https://YOUR_HOST/markux.js" data-project="${project.id}"><\/script>`;

  // Build DOM safely
  while (container.firstChild) container.removeChild(container.firstChild);

  // Project ID
  const idDiv = document.createElement("div");
  idDiv.style.marginBottom = "16px";
  const idLabel = document.createElement("strong");
  idLabel.textContent = "Project ID: ";
  const idCode = document.createElement("code");
  idCode.textContent = project.id;
  idDiv.appendChild(idLabel);
  idDiv.appendChild(idCode);

  // Allowed domains
  const domainsDiv = document.createElement("div");
  domainsDiv.style.marginBottom = "16px";
  const domainsLabel = document.createElement("strong");
  domainsLabel.textContent = "Allowed Domains: ";
  domainsDiv.appendChild(domainsLabel);
  domainsDiv.appendChild(document.createTextNode(project.allowed_domains.join(", ")));

  // Snippet
  const snippetLabel = document.createElement("strong");
  snippetLabel.textContent = "Add this to your website:";

  const snippetBox = document.createElement("div");
  snippetBox.className = "snippet-box";
  snippetBox.style.marginTop = "8px";

  const codeEl = document.createElement("code");
  codeEl.textContent = scriptTag;
  snippetBox.appendChild(codeEl);

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(scriptTag).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 2000);
    });
  });
  snippetBox.appendChild(copyBtn);

  container.appendChild(idDiv);
  container.appendChild(domainsDiv);
  container.appendChild(snippetLabel);
  container.appendChild(snippetBox);
}
