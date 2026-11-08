import path from "node:path";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Escapes LIKE wildcards so user input matches literally (used with ESCAPE '\').
export function likePattern(input) {
  return "%" + String(input ?? "").replace(/[\\%_]/g, "\\$&") + "%";
}

// Resolves a user-supplied relative path inside root; returns null if it escapes.
export function resolveContained(root, userPath) {
  if (typeof userPath !== "string" || userPath === "" || userPath.includes("\0")) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, userPath);
  return full.startsWith(base + path.sep) ? full : null;
}

export function isValidExamId(examId) {
  return typeof examId === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(examId);
}

// Fixed-window in-memory rate limiter; returns an Express-style middleware.
export function createRateLimiter({ windowMs = 60_000, max = 30, now = Date.now } = {}) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    const t = now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    let entry = hits.get(key);
    if (!entry || t >= entry.resetAt) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (hits.size > 10_000) for (const [k, v] of hits) if (t >= v.resetAt) hits.delete(k);
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - t) / 1000)));
      return res.status(429).send("too many requests");
    }
    next();
  };
}
