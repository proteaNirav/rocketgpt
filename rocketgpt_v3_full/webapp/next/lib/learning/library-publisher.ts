import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

import { findRepoRoot, toPosixRelative } from "@/lib/learning/repo-paths";

function yyyyMm(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function markdownFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${String(item)}`);
      continue;
    }
    if (value === null || value === undefined) {
      lines.push(`${key}: null`);
      continue;
    }
    if (typeof value === "object") {
      lines.push(`${key}: '${JSON.stringify(value).replace(/'/g, "''")}'`);
      continue;
    }
    lines.push(`${key}: '${String(value).replace(/'/g, "''")}'`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function publishLearningMarkdown(input: {
  libraryId: string;
  topicKey: string;
  slug: string;
  itemId: string;
  title: string;
  sanitizedContent: string;
  contentSha256: string;
  status: "published";
  sourceKind: "rss" | "chat";
  sourceRef: string | null;
  provenance: Record<string, unknown>;
  topics: string[];
}): { absolutePath: string; relativePath: string } {
  const repoRoot = findRepoRoot();
  const month = yyyyMm();
  const dir = path.join(repoRoot, "docs", "libraries", input.libraryId, month);
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${input.topicKey}-${input.slug}-${input.itemId}.md`;
  const absPath = path.join(dir, fileName);

  const fm = markdownFrontmatter({
    title: input.title,
    item_id: input.itemId,
    source_kind: input.sourceKind,
    source_ref: input.sourceRef ?? "",
    status: input.status,
    content_sha256: input.contentSha256,
    topics: input.topics,
    provenance: input.provenance,
    published_at: new Date().toISOString(),
  });
  const body = [fm, "", `# ${input.title}`, "", input.sanitizedContent.trim(), ""].join("\n");
  fs.writeFileSync(absPath, body, "utf8");
  return { absolutePath: absPath, relativePath: toPosixRelative(repoRoot, absPath) };
}

export function refreshLibraryIndexes(): void {
  const repoRoot = findRepoRoot();
  const scriptPath = path.join(repoRoot, "scripts", "quality", "libs-index.mjs");
  if (!fs.existsSync(scriptPath)) return;
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "libs:index failed").trim());
  }
}
