"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyExperienceOutcome = classifyExperienceOutcome;
function hasGuardrail(circumstances, action) {
    return (circumstances.guardrailApplied ||
        action.capabilityStatus === "blocked" ||
        action.capabilityStatus === "denied" ||
        action.capabilityStatus === "not_found" ||
        action.capabilityStatus === "invalid" ||
        action.capabilityStatus === "unavailable");
}
function classifyExperienceOutcome(facts) {
    if (facts.executionAborted) {
        return {
            classification: "aborted",
            status: "negative",
            reusable: true,
            stabilityImpact: "negative",
            summary: "runtime_execution_aborted",
        };
    }
    if (facts.routeError) {
        return {
            classification: "failed",
            status: "negative",
            reusable: true,
            stabilityImpact: "critical",
            summary: "runtime_route_failed",
        };
    }
    if (hasGuardrail(facts.circumstances, facts.action)) {
        return {
            classification: "guarded",
            status: "negative",
            reusable: true,
            stabilityImpact: "negative",
            summary: "guardrail_constrained_execution",
        };
    }
    if (facts.routeFallbackUsed || facts.circumstances.fallbackTriggered || facts.circumstances.recoveryPathUsed) {
        return {
            classification: "successful-with-fallback",
            status: "neutral",
            reusable: true,
            stabilityImpact: "negative",
            summary: "execution_completed_with_fallback",
        };
    }
    if (facts.action.routeAccepted === false) {
        return {
            classification: "rejected",
            status: "negative",
            reusable: true,
            stabilityImpact: "negative",
            summary: "route_rejected_request",
        };
    }
    if (facts.action.routeAccepted !== true) {
        return {
            classification: "partial",
            status: "neutral",
            reusable: false,
            stabilityImpact: "neutral",
            summary: "partial_execution",
        };
    }
    if (facts.verification.required) {
        return {
            classification: "successful-with-verification",
            status: "positive",
            reusable: true,
            stabilityImpact: "positive",
            summary: "execution_completed_with_verification",
        };
    }
    return {
        classification: "successful",
        status: "positive",
        reusable: true,
        stabilityImpact: "positive",
        summary: "execution_completed",
    };
}
