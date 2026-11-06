import path from "node:path";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Escapes LIKE wildcards so user input is matched literally (use with ESCAPE '\').
export function likeContains(value) {
  return "%" + String(value ?? "").replace(/[\\%_]/g, "\\$&") + "%";
}

export function isValidExamId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

// Resolves a user-supplied relative path inside root; returns null if it escapes.
export function resolveContained(root, requested) {
  if (typeof requested !== "string" || requested === "" || requested.includes("\0")) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, requested);
  return full.startsWith(base + path.sep) ? full : null;
}

// Fixed-window in-memory rate limiter. Returns express-style middleware.
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
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (t >= v.resetAt) hits.delete(k);
    }
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - t) / 1000)));
      return res.status(429).send("too many requests");
    }
    next();
  };
}
