# FFOA exam-portal: Copilot instructions

- Fictional Federal Financial Oversight Agency examiner portal. Intentionally vulnerable demo code.
- Commit and push with git. Code scanning alerts, issues, and pull requests go through the `github` MCP server. The gh CLI is not available.
- Change management, POA&M, and policy live in FFOA systems via the `ffoa-systems` MCP server. Security fixes use change type `application_security`.
- Fix vulnerabilities with the platform's safe APIs (parameterized queries, output encoding, path containment, execFile with argument arrays). Add tests where practical. Don't add dependencies.
- Never dismiss alerts, approve change requests, or merge to main.
