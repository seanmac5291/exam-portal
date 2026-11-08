import express from "express";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pool } from "./db.js";
import { escapeHtml, likePattern, resolveContained, isValidExamId, createRateLimiter } from "./security.js";

const app = express();
const WORKPAPER_ROOT = path.resolve("data/workpapers");
const rateLimit = createRateLimiter({ windowMs: 60_000, max: 60 });

// Examiner bank search
app.get("/banks/search", rateLimit, async (req, res) => {
  const name = typeof req.query.name === "string" ? req.query.name : "";
  const result = await pool.query(
    "SELECT bank_id, charter, district FROM banks WHERE name LIKE $1 ESCAPE '\\'",
    [likePattern(name)]
  );
  res.json(result.rows);
});

// Exam notes page
app.get("/exams/:examId/notes", rateLimit, async (req, res) => {
  const result = await pool.query("SELECT body FROM exam_notes WHERE exam_id = $1", [req.params.examId]);
  const highlight = typeof req.query.highlight === "string" ? req.query.highlight : "";
  res.send(
    `<h1>Exam ${escapeHtml(req.params.examId)}</h1><p>Highlight: ${escapeHtml(highlight)}</p>` +
      result.rows.map((r) => `<p>${escapeHtml(r.body)}</p>`).join("")
  );
});

// Workpaper download
app.get("/workpapers", rateLimit, (req, res) => {
  const file = resolveContained(WORKPAPER_ROOT, req.query.file);
  if (!file) return res.status(400).send("invalid file");
  fs.readFile(file, "utf8", (err, data) => {
    if (err) return res.status(404).send("not found");
    res.type("text/plain").send(data);
  });
});

// Exam package export
app.post("/exams/:examId/export", rateLimit, (req, res) => {
  const examId = req.params.examId;
  if (!isValidExamId(examId)) return res.status(400).send("invalid exam id");
  execFile("tar", ["-czf", `/tmp/export-${examId}.tgz`, path.join("data/workpapers", examId)], (err) => {
    if (err) return res.status(500).send("export failed");
    res.send("ok");
  });
});

app.listen(process.env.PORT || 3000);
