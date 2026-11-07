import path from "node:path";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Resolves a user-supplied relative path inside root; returns null if it escapes or is invalid.
export function resolveContained(root, userPath) {
  if (typeof userPath !== "string" || userPath === "" || userPath.includes("\0")) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, userPath);
  return full.startsWith(base + path.sep) ? full : null;
}

export function isValidExamId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

// Escapes LIKE wildcards so user input matches literally (use with ESCAPE '\').
export function likePattern(value) {
  return "%" + String(value ?? "").replace(/[\\%_]/g, "\\$&") + "%";
}
