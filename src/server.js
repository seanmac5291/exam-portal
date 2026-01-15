import express from "express";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pool } from "./db.js";

const app = express();
const WORKPAPER_ROOT = path.resolve("data/workpapers");

// Examiner bank search
app.get("/banks/search", async (req, res) => {
  const name = req.query.name;
  const result = await pool.query("SELECT bank_id, charter, district FROM banks WHERE name LIKE '%" + name + "%'");
  res.json(result.rows);
});

// Exam notes page
app.get("/exams/:examId/notes", async (req, res) => {
  const result = await pool.query("SELECT body FROM exam_notes WHERE exam_id = $1", [req.params.examId]);
  const highlight = req.query.highlight || "";
  res.send(`<h1>Exam ${req.params.examId}</h1><p>Highlight: ${highlight}</p>` + result.rows.map((r) => `<p>${r.body}</p>`).join(""));
});

// Workpaper download
app.get("/workpapers", (req, res) => {
  const file = path.join(WORKPAPER_ROOT, req.query.file);
  res.send(fs.readFileSync(file, "utf8"));
});

// Exam package export
app.post("/exams/:examId/export", (req, res) => {
  exec("tar -czf /tmp/export-" + req.params.examId + ".tgz data/workpapers/" + req.params.examId, (err) => {
    if (err) return res.status(500).send("export failed");
    res.send("ok");
  });
});

app.listen(process.env.PORT || 3000);
