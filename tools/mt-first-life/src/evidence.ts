import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ResultEvidenceAttachmentContract } from "../../../shared/event-model/types.js";
import { getRepoRoot, loadEvidenceState, saveEvidenceState } from "./state.js";
import type { PersistedEvidenceEntry, PersistedTaskRecord } from "./types.js";

export async function appendEvidence(task: PersistedTaskRecord): Promise<PersistedEvidenceEntry> {
  if (!task.assignment?.builderId || !task.result) {
    throw new Error("Cannot append evidence without assignment and result.");
  }

  const evidenceState = await loadEvidenceState();
  const artifactPath = task.result.evidence[0]?.payloadRef;
  const artifactHash = artifactPath
    ? createHash("sha256").update(await readFile(resolve(getRepoRoot(), artifactPath), "utf8")).digest("hex")
    : undefined;

  const attachment: ResultEvidenceAttachmentContract = {
    attachmentId: `${task.id}-attachment`,
    taskId: task.id,
    actorId: task.assignment.builderId,
    resultSummary: task.result.summary,
    evidence: task.result.evidence.map((item) => ({
      eventType: item.eventType,
      evidenceRef: item.payloadRef,
      payloadHash: artifactHash ?? item.payloadHash,
    })),
    lineage: {
      sourceTaskId: task.id,
      upstreamRef: task.assignment.assignmentId,
    },
    validation: {
      validationState: "satisfied",
      validatorRefs: ["mishti.first-life.local-verifier"],
    },
  };

  const entry: PersistedEvidenceEntry = {
    evidenceId: `${task.id}-evidence`,
    taskId: task.id,
    builderId: task.assignment.builderId,
    action: "generate-document",
    resultStatus: task.result.status,
    outputArtifactPath: artifactPath,
    timestamp: new Date().toISOString(),
    lineage: {
      sourceTaskId: task.id,
      upstreamRef: task.assignment.assignmentId,
    },
    governance: {
      decisionClass: task.governance.decisionClass,
      policyRefs: task.governance.policyRefs,
    },
    runtime: {
      surface: "sandbox_runner",
      conditionedTrust: "guarded",
    },
    attachment,
  };

  evidenceState.entries.push(entry);
  await saveEvidenceState(evidenceState);
  return entry;
}
