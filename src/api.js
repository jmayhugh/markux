let _apiKey = null;

export function setApiKey(key) {
  _apiKey = key;
}

async function callEdgeFunction(edgeFunctionUrl, payload) {
  const headers = { "Content-Type": "application/json" };
  if (_apiKey) {
    headers["Authorization"] = `Bearer ${_apiKey}`;
  }
  const res = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function createAnnotation(edgeFunctionUrl, projectId, data) {
  return callEdgeFunction(edgeFunctionUrl, { action: "create_annotation", project_id: projectId, data });
}

export async function createReply(edgeFunctionUrl, projectId, data) {
  return callEdgeFunction(edgeFunctionUrl, { action: "create_reply", project_id: projectId, data });
}

export async function updateAnnotationStatus(edgeFunctionUrl, projectId, annotationId, status) {
  return callEdgeFunction(edgeFunctionUrl, { action: "update_annotation_status", project_id: projectId, data: { annotation_id: annotationId, status } });
}

export async function deleteAnnotation(edgeFunctionUrl, projectId, annotationId, authorEmail) {
  return callEdgeFunction(edgeFunctionUrl, { action: "delete_annotation", project_id: projectId, data: { annotation_id: annotationId, author_email: authorEmail } });
}

export async function uploadScreenshot(edgeFunctionUrl, projectId, path, base64) {
  return callEdgeFunction(edgeFunctionUrl, { action: "upload_screenshot", project_id: projectId, data: { path, base64 } });
}
