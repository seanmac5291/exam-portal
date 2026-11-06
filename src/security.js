import path from "node:path";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Resolves a user-supplied relative file under root; returns null if it escapes root.
export function resolveContained(root, userPath) {
  if (typeof userPath !== "string" || userPath === "" || userPath.includes("\0")) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, userPath);
  return full.startsWith(base + path.sep) ? full : null;
}

export function isValidExamId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(id);
}

export function likePattern(term) {
  const escaped = String(term ?? "").replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}

// Fixed-window in-memory limiter keyed by client IP.
export function createRateLimiter({ windowMs = 60_000, max = 60, now = Date.now } = {}) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    const t = now();
    const key = req.ip ?? "unknown";
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
