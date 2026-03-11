export class ValidationBuilder {
    capability = {
        builderId: "validation-builder",
        builderKind: "validation_builder",
        capabilities: ["validation_execution", "test_plan_generation", "compliance_review"],
        boundedScopes: ["tests/**", "schemas/**", "docs/**", "shared/**"],
    };
    declareHealth() {
        return {
            builderId: this.capability.builderId,
            status: "healthy",
            trustPosture: "guarded",
        };
    }
    acceptTask(task) {
        if (task.context.survivalState === "safe_mode" || task.context.survivalState === "emergency_stop") {
            return this.rejectTask(task, "capacity_constrained", "validation work is suppressed in current survival mode");
        }
        if (task.requestedCapability !== "validation_execution" &&
            task.requestedCapability !== "test_plan_generation" &&
            task.requestedCapability !== "compliance_review") {
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
    rejectTask(task, reason, detail) {
        return {
            taskId: task.taskId,
            builderId: this.capability.builderId,
            accepted: false,
            reasonCode: reason,
            detail,
            assignmentId: task.assignment?.assignmentId,
        };
    }
    executeTask(task) {
        return this.emitResult(task);
    }
    emitResult(task) {
        return {
            taskId: task.taskId,
            builderId: this.capability.builderId,
            status: "verified",
            summary: "validation-oriented output prepared for evidentiary attachment",
            evidence: [{ taskId: task.taskId, eventType: "builder_result" }],
            governanceHooks: task.context.governance.governanceHooks,
        };
    }
    attachEvidence(request) {
        return request.attachment;
    }
    emitPainSignal(task, severity, constraintClass, summary) {
        return {
            builderId: this.capability.builderId,
            taskId: task?.taskId,
            severity,
            constraintClass,
            summary,
        };
    }
    emitAdaptiveFlow(request) {
        return request.adaptiveFlow;
    }
}
export const validationBuilder = new ValidationBuilder();
