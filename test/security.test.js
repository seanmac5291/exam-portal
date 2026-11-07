import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, resolveContained, isValidExamId, likePattern } from "../src/security.js";

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>&'`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;");
  assert.equal(escapeHtml(undefined), "");
});

test("resolveContained blocks traversal", () => {
  assert.ok(resolveContained("/data/wp", "a/b.txt").endsWith("/data/wp/a/b.txt"));
  assert.equal(resolveContained("/data/wp", "../etc/passwd"), null);
  assert.equal(resolveContained("/data/wp", "/etc/passwd"), null);
  assert.equal(resolveContained("/data/wp", "../wp-evil/x"), null);
  assert.equal(resolveContained("/data/wp", ["a"]), null);
  assert.equal(resolveContained("/data/wp", "a\0b"), null);
  assert.equal(resolveContained("/data/wp", ""), null);
});

test("isValidExamId rejects shell metacharacters", () => {
  assert.equal(isValidExamId("2024-NE_01"), true);
  assert.equal(isValidExamId("1; rm -rf /"), false);
  assert.equal(isValidExamId("../x"), false);
  assert.equal(isValidExamId(["a"]), false);
});

test("likePattern escapes wildcards", () => {
  assert.equal(likePattern("50%_a\\"), "%50\\%\\_a\\\\%");
});
