import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

async function safeReadJson(filePath: string): Promise<any | null> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function countLines(filePath: string): Promise<number> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    if (!text.trim()) return 0;
    return text.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

async function countSubdirs(root: string): Promise<number> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

export async function GET(_req: NextRequest) {
  await runtimeGuard(_req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  try {
    const baseDir = process.cwd();
    const dataRoot = path.join(baseDir, "data");

    const knowledgeIndexPath = path.join(
      dataRoot,
      "self_study",
      "knowledge_index.json"
    );
    const ideaPoolPath = path.join(
      dataRoot,
      "self_innovate",
      "idea_pool.jsonl"
    );
    const researchLogPath = path.join(
      dataRoot,
      "self_research",
      "research_log.jsonl"
    );
    const domainsRoot = path.join(dataRoot, "domains");

    const [knowledgeIndex, ideaCount, researchCount, domainCount] =
      await Promise.all([
        safeReadJson(knowledgeIndexPath),
        countLines(ideaPoolPath),
        countLines(researchLogPath),
        countSubdirs(domainsRoot)
      ]);

    return NextResponse.json({
      ok: true,
      knowledgeIndex,
      ideaCount,
      researchCount,
      domainCount
    });
  } catch (err) {
    console.error("Error in /api/demo/orchestrator/status:", err);
    return NextResponse.json(
      { error: "Internal error reading orchestrator status" },
      { status: 500 }
    );
  }
}
