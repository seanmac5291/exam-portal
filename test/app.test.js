import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { escapeHtml, resolveInside, rateLimit } from "../src/security.js";

const hasExpress = await import("express").then(() => true, () => false);
const { createApp } = hasExpress ? await import("../src/app.js") : {};
const it = (name, fn) => test(name, { skip: !hasExpress && "express not installed" }, fn);

function setup(pool, limit) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wp-"));
  fs.mkdirSync(path.join(root, "42"));
  fs.writeFileSync(path.join(root, "42", "a.txt"), "hello");
  const server = createApp({ pool, workpaperRoot: root, exportDir: root, limit }).listen(0);
  return { root, server, url: `http://127.0.0.1:${server.address().port}` };
}

it("SQL injection payload is passed as a bound parameter", async () => {
  const calls = [];
  const { server, url } = setup({ query: async (sql, params) => (calls.push([sql, params]), { rows: [] }) });
  await fetch(`${url}/banks/search?name=${encodeURIComponent("' OR 1=1 --")}`);
  server.close();
  assert.ok(!calls[0][0].includes("OR 1=1"));
  assert.deepEqual(calls[0][1], ["%' OR 1=1 --%"]);
});

it("notes page escapes highlight and note bodies", async () => {
  const { server, url } = setup({ query: async () => ({ rows: [{ body: "<img onerror=x>" }] }) });
  const html = await (await fetch(`${url}/exams/1/notes?highlight=${encodeURIComponent("<script>alert(1)</script>")}`)).text();
  server.close();
  assert.ok(!html.includes("<script>") && !html.includes("<img"));
  assert.ok(html.includes("&lt;script&gt;"));
});

it("workpaper download blocks traversal", async () => {
  const { server, url } = setup({});
  const ok = await fetch(`${url}/workpapers?file=42/a.txt`);
  const bad = await fetch(`${url}/workpapers?file=${encodeURIComponent("../../etc/passwd")}`);
  server.close();
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "hello");
  assert.equal(bad.status, 400);
});

it("export rejects shell metacharacters and exports numeric ids", async () => {
  const { root, server, url } = setup({});
  const bad = await fetch(`${url}/exams/${encodeURIComponent("1;touch pwned")}/export`, { method: "POST" });
  const good = await fetch(`${url}/exams/42/export`, { method: "POST" });
  server.close();
  assert.equal(bad.status, 400);
  assert.equal(good.status, 200);
  assert.ok(fs.existsSync(path.join(root, "export-42.tgz")));
});

it("rate limiter returns 429 after max requests", async () => {
  const { server, url } = setup({ query: async () => ({ rows: [] }) }, { max: 2 });
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await fetch(`${url}/banks/search?name=a`)).status);
  server.close();
  assert.deepEqual(codes, [200, 200, 429]);
});

test("helpers", () => {
  assert.equal(escapeHtml(`<&"'>`), "&lt;&amp;&quot;&#39;&gt;");
  assert.equal(resolveInside("/r", "../x"), null);
  assert.equal(resolveInside("/r", "/etc/passwd"), null);
});

test("rateLimit blocks after max and sets Retry-After", () => {
  const mw = rateLimit({ max: 1, windowMs: 1000 });
  const res = { headers: {}, set(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send() {} };
  let passed = 0;
  for (let i = 0; i < 2; i++) mw({ ip: "1.1.1.1" }, res, () => passed++);
  assert.equal(passed, 1);
  assert.equal(res.code, 429);
  assert.ok(res.headers["Retry-After"]);
});
