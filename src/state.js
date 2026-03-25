let annotationMode = false;
let annotations = [];

export function getReviewerIdentity() {
  return {
    name: localStorage.getItem("markux-reviewer-name") || "",
    email: localStorage.getItem("markux-reviewer-email") || "",
  };
}

export function setReviewerIdentity(name, email) {
  localStorage.setItem("markux-reviewer-name", name);
  localStorage.setItem("markux-reviewer-email", email);
}

export function getAnnotationMode() { return annotationMode; }
export function setAnnotationMode(active) { annotationMode = active; }
export function getAnnotations() { return annotations; }
export function addAnnotation(annotation) { annotations.push(annotation); }
export function removeAnnotation(id) { annotations = annotations.filter((a) => a.id !== id); }
export function updateAnnotation(id, updates) {
  const idx = annotations.findIndex((a) => a.id === id);
  if (idx !== -1) annotations[idx] = { ...annotations[idx], ...updates };
}
export function clearAnnotations() { annotations = []; }
