"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const motivated_recall_engine_1 = require("../memory/motivated-recall-engine");
function baseSignals() {
    return {
        goalRelevance: 0.2,
        riskIndicator: 0.2,
        repetitionIndicator: 0.2,
        unresolvedContextRelevance: 0.1,
        priorExperienceUsefulness: 0.1,
        experienceLayerMatch: 0.1,
        learnerOutputRelevance: 0.1,
        analysisResultRelevance: 0.1,
        catHelpSignal: 0.1,
        repairRequirementSignal: 0.1,
        creativeNeedSignal: 0.1,
        dreamMemoryRelevance: 0,
    };
}
(0, node_test_1.test)("motivated recall triggers by experience usefulness", () => {
    const engine = new motivated_recall_engine_1.MotivatedRecallEngine();
    const decision = engine.decide({
        sessionId: "mr-trigger-1",
        capabilityId: "cap.retrieval.v1",
        sourceType: "workflow.trigger",
        signals: {
            ...baseSignals(),
            priorExperienceUsefulness: 0.9,
            experienceLayerMatch: 0.8,
            learnerOutputRelevance: 0.75,
            analysisResultRelevance: 0.7,
        },
    });
    assert.equal(decision.enableRecall, true);
    assert.equal(decision.signalsTriggered.includes("priorExperienceUsefulness"), true);
});
(0, node_test_1.test)("motivated recall triggers by CAT help signal", () => {
    const engine = new motivated_recall_engine_1.MotivatedRecallEngine();
    const decision = engine.decide({
        sessionId: "mr-trigger-2",
        capabilityId: "cap.language.v1",
        sourceType: "chat.user_text",
        signals: {
            ...baseSignals(),
            catHelpSignal: 0.95,
            creativeNeedSignal: 0.7,
            goalRelevance: 0.8,
            learnerOutputRelevance: 0.7,
            analysisResultRelevance: 0.62,
        },
    });
    assert.equal(decision.enableRecall, true);
    assert.equal(decision.signalsTriggered.includes("catHelpSignal"), true);
});
(0, node_test_1.test)("motivated recall triggers by repair requirement", () => {
    const engine = new motivated_recall_engine_1.MotivatedRecallEngine();
    const decision = engine.decide({
        sessionId: "mr-trigger-3",
        capabilityId: "cap.retrieval.v1",
        sourceType: "workflow.trigger",
        signals: {
            ...baseSignals(),
            repairRequirementSignal: 0.92,
            riskIndicator: 0.4,
            analysisResultRelevance: 0.65,
        },
    });
    assert.equal(decision.enableRecall, true);
    assert.equal(decision.signalsTriggered.includes("repairRequirementSignal"), true);
});
(0, node_test_1.test)("motivated recall triggers by repetition indicator", () => {
    const engine = new motivated_recall_engine_1.MotivatedRecallEngine();
    const decision = engine.decide({
        sessionId: "mr-trigger-4",
        capabilityId: "cap.retrieval.v1",
        sourceType: "workflow.trigger",
        signals: {
            ...baseSignals(),
            repetitionIndicator: 0.95,
            goalRelevance: 0.75,
            priorExperienceUsefulness: 0.7,
        },
    });
    assert.equal(decision.enableRecall, true);
    assert.equal(decision.signalsTriggered.includes("repetitionIndicator"), true);
});
(0, node_test_1.test)("motivated recall triggers by learner output relevance", () => {
    const engine = new motivated_recall_engine_1.MotivatedRecallEngine();
    const decision = engine.decide({
        sessionId: "mr-trigger-5",
        capabilityId: "cap.language.v1",
        sourceType: "chat.user_text",
        signals: {
            ...baseSignals(),
            learnerOutputRelevance: 0.92,
            goalRelevance: 0.8,
            creativeNeedSignal: 0.6,
            priorExperienceUsefulness: 0.7,
            experienceLayerMatch: 0.65,
        },
    });
    assert.equal(decision.enableRecall, true);
    assert.equal(decision.signalsTriggered.includes("learnerOutputRelevance"), true);
});
