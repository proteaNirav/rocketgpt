import * as fs from "fs";
import * as path from "path";

export function readJson(relPathFromRepoRoot: string): any {
  const repoRoot = process.cwd();
  const full = path.join(repoRoot, relPathFromRepoRoot);
  const raw = fs.readFileSync(full, "utf8");
  return JSON.parse(raw);
}

export function appendJsonl(relPathFromRepoRoot: string, obj: unknown): boolean {
  try {
    const repoRoot = process.cwd();
    const full = path.join(repoRoot, relPathFromRepoRoot);
    const line = JSON.stringify(obj) + "\n";
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.appendFileSync(full, line, { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}
