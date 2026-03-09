import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { hostname } from "node:os";
import { RuntimeSanitationPolicyEngine } from "./runtime-sanitation-policy";
import type {
  RuntimeSanitationAction,
  RuntimeSanitationExecutionRecord,
  RuntimeSanitationFinding,
  RuntimeSanitationOptions,
  RuntimeSanitationPathConfig,
  RuntimeSanitationReport,
  RuntimeSanitationScope,
} from "./runtime-sanitation.types";

const DEFAULT_PATHS: RuntimeSanitationPathConfig = {
  executionLedgerPath: ".rocketgpt/cognitive-mesh/execution-ledger.jsonl",
  runtimeTimelinePath: ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl",
  killSwitchPath: ".rocketgpt/runtime/kill-switch.json",
  tmpDirectoryPath: ".tmp",
  runtimeArchiveDir: ".rocketgpt/archive/runtime",
  tempArchiveDir: ".rocketgpt/archive/temp",
  runtimeQuarantineDir: ".rocketgpt/quarantine/runtime",
  tempQuarantineDir: ".rocketgpt/quarantine/temp",
};

interface JsonlInspection {
  lineCount: number;
  entryCount: number;
  parseErrorCount: number;
  benchmarkMarkerCount: number;
  duplicateSequenceCount: number;
  duplicateEventIdCount: number;
}

function toScopeList(scope: RuntimeSanitationScope): Array<"runtime-artifacts" | "temp-artifacts"> {
  if (scope === "all") {
    return ["runtime-artifacts", "temp-artifacts"];
  }
  return [scope];
}

function formatTimestampForPath(date: Date): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

async function statSafe(path: string): Promise<{ exists: boolean; sizeBytes?: number; isDirectory?: boolean }> {
  try {
    const info = await stat(path);
    return { exists: true, sizeBytes: info.size, isDirectory: info.isDirectory() };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return { exists: false };
    }
    throw error;
  }
}

function hasBenchmarkMarker(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("bench") ||
      normalized.includes("benchmark") ||
      normalized.includes("mesh-tests") ||
      normalized.includes("unit.test") ||
      normalized.includes(".test")
    );
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasBenchmarkMarker(entry));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) => hasBenchmarkMarker(entry));
  }
  return false;
}

function countTimelineDuplicateSignals(records: Array<Record<string, unknown>>): { duplicateSequenceCount: number; duplicateEventIdCount: number } {
  let duplicateSequenceCount = 0;
  let duplicateEventIdCount = 0;
  const sequenceSeen = new Set<string>();
  const eventIdSeen = new Set<string>();

  for (const record of records) {
    const executionId = typeof record.executionId === "string" ? record.executionId : "";
    const sequenceNoRaw = record.sequenceNo;
    const sequenceNo = typeof sequenceNoRaw === "number" ? sequenceNoRaw : Number.NaN;
    if (executionId && Number.isFinite(sequenceNo)) {
      const key = `${executionId}:${sequenceNo}`;
      if (sequenceSeen.has(key)) {
        duplicateSequenceCount += 1;
      } else {
        sequenceSeen.add(key);
      }
    }

    const eventId = typeof record.eventId === "string" ? record.eventId : "";
    if (eventId) {
      if (eventIdSeen.has(eventId)) {
        duplicateEventIdCount += 1;
      } else {
        eventIdSeen.add(eventId);
      }
    }
  }

  return { duplicateSequenceCount, duplicateEventIdCount };
}

async function inspectJsonl(path: string, timelineLike: boolean): Promise<JsonlInspection> {
  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const parsed: Array<Record<string, unknown>> = [];
  let parseErrorCount = 0;
  let benchmarkMarkerCount = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as unknown;
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        parseErrorCount += 1;
        continue;
      }
      const record = obj as Record<string, unknown>;
      if (hasBenchmarkMarker(record)) {
        benchmarkMarkerCount += 1;
      }
      parsed.push(record);
    } catch {
      parseErrorCount += 1;
    }
  }

  const duplicates = timelineLike ? countTimelineDuplicateSignals(parsed) : { duplicateSequenceCount: 0, duplicateEventIdCount: 0 };

  return {
    lineCount: lines.length,
    entryCount: parsed.length,
    parseErrorCount,
    benchmarkMarkerCount,
    duplicateSequenceCount: duplicates.duplicateSequenceCount,
    duplicateEventIdCount: duplicates.duplicateEventIdCount,
  };
}

