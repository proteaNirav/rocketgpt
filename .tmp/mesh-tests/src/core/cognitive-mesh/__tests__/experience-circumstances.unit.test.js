"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const circumstantial_context_deriver_1 = require("../experience/services/circumstantial-context-deriver");
(0, node_test_1.test)("derives circumstantial signals deterministically", () => {
    const context = (0, circumstantial_context_deriver_1.deriveCircumstantialContext)({
        fallbackTriggered: true,
        guardrailApplied: true,
        verificationRequired: true,
        verificationVerdict: "reject",
        capabilitiesUsed: ["cap.language.v1", "cap.retrieval.v1"],
        requestComplexityScore: 0.8,
        stateFragility: true,
        recoveryPathUsed: true,
        confidence: 0.4,
    });
    assert.equal(context.fallbackTriggered, true);
    assert.equal(context.guardrailApplied, true);
    assert.equal(context.verificationRequired, true);
    assert.equal(context.verificationFailed, true);
    assert.equal(context.multipleCapabilitiesUsed, true);
    assert.equal(context.highComplexityRequest, true);
    assert.equal(context.stateFragility, true);
    assert.equal(context.recoveryPathUsed, true);
    assert.equal(context.lowConfidenceResult, true);
});
