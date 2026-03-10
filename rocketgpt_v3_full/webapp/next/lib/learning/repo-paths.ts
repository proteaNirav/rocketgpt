import * as fs from "fs";
import * as path from "path";

export function findRepoRoot(start = process.cwd()): string {
  let current = path.resolve(start);
  let nearestGitRoot: string | null = null;
  while (true) {
    if (fs.existsSync(path.join(current, "scripts", "quality", "libs-index.mjs"))) {
      return current;
    }
    if (fs.existsSync(path.join(current, ".git"))) {
      if (!nearestGitRoot) nearestGitRoot = current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return nearestGitRoot ?? path.resolve(start);
    }
    current = parent;
  }
}

export function toPosixRelative(fromRoot: string, abs: string): string {
  return path.relative(fromRoot, abs).replaceAll("\\", "/");
}
