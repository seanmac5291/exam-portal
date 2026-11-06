import express from "express";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { escapeHtml, resolveInside, rateLimit } from "./security.js";

export function createApp({ pool, workpaperRoot = path.resolve("data/workpapers"), exportDir = "/tmp", limit = {} }) {
  const app = express();
  const limiter = rateLimit(limit);

  // Examiner bank search
  app.get("/banks/search", limiter, async (req, res) => {
    const name = typeof req.query.name === "string" ? req.query.name : "";
    const result = await pool.query("SELECT bank_id, charter, district FROM banks WHERE name LIKE $1", [`%${name}%`]);
    res.json(result.rows);
  });

  // Exam notes page
  app.get("/exams/:examId/notes", limiter, async (req, res) => {
    const result = await pool.query("SELECT body FROM exam_notes WHERE exam_id = $1", [req.params.examId]);
    const highlight = typeof req.query.highlight === "string" ? req.query.highlight : "";
    res.type("html").send(
      `<h1>Exam ${escapeHtml(req.params.examId)}</h1><p>Highlight: ${escapeHtml(highlight)}</p>` +
        result.rows.map((r) => `<p>${escapeHtml(r.body)}</p>`).join("")
    );
  });

  // Workpaper download
  app.get("/workpapers", limiter, (req, res) => {
    const file = resolveInside(workpaperRoot, req.query.file);
    if (!file) return res.status(400).send("invalid file");
    fs.readFile(file, "utf8", (err, data) => {
      if (err) return res.status(404).send("not found");
      res.type("text").send(data);
    });
  });

  // Exam package export
  app.post("/exams/:examId/export", limiter, (req, res) => {
    const examId = req.params.examId;
    if (!/^\d{1,12}$/.test(examId)) return res.status(400).send("invalid exam id");
    execFile("tar", ["-czf", path.join(exportDir, `export-${examId}.tgz`), path.join(workpaperRoot, examId)], (err) => {
      if (err) return res.status(500).send("export failed");
      res.send("ok");
    });
  });

  return app;
}
