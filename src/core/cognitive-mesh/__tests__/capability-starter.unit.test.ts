import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CAPABILITY_IDS } from "../capabilities/constants";
import { LanguageCapability } from "../capabilities/adaptors/language-capability";
import { RetrievalCapability } from "../capabilities/adaptors/retrieval-capability";
import { VerificationCapability } from "../capabilities/adaptors/verification-capability";

test("language capability returns structured deterministic result", async () => {
  const capability = new LanguageCapability();
  const result = await capability.invoke({
    requestId: "req-language-1",
    sessionId: "session-language",
    capabilityId: CAPABILITY_IDS.LANGUAGE,
    purpose: "normalize",
    input: " Hello    world  from   mesh ",
    createdAt: new Date().toISOString(),
  });

  assert.equal(result.status, "success");
  const payload = result.payload as { normalizedText: string; summaryText: string; length: number };
  assert.equal(payload.normalizedText, "Hello world from mesh");
  assert.equal(payload.length, payload.normalizedText.length);
});

test("retrieval capability returns structured records payload", async () => {
  const capability = new RetrievalCapability([
    { id: "r1", text: "rocketgpt status report" },
    { id: "r2", text: "unrelated memory" },
  ]);
  const result = await capability.invoke({
    requestId: "req-retrieval-1",
    sessionId: "session-retrieval",
    capabilityId: CAPABILITY_IDS.RETRIEVAL,
    purpose: "lookup",
    input: { query: "rocketgpt" },
    createdAt: new Date().toISOString(),
  });

  assert.equal(result.status, "success");
  const payload = result.payload as { query: string; count: number; records: Array<{ id: string }> };
  assert.equal(payload.query, "rocketgpt");
  assert.equal(payload.count, 1);
  assert.equal(payload.records[0]?.id, "r1");
  assert.equal(result.verificationRequired, true);
});

test("verification capability returns structured verdict", async () => {
  const capability = new VerificationCapability();
  const result = await capability.invoke({
    requestId: "req-verify-1",
    sessionId: "session-verify",
    capabilityId: CAPABILITY_IDS.VERIFICATION,
    purpose: "verify",
    input: {
      verificationRequestId: "verify-1",
      sessionId: "session-verify",
      capabilityId: CAPABILITY_IDS.RETRIEVAL,
      capabilityResult: {
        requestId: "req-retrieval-2",
        sessionId: "session-verify",
        capabilityId: CAPABILITY_IDS.RETRIEVAL,
        status: "success",
        payload: { text: "ok" },
        confidence: 0.9,
        verificationRequired: true,
        completedAt: new Date().toISOString(),
      },
      requestedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  });

  assert.equal(result.status, "success");
  const payload = result.payload as { verdict: string; confidence: number };
  assert.equal(payload.verdict, "accept");
  assert.equal(payload.confidence, 0.9);
});

