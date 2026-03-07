import test = require('node:test');
import assert = require('node:assert/strict');

import { createKnowledgePacket } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-factory';
import { createPacketLifecycleLedgerEvents } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-ledger';
import { routeKnowledgePacket } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-router';

test('routeKnowledgePacket is deterministic and dual-ready aware', () => {
  const packet = createKnowledgePacket({
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

  const first = routeKnowledgePacket(packet, nodes);
  const second = routeKnowledgePacket(packet, nodes);

  assert.deepEqual(first, second);
  assert.equal(first.candidateTargetIds.length, 2);
  assert.equal(typeof first.primaryTargetId, 'string');
  assert.equal(typeof first.secondaryTargetId, 'string');
  assert.notEqual(first.primaryTargetId, first.secondaryTargetId);
});

test('createPacketLifecycleLedgerEvents emits core packet lifecycle events', () => {
  const packet = createKnowledgePacket({
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

  const routeDecision = routeKnowledgePacket(packet, [
    { nodeId: 'answer-node', capabilityTags: ['answering'] },
  ]);

  const events = createPacketLifecycleLedgerEvents({
    packet,
    routeDecision,
    actor: 'mesh-runtime',
    createdAt: '2026-03-06T12:00:00.000Z',
  });

  assert.deepEqual(
    events.map((event) => event.type),
    [
      'packet.created',
      'packet.validated',
      'packet.integrity.verified',
      'packet.routed',
    ],
  );
  assert.equal(events[3].routeTargetId, 'answer-node');
});

