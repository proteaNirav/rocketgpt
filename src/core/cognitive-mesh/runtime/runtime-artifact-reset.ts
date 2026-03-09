import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { hostname } from "node:os";

const DEFAULT_LEDGER_PATH = ".rocketgpt/cognitive-mesh/execution-ledger.jsonl";
const DEFAULT_TIMELINE_PATH = ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
const DEFAULT_KILL_SWITCH_PATH = ".rocketgpt/runtime/kill-switch.json";
const DEFAULT_ARCHIVE_DIR = ".rocketgpt/archive/runtime";

export interface RuntimeArtifactResetOptions {
  dryRun?: boolean;
  archiveOnly?: boolean;
  now?: Date;
  ledgerPath?: string;
  timelinePath?: string;
  killSwitchPath?: string;
  archiveDir?: string;
}

export interface RuntimeArtifactDescriptor {
  key: "execution-ledger" | "runtime-timeline" | "kill-switch";
  path: string;
  exists: boolean;
  sizeBytes: number | null;
}

export interface RuntimeArtifactAction {
  type:
    | "detected"
    | "archive_planned"
    | "archived"
    | "create_planned"
    | "created"
    | "skipped_create_archive_only"
    | "skipped_existing"
    | "skipped_missing";
  artifact: string;
  fromPath?: string;
  toPath?: string;
  note?: string;
}

export interface RuntimeArtifactResetResult {
  dryRun: boolean;
  archiveOnly: boolean;
  timestamp: string;
  runtimeHost: string;
  artifacts: RuntimeArtifactDescriptor[];
  actions: RuntimeArtifactAction[];
}

function formatTimestampForFileName(date: Date): string {
  const y = String(date.getUTCFullYear());
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

async function readArtifact(path: string): Promise<{ exists: boolean; sizeBytes: number | null }> {
  try {
    const info = await stat(path);
    return { exists: true, sizeBytes: info.size };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return { exists: false, sizeBytes: null };
    }
    throw error;
  }
}

async function pickArchivePath(basePath: string): Promise<string> {
  const extIndex = basePath.lastIndexOf(".");
  const stem = extIndex > 0 ? basePath.slice(0, extIndex) : basePath;
  const ext = extIndex > 0 ? basePath.slice(extIndex) : "";

  let candidate = basePath;
  let suffix = 1;
  while (true) {
    try {
      await stat(candidate);
      candidate = `${stem}-${suffix}${ext}`;
      suffix += 1;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") {
        return candidate;
      }
      throw error;
    }
  }
}

export async function resetRuntimeArtifacts(options: RuntimeArtifactResetOptions = {}): Promise<RuntimeArtifactResetResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun === true;
  const archiveOnly = options.archiveOnly === true;
  const ledgerPath = options.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const timelinePath = options.timelinePath ?? DEFAULT_TIMELINE_PATH;
  const killSwitchPath = options.killSwitchPath ?? DEFAULT_KILL_SWITCH_PATH;
  const archiveDir = options.archiveDir ?? DEFAULT_ARCHIVE_DIR;

  const actions: RuntimeArtifactAction[] = [];
  const timestampTag = formatTimestampForFileName(now);

  const [ledgerInfo, timelineInfo, killSwitchInfo] = await Promise.all([
    readArtifact(ledgerPath),
    readArtifact(timelinePath),
    readArtifact(killSwitchPath),
  ]);

  const artifacts: RuntimeArtifactDescriptor[] = [
    { key: "execution-ledger", path: ledgerPath, exists: ledgerInfo.exists, sizeBytes: ledgerInfo.sizeBytes },
    { key: "runtime-timeline", path: timelinePath, exists: timelineInfo.exists, sizeBytes: timelineInfo.sizeBytes },
    { key: "kill-switch", path: killSwitchPath, exists: killSwitchInfo.exists, sizeBytes: killSwitchInfo.sizeBytes },
  ];

  for (const artifact of artifacts) {
    actions.push({
      type: "detected",
      artifact: artifact.key,
      fromPath: artifact.path,
      note: artifact.exists ? `exists size=${artifact.sizeBytes ?? 0}` : "missing",
    });
  }

  const archiveTargets: Array<{ key: "execution-ledger" | "runtime-timeline"; source: string; archiveName: string }> = [
    {
      key: "execution-ledger",
      source: ledgerPath,
      archiveName: `execution-ledger-${timestampTag}.jsonl`,
    },
    {
      key: "runtime-timeline",
      source: timelinePath,
      archiveName: `runtime-timeline-${timestampTag}.jsonl`,
    },
  ];

  if (!dryRun) {
    await mkdir(archiveDir, { recursive: true });
  }

  for (const target of archiveTargets) {
    const sourceInfo = await readArtifact(target.source);
    if (!sourceInfo.exists) {
      actions.push({
        type: "skipped_missing",
        artifact: target.key,
        fromPath: target.source,
        note: "source file missing; nothing to archive",
      });
      continue;
    }

    let destination = join(archiveDir, target.archiveName);
    if (!dryRun) {
      destination = await pickArchivePath(destination);
    }

    actions.push({
      type: "archive_planned",
      artifact: target.key,
      fromPath: target.source,
      toPath: destination,
    });

    if (!dryRun) {
      await rename(target.source, destination);
      actions.push({
        type: "archived",
        artifact: target.key,
        fromPath: target.source,
        toPath: destination,
      });
    }
  }

  if (archiveOnly) {
    actions.push({
      type: "skipped_create_archive_only",
      artifact: "all",
      note: "archive-only mode: clean artifact recreation skipped",
    });
  } else {
    const recreateTargets = [
      { key: "execution-ledger", path: ledgerPath },
      { key: "runtime-timeline", path: timelinePath },
    ] as const;

    for (const target of recreateTargets) {
      const existsNow = await readArtifact(target.path);
      if (existsNow.exists) {
        actions.push({
          type: "skipped_existing",
          artifact: target.key,
          fromPath: target.path,
          note: "file already present; not recreating",
        });
        continue;
      }

      actions.push({
        type: "create_planned",
        artifact: target.key,
        fromPath: target.path,
      });

      if (!dryRun) {
        await mkdir(dirname(target.path), { recursive: true });
        await writeFile(target.path, "", "utf8");
        actions.push({
          type: "created",
          artifact: target.key,
          fromPath: target.path,
        });
      }
    }
  }

  return {
    dryRun,
    archiveOnly,
    timestamp: now.toISOString(),
    runtimeHost: hostname(),
    artifacts,
    actions,
  };
}
