import { ConstitutionalLifecycleLedger, type ConstitutionalLifecycleStage } from "./constitutional-lifecycle-ledger";
import type { ConstitutionVersion } from "../types/constitution-version";
import { ConstitutionalValidationEngine } from "../validation/constitutional-validation-engine";
import { ConstitutionRegistry } from "../registry/constitution-registry";
import { loadConstitutionArtifact } from "./constitutional-artifact-loader";

export type ConstitutionalRuntimeBridgeMode = "bootstrap" | "governance_activation";

export interface ConstitutionalRuntimeBridgeOptions {
  mode?: ConstitutionalRuntimeBridgeMode;
  artifactPath?: string;
  schemaPath?: string;
  markActive?: boolean;
  markTrusted?: boolean;
  emitLifecycleEvent?: boolean;
  actorRole?: string;
}

export interface ConstitutionLoadAndRegisterResult {
  success: boolean;
  mode: ConstitutionalRuntimeBridgeMode;
  constitutionVersion: ConstitutionVersion;
  activeVersion?: ConstitutionVersion;
  trustedVersion?: ConstitutionVersion;
  validationSummary: ReturnType<ConstitutionalValidationEngine["validateArtifact"]>;
  lifecycleEventEmitted: boolean;
  lifecycleEventStage?: ConstitutionalLifecycleStage;
  diagnostics: string[];
  sourceArtifactPath: string;
}

export class ConstitutionalRuntimeBridge {
  constructor(
    private readonly validationEngine = new ConstitutionalValidationEngine(),
    private readonly registry = new ConstitutionRegistry(),
    private readonly lifecycleLedger = new ConstitutionalLifecycleLedger()
  ) {}

  async initializeConstitution(
    options: ConstitutionalRuntimeBridgeOptions = {}
  ): Promise<ConstitutionLoadAndRegisterResult> {
    const mode = options.mode ?? "bootstrap";
    const shouldMarkActive = options.markActive ?? mode === "bootstrap";
    const shouldMarkTrusted = options.markTrusted ?? mode === "bootstrap";
    const shouldEmitLifecycleEvent = options.emitLifecycleEvent ?? false;
    const diagnostics: string[] = [];

    const loaded = await loadConstitutionArtifact(options.artifactPath, options.schemaPath);
    const validation = this.validationEngine.validateArtifact(loaded.artifact, loaded.schema, loaded.artifactPath);
    if (!validation.valid) {
      throw new Error(`constitution_validation_failed:${validation.errors.join("|")}`);
    }

    const version: ConstitutionVersion = {
      versionId: loaded.artifact.constitution_id,
      semanticVersion: `v${loaded.artifact.version}`,
      status: shouldMarkActive ? "active" : loaded.artifact.active_version ? "active" : "draft",
      trustedBaseline: shouldMarkTrusted || loaded.artifact.active_version === true,
      activatedAt: shouldMarkActive || loaded.artifact.active_version ? new Date().toISOString() : undefined,
      sourceArtifactRef: loaded.artifactPath,
      schemaRef: loaded.schemaPath,
    };

    this.registry.registerVersion(version);
    diagnostics.push(`version_registered:${version.versionId}`);

    if (shouldMarkTrusted) {
      this.registry.setTrustedVersionReference(version.versionId);
      diagnostics.push(`trusted_version_set:${version.versionId}`);
    }

    if (shouldMarkActive || loaded.artifact.active_version) {
      this.registry.markActiveVersion(version.versionId);
      diagnostics.push(`active_version_set:${version.versionId}`);
    }

    let lifecycleEventEmitted = false;
    let lifecycleEventStage: ConstitutionalLifecycleStage | undefined;
    if (shouldEmitLifecycleEvent) {
      lifecycleEventStage = "activation_completed";
      this.lifecycleLedger.emit({
        stage: lifecycleEventStage,
        constitutionVersion: version.versionId,
        actorRole: options.actorRole ?? (mode === "bootstrap" ? "emergency_controller" : "approver"),
        sourceArtifactRef: loaded.artifactPath,
      });
      lifecycleEventEmitted = true;
      diagnostics.push(`lifecycle_event_emitted:${lifecycleEventStage}`);
    }

    return {
      success: true,
      mode,
      constitutionVersion: version,
      activeVersion: this.registry.getActiveVersion(),
      trustedVersion: this.registry.getTrustedVersion(),
      validationSummary: validation,
      lifecycleEventEmitted,
      lifecycleEventStage,
      diagnostics,
      sourceArtifactPath: loaded.artifactPath,
    };
  }

  async loadValidateAndRegister(
    artifactPath?: string,
    schemaPath?: string
  ): Promise<ConstitutionLoadAndRegisterResult> {
    return this.initializeConstitution({
      artifactPath,
      schemaPath,
      mode: "bootstrap",
      markActive: true,
      markTrusted: true,
      emitLifecycleEvent: false,
    });
  }

  getRegistry(): ConstitutionRegistry {
    return this.registry;
  }
}
