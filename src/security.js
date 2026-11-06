import path from "node:path";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Resolves a user-supplied relative path inside root; returns null if it escapes root.
export function resolveInside(root, userPath) {
  if (typeof userPath !== "string" || userPath.includes("\0")) return null;
  const full = path.resolve(root, userPath);
  return full.startsWith(root + path.sep) ? full : null;
}

export function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      if (hits.size > 10_000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return res.status(429).send("too many requests");
    }
    next();
  };
}
