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

export class ValidationBuilder implements MishtiBuilderWorker {
  readonly capability: BuilderCapabilityDeclaration = {
    builderId: "validation-builder",
    builderKind: "validation_builder",
    capabilities: ["validation_execution", "test_plan_generation", "compliance_review"],
    boundedScopes: ["tests/**", "schemas/**", "docs/**", "shared/**"],
  };

  declareHealth(): BuilderHealthDeclaration {
    return {
      builderId: this.capability.builderId,
      status: "healthy",
      trustPosture: "guarded",
    };
  }

  acceptTask(task: BuilderTaskIntakeContract): BuilderTaskAcceptanceContract | BuilderTaskRejectionContract {
    if (task.context.survivalState === "safe_mode" || task.context.survivalState === "emergency_stop") {
      return this.rejectTask(task, "capacity_constrained", "validation work is suppressed in current survival mode");
    }

    if (
      task.requestedCapability !== "validation_execution" &&
      task.requestedCapability !== "test_plan_generation" &&
      task.requestedCapability !== "compliance_review"
    ) {
      return this.rejectTask(task, "out_of_scope", "task capability is outside validation-builder scope");
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
      status: "verified",
      summary: "validation-oriented output prepared for evidentiary attachment",
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

export const validationBuilder = new ValidationBuilder();
