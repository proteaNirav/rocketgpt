import * as fs from "fs";
import * as path from "path";

/**
 * Appends one JSON object per line to the runtime ledger.
 * NOTE: In production, this should be replaced with an append-only store (DB table, object store, or event stream).
 */
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
