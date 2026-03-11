import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { loadConstitutionArtifact } from "../../../src/constitution/core/constitutional-artifact-loader";
import { ConstitutionalValidationEngine } from "../../../src/constitution/validation/constitutional-validation-engine";
import { ConstitutionRegistry } from "../../../src/constitution/registry/constitution-registry";
import { ConstitutionalProposalService } from "../../../src/constitution/proposals/constitutional-proposal-service";
import { ConstitutionalActivationService } from "../../../src/constitution/activation/constitutional-activation-service";
import { ConstitutionalSnapshotService } from "../../../src/constitution/snapshots/constitutional-snapshot-service";
import { ConstitutionalLifecycleLedger } from "../../../src/constitution/core/constitutional-lifecycle-ledger";
import { ConstitutionalRuntimeBridge } from "../../../src/constitution/core/constitutional-runtime-bridge";
import { ExecutionLedger } from "../../../src/core/cognitive-mesh/runtime/execution-ledger";

test("valid constitution YAML passes schema validation", async () => {
  const loaded = await loadConstitutionArtifact();
  const validation = new ConstitutionalValidationEngine().validateArtifact(
    loaded.artifact,
    loaded.schema,
    loaded.artifactPath
  );

  assert.equal(validation.valid, true);
  assert.equal(loaded.artifact.constitution_id, "mishti-ai-constitution-v1");
});

test("invalid constitution YAML fails with diagnostics", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "mishti-constitution-"));
  const invalidArtifactPath = join(tempDir, "constitution.invalid.yaml");
  await writeFile(
    invalidArtifactPath,
    [
      "version: 1",
      "constitution_id: invalid-constitution",
      "status: draft_scaffold",
      "core_principles:",
      "  - principle_id: broken",
      "    title: Broken",
      "    lock_level: protected",
      "    mutable: true",
      "    statement: Missing other required top-level sections.",
    ].join("\n"),
    "utf8"
  );

  const loaded = await loadConstitutionArtifact(
    invalidArtifactPath,
    "config/constitution/constitutional-policy-schema.json"
  );
  const validation = new ConstitutionalValidationEngine().validateArtifact(loaded.artifact, loaded.schema);

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((item) => item.includes("missing_required")), true);
});

test("constitution registry tracks active and trusted versions", () => {
  const registry = new ConstitutionRegistry();
  registry.registerVersion({
    versionId: "mishti-ai-constitution-v1",
    semanticVersion: "v1",
    status: "approved",
    trustedBaseline: true,
    sourceArtifactRef: "config/constitution/constitution.v1.yaml",
  });
  registry.registerVersion({
    versionId: "mishti-ai-constitution-v2",
    semanticVersion: "v2",
    status: "approved",
    trustedBaseline: false,
    sourceArtifactRef: "config/constitution/constitution.v2.yaml",
  });
  registry.markActiveVersion("mishti-ai-constitution-v2");

  assert.equal(registry.getActiveVersion()?.versionId, "mishti-ai-constitution-v2");
  assert.equal(registry.getTrustedVersion()?.versionId, "mishti-ai-constitution-v1");
});

test("constitutional lifecycle events are emitted in ledger-compatible shape", () => {
  const executionLedger = new ExecutionLedger("", "");
  const lifecycleLedger = new ConstitutionalLifecycleLedger(executionLedger);
  const proposalService = new ConstitutionalProposalService(lifecycleLedger);
  const activationService = new ConstitutionalActivationService(lifecycleLedger);
  const snapshotService = new ConstitutionalSnapshotService(lifecycleLedger);

  const proposal = proposalService.createDraft({
    title: "Test constitutional proposal",
    summary: "Narrow lifecycle emission test.",
    targetLayer: "legislative_policy",
    evidenceRefs: ["evidence:test"],
  });
  const submitted = proposalService.submitProposal(proposal, "proposer");
  const approved = proposalService.approveProposal(submitted, "mishti-ai-constitution-v1", "approver");
  const activation = activationService.activate(approved);
  const snapshot = snapshotService.createSnapshot({
    snapshotId: "snapshot-001",
    constitutionVersionId: activation.activatedVersionId,
    trusted: true,
    contents: ["config/constitution/constitution.v1.yaml"],
  });

  const entries = executionLedger.snapshot();
  assert.equal(entries.length, 4);
  assert.deepEqual(
    entries.map((entry) => entry.eventType),
    [
      "constitutional.proposal.submitted",
      "constitutional.proposal.approved",
      "constitutional.activation.completed",
      "constitutional.snapshot.created",
    ]
  );
  assert.equal(entries[0]?.metadata?.lifecycleStage, "proposal_submitted");
  assert.equal(entries[3]?.metadata?.snapshotId, snapshot.snapshotId);
});

test("runtime bridge bootstrap path loads validates registers and emits deterministically", async () => {
  const executionLedger = new ExecutionLedger("", "");
  const registry = new ConstitutionRegistry();
  const bridge = new ConstitutionalRuntimeBridge(
    new ConstitutionalValidationEngine(),
    registry,
    new ConstitutionalLifecycleLedger(executionLedger)
  );

  const result = await bridge.initializeConstitution({
    mode: "bootstrap",
    emitLifecycleEvent: true,
    actorRole: "emergency_controller",
  });

  assert.equal(result.success, true);
  assert.equal(result.mode, "bootstrap");
  assert.equal(result.validationSummary.valid, true);
  assert.equal(result.constitutionVersion.versionId, "mishti-ai-constitution-v1");
  assert.equal(result.activeVersion?.versionId, "mishti-ai-constitution-v1");
  assert.equal(result.trustedVersion?.versionId, "mishti-ai-constitution-v1");
  assert.equal(result.lifecycleEventEmitted, true);
  assert.equal(result.lifecycleEventStage, "activation_completed");
  assert.deepEqual(result.diagnostics, [
    "version_registered:mishti-ai-constitution-v1",
    "trusted_version_set:mishti-ai-constitution-v1",
    "active_version_set:mishti-ai-constitution-v1",
    "lifecycle_event_emitted:activation_completed",
  ]);

  const entries = executionLedger.snapshot();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.eventType, "constitutional.activation.completed");
  assert.equal(entries[0]?.metadata?.constitutionVersion, "mishti-ai-constitution-v1");
  assert.equal(entries[0]?.metadata?.sourceArtifactRef, result.sourceArtifactPath);
});

test("runtime bridge fails invalid artifact before registration or event emission", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "mishti-constitution-bridge-"));
  const invalidArtifactPath = join(tempDir, "constitution.invalid.yaml");
  await writeFile(
    invalidArtifactPath,
    [
      "version: 1",
      "constitution_id: invalid-bridge",
      "status: draft_scaffold",
      "core_principles:",
      "  - principle_id: mutable_core",
      "    title: Mutable Core",
      "    lock_level: protected",
      "    mutable: true",
      "    statement: Invalid scaffold artifact.",
    ].join("\n"),
    "utf8"
  );

  const executionLedger = new ExecutionLedger("", "");
  const registry = new ConstitutionRegistry();
  const bridge = new ConstitutionalRuntimeBridge(
    new ConstitutionalValidationEngine(),
    registry,
    new ConstitutionalLifecycleLedger(executionLedger)
  );

  await assert.rejects(
    () =>
      bridge.initializeConstitution({
        artifactPath: invalidArtifactPath,
        schemaPath: "config/constitution/constitutional-policy-schema.json",
        emitLifecycleEvent: true,
      }),
    /constitution_validation_failed/
  );

  assert.equal(registry.listVersions().length, 0);
  assert.equal(executionLedger.snapshot().length, 0);
});
