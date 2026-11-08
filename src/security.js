import path from "node:path";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Escapes LIKE wildcards so user input is matched literally (use with ESCAPE '\').
export function likePattern(value) {
  return "%" + String(value).replace(/[\\%_]/g, "\\$&") + "%";
}

// Resolves a user-supplied relative path inside root; returns null if it escapes.
export function resolveContained(root, requested) {
  if (typeof requested !== "string" || requested === "" || requested.includes("\0")) return null;
  const resolved = path.resolve(root, requested);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

const EXAM_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidExamId(value) {
  return typeof value === "string" && EXAM_ID.test(value);
}

// Fixed-window in-memory limiter keyed by client; returns Express middleware.
export function createRateLimiter({ windowMs = 60_000, max = 60, now = Date.now } = {}) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    const t = now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    let entry = hits.get(key);
    if (!entry || t >= entry.reset) {
      entry = { count: 0, reset: t + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (t >= v.reset) hits.delete(k);
    }
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - t) / 1000)));
      return res.status(429).send("too many requests");
    }
    next();
  };
}
