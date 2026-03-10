import { test } from "node:test";
import * as assert from "node:assert/strict";
import { InMemoryExperienceRepository } from "../experience/repository/in-memory-experience-repository";
import { ExperienceRetrievalService } from "../experience/services/experience-retrieval-service";
import type { ExperienceRecord } from "../experience/types/experience.types";

function record(id: string, overrides: Partial<ExperienceRecord> = {}): ExperienceRecord {
  const merged: Partial<ExperienceRecord> = {
    experienceId: id,
    experienceType: "execution",
    experienceCategory: "execution_success",
    experienceOutcome: "positive",
    experienceScore: 0.9,
    experienceConfidence: 0.8,
    sessionId: "s1",
    timestamp: `2026-03-07T00:00:0${id.slice(-1)}.000Z`,
    sourceCapability: "cap.language.v1",
    relatedMemoryId: undefined,
    relatedExecutionId: `exec-${id}`,
    relatedSignals: [],
    relatedReinforcementEvents: [],
    experienceTags: ["repo_test"],
    experienceMetadata: {},
    source: { component: "mesh-live-runtime", source: "chat:user_text" },
    situation: { mode: "chat", sourceType: "chat.user_text" },
    context: { cognitiveState: "completed", trustClass: "trusted", riskScore: 0.2, tags: [] },
    action: { capabilityId: "cap.language.v1", capabilityStatus: "success", verificationInvoked: false, routeAccepted: true },
    verification: { required: false },
    outcome: {
      classification: "successful",
      status: "positive",
      reusable: true,
      stabilityImpact: "positive",
      summary: "ok",
    },
    circumstances: {
      fallbackTriggered: false,
      guardrailApplied: false,
      verificationRequired: false,
      verificationFailed: false,
      multipleCapabilitiesUsed: false,
      highComplexityRequest: false,
      stateFragility: false,
      recoveryPathUsed: false,
      lowConfidenceResult: false,
    },
    learnableValue: { level: "low", rationale: ["basic"], reusableValue: false },
    governanceIssues: [],
    tags: ["cel.captured"],
    relevanceScore: 0.5,
    isMeaningful: true,
    ...overrides,
  };
  return {
    ...(merged as ExperienceRecord),
    governanceIssues: merged.governanceIssues ?? [],
  };
}

test("repository supports save and deterministic retrieval hooks", () => {
  const repository = new InMemoryExperienceRepository(10);
  const retrieval = new ExperienceRetrievalService(repository);

  repository.save(record("exp-1", { outcome: { ...record("exp-1").outcome, classification: "successful-with-fallback" } }));
  repository.save(
    record("exp-2", {
      action: { ...record("exp-2").action, capabilityId: "cap.retrieval.v1" },
      circumstances: { ...record("exp-2").circumstances, verificationRequired: true },
      outcome: { ...record("exp-2").outcome, classification: "successful-with-verification" },
    })
  );
  repository.save(
    record("exp-3", {
      circumstances: { ...record("exp-3").circumstances, guardrailApplied: true },
      outcome: { ...record("exp-3").outcome, classification: "guarded", status: "negative" },
    })
  );

  assert.equal(repository.findById("exp-2")?.experienceId, "exp-2");
  assert.equal(repository.listBySession("s1").length, 3);
  assert.equal(retrieval.getExperiencesByCapability("cap.retrieval.v1", 10).length, 1);
  assert.equal(retrieval.getExperiencesByOutcome("guarded", 10).length, 1);
  assert.equal(retrieval.findByCircumstantialSignals(["guardrailApplied"], 10).length, 1);
  assert.equal(retrieval.getRecentExperiences("s1", 2).length, 2);
});
