import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, likePattern, isValidExamId, resolveWithin, rateLimit } from "../src/security.js";

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml(`<script>"a"&'b'</script>`), "&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;");
});

test("likePattern escapes wildcards", () => {
  assert.equal(likePattern("a%b_c\\"), "%a\\%b\\_c\\\\%");
});

test("isValidExamId rejects shell/path metacharacters", () => {
  assert.equal(isValidExamId("EX-2024_01"), true);
  for (const bad of ["1; rm -rf /", "../x", "a b", "", undefined, ["a"]]) assert.equal(isValidExamId(bad), false);
});

test("resolveWithin contains paths", () => {
  assert.equal(resolveWithin("/data/wp", "a/b.txt"), "/data/wp/a/b.txt");
  for (const bad of ["../secret", "/etc/passwd", "a/../../x", "", "a\0b", undefined, ["a"]]) {
    assert.equal(resolveWithin("/data/wp", bad), null);
  }
});

test("rateLimit returns 429 after max and resets", () => {
  let t = 0;
  const mw = rateLimit({ windowMs: 1000, max: 2, now: () => t });
  const res = { headers: {}, set(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send() { return this; } };
  let passed = 0;
  const req = { ip: "1.1.1.1" };
  for (let i = 0; i < 3; i++) mw(req, res, () => passed++);
  assert.equal(passed, 2);
  assert.equal(res.code, 429);
  t = 1000;
  mw(req, res, () => passed++);
  assert.equal(passed, 3);
});
