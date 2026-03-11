import {
  getExecutionLedger,
  type ExecutionLedger,
  type ExecutionLedgerEntry,
} from "../../core/cognitive-mesh/runtime/execution-ledger";

export type ConstitutionalLifecycleStage =
  | "proposal_submitted"
  | "proposal_approved"
  | "activation_completed"
  | "snapshot_created";

export interface ConstitutionalLifecycleEventInput {
  stage: ConstitutionalLifecycleStage;
  constitutionVersion: string;
  proposalId?: string;
  actorRole?: string;
  snapshotId?: string;
  sourceArtifactRef?: string;
  timestamp?: string;
}

function eventTypeFor(stage: ConstitutionalLifecycleStage) {
  switch (stage) {
    case "proposal_submitted":
      return "constitutional.proposal.submitted" as const;
    case "proposal_approved":
      return "constitutional.proposal.approved" as const;
    case "activation_completed":
      return "constitutional.activation.completed" as const;
    case "snapshot_created":
      return "constitutional.snapshot.created" as const;
  }
}

export class ConstitutionalLifecycleLedger {
  constructor(private readonly ledger: ExecutionLedger = getExecutionLedger()) {}

  emit(input: ConstitutionalLifecycleEventInput): ExecutionLedgerEntry {
    return this.ledger.append({
      category: "runtime",
      eventType: eventTypeFor(input.stage),
      action: `constitutional_${input.stage}`,
      source: "constitution_backend",
      target: "constitutional_governance",
      status: "completed",
      mode: "normal",
      timestamp: input.timestamp,
      metadata: {
        constitutionVersion: input.constitutionVersion,
        proposalId: input.proposalId,
        actorRole: input.actorRole,
        snapshotId: input.snapshotId,
        sourceArtifactRef: input.sourceArtifactRef,
        lifecycleStage: input.stage,
      },
    });
  }
}
