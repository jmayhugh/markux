// admin/js/project-detail.js
import { getSupabase } from "./supabase-client.js";

export async function loadProject(projectId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(projectId, updates) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(projectId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) throw error;
}

export async function loadAnnotations(projectId, filters = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from("annotations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.pageUrl) {
    query = query.eq("page_url", filters.pageUrl);
  }
  if (filters.author) {
    query = query.ilike("author_name", `%${filters.author}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function loadReplies(annotationId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("replies")
    .select("*")
    .eq("annotation_id", annotationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateAnnotationStatus(annotationId, status) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("annotations")
    .update({ status })
    .eq("id", annotationId);
  if (error) throw error;
}

export async function getPageUrls(projectId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("annotations")
    .select("page_url")
    .eq("project_id", projectId);
  if (error) throw error;
  return [...new Set((data || []).map((a) => a.page_url))];
}

export function renderAnnotationRow(annotation, onExpand, onStatusToggle) {
  const tr = document.createElement("tr");

  // Page URL cell
  const pageCell = document.createElement("td");
  pageCell.textContent = truncateUrl(annotation.page_url);
  pageCell.title = annotation.page_url;

  // Author cell
  const authorCell = document.createElement("td");
  const authorName = document.createElement("span");
  authorName.textContent = annotation.author_name;
  const authorEmail = document.createElement("small");
  authorEmail.className = "text-muted";
  authorEmail.textContent = annotation.author_email;
  authorCell.appendChild(authorName);
  authorCell.appendChild(document.createElement("br"));
  authorCell.appendChild(authorEmail);

  // Comment cell
  const commentCell = document.createElement("td");
  commentCell.textContent =
    annotation.comment.length > 60
      ? annotation.comment.slice(0, 60) + "..."
      : annotation.comment;

  // Status cell
  const statusCell = document.createElement("td");
  const statusSpan = document.createElement("span");
  statusSpan.className = `status ${annotation.status === "open" ? "status-open" : "status-resolved"}`;
  statusSpan.textContent = annotation.status;
  statusCell.appendChild(statusSpan);

  // Date cell
  const dateCell = document.createElement("td");
  dateCell.textContent = new Date(annotation.created_at).toLocaleDateString();

  // Action cell
  const actionCell = document.createElement("td");
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "btn btn-sm btn-secondary toggle-status";
  toggleBtn.textContent = annotation.status === "open" ? "Resolve" : "Reopen";
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onStatusToggle(
      annotation.id,
      annotation.status === "open" ? "resolved" : "open",
    );
  });
  actionCell.appendChild(toggleBtn);

  // View-in-context cell
  const viewCell = document.createElement("td");
  const viewLink = document.createElement("a");
  viewLink.href = `${annotation.page_url}#markux=${annotation.id}`;
  viewLink.target = "_blank";
  viewLink.rel = "noopener noreferrer";
  viewLink.textContent = "View";
  viewLink.className = "btn btn-sm btn-link";
  viewLink.addEventListener("click", (e) => e.stopPropagation());
  viewCell.appendChild(viewLink);

  tr.appendChild(pageCell);
  tr.appendChild(authorCell);
  tr.appendChild(commentCell);
  tr.appendChild(statusCell);
  tr.appendChild(dateCell);
  tr.appendChild(actionCell);
  tr.appendChild(viewCell);

  tr.addEventListener("click", (e) => {
    if (e.target.closest(".toggle-status")) return;
    onExpand(annotation);
  });

  return tr;
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}
