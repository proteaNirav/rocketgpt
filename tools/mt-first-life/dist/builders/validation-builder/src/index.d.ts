import type { AdaptiveFlowIntakeContract, ResultEvidenceAttachmentContract } from "../../../shared/event-model/types.js";
import type { BuilderCapabilityDeclaration, BuilderEvidenceAttachmentRequest, BuilderHealthDeclaration, BuilderResultContract, BuilderTaskAcceptanceContract, BuilderTaskIntakeContract, BuilderTaskRejectionContract, ConstraintClass, MishtiBuilderWorker, PainSeverity, PainSignalContract } from "../../builder-sdk/src/index.js";
export declare class ValidationBuilder implements MishtiBuilderWorker {
    readonly capability: BuilderCapabilityDeclaration;
    declareHealth(): BuilderHealthDeclaration;
    acceptTask(task: BuilderTaskIntakeContract): BuilderTaskAcceptanceContract | BuilderTaskRejectionContract;
    rejectTask(task: BuilderTaskIntakeContract, reason: BuilderTaskRejectionContract["reasonCode"], detail?: string): BuilderTaskRejectionContract;
    executeTask(task: BuilderTaskIntakeContract): BuilderResultContract;
    emitResult(task: BuilderTaskIntakeContract): BuilderResultContract;
    attachEvidence(request: BuilderEvidenceAttachmentRequest): ResultEvidenceAttachmentContract;
    emitPainSignal(task: BuilderTaskIntakeContract | undefined, severity: PainSeverity, constraintClass: ConstraintClass, summary: string): PainSignalContract;
    emitAdaptiveFlow(request: {
        assignmentId?: string;
        adaptiveFlow: AdaptiveFlowIntakeContract;
    }): AdaptiveFlowIntakeContract;
}
export declare const validationBuilder: ValidationBuilder;
