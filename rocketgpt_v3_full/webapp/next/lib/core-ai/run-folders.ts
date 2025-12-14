import path from "path";
import fs from "fs/promises";

/**
 * Local-first run folders.
 * We keep them under repo root in a dedicated directory.
 * NOTE: In production you may remap this path to a mounted volume.
 */
export const RUN_ROOT_DIRNAME = "rocketgpt_runs";

export function getRepoRoot(): string {
  // In Next.js server routes, process.cwd() points to the Next app root.
  // Repo root is two levels up from rocketgpt_v3_full/webapp/next
  // However, we intentionally keep rocketgpt_runs inside the Next app root
  // to avoid path ambiguity during development.
  return process.cwd();
}

export function getRunRoot(runId: string): string {
  return path.join(getRepoRoot(), RUN_ROOT_DIRNAME, runId);
}

export function getRunLogsDir(runId: string): string {
  return path.join(getRunRoot(runId), "logs");
}

export function getRunRunsDir(runId: string): string {
  return path.join(getRunRoot(runId), "runs");
}

export function getRunExportsDir(runId: string): string {
  return path.join(getRunRoot(runId), "exports");
}

/** Ensure the run folder structure exists. */
export async function ensureRunDirs(runId: string): Promise<void> {
  await fs.mkdir(getRunLogsDir(runId), { recursive: true });
  await fs.mkdir(getRunRunsDir(runId), { recursive: true });
  await fs.mkdir(getRunExportsDir(runId), { recursive: true });
}
