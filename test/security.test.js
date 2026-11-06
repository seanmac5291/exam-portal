import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, resolveContained, isValidExamId, likePattern, createRateLimiter } from "../src/security.js";

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml(`<script>"a"&'b'</script>`), "&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;");
});

test("resolveContained blocks traversal", () => {
  assert.ok(resolveContained("/srv/wp", "a/b.txt").endsWith("/srv/wp/a/b.txt"));
  assert.equal(resolveContained("/srv/wp", "../etc/passwd"), null);
  assert.equal(resolveContained("/srv/wp", "/etc/passwd"), null);
  assert.equal(resolveContained("/srv/wp", "../wp-evil/x"), null);
  assert.equal(resolveContained("/srv/wp", undefined), null);
  assert.equal(resolveContained("/srv/wp", ["a"]), null);
});

test("isValidExamId rejects shell metacharacters", () => {
  assert.ok(isValidExamId("2024-NE_01"));
  assert.equal(isValidExamId("1; rm -rf /"), false);
  assert.equal(isValidExamId("../x"), false);
  assert.equal(isValidExamId(""), false);
});

test("likePattern escapes wildcards", () => {
  assert.equal(likePattern("50%_\\x"), "%50\\%\\_\\\\x%");
});

test("rate limiter returns 429 over max and resets", () => {
  let t = 0;
  const rl = createRateLimiter({ windowMs: 1000, max: 2, now: () => t });
  const res = { headers: {}, set(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send() {} };
  let passed = 0;
  const next = () => passed++;
  for (let i = 0; i < 3; i++) rl({ ip: "1.1.1.1" }, res, next);
  assert.equal(passed, 2);
  assert.equal(res.code, 429);
  assert.equal(res.headers["Retry-After"], "1");
  t = 1000;
  rl({ ip: "1.1.1.1" }, res, next);
  assert.equal(passed, 3);
});
