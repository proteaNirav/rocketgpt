function buildGovernanceHooks(task) {
    return [
        {
            gateId: `${task.id}-task-routing-gate`,
            target: "task_routing",
            decision: {
                decisionClass: task.governance.decisionClass,
                reasonCode: task.governance.reasonCode,
                policyRefs: task.governance.policyRefs,
            },
            eligibility: task.governance.eligibility,
            requiresApproval: task.governance.decisionClass === "approval_required",
        },
    ];
}
function buildRuntimeHooks(builder, task) {
    return builder.runtimeEligibility.map((surface) => ({
        requestId: `${task.id}-${surface}`,
        targetSurface: surface,
        decisionClass: task.governance.decisionClass,
        eligibility: task.governance.eligibility,
        policyRefs: task.governance.policyRefs,
    }));
}
export function routeTask(buildersState, task) {
    const builder = buildersState.builders.find((candidate) => candidate.capabilities.includes(task.requestedCapability) &&
        candidate.trustPosture !== "quarantined" &&
        candidate.trustPosture !== "emergency_stop" &&
        candidate.healthStatus !== "unavailable" &&
        task.governance.eligibility === "eligible");
    if (!builder) {
        throw new Error("No eligible builder was available for the task.");
    }
    return {
        builder,
        assignment: {
            assignmentId: `${task.id}-${builder.builderId}-assignment`,
            taskId: task.id,
            builderId: builder.builderId,
            requestedCapability: task.requestedCapability,
            boundedScope: "docs/generated/first-life.md",
            trustPosture: builder.trustPosture,
            builderHealthState: builder.healthStatus,
            governanceHooks: buildGovernanceHooks(task),
            runtimeEligibilityHooks: buildRuntimeHooks(builder, task),
        },
    };
}
