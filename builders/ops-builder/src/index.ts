import type {
  AdaptiveFlowIntakeContract,
  ResultEvidenceAttachmentContract,
} from "../../../shared/event-model/types.js";
import type {
  BuilderCapabilityDeclaration,
  BuilderEvidenceAttachmentRequest,
  BuilderHealthDeclaration,
  BuilderResultContract,
  BuilderTaskAcceptanceContract,
  BuilderTaskIntakeContract,
  BuilderTaskRejectionContract,
  ConstraintClass,
  MishtiBuilderWorker,
  PainSeverity,
  PainSignalContract,
} from "../../builder-sdk/src/index.js";

export class OpsBuilder implements MishtiBuilderWorker {
  readonly capability: BuilderCapabilityDeclaration = {
    builderId: "ops-builder",
    builderKind: "ops_builder",
    capabilities: ["ops_config_generation", "infra_spec_generation", "script_generation"],
    boundedScopes: ["config/**", "infra/**", "scripts/**", "ops/**"],
  };

  declareHealth(): BuilderHealthDeclaration {
    return {
      builderId: this.capability.builderId,
      status: "constrained",
      trustPosture: "guarded",
    };
  }

  acceptTask(task: BuilderTaskIntakeContract): BuilderTaskAcceptanceContract | BuilderTaskRejectionContract {
    if (task.context.trustPosture === "quarantined" || task.context.survivalState === "emergency_stop") {
      return this.rejectTask(task, "trust_mismatch", "ops work is blocked by current trust or survival posture");
    }

    if (
      task.requestedCapability !== "ops_config_generation" &&
      task.requestedCapability !== "infra_spec_generation" &&
      task.requestedCapability !== "script_generation"
    ) {
      return this.rejectTask(task, "out_of_scope", "task capability is outside ops-builder scope");
    }

    return {
      taskId: task.taskId,
      builderId: this.capability.builderId,
      accepted: true,
      acceptedCapability: task.requestedCapability,
      assignmentId: task.assignment?.assignmentId,
    };
  }

  rejectTask(task: BuilderTaskIntakeContract, reason: BuilderTaskRejectionContract["reasonCode"], detail?: string): BuilderTaskRejectionContract {
    return {
      taskId: task.taskId,
      builderId: this.capability.builderId,
      accepted: false,
      reasonCode: reason,
      detail,
      assignmentId: task.assignment?.assignmentId,
    };
  }

  executeTask(task: BuilderTaskIntakeContract): BuilderResultContract {
    return this.emitResult(task);
  }

  emitResult(task: BuilderTaskIntakeContract): BuilderResultContract {
    return {
      taskId: task.taskId,
      builderId: this.capability.builderId,
      status: "completed",
      summary: "ops-oriented output prepared for later bounded review",
      evidence: [{ taskId: task.taskId, eventType: "builder_result" }],
      governanceHooks: task.context.governance.governanceHooks,
    };
  }

  attachEvidence(request: BuilderEvidenceAttachmentRequest): ResultEvidenceAttachmentContract {
    return request.attachment;
  }

  emitPainSignal(task: BuilderTaskIntakeContract | undefined, severity: PainSeverity, constraintClass: ConstraintClass, summary: string): PainSignalContract {
    return {
      builderId: this.capability.builderId,
      taskId: task?.taskId,
      severity,
      constraintClass,
      summary,
    };
  }

  emitAdaptiveFlow(request: { assignmentId?: string; adaptiveFlow: AdaptiveFlowIntakeContract }): AdaptiveFlowIntakeContract {
    return request.adaptiveFlow;
  }
}

export const opsBuilder = new OpsBuilder();
