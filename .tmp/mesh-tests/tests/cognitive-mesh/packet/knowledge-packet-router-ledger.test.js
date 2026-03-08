"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test = require("node:test");
const assert = require("node:assert/strict");
const knowledge_packet_factory_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-factory");
const knowledge_packet_ledger_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-ledger");
const knowledge_packet_router_1 = require("../../../src/core/cognitive-mesh/packet/knowledge-packet-router");
test('routeKnowledgePacket is deterministic and dual-ready aware', () => {
    const packet = (0, knowledge_packet_factory_1.createKnowledgePacket)({
        packetType: 'mesh.plan',
        createdBy: 'system:test',
        sourceNodeId: 'router',
        payload: {
            content: { objective: 'draft plan' },
            contentType: 'application/json',
            contentVersion: '1.0.0',
        },
        routing: {
            strategy: 'capability',
            deliveryMode: 'dual-ready',
            deterministicKey: 'session-abc',
            capabilityTags: ['planning'],
        },
    });
    const nodes = [
        { nodeId: 'planner-a', capabilityTags: ['planning', 'reasoning'] },
        { nodeId: 'planner-b', capabilityTags: ['planning'] },
        { nodeId: 'analyst-a', capabilityTags: ['analysis'] },
    ];
    const first = (0, knowledge_packet_router_1.routeKnowledgePacket)(packet, nodes);
    const second = (0, knowledge_packet_router_1.routeKnowledgePacket)(packet, nodes);
    assert.deepEqual(first, second);
    assert.equal(first.candidateTargetIds.length, 2);
    assert.equal(typeof first.primaryTargetId, 'string');
    assert.equal(typeof first.secondaryTargetId, 'string');
    assert.notEqual(first.primaryTargetId, first.secondaryTargetId);
});
test('createPacketLifecycleLedgerEvents emits core packet lifecycle events', () => {
    const packet = (0, knowledge_packet_factory_1.createKnowledgePacket)({
        packetType: 'mesh.answer',
        createdBy: 'system:test',
        sourceNodeId: 'router',
        destinationNodeId: 'answer-node',
        payload: {
            content: { answer: 'ok' },
            contentType: 'application/json',
            contentVersion: '1.0.0',
        },
    });
    const routeDecision = (0, knowledge_packet_router_1.routeKnowledgePacket)(packet, [
        { nodeId: 'answer-node', capabilityTags: ['answering'] },
    ]);
    const events = (0, knowledge_packet_ledger_1.createPacketLifecycleLedgerEvents)({
        packet,
        routeDecision,
        actor: 'mesh-runtime',
        createdAt: '2026-03-06T12:00:00.000Z',
    });
    assert.deepEqual(events.map((event) => event.type), [
        'packet.created',
        'packet.validated',
        'packet.integrity.verified',
        'packet.routed',
    ]);
    assert.equal(events[3].routeTargetId, 'answer-node');
});
