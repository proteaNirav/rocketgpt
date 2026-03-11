export class CodeBuilder {
    capability = {
        builderId: "code-builder",
        builderKind: "code_builder",
        capabilities: ["code_patch_generation", "code_scaffold_generation", "typed_refactor_stub"],
        boundedScopes: ["src/**", "apps/**", "packages/**", "services/**"],
    };
    declareHealth() {
        return {
            builderId: this.capability.builderId,
            status: "healthy",
            trustPosture: "guarded",
        };
    }
    acceptTask(task) {
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
            status: "completed",
            summary: "code-oriented output prepared for later review and evidence linkage",
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
export const codeBuilder = new CodeBuilder();