export class RuntimeWasteScanner {
  async scan(pathConfig: RuntimeSanitationPathConfig, scope: RuntimeSanitationScope): Promise<RuntimeSanitationFinding[]> {
    const findings: RuntimeSanitationFinding[] = [];
    const scopes = toScopeList(scope);

    if (scopes.includes("runtime-artifacts")) {
      findings.push(await this.scanRuntimeFile("execution-ledger", pathConfig.executionLedgerPath, false));
      findings.push(await this.scanRuntimeFile("runtime-timeline", pathConfig.runtimeTimelinePath, true));
      findings.push(await this.scanKillSwitch(pathConfig.killSwitchPath));
    }

    if (scopes.includes("temp-artifacts")) {
      findings.push(await this.scanTmpDirectory(pathConfig.tmpDirectoryPath));
    }

    return findings;
  }

  private async scanRuntimeFile(
    id: "execution-ledger" | "runtime-timeline",
    path: string,
    timelineLike: boolean
  ): Promise<RuntimeSanitationFinding> {
    const info = await statSafe(path);
    if (!info.exists) {
      return {
        id,
        kind: "runtime_file",
        scope: "runtime-artifacts",
        path,
        exists: false,
        classification: "stale",
        indicators: {},
        warnings: ["runtime artifact missing"],
      };
    }

    const inspection = await inspectJsonl(path, timelineLike);
    const warnings: string[] = [];
    let classification: RuntimeSanitationFinding["classification"] = "clean";

    if (inspection.parseErrorCount > 0) {
      classification = "malformed";
      warnings.push("jsonl parse errors detected");
    } else if (
      inspection.benchmarkMarkerCount > 0 ||
      inspection.duplicateSequenceCount > 0 ||
      inspection.duplicateEventIdCount > 0
    ) {
      classification = "contaminated";
      if (inspection.benchmarkMarkerCount > 0) {
        warnings.push("benchmark/test signatures detected");
      }
      if (inspection.duplicateSequenceCount > 0 || inspection.duplicateEventIdCount > 0) {
        warnings.push("duplicate canonical continuity markers detected");
      }
    }

    return {
      id,
      kind: "runtime_file",
      scope: "runtime-artifacts",
      path,
      exists: true,
      classification,
      indicators: {
        sizeBytes: info.sizeBytes,
        lineCount: inspection.lineCount,
        entryCount: inspection.entryCount,
        parseErrorCount: inspection.parseErrorCount,
        benchmarkMarkerCount: inspection.benchmarkMarkerCount,
        duplicateSequenceCount: inspection.duplicateSequenceCount,
        duplicateEventIdCount: inspection.duplicateEventIdCount,
      },
      warnings,
    };
  }

  private async scanKillSwitch(path: string): Promise<RuntimeSanitationFinding> {
    const info = await statSafe(path);
    if (!info.exists) {
      return {
        id: "kill-switch",
        kind: "support_file",
        scope: "runtime-artifacts",
        path,
        exists: false,
        classification: "stale",
        indicators: {},
        warnings: ["kill-switch file missing (informational)"],
      };
    }

    try {
      const text = await readFile(path, "utf8");
      JSON.parse(text);
      return {
        id: "kill-switch",
        kind: "support_file",
        scope: "runtime-artifacts",
        path,
        exists: true,
        classification: "clean",
        indicators: { sizeBytes: info.sizeBytes },
        warnings: [],
      };
    } catch {
      return {
        id: "kill-switch",
        kind: "support_file",
        scope: "runtime-artifacts",
        path,
        exists: true,
        classification: "malformed",
        indicators: { sizeBytes: info.sizeBytes },
        warnings: ["kill-switch json is malformed"],
      };
    }
  }

