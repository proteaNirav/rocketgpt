"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test = require("node:test");
const assert = require("node:assert/strict");
const knowledge_packet_factory_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-factory");
const knowledge_packet_validator_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-validator");
const knowledge_packet_integrity_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-integrity");
test('createKnowledgePacket creates a valid packet with verified integrity', () => {
    const packet = (0, knowledge_packet_factory_1.createKnowledgePacket)({
        packetType: 'mesh.query',
        createdBy: 'user:nirav',
        sourceNodeId: 'mesh-router',
        payload: {
            content: { question: 'What is the current state?' },
            contentType: 'application/json',
            contentVersion: '1.0.0',
        },
        routing: {
            capabilityTags: ['reasoning', 'planner'],
        },
        tags: ['runtime', 'batch-1'],
    });
    const validation = (0, knowledge_packet_validator_1.validateKnowledgePacket)(packet);
    assert.equal(validation.valid, true);
    assert.equal(packet.routing.strategy, 'capability');
    assert.equal(packet.trust.zeroTrustRequired, true);
    assert.equal((0, knowledge_packet_integrity_1.verifyKnowledgePacketIntegrity)(packet), true);
});
