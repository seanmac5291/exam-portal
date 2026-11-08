import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { escapeHtml, likePattern, resolveContained, isValidExamId, createRateLimiter } from "../src/security.js";

const ROOT = path.resolve("data/workpapers");

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml(`<script>"a"&'b'</script>`), "&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;");
});

test("likePattern escapes wildcards", () => {
  assert.equal(likePattern("a%b_c\\"), "%a\\%b\\_c\\\\%");
});

test("resolveContained allows files inside root, rejects escapes", () => {
  assert.equal(resolveContained(ROOT, "a/b.txt"), path.join(ROOT, "a/b.txt"));
  assert.equal(resolveContained(ROOT, "../secret"), null);
  assert.equal(resolveContained(ROOT, "/etc/passwd"), null);
  assert.equal(resolveContained(ROOT, "../workpapers-evil/x"), null);
  assert.equal(resolveContained(ROOT, ["a"]), null);
  assert.equal(resolveContained(ROOT, "a\0b"), null);
});

test("isValidExamId rejects shell metacharacters", () => {
  assert.ok(isValidExamId("EX-2026_01"));
  for (const bad of ["1; rm -rf /", "../x", "a b", "", "$(id)", undefined]) assert.equal(isValidExamId(bad), false);
});

test("rate limiter blocks after max and resets", () => {
  let t = 0;
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => t });
  const req = { ip: "1.1.1.1" };
  const run = () => {
    const out = { next: false, status: null };
    const res = { set() {}, status(c) { out.status = c; return this; }, send() {} };
    limiter(req, res, () => (out.next = true));
    return out;
  };
  assert.ok(run().next);
  assert.ok(run().next);
  assert.equal(run().status, 429);
  t = 1000;
  assert.ok(run().next);
});