  private async scanTmpDirectory(path: string): Promise<RuntimeSanitationFinding> {
    const info = await statSafe(path);
    if (!info.exists) {
      return {
        id: "tmp-root",
        kind: "temp_directory",
        scope: "temp-artifacts",
        path,
        exists: false,
        classification: "stale",
        indicators: {},
        warnings: [],
      };
    }

    if (!info.isDirectory) {
      return {
        id: "tmp-root",
        kind: "temp_directory",
        scope: "temp-artifacts",
        path,
        exists: true,
        classification: "malformed",
        indicators: { sizeBytes: info.sizeBytes },
        warnings: ["temporary artifact root is not a directory"],
      };
    }

    const children = await readdir(path, { withFileTypes: true });
    const childCount = children.length;

    return {
      id: "tmp-root",
      kind: "temp_directory",
      scope: "temp-artifacts",
      path,
      exists: true,
      classification: childCount > 0 ? "transient" : "clean",
      indicators: { childCount, sizeBytes: info.sizeBytes },
      warnings: childCount > 0 ? ["temporary runtime/test artifacts detected"] : [],
    };
  }
}

class SanitationExecutor {
  async execute(
    actions: RuntimeSanitationAction[],
    findingsById: Map<string, RuntimeSanitationFinding>,
    config: RuntimeSanitationPathConfig,
    now: Date,
    dryRun: boolean
  ): Promise<RuntimeSanitationExecutionRecord[]> {
    const records: RuntimeSanitationExecutionRecord[] = [];
    const timestamp = formatTimestampForPath(now);

    for (const action of actions) {
      const finding = findingsById.get(action.findingId);
      if (!finding) {
        records.push({
          findingId: action.findingId,
          decision: action.decision,
          status: "skipped",
          notes: ["missing_finding_for_action"],
        });
        continue;
      }

      if (action.decision === "retain") {
        records.push({
          findingId: finding.id,
          decision: action.decision,
          status: "skipped",
          sourcePath: finding.path,
          notes: ["retained_by_policy"],
        });
        continue;
      }

      if (action.decision === "skip_with_warning") {
        records.push({
          findingId: finding.id,
          decision: action.decision,
          status: "skipped",
          sourcePath: finding.path,
          notes: [action.reason],
        });
        continue;
      }

      const moveTargetDir = this.selectTargetDir(action.decision, finding.scope, config);
      const movedName = this.buildMovedName(finding, timestamp);
      const initialDestination = join(moveTargetDir, movedName);

      if (dryRun) {
        records.push({
          findingId: finding.id,
          decision: action.decision,
          status: "planned",
          sourcePath: finding.path,
          destinationPath: initialDestination,
          notes: action.refreshAfterMove ? ["refresh_planned"] : undefined,
        });
        continue;
      }

      const sourceInfo = await statSafe(finding.path);
      if (!sourceInfo.exists) {
        records.push({
          findingId: finding.id,
          decision: action.decision,
          status: "skipped",
          sourcePath: finding.path,
          notes: ["source_missing_during_execution"],
        });
        continue;
      }

      await mkdir(moveTargetDir, { recursive: true });
      const destination = await this.findUniquePath(initialDestination);
      await rename(finding.path, destination);

      if (action.refreshAfterMove) {
        if (finding.kind === "runtime_file") {
          await mkdir(dirname(finding.path), { recursive: true });
          await writeFile(finding.path, "", "utf8");
        } else if (finding.kind === "temp_directory") {
          await mkdir(finding.path, { recursive: true });
        }
      }

      records.push({
        findingId: finding.id,
        decision: action.decision,
        status: "executed",
        sourcePath: finding.path,
        destinationPath: destination,
        notes: action.refreshAfterMove ? ["refresh_executed"] : undefined,
      });
    }

    return records;
  }

  private selectTargetDir(decision: RuntimeSanitationAction["decision"], scope: RuntimeSanitationAction["scope"], config: RuntimeSanitationPathConfig): string {
    if (decision === "quarantine") {
      return scope === "runtime-artifacts" ? config.runtimeQuarantineDir : config.tempQuarantineDir;
    }
    return scope === "runtime-artifacts" ? config.runtimeArchiveDir : config.tempArchiveDir;
  }

