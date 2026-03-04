import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

function repoRootFromNextCwd() {
  return path.resolve(process.cwd(), "../../..");
}

export function isSelfImproveEnabled() {
  const v = (process.env.SELF_IMPROVE_ENABLED || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function runSelfImproveCli(args: string[]) {
  const repoRoot = repoRootFromNextCwd();
  const cliPath = path.join(repoRoot, "tools", "self-improve", "index.mjs");
  const { stdout, stderr } = await execFileAsync("node", [cliPath, ...args], {
    cwd: repoRoot,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (stderr && stderr.trim()) {
    throw new Error(stderr.trim());
  }
  return stdout ? JSON.parse(stdout) : {};
}
