async function callEdgeFunction(edgeFunctionUrl, payload) {
  const res = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
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

export async function uploadScreenshot(edgeFunctionUrl, projectId, path, base64) {
  return callEdgeFunction(edgeFunctionUrl, { action: "upload_screenshot", project_id: projectId, data: { path, base64 } });
}
