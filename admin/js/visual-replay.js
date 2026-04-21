// admin/js/visual-replay.js

let currentIndex = 0;

export function renderVisualReplay(container, annotations, supabaseUrl) {
  if (annotations.length === 0) {
    // Clear and show empty state using DOM API
    while (container.firstChild) container.removeChild(container.firstChild);
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No annotations to replay.";
    container.appendChild(empty);
    return;
  }

  currentIndex = 0;
  renderAnnotation(container, annotations, supabaseUrl);
}

function renderAnnotation(container, annotations, supabaseUrl) {
  const ann = annotations[currentIndex];
  const screenshotUrl = ann.screenshot_path
    ? `${supabaseUrl}/storage/v1/object/public/screenshots/${ann.screenshot_path}`
    : null;

  // Build DOM using safe methods
  while (container.firstChild) container.removeChild(container.firstChild);

  const card = document.createElement("div");
  card.className = "card";

  // Replay container
  const replayBox = document.createElement("div");
  replayBox.className = "replay-container";

  if (screenshotUrl) {
    const img = document.createElement("img");
    img.src = screenshotUrl;
    img.alt = "Screenshot";
    replayBox.appendChild(img);

    // Pin overlay on screenshot
    const pinEl = document.createElement("div");
    pinEl.className = "replay-pin";
    pinEl.style.left = `${ann.pin_x * 100}%`;
    pinEl.style.top = `${ann.pin_y * 100}%`;
    const pinSvgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(pinSvgNs, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    const path = document.createElementNS(pinSvgNs, "path");
    path.setAttribute("fill", "#6366f1");
    path.setAttribute("d", "M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z");
    svg.appendChild(path);
    pinEl.appendChild(svg);
    replayBox.appendChild(pinEl);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "empty-state";
    placeholder.style.cssText = "padding:80px;background:#f3f4f6";
    placeholder.textContent = "Screenshot unavailable";
    replayBox.appendChild(placeholder);
  }

  card.appendChild(replayBox);

  // Navigation
  const nav = document.createElement("div");
  nav.className = "replay-nav";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn-sm btn-secondary";
  prevBtn.textContent = "Previous";
  prevBtn.disabled = currentIndex === 0;

  const info = document.createElement("span");
  info.className = "text-muted";
  info.textContent = `${currentIndex + 1} / ${annotations.length} \u2014 Captured at ${ann.viewport_width}x${ann.viewport_height}`;

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-sm btn-secondary";
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentIndex === annotations.length - 1;

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderAnnotation(container, annotations, supabaseUrl);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex < annotations.length - 1) {
      currentIndex++;
      renderAnnotation(container, annotations, supabaseUrl);
    }
  });

  nav.appendChild(prevBtn);
  nav.appendChild(info);
  nav.appendChild(nextBtn);
  card.appendChild(nav);

  // Annotation details
  const details = document.createElement("div");
  details.style.padding = "16px";

  const authorLine = document.createElement("div");
  const authorStrong = document.createElement("strong");
  authorStrong.textContent = ann.author_name;
  const authorEmail = document.createElement("span");
  authorEmail.className = "text-muted";
  authorEmail.style.marginLeft = "8px";
  authorEmail.textContent = ann.author_email;
  const statusEl = document.createElement("span");
  statusEl.className = `status status-${ann.status}`;
  statusEl.style.marginLeft = "8px";
  statusEl.textContent = ann.status;
  authorLine.appendChild(authorStrong);
  authorLine.appendChild(authorEmail);
  authorLine.appendChild(statusEl);

  const commentP = document.createElement("p");
  commentP.style.marginTop = "8px";
  commentP.textContent = ann.comment;

  const dateSmall = document.createElement("small");
  dateSmall.className = "text-muted";
  dateSmall.textContent = new Date(ann.created_at).toLocaleString();

  const pageDiv = document.createElement("div");
  pageDiv.className = "text-muted";
  pageDiv.style.marginTop = "4px";
  pageDiv.textContent = `Page: ${ann.page_url}`;

  details.appendChild(authorLine);
  details.appendChild(commentP);
  details.appendChild(dateSmall);
  details.appendChild(pageDiv);
  card.appendChild(details);

  container.appendChild(card);
}
