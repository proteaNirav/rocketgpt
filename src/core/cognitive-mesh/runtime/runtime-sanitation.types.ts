export type RuntimeSanitationScope = "runtime-artifacts" | "temp-artifacts" | "all";

export type SanitationClassification =
  | "clean"
  | "stale"
  | "transient"
  | "malformed"
  | "contaminated"
  | "quarantined"
  | "archived"
  | "refreshed"
  | "skipped";

export type SanitationDecision = "retain" | "archive" | "quarantine" | "archive_and_refresh" | "skip_with_warning";

export type RuntimeSanitationArtifactKind = "runtime_file" | "temp_directory" | "support_file";

export interface RuntimeSanitationFinding {
  id: string;
  kind: RuntimeSanitationArtifactKind;
  scope: Exclude<RuntimeSanitationScope, "all">;
  path: string;
  exists: boolean;
  classification: SanitationClassification;
  indicators: {
    sizeBytes?: number;
    lineCount?: number;
    parseErrorCount?: number;
    benchmarkMarkerCount?: number;
    duplicateSequenceCount?: number;
    duplicateEventIdCount?: number;
    entryCount?: number;
    childCount?: number;
  };
  warnings: string[];
}

export interface RuntimeSanitationAction {
  findingId: string;
  path: string;
  scope: Exclude<RuntimeSanitationScope, "all">;
  decision: SanitationDecision;
  reason: string;
  refreshAfterMove: boolean;
}

export interface RuntimeSanitationExecutionRecord {
  findingId: string;
  decision: SanitationDecision;
  status: "planned" | "executed" | "skipped";
  sourcePath?: string;
  destinationPath?: string;
  notes?: string[];
}

export interface RuntimeSanitationOptions {
  dryRun?: boolean;
  scope?: RuntimeSanitationScope;
  quarantineInvalid?: boolean;
  archiveOnly?: boolean;
  now?: Date;
  runtimeArtifactPaths?: {
    executionLedgerPath?: string;
    runtimeTimelinePath?: string;
    killSwitchPath?: string;
  };
  tempArtifactPaths?: {
    tmpDirectoryPath?: string;
  };
  archiveRoots?: {
    runtimeArchiveDir?: string;
    tempArchiveDir?: string;
  };
  quarantineRoots?: {
    runtimeQuarantineDir?: string;
    tempQuarantineDir?: string;
  };
}

export interface RuntimeSanitationReport {
  timestamp: string;
  host: string;
  dryRun: boolean;
  scope: RuntimeSanitationScope;
  quarantineInvalid: boolean;
  archiveOnly: boolean;
  findings: RuntimeSanitationFinding[];
  actionsSelected: RuntimeSanitationAction[];
  actionsExecuted: RuntimeSanitationExecutionRecord[];
  affectedPaths: string[];
  warnings: string[];
  notes: string[];
  summary: {
    findingCount: number;
    actionCount: number;
    executedCount: number;
    skippedCount: number;
  };
}

export interface RuntimeSanitationPathConfig {
  executionLedgerPath: string;
  runtimeTimelinePath: string;
  killSwitchPath: string;
  tmpDirectoryPath: string;
  runtimeArchiveDir: string;
  tempArchiveDir: string;
  runtimeQuarantineDir: string;
  tempQuarantineDir: string;
}
