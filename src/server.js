import express from "express";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pool } from "./db.js";
import { escapeHtml, likePattern, isValidExamId, resolveWithin, rateLimit } from "./security.js";

const app = express();
const WORKPAPER_ROOT = path.resolve("data/workpapers");
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
const exportLimiter = rateLimit({ windowMs: 60_000, max: 5 });

// Examiner bank search
app.get("/banks/search", limiter, async (req, res) => {
  const name = req.query.name;
  if (typeof name !== "string") return res.status(400).send("invalid name");
  const result = await pool.query(
    "SELECT bank_id, charter, district FROM banks WHERE name LIKE $1 ESCAPE '\\'",
    [likePattern(name)],
  );
  res.json(result.rows);
});

// Exam notes page
app.get("/exams/:examId/notes", limiter, async (req, res) => {
  const result = await pool.query("SELECT body FROM exam_notes WHERE exam_id = $1", [req.params.examId]);
  const highlight = req.query.highlight || "";
  res.send(
    `<h1>Exam ${escapeHtml(req.params.examId)}</h1><p>Highlight: ${escapeHtml(highlight)}</p>` +
      result.rows.map((r) => `<p>${escapeHtml(r.body)}</p>`).join(""),
  );
});

// Workpaper download
app.get("/workpapers", limiter, (req, res) => {
  const file = resolveWithin(WORKPAPER_ROOT, req.query.file);
  if (!file) return res.status(400).send("invalid file");
  res.type("text/plain").send(fs.readFileSync(file, "utf8"));
});

// Exam package export
app.post("/exams/:examId/export", exportLimiter, (req, res) => {
  const { examId } = req.params;
  if (!isValidExamId(examId)) return res.status(400).send("invalid exam id");
  execFile("tar", ["-czf", `/tmp/export-${examId}.tgz`, path.join("data/workpapers", examId)], (err) => {
    if (err) return res.status(500).send("export failed");
    res.send("ok");
  });
});

app.listen(process.env.PORT || 3000);
