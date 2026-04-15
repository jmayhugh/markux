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
