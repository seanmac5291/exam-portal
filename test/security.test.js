import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, likeContains, isValidExamId, resolveContained, createRateLimiter } from "../src/security.js";

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml(`<script>"x"&'</script>`), "&lt;script&gt;&quot;x&quot;&amp;&#39;&lt;/script&gt;");
});

test("likeContains escapes wildcards", () => {
  assert.equal(likeContains("a%b_c\\"), "%a\\%b\\_c\\\\%");
});

test("isValidExamId", () => {
  assert.ok(isValidExamId("EX-2024_01"));
  for (const bad of ["1; rm -rf /", "../x", "", "a b", undefined, ["a"], "x".repeat(65)]) assert.ok(!isValidExamId(bad));
});

test("resolveContained blocks traversal", () => {
  assert.equal(resolveContained("/data/wp", "a/b.txt"), "/data/wp/a/b.txt");
  for (const bad of ["../etc/passwd", "/etc/passwd", "a/../../x", "", "a\0b", undefined, ["a"], "."]) {
    assert.equal(resolveContained("/data/wp", bad), null);
  }
});

test("rate limiter returns 429 after max and resets", () => {
  let t = 0;
  const rl = createRateLimiter({ windowMs: 1000, max: 2, now: () => t });
  const mk = () => {
    const res = { code: 200, headers: {}, set(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send() { return this; } };
    let nexted = false;
    rl({ ip: "1.1.1.1" }, res, () => { nexted = true; });
    return { res, nexted };
  };
  assert.ok(mk().nexted);
  assert.ok(mk().nexted);
  const blocked = mk();
  assert.equal(blocked.res.code, 429);
  assert.ok(!blocked.nexted);
  t = 1000;
  assert.ok(mk().nexted);
});
