// src/realtime.js
import { getSupabase } from "./supabase-client.js";

let channel = null;

/**
 * Subscribe to realtime annotation changes for a project.
 * @param {string} projectId
 * @param {(annotation: object) => void} onInsert - Called when a new annotation is created
 * @param {(annotation: object) => void} onUpdate - Called when an annotation is updated
 * @param {(annotation: object) => void} onDelete - Called when an annotation is deleted
 */
export function subscribeToAnnotations(
  projectId,
  { onInsert, onUpdate, onDelete },
) {
  const supabase = getSupabase();

  channel = supabase
    .channel(`annotations:${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "annotations",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onInsert(payload.new),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "annotations",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onUpdate(payload.new),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "annotations",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onDelete(payload.old),
    )
    .subscribe();
}

export function unsubscribe() {
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
}
