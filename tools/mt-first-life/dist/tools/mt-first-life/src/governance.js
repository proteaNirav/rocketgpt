export function evaluateGovernance(task, runtime) {
    if (runtime.survivalState === "emergency_stop") {
        return {
            decision: {
                decisionClass: "emergency_stop",
                reasonCode: "runtime_emergency_stop_active",
                policyRefs: ["mishti.first-life.survival"],
            },
            eligibility: "blocked",
        };
    }
    if (runtime.survivalState === "safe_mode") {
        return {
            decision: {
                decisionClass: "approval_required",
                reasonCode: "runtime_safe_mode_active",
                policyRefs: ["mishti.first-life.survival"],
            },
            eligibility: "blocked",
        };
    }
    if (task.type === "generate-document") {
        const outputPath = String(task.payload.outputPath ?? "");
        if (outputPath === "docs/generated/first-life.md") {
            return {
                decision: {
                    decisionClass: "bounded_allow",
                    reasonCode: "first_life_document_task_allowed",
                    policyRefs: ["mishti.first-life.governance", "mishti.runtime.sandbox.first-life"],
                },
                eligibility: "eligible",
            };
        }
        return {
            decision: {
                decisionClass: "deny",
                reasonCode: "unsupported_generate_document_target",
                policyRefs: ["mishti.first-life.governance"],
            },
            eligibility: "blocked",
        };
    }
    return {
        decision: {
            decisionClass: "deny",
            reasonCode: "unsupported_task_type",
            policyRefs: ["mishti.first-life.governance"],
        },
        eligibility: "blocked",
    };
}
