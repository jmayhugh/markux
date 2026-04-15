// admin/js/collaborators.js
import { getSupabase } from "./supabase-client.js";

export async function loadCollaborators(projectId) {
  const supabase = getSupabase();

  // Fetch all annotations for this project (just the identity + id columns)
  const { data: annotations, error: annErr } = await supabase
    .from("annotations")
    .select("id, author_name, author_email, created_at")
    .eq("project_id", projectId);
  if (annErr) throw annErr;

  const annotationIds = (annotations || []).map((a) => a.id);

  // Fetch replies scoped to those annotations
  let replies = [];
  if (annotationIds.length > 0) {
    const { data, error: repErr } = await supabase
      .from("replies")
      .select("annotation_id, author_name, author_email")
      .in("annotation_id", annotationIds);
    if (repErr) throw repErr;
    replies = data || [];
  }

  // Group by lowercased email. Most-recent annotation author_name wins for display.
  const groups = new Map();
  const sortedAnnotations = [...(annotations || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  for (const a of sortedAnnotations) {
    const key = (a.author_email || "").toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        email: key,
        displayEmail: a.author_email,
        name: a.author_name,
        annotationCount: 0,
        replyCount: 0,
      });
    }
    groups.get(key).annotationCount++;
  }
  for (const r of replies) {
    const key = (r.author_email || "").toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        email: key,
        displayEmail: r.author_email,
        name: r.author_name,
        annotationCount: 0,
        replyCount: 0,
      });
    }
    groups.get(key).replyCount++;
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateCollaborator({ projectId, oldEmail, newName, newEmail }) {
  const supabase = getSupabase();
  const oldEmailLower = (oldEmail || "").toLowerCase();
  const newEmailLower = (newEmail || "").toLowerCase();

  // 1. Update annotations in this project
  const { error: annErr } = await supabase
    .from("annotations")
    .update({ author_name: newName, author_email: newEmailLower })
    .eq("project_id", projectId)
    .ilike("author_email", oldEmailLower);
  if (annErr) throw annErr;

  // 2. Get all annotation ids in this project, then update matching replies
  const { data: annotations, error: listErr } = await supabase
    .from("annotations")
    .select("id")
    .eq("project_id", projectId);
  if (listErr) throw listErr;

  const ids = (annotations || []).map((a) => a.id);
  if (ids.length > 0) {
    const { error: repErr } = await supabase
      .from("replies")
      .update({ author_name: newName, author_email: newEmailLower })
      .in("annotation_id", ids)
      .ilike("author_email", oldEmailLower);
    if (repErr) throw repErr;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function renderCollaboratorsSection(projectId, { onChange } = {}) {
  const section = document.getElementById("collaborators-section");
  const list = document.getElementById("collaborators-list");
  const empty = document.getElementById("collaborators-empty");
  const title = document.getElementById("collaborators-title");
  const toggle = document.getElementById("collaborators-toggle");

  const collaborators = await loadCollaborators(projectId);

  list.replaceChildren();
  title.textContent = `Collaborators (${collaborators.length})`;

  if (collaborators.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    collaborators.forEach((c) => list.appendChild(renderRow(c)));
  }

  // Initial collapse state: collapsed if > 10
  if (collaborators.length > 10) {
    section.classList.add("collapsed");
    toggle.textContent = "Expand";
  } else {
    section.classList.remove("collapsed");
    toggle.textContent = "Collapse";
  }

  toggle.onclick = () => {
    const isCollapsed = section.classList.toggle("collapsed");
    toggle.textContent = isCollapsed ? "Expand" : "Collapse";
  };

  function renderRow(c) {
    const row = document.createElement("div");
    row.className = "collaborator-row";

    const info = document.createElement("div");
    info.className = "collaborator-info";
    const nameEl = document.createElement("span");
    nameEl.className = "collaborator-name";
    nameEl.textContent = c.name || "(no name)";
    const emailEl = document.createElement("span");
    emailEl.className = "collaborator-email";
    emailEl.textContent = c.displayEmail;
    info.appendChild(nameEl);
    info.appendChild(emailEl);

    const counts = document.createElement("span");
    counts.className = "collaborator-counts";
    counts.textContent = `${c.annotationCount} comment${c.annotationCount === 1 ? "" : "s"} · ${c.replyCount} repl${c.replyCount === 1 ? "y" : "ies"}`;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-sm btn-secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditModal(c));

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "12px";
    right.style.alignItems = "center";
    right.appendChild(counts);
    right.appendChild(editBtn);

    row.appendChild(info);
    row.appendChild(right);
    return row;
  }

  function openEditModal(c) {
    const modal = document.getElementById("collaborator-modal");
    const nameInput = document.getElementById("collab-name");
    const emailInput = document.getElementById("collab-email");
    const saveBtn = document.getElementById("collab-save");
    const cancelBtn = document.getElementById("collab-cancel");
    const errorEl = document.getElementById("collab-error");
    const form = document.getElementById("collaborator-form");

    nameInput.value = c.name || "";
    emailInput.value = c.displayEmail;
    errorEl.style.display = "none";
    errorEl.textContent = "";
    saveBtn.disabled = true;

    function validate() {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const valid =
        name.length > 0 &&
        EMAIL_RE.test(email) &&
        (name !== (c.name || "") || email.toLowerCase() !== c.email);
      saveBtn.disabled = !valid;
    }

    nameInput.oninput = validate;
    emailInput.oninput = validate;

    function close() {
      modal.style.display = "none";
      form.onsubmit = null;
      cancelBtn.onclick = null;
    }

    cancelBtn.onclick = close;

    form.onsubmit = async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      errorEl.style.display = "none";
      try {
        await updateCollaborator({
          projectId,
          oldEmail: c.email,
          newName: nameInput.value.trim(),
          newEmail: emailInput.value.trim(),
        });
        close();
        await renderCollaboratorsSection(projectId, { onChange });
        if (onChange) await onChange();
      } catch (err) {
        errorEl.textContent = err.message || "Failed to save.";
        errorEl.style.display = "block";
        saveBtn.disabled = false;
      }
    };

    modal.style.display = "flex";
  }
}
