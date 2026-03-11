import { createHash } from "node:crypto";
import type {
  AdaptiveFlowIntakeContract,
  ResultEvidenceAttachmentContract,
} from "../../../shared/event-model/types.js";
import { executeBoundedDocumentWrite } from "../../../runtime/sandbox-runner/src/execute.js";
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

interface GenerateDocumentPayload extends Record<string, unknown> {
  content: string;
  outputPath: string;
}

function isGenerateDocumentPayload(payload: Record<string, unknown> | undefined): payload is GenerateDocumentPayload {
  return typeof payload?.content === "string" && typeof payload?.outputPath === "string";
}

export class DocBuilder implements MishtiBuilderWorker {
  readonly capability: BuilderCapabilityDeclaration = {
    builderId: "doc-builder",
    builderKind: "doc_builder",
    capabilities: ["document_generation", "spec_refinement", "architecture_drafting"],
    boundedScopes: ["docs/**", "specs/**"],
  };

  declareHealth(): BuilderHealthDeclaration {
    return {
      builderId: this.capability.builderId,
      status: "healthy",
      trustPosture: "guarded",
    };
  }

  acceptTask(
    task: BuilderTaskIntakeContract
  ): BuilderTaskAcceptanceContract | BuilderTaskRejectionContract {
    if (task.context.trustPosture === "quarantined" || task.context.trustPosture === "emergency_stop") {
      return this.rejectTask(task, "trust_mismatch", "builder will not accept quarantined or stopped work");
    }

    if (task.requestedCapability !== "document_generation" && task.requestedCapability !== "spec_refinement") {
      return this.rejectTask(task, "out_of_scope", "task capability is outside documentation scope");
    }

    if (task.taskType === "generate-document" && !isGenerateDocumentPayload(task.payload)) {
      return this.rejectTask(task, "unclear_task", "generate-document requires content and outputPath");
    }

    return {
      taskId: task.taskId,
      builderId: this.capability.builderId,
      accepted: true,
      acceptedCapability: task.requestedCapability,
      assignmentId: task.assignment?.assignmentId,
    };
  }

  rejectTask(
    task: BuilderTaskIntakeContract,
    reason: BuilderTaskRejectionContract["reasonCode"],
    detail?: string
  ): BuilderTaskRejectionContract {
    return {
      taskId: task.taskId,
      builderId: this.capability.builderId,
      accepted: false,
      reasonCode: reason,
      detail,
      assignmentId: task.assignment?.assignmentId,
    };
  }

  async executeTask(task: BuilderTaskIntakeContract): Promise<BuilderResultContract> {
    if (task.taskType !== "generate-document") {
      return this.emitResult(task);
    }

    if (!isGenerateDocumentPayload(task.payload)) {
      return {
        taskId: task.taskId,
        builderId: this.capability.builderId,
        status: "failed",
        summary: "document task payload was invalid",
        evidence: [{ taskId: task.taskId, eventType: "builder_pain_signal" }],
      };
    }

    const runtimeResult = await executeBoundedDocumentWrite({
      request: {
        requestId: `${task.taskId}-runtime-request`,
        executionType: "document",
        policyRef: {
          policyId: "mishti.runtime.sandbox.first-life",
          policyVersion: "v1",
          boundedScope: task.context.boundedScope,
        },
        context: {
          taskId: task.taskId,
          traceId: task.context.governance.traceId,
          boundedScope: task.context.boundedScope,
          trustPosture: task.context.trustPosture,
          survivalState: task.context.survivalState,
          governanceDecisionClass: task.context.governance.decisionClass,
          governanceHooks: task.context.governance.governanceHooks,
        },
        resourceLimits: {
          wallClockMs: 1500,
          ioOperations: 4,
        },
        validationHooks: [{ hookId: "doc-post-validation", stage: "post_execution", description: "require first-life document validation" }],
        evidenceHooks: [{ hookId: "doc-evidence", eventType: "execution_completed", required: true }],
        survivalHooks: [{ hookId: "doc-survival", triggerStates: ["safe_mode", "emergency_stop", "node_isolated"], failClosed: true }],
        runtimeEligibilityHooks: task.assignment?.runtimeEligibilityHooks,
      },
      outputPath: task.payload.outputPath,
      content: task.payload.content,
    });

    return {
      taskId: task.taskId,
      builderId: this.capability.builderId,
      status: runtimeResult.status === "completed" ? "completed" : "failed",
      summary: runtimeResult.summary,
      evidence: [
        {
          taskId: task.taskId,
          eventType: "builder_result",
          payloadRef: task.payload.outputPath,
          payloadHash: createHash("sha256").update(task.payload.content).digest("hex"),
        },
      ],
      governanceHooks: task.context.governance.governanceHooks,
    };
  }

  emitResult(task: BuilderTaskIntakeContract): BuilderResultContract {
    return {
      taskId: task.taskId,
      builderId: this.capability.builderId,
      status: "completed",
      summary: "document-oriented output prepared for evidentiary attachment",
      evidence: [
        {
          taskId: task.taskId,
          eventType: "builder_result",
        },
      ],
      governanceHooks: task.context.governance.governanceHooks,
    };
  }

  attachEvidence(request: BuilderEvidenceAttachmentRequest): ResultEvidenceAttachmentContract {
    return request.attachment;
  }

  emitPainSignal(
    task: BuilderTaskIntakeContract | undefined,
    severity: PainSeverity,
    constraintClass: ConstraintClass,
    summary: string
  ): PainSignalContract {
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

export const docBuilder = new DocBuilder();

