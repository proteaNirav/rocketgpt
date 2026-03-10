#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DOCS_LIBRARIES_DIR = path.join(ROOT, "docs", "libraries");
const MASTER_INDEX_PATH = path.join(ROOT, "docs", "libraries.master_index.json");
const CHECK_MODE = process.argv.includes("--check");

const JSON_SPACES = 2;

function toPosixRelative(absPath) {
  return path.relative(ROOT, absPath).replaceAll("\\", "/");
}

function listSubdirs(absDir) {
  if (!fs.existsSync(absDir)) {
    return [];
  }
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function listFilesRecursive(absDir) {
  const out = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(absPath));
      continue;
    }
    if (entry.isFile()) {
      out.push(absPath);
    }
  }
  return out;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  }
  return [];
}

function parseSimpleFrontmatter(mdText) {
  if (!mdText.startsWith("---")) {
    return { tags: [], topics: [] };
  }
  const newlineIdx = mdText.indexOf("\n");
  if (newlineIdx === -1) {
    return { tags: [], topics: [] };
  }
  const endMarkerIdx = mdText.indexOf("\n---", newlineIdx + 1);
  if (endMarkerIdx === -1) {
    return { tags: [], topics: [] };
  }

  const frontmatter = mdText.slice(newlineIdx + 1, endMarkerIdx);
  const lines = frontmatter.split(/\r?\n/);
  const out = { tags: [], topics: [] };
  let currentKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("- ") && currentKey && (currentKey === "tags" || currentKey === "topics")) {
      out[currentKey].push(line.slice(2).trim());
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      currentKey = null;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();
    currentKey = key;

    if (key !== "tags" && key !== "topics") {
      continue;
    }

    if (!rawValue) {
      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      try {
        const parsed = JSON.parse(rawValue);
        out[key].push(...normalizeStringArray(parsed));
        continue;
      } catch {
        out[key].push(...normalizeStringArray(rawValue.slice(1, -1)));
        continue;
      }
    }

    out[key].push(...normalizeStringArray(rawValue));
  }

  return {
    tags: normalizeStringArray(out.tags),
    topics: normalizeStringArray(out.topics),
  };
}

function readSidecarMetadata(absFilePath) {
  const ext = path.extname(absFilePath);
  const baseNoExt = absFilePath.slice(0, absFilePath.length - ext.length);
  const candidates = [`${absFilePath}.meta.json`, `${baseNoExt}.meta.json`];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const raw = fs.readFileSync(candidate, "utf8");
      const parsed = JSON.parse(raw);
      return {
        tags: normalizeStringArray(parsed.tags),
        topics: normalizeStringArray(parsed.topics),
      };
    } catch {
      return { tags: [], topics: [] };
    }
  }
  return { tags: [], topics: [] };
}

function buildFileEntry(absPath) {
  const stat = fs.statSync(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const type = ext ? ext.slice(1) : "file";

  let tags = [];
  let topics = [];

  if (ext === ".md") {
    try {
      const mdText = fs.readFileSync(absPath, "utf8");
      const fm = parseSimpleFrontmatter(mdText);
      tags = fm.tags;
      topics = fm.topics;
    } catch {
      // Keep best-effort indexing on malformed or unreadable markdown.
    }
  }

  const sidecar = readSidecarMetadata(absPath);
  tags = normalizeStringArray([...tags, ...sidecar.tags]);
  topics = normalizeStringArray([...topics, ...sidecar.topics]);

  return {
    path: toPosixRelative(absPath),
    extension: ext,
    type,
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
    tags,
    topics,
  };
}

function stableJsonStringify(value) {
  return `${JSON.stringify(value, null, JSON_SPACES)}\n`;
}

function writeOrCheck(absPath, payload, label, failures) {
  const expected = stableJsonStringify(payload);
  if (!CHECK_MODE) {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, expected, "utf8");
    return;
  }

  if (!fs.existsSync(absPath)) {
    failures.push(`${label}: missing file (${toPosixRelative(absPath)})`);
    return;
  }

  const actual = fs.readFileSync(absPath, "utf8");
  if (actual !== expected) {
    failures.push(`${label}: out of date (${toPosixRelative(absPath)})`);
  }
}

function main() {
  if (!CHECK_MODE) {
    fs.mkdirSync(DOCS_LIBRARIES_DIR, { recursive: true });
  }

  const failures = [];
  const libraries = listSubdirs(DOCS_LIBRARIES_DIR);
  const masterLibraries = [];

  for (const library of libraries) {
    const libraryDir = path.join(DOCS_LIBRARIES_DIR, library);
    const files = listFilesRecursive(libraryDir)
      .filter((absPath) => {
        const base = path.basename(absPath);
        if (base === "index.json") return false;
        if (base === ".gitkeep") return false;
        return true;
      })
      .sort((a, b) => toPosixRelative(a).localeCompare(toPosixRelative(b)));

    const entries = files.map(buildFileEntry);
    const libraryIndex = {
      library,
      root: `docs/libraries/${library}`,
      fileCount: entries.length,
      files: entries,
    };

    const libraryIndexPath = path.join(libraryDir, "index.json");
    writeOrCheck(libraryIndexPath, libraryIndex, `library:${library}`, failures);

    masterLibraries.push({
      library,
      indexPath: `docs/libraries/${library}/index.json`,
      fileCount: entries.length,
    });
  }

  const masterIndex = {
    root: "docs/libraries",
    libraryCount: masterLibraries.length,
    libraries: masterLibraries,
  };

  writeOrCheck(MASTER_INDEX_PATH, masterIndex, "master-index", failures);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    console.error(`libs:check failed with ${failures.length} drift issue(s).`);
    process.exit(1);
  }

  if (CHECK_MODE) {
    console.log(`libs:check passed for ${masterLibraries.length} librar${masterLibraries.length === 1 ? "y" : "ies"}.`);
    return;
  }

  console.log(`libs:index generated ${masterLibraries.length} librar${masterLibraries.length === 1 ? "y" : "ies"}.`);
}

main();
