import { readFile } from "node:fs/promises";
import type { FirstLifeTaskDraft } from "./types.js";

function matchLine(source: string, label: string): string {
  const pattern = new RegExp(`^${label}\\s+\"([\\s\\S]*?)\"$`, "m");
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Missing ${label} declaration in MTL.`);
  }
  return match[1];
}

export async function parseMtlFile(filePath: string): Promise<FirstLifeTaskDraft> {
  const source = await readFile(filePath, "utf8");

  if (!/^TASK\s+generate-document$/m.test(source)) {
    throw new Error("First-life MTL only supports TASK generate-document.");
  }

  const title = matchLine(source, "TITLE");
  const outputPath = matchLine(source, "TARGET");
  const contentMatch = source.match(/CONTENT\s+"""([\s\S]*?)"""/m);
  if (!contentMatch) {
    throw new Error("Missing CONTENT block in MTL.");
  }

  return {
    title,
    type: "generate-document",
    requestedCapability: "document_generation",
    payload: {
      content: contentMatch[1].trim(),
      outputPath,
    },
  };
}
