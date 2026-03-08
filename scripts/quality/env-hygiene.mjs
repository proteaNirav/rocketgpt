#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const FIX_MODE = process.argv.includes("--fix");
const KEY_RE = /^[A-Z0-9_]+$/;
const KNOWN_BAD_KEY_CHARS_RE = /[»\u00bb\uFEFF\u200B\u200C\u200D\u2060]/g;

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".vercel",
  ".mypy_cache",
  "__pycache__",
  "playwright-report",
  "test-results",
  ".aider.tags.cache.v4",
]);

function isEnvFilename(name) {
  return name === ".env" || name.startsWith(".env.");
}

function listEnvFiles(dir) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      if (SKIP_DIRS.has(item.name)) continue;
      out.push(...listEnvFiles(path.join(dir, item.name)));
      continue;
    }
    if (!item.isFile()) continue;
    if (isEnvFilename(item.name)) {
      out.push(path.join(dir, item.name));
    }
  }
  return out;
}

function stripBom(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { hadBom: true, text: bytes.slice(3).toString("utf8") };
  }
  return { hadBom: false, text: bytes.toString("utf8") };
}

function analyzeAndFixFile(absPath) {
  const rel = path.relative(ROOT, absPath).replaceAll("\\", "/");
  const raw = fs.readFileSync(absPath);
  const { hadBom, text } = stripBom(raw);
  const lines = text.split(/\r?\n/);
  const issues = [];
  let changed = hadBom;
  const fixedLines = [];

  if (hadBom) {
    issues.push({ line: 1, message: "UTF-8 BOM detected" });
  }

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i];

    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      fixedLines.push(line);
      continue;
    }

    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) {
      issues.push({ line: lineNo, message: "Line must be KEY=VALUE, comment, or blank" });
      fixedLines.push(line);
      continue;
    }

    const originalKey = line.slice(0, eqIdx);
    const value = line.slice(eqIdx + 1);
    const trimmedKey = originalKey.trim();
    const cleanedKey = trimmedKey.replace(KNOWN_BAD_KEY_CHARS_RE, "");

    if (cleanedKey !== trimmedKey) {
      issues.push({ line: lineNo, message: `Invalid stray characters in key '${trimmedKey}'` });
      changed = true;
    }

    if (!KEY_RE.test(cleanedKey)) {
      issues.push({ line: lineNo, message: `Invalid key '${cleanedKey}'. Allowed: [A-Z0-9_]` });
      fixedLines.push(`${cleanedKey}=${value}`);
      continue;
    }

    const normalized = `${cleanedKey}=${value}`;
    if (normalized !== line) {
      changed = true;
    }
    fixedLines.push(normalized);
  }

  if (FIX_MODE && changed) {
    const outText = `${fixedLines.join("\n")}${text.endsWith("\n") ? "\n" : ""}`;
    fs.writeFileSync(absPath, outText, { encoding: "utf8" });
  }

  return { rel, issues, changed };
}

const files = listEnvFiles(ROOT);
const allIssues = [];
let fixedCount = 0;

for (const file of files) {
  const result = analyzeAndFixFile(file);
  if (result.changed) fixedCount += 1;
  for (const issue of result.issues) {
    allIssues.push(`${result.rel}:${issue.line} ${issue.message}`);
  }
}

if (allIssues.length > 0) {
  for (const issue of allIssues) console.error(issue);
  if (!FIX_MODE) {
    console.error(`Found ${allIssues.length} env hygiene issue(s) across ${files.length} file(s).`);
    process.exit(1);
  }
}

if (FIX_MODE) {
  console.log(`env:fix completed. Scanned ${files.length} file(s), rewrote ${fixedCount} file(s).`);
  process.exit(0);
}

console.log(`env:check passed. Scanned ${files.length} file(s).`);
