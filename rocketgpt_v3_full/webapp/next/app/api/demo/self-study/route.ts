import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

async function countSubdirs(root: string): Promise<number> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

export async function POST(_req: NextRequest) {
  try {
    const baseDir = process.cwd();
    const dataRoot = path.join(baseDir, "data");
    const languageRoot = path.join(dataRoot, "language");
    const domainsRoot = path.join(dataRoot, "domains");
    const naturalRoot = path.join(languageRoot, "natural");
    const programmingRoot = path.join(languageRoot, "programming");

    const [naturalCount, programmingCount, domainCount] = await Promise.all([
      countSubdirs(naturalRoot),
      countSubdirs(programmingRoot),
      countSubdirs(domainsRoot)
    ]);

    const summary = {
      runAtUtc: new Date().toISOString(),
      naturalLanguagesTracked: naturalCount,
      programmingLanguagesTracked: programmingCount,
      domainsTracked: domainCount,
      notes:
        "This is a simple first self-study run that inspects the knowledge library layout. Future versions will analyse content and update this file with richer summaries."
    };

    const outDir = path.join(dataRoot, "self_study");
    await fs.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, "knowledge_index.json");
    await fs.writeFile(outFile, JSON.stringify(summary, null, 2), "utf8");

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("Error in /api/demo/self-study:", err);
    return NextResponse.json(
      { error: "Internal error in self-study run" },
      { status: 500 }
    );
  }
}
