import express from "express";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pool } from "./db.js";
import { escapeHtml, resolveContained, validExamId, likePattern } from "./safe.js";

const app = express();
const WORKPAPER_ROOT = path.resolve("data/workpapers");

// Examiner bank search
app.get("/banks/search", async (req, res) => {
  const name = req.query.name;
  const result = await pool.query("SELECT bank_id, charter, district FROM banks WHERE name LIKE $1", [likePattern(name)]);
  res.json(result.rows);
});

// Exam notes page
app.get("/exams/:examId/notes", async (req, res) => {
  const result = await pool.query("SELECT body FROM exam_notes WHERE exam_id = $1", [req.params.examId]);
  const highlight = escapeHtml(req.query.highlight);
  res.send(`<h1>Exam ${escapeHtml(req.params.examId)}</h1><p>Highlight: ${highlight}</p>` + result.rows.map((r) => `<p>${escapeHtml(r.body)}</p>`).join(""));
});

// Workpaper download
app.get("/workpapers", (req, res) => {
  const file = resolveContained(WORKPAPER_ROOT, req.query.file);
  if (!file) return res.status(400).send("invalid file");
  res.send(fs.readFileSync(file, "utf8"));
});

// Exam package export
app.post("/exams/:examId/export", (req, res) => {
  const id = req.params.examId;
  if (!validExamId(id)) return res.status(400).send("invalid exam id");
  execFile("tar", ["-czf", `/tmp/export-${id}.tgz`, `data/workpapers/${id}`], (err) => {
    if (err) return res.status(500).send("export failed");
    res.send("ok");
  });
});

app.listen(process.env.PORT || 3000);
