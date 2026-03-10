import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CognitiveAttentionEngine } from "../attention/cognitive-attention-engine";
import type { AttentionInput } from "../attention/attention-types";

const BASE_TS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);

function createInput(overrides: Partial<AttentionInput> = {}): AttentionInput {
  return {
    id: "attention-item",
    source: "mesh-unit-test",
    kind: "task",
    urgency: 0.4,
    uncertainty: 0.2,
    risk: 0.2,
    novelty: 0.2,
    userImpact: 0.3,
    strategicValue: 0.3,
    createdAtTs: BASE_TS,
    ...overrides,
  };
}

test("high urgency plus high risk produces high attention", () => {
  const engine = new CognitiveAttentionEngine({ now: () => BASE_TS });
  const result = engine.evaluate(
    createInput({
      id: "critical",
      urgency: 1,
      risk: 0.95,
      userImpact: 0.9,
      strategicValue: 0.8,
    })
  );

  assert.equal(result.score >= 60, true);
  assert.equal(result.band === "high" || result.band === "critical", true);
});

test("near deadline increases attention score", () => {
  const engine = new CognitiveAttentionEngine({ now: () => BASE_TS });
  const withoutDeadline = engine.evaluate(createInput({ id: "without-deadline", urgency: 0.5, risk: 0.4 }));
  const nearDeadline = engine.evaluate(
    createInput({
      id: "near-deadline",
      urgency: 0.5,
      risk: 0.4,
      deadlineTs: BASE_TS + 10 * 60 * 1_000,
    })
  );

  assert.equal(nearDeadline.score > withoutDeadline.score, true);
});

test("low-value item remains in low band", () => {
  const engine = new CognitiveAttentionEngine({ now: () => BASE_TS });
  const result = engine.evaluate(
    createInput({
      id: "low",
      urgency: 0.05,
      uncertainty: 0.05,
      risk: 0.05,
      novelty: 0.05,
      userImpact: 0.05,
      strategicValue: 0.05,
    })
  );

  assert.equal(result.band, "low");
  assert.equal(result.score < 35, true);
});

test("rank sorts attention results by descending score", () => {
  const engine = new CognitiveAttentionEngine({ now: () => BASE_TS });
  const ranked = engine.rank([
    createInput({ id: "a", urgency: 0.2, risk: 0.2 }),
    createInput({ id: "b", urgency: 0.9, risk: 0.9, userImpact: 0.7 }),
    createInput({ id: "c", urgency: 0.5, risk: 0.6 }),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["b", "c", "a"]
  );
});

test("rank ordering is deterministic when scores are equal", () => {
  const engine = new CognitiveAttentionEngine({ now: () => BASE_TS });
  const tied = engine.rank([
    createInput({ id: "z", urgency: 0.3, risk: 0.3, uncertainty: 0.2, novelty: 0.1, userImpact: 0.2, strategicValue: 0.2 }),
    createInput({ id: "a", urgency: 0.3, risk: 0.3, uncertainty: 0.2, novelty: 0.1, userImpact: 0.2, strategicValue: 0.2 }),
    createInput({ id: "m", urgency: 0.3, risk: 0.3, uncertainty: 0.2, novelty: 0.1, userImpact: 0.2, strategicValue: 0.2 }),
  ]);

  assert.deepEqual(
    tied.map((item) => item.id),
    ["a", "m", "z"]
  );
});

test("top returns stable subset and evaluate clamps NaN/Infinity safely", () => {
  const engine = new CognitiveAttentionEngine({ now: () => BASE_TS });
  const top = engine.top(
    [
      createInput({ id: "x", urgency: Number.NaN, risk: Number.POSITIVE_INFINITY, uncertainty: Number.NEGATIVE_INFINITY }),
      createInput({ id: "y", urgency: 0.9, risk: 0.8, userImpact: 0.7 }),
      createInput({ id: "z", urgency: 0.4, risk: 0.2 }),
    ],
    2
  );

  assert.equal(top.length, 2);
  assert.deepEqual(
    top.map((item) => item.id),
    ["y", "z"]
  );
  assert.equal(Number.isFinite(top[0].score), true);
  assert.equal(Number.isFinite(top[1].score), true);
});
