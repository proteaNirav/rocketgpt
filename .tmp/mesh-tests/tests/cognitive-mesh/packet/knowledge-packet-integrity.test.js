"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test = require("node:test");
const assert = require("node:assert/strict");
const knowledge_packet_factory_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-factory");
const knowledge_packet_integrity_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-integrity");
test('verifyKnowledgePacketIntegrity fails when payload content changes', () => {
    const packet = (0, knowledge_packet_factory_1.createKnowledgePacket)({
        packetType: 'mesh.analysis',
        createdBy: 'system:test',
        sourceNodeId: 'mesh-runtime',
        payload: {
            content: { value: 42 },
            contentType: 'application/json',
            contentVersion: '1.0.0',
        },
    });
    const tampered = {
        ...packet,
        payload: {
            ...packet.payload,
            content: { value: 43 },
        },
    };
    assert.equal((0, knowledge_packet_integrity_1.verifyKnowledgePacketIntegrity)(tampered), false);
    assert.throws(() => (0, knowledge_packet_integrity_1.assertKnowledgePacketIntegrity)(tampered));
});
