// admin/js/csv-export.js
import { getSupabase } from "./supabase-client.js";

export async function exportCsv(projectId, projectName) {
  const supabase = getSupabase();

  // Fetch all annotations with their replies
  const { data: annotations, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Fetch replies for all annotations
  const annotationIds = (annotations || []).map((a) => a.id);
  const { data: allReplies } = await supabase
    .from("replies")
    .select("*")
    .in("annotation_id", annotationIds)
    .order("created_at", { ascending: true });

  // Group replies by annotation
  const repliesByAnnotation = {};
  (allReplies || []).forEach((r) => {
    if (!repliesByAnnotation[r.annotation_id]) {
      repliesByAnnotation[r.annotation_id] = [];
    }
    repliesByAnnotation[r.annotation_id].push(r);
  });

  // Build CSV
  const headers = [
    "Page URL",
    "Author Name",
    "Author Email",
    "Comment",
    "Status",
    "Reply Count",
    "Replies",
    "Viewport Width",
    "Created Date",
  ];

  const rows = (annotations || []).map((a) => {
    const replies = repliesByAnnotation[a.id] || [];
    const repliesText = replies
      .map((r) => `${r.author_name}: ${r.body}`)
      .join(" | ");

    return [
      a.page_url,
      a.author_name,
      a.author_email,
      a.comment,
      a.status,
      replies.length,
      repliesText,
      a.viewport_width,
      new Date(a.created_at).toISOString(),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName.replace(/[^a-z0-9]/gi, "-")}-annotations.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(str) {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
