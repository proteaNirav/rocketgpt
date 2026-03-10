import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MotivatedRecallEngine } from "../memory/motivated-recall-engine";

test("motivated recall suppressed when below low threshold", () => {
  const engine = new MotivatedRecallEngine({ thresholdLow: 0.5, thresholdHigh: 0.8 });
  const decision = engine.decide({
    sessionId: "mr-thresh-1",
    capabilityId: "cap.language.v1",
    sourceType: "chat.user_text",
    signals: {
      goalRelevance: 0.2,
      riskIndicator: 0.1,
      repetitionIndicator: 0.2,
      unresolvedContextRelevance: 0.1,
      priorExperienceUsefulness: 0.15,
      experienceLayerMatch: 0.2,
      learnerOutputRelevance: 0.2,
      analysisResultRelevance: 0.1,
      catHelpSignal: 0.2,
      repairRequirementSignal: 0.1,
      creativeNeedSignal: 0.2,
      dreamMemoryRelevance: 0,
    },
  });
  assert.equal(decision.enableRecall, false);
  assert.equal(decision.recallMode, "none");
});

test("motivated recall selects implicit between thresholds", () => {
  const engine = new MotivatedRecallEngine({ thresholdLow: 0.4, thresholdHigh: 0.75 });
  const decision = engine.decide({
    sessionId: "mr-thresh-2",
    capabilityId: "cap.retrieval.v1",
    sourceType: "workflow.trigger",
    signals: {
      goalRelevance: 0.6,
      riskIndicator: 0.2,
      repetitionIndicator: 0.55,
      unresolvedContextRelevance: 0.5,
      priorExperienceUsefulness: 0.5,
      experienceLayerMatch: 0.45,
      learnerOutputRelevance: 0.4,
      analysisResultRelevance: 0.35,
      catHelpSignal: 0.45,
      repairRequirementSignal: 0.35,
      creativeNeedSignal: 0.4,
      dreamMemoryRelevance: 0.1,
    },
  });
  assert.equal(decision.enableRecall, true);
  assert.equal(decision.recallMode, "implicit");
});

test("motivated recall prefers explicit when risk indicator is high", () => {
  const engine = new MotivatedRecallEngine({ thresholdLow: 0.4, thresholdHigh: 0.7 });
  const decision = engine.decide({
    sessionId: "mr-thresh-3",
    capabilityId: "cap.retrieval.v1",
    sourceType: "workflow.trigger",
    signals: {
      goalRelevance: 0.85,
      riskIndicator: 0.9,
      repetitionIndicator: 0.7,
      unresolvedContextRelevance: 0.6,
      priorExperienceUsefulness: 0.75,
      experienceLayerMatch: 0.7,
      learnerOutputRelevance: 0.55,
      analysisResultRelevance: 0.65,
      catHelpSignal: 0.5,
      repairRequirementSignal: 0.45,
      creativeNeedSignal: 0.3,
      dreamMemoryRelevance: 0.2,
    },
  });
  assert.equal(decision.enableRecall, true);
  assert.equal(decision.recallMode, "explicit");
  assert.equal(decision.reasons.includes("risk_indicator_high_prefers_explicit"), true);
});
