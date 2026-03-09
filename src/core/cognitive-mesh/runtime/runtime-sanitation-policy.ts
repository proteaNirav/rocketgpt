import type { RuntimeSanitationAction, RuntimeSanitationFinding } from "./runtime-sanitation.types";

export interface HygienePolicyInput {
  findings: RuntimeSanitationFinding[];
  quarantineInvalid: boolean;
  archiveOnly: boolean;
}

export class RuntimeSanitationPolicyEngine {
  classifyActions(input: HygienePolicyInput): RuntimeSanitationAction[] {
    const actions: RuntimeSanitationAction[] = [];

    for (const finding of input.findings) {
      if (!finding.exists) {
        actions.push({
          findingId: finding.id,
          path: finding.path,
          scope: finding.scope,
          decision: "retain",
          reason: "artifact_missing_or_not_applicable",
          refreshAfterMove: false,
        });
        continue;
      }

      if (finding.classification === "clean" || finding.classification === "stale") {
        actions.push({
          findingId: finding.id,
          path: finding.path,
          scope: finding.scope,
          decision: "retain",
          reason: "artifact_is_clean_or_stale_without_risk",
          refreshAfterMove: false,
        });
        continue;
      }

      if (finding.classification === "malformed") {
        if (input.quarantineInvalid) {
          actions.push({
            findingId: finding.id,
            path: finding.path,
            scope: finding.scope,
            decision: "quarantine",
            reason: "malformed_artifact_requires_quarantine",
            refreshAfterMove: finding.kind === "runtime_file" && !input.archiveOnly,
          });
          continue;
        }

        actions.push({
          findingId: finding.id,
          path: finding.path,
          scope: finding.scope,
          decision: input.archiveOnly ? "archive" : "archive_and_refresh",
          reason: "malformed_artifact_archived_for_safety",
          refreshAfterMove: !input.archiveOnly && finding.kind === "runtime_file",
        });
        continue;
      }

      if (finding.classification === "contaminated" || finding.classification === "transient") {
        const archiveAndRefresh = !input.archiveOnly && (finding.kind === "runtime_file" || finding.kind === "temp_directory");
        actions.push({
          findingId: finding.id,
          path: finding.path,
          scope: finding.scope,
          decision: archiveAndRefresh ? "archive_and_refresh" : "archive",
          reason: "contaminated_or_transient_artifact_sanitized",
          refreshAfterMove: archiveAndRefresh,
        });
        continue;
      }

      actions.push({
        findingId: finding.id,
        path: finding.path,
        scope: finding.scope,
        decision: "skip_with_warning",
        reason: "unsupported_classification_for_phase1",
        refreshAfterMove: false,
      });
    }

    return actions;
  }
}
