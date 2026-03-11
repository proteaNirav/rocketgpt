export class OpsBuilder {
    capability = {
        builderId: "ops-builder",
        builderKind: "ops_builder",
        capabilities: ["ops_config_generation", "infra_spec_generation", "script_generation"],
        boundedScopes: ["config/**", "infra/**", "scripts/**", "ops/**"],
    };
    declareHealth() {
        return {
            builderId: this.capability.builderId,
            status: "constrained",
            trustPosture: "guarded",
        };
    }
    acceptTask(task) {
        if (task.context.trustPosture === "quarantined" || task.context.survivalState === "emergency_stop") {
            return this.rejectTask(task, "trust_mismatch", "ops work is blocked by current trust or survival posture");
        }
        if (task.requestedCapability !== "ops_config_generation" &&
            task.requestedCapability !== "infra_spec_generation" &&
            task.requestedCapability !== "script_generation") {
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
            summary: "ops-oriented output prepared for later bounded review",
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
export const opsBuilder = new OpsBuilder();
