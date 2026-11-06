import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, resolveContained, validExamId, likePattern } from "../src/safe.js";

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml("<script>alert('x')</script>"), "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
});

test("resolveContained blocks traversal", () => {
  assert.equal(resolveContained("/data/wp", "../etc/passwd"), null);
  assert.equal(resolveContained("/data/wp", "/etc/passwd"), null);
  assert.equal(resolveContained("/data/wp", undefined), null);
  assert.equal(resolveContained("/data/wp", "a/b.txt"), "/data/wp/a/b.txt");
});

test("validExamId rejects shell metacharacters", () => {
  assert.equal(validExamId("NE-42"), true);
  assert.equal(validExamId("1; rm -rf /"), false);
  assert.equal(validExamId("../x"), false);
});

test("likePattern escapes wildcards", () => {
  assert.equal(likePattern("a%b_"), "%a\\%b\\_%");
});
