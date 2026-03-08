"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test = require("node:test");
const assert = require("node:assert/strict");
const knowledge_packet_validator_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-validator");
test('validateKnowledgePacket returns issues for malformed packets', () => {
    const result = (0, knowledge_packet_validator_1.validateKnowledgePacket)({
        id: '',
        protocolVersion: '0.0.1',
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues.some((issue) => issue.path === 'protocolVersion'));
    assert.ok(result.issues.some((issue) => issue.path === 'packetType'));
});