  private buildMovedName(finding: RuntimeSanitationFinding, timestamp: string): string {
    if (finding.kind === "temp_directory") {
      return `${basename(finding.path)}-${timestamp}`;
    }
    const fileName = basename(finding.path);
    const extension = extname(fileName);
    const stem = extension.length > 0 ? fileName.slice(0, -extension.length) : fileName;
    return `${stem}-${timestamp}${extension}`;
  }

  private async findUniquePath(basePath: string): Promise<string> {
    let candidate = basePath;
    let suffix = 1;
    while (true) {
      const info = await statSafe(candidate);
      if (!info.exists) {
        return candidate;
      }
      const extension = extname(basePath);
      const stem = extension.length > 0 ? basePath.slice(0, -extension.length) : basePath;
      candidate = `${stem}-${suffix}${extension}`;
      suffix += 1;
    }
  }
}

function resolvePathConfig(options: RuntimeSanitationOptions): RuntimeSanitationPathConfig {
  return {
    executionLedgerPath: options.runtimeArtifactPaths?.executionLedgerPath ?? DEFAULT_PATHS.executionLedgerPath,
    runtimeTimelinePath: options.runtimeArtifactPaths?.runtimeTimelinePath ?? DEFAULT_PATHS.runtimeTimelinePath,
    killSwitchPath: options.runtimeArtifactPaths?.killSwitchPath ?? DEFAULT_PATHS.killSwitchPath,
    tmpDirectoryPath: options.tempArtifactPaths?.tmpDirectoryPath ?? DEFAULT_PATHS.tmpDirectoryPath,
    runtimeArchiveDir: options.archiveRoots?.runtimeArchiveDir ?? DEFAULT_PATHS.runtimeArchiveDir,
    tempArchiveDir: options.archiveRoots?.tempArchiveDir ?? DEFAULT_PATHS.tempArchiveDir,
    runtimeQuarantineDir: options.quarantineRoots?.runtimeQuarantineDir ?? DEFAULT_PATHS.runtimeQuarantineDir,
    tempQuarantineDir: options.quarantineRoots?.tempQuarantineDir ?? DEFAULT_PATHS.tempQuarantineDir,
  };
}

export async function runRuntimeSanitation(options: RuntimeSanitationOptions = {}): Promise<RuntimeSanitationReport> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun === true;
  const scope = options.scope ?? "all";
  const quarantineInvalid = options.quarantineInvalid === true;
  const archiveOnly = options.archiveOnly === true;

  const pathConfig = resolvePathConfig(options);
  const scanner = new RuntimeWasteScanner();
  const policyEngine = new RuntimeSanitationPolicyEngine();
  const executor = new SanitationExecutor();

  const findings = await scanner.scan(pathConfig, scope);
  const findingsById = new Map(findings.map((finding) => [finding.id, finding] as const));
  const actionsSelected = policyEngine.classifyActions({
    findings,
    quarantineInvalid,
    archiveOnly,
  });

  const actionsExecuted = await executor.execute(actionsSelected, findingsById, pathConfig, now, dryRun);
  const affectedPaths = [...new Set(actionsExecuted.flatMap((record) => [record.sourcePath, record.destinationPath]).filter((path): path is string => Boolean(path)))];

  const warnings = findings.flatMap((finding) => finding.warnings);
  const notes: string[] = [];
  if (dryRun) {
    notes.push("dry-run mode: no filesystem mutations were performed");
  }
  if (archiveOnly) {
    notes.push("archive-only mode: refreshed active runtime surfaces were not recreated");
  }

  const executedCount = actionsExecuted.filter((record) => record.status === "executed").length;
  const skippedCount = actionsExecuted.filter((record) => record.status === "skipped").length;

  return {
    timestamp: now.toISOString(),
    host: hostname(),
    dryRun,
    scope,
    quarantineInvalid,
    archiveOnly,
    findings,
    actionsSelected,
    actionsExecuted,
    affectedPaths,
    warnings,
    notes,
    summary: {
      findingCount: findings.length,
      actionCount: actionsSelected.length,
      executedCount,
      skippedCount,
    },
  };
}
