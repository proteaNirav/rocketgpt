"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const constants_1 = require("../capabilities/constants");
const language_capability_1 = require("../capabilities/adaptors/language-capability");
const retrieval_capability_1 = require("../capabilities/adaptors/retrieval-capability");
const verification_capability_1 = require("../capabilities/adaptors/verification-capability");
(0, node_test_1.test)("language capability returns structured deterministic result", async () => {
    const capability = new language_capability_1.LanguageCapability();
    const result = await capability.invoke({
        requestId: "req-language-1",
        sessionId: "session-language",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: " Hello    world  from   mesh ",
        createdAt: new Date().toISOString(),
    });
    assert.equal(result.status, "success");
    const payload = result.payload;
    assert.equal(payload.normalizedText, "Hello world from mesh");
    assert.equal(payload.length, payload.normalizedText.length);
});
(0, node_test_1.test)("retrieval capability returns structured records payload", async () => {
    const capability = new retrieval_capability_1.RetrievalCapability([
        { id: "r1", text: "rocketgpt status report" },
        { id: "r2", text: "unrelated memory" },
    ]);
    const result = await capability.invoke({
        requestId: "req-retrieval-1",
        sessionId: "session-retrieval",
        capabilityId: constants_1.CAPABILITY_IDS.RETRIEVAL,
        purpose: "lookup",
        input: { query: "rocketgpt" },
        createdAt: new Date().toISOString(),
    });
    assert.equal(result.status, "success");
    const payload = result.payload;
    assert.equal(payload.query, "rocketgpt");
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0]?.id, "r1");
    assert.equal(result.verificationRequired, true);
});
(0, node_test_1.test)("verification capability returns structured verdict", async () => {
    const capability = new verification_capability_1.VerificationCapability();
    const result = await capability.invoke({
        requestId: "req-verify-1",
        sessionId: "session-verify",
        capabilityId: constants_1.CAPABILITY_IDS.VERIFICATION,
        purpose: "verify",
        input: {
            verificationRequestId: "verify-1",
            sessionId: "session-verify",
            capabilityId: constants_1.CAPABILITY_IDS.RETRIEVAL,
            capabilityResult: {
                requestId: "req-retrieval-2",
                sessionId: "session-verify",
                capabilityId: constants_1.CAPABILITY_IDS.RETRIEVAL,
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
    const payload = result.payload;
    assert.equal(payload.verdict, "accept");
    assert.equal(payload.confidence, 0.9);
});
