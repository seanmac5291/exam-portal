import path from "node:path";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function resolveContained(root, requested) {
  if (typeof requested !== "string" || requested.includes("\0")) return null;
  const full = path.resolve(root, requested);
  return full.startsWith(root + path.sep) ? full : null;
}

export function validExamId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(id);
}

export function likePattern(term) {
  return "%" + String(term ?? "").replace(/[\\%_]/g, "\\$&") + "%";
}
