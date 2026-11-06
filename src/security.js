import path from "node:path";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Escapes LIKE wildcards so user input matches literally (use with ESCAPE '\').
export function likePattern(value) {
  return "%" + String(value ?? "").replace(/[\\%_]/g, "\\$&") + "%";
}

const EXAM_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidExamId(value) {
  return typeof value === "string" && EXAM_ID.test(value);
}

// Resolves a user-supplied relative path inside root; returns null if it escapes.
export function resolveWithin(root, userPath) {
  if (typeof userPath !== "string" || userPath === "" || userPath.includes("\0")) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, userPath);
  return full.startsWith(base + path.sep) ? full : null;
}

// Fixed-window in-memory rate limiter middleware factory.
export function rateLimit({ windowMs = 60_000, max = 60, now = Date.now } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const t = now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    let entry = hits.get(key);
    if (!entry || t - entry.start >= windowMs) {
      entry = { start: t, count: 0 };
      hits.set(key, entry);
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
      }
    }
    entry.count++;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.start + windowMs - t) / 1000)));
      return res.status(429).send("too many requests");
    }
    next();
  };
}
