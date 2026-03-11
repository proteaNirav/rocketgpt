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

export class CodeBuilder implements MishtiBuilderWorker {
  readonly capability: BuilderCapabilityDeclaration = {
    builderId: "code-builder",
    builderKind: "code_builder",
    capabilities: ["code_patch_generation", "code_scaffold_generation", "typed_refactor_stub"],
    boundedScopes: ["src/**", "apps/**", "packages/**", "services/**"],
  };

  declareHealth(): BuilderHealthDeclaration {
    return {
      builderId: this.capability.builderId,
      status: "healthy",
      trustPosture: "guarded",
    };
  }

  acceptTask(task: BuilderTaskIntakeContract): BuilderTaskAcceptanceContract | BuilderTaskRejectionContract {
    if (task.context.boundary === "untrusted_external" || task.context.trustPosture === "emergency_stop") {
      return this.rejectTask(task, "unsafe_scope", "code builder requires bounded internal scope");
    }

    if (task.requestedCapability !== "code_patch_generation" && task.requestedCapability !== "code_scaffold_generation") {
      return this.rejectTask(task, "out_of_scope", "task capability is outside code-builder scope");
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
      summary: "code-oriented output prepared for later review and evidence linkage",
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

export const codeBuilder = new CodeBuilder();
