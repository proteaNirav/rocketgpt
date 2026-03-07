import test = require('node:test');
import assert = require('node:assert/strict');

import { createKnowledgePacket } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-factory';
import { validateKnowledgePacket } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-validator';
import { verifyKnowledgePacketIntegrity } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-integrity';

test('createKnowledgePacket creates a valid packet with verified integrity', () => {
  const packet = createKnowledgePacket({
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

  const validation = validateKnowledgePacket(packet);

  assert.equal(validation.valid, true);
  assert.equal(packet.routing.strategy, 'capability');
  assert.equal(packet.trust.zeroTrustRequired, true);
  assert.equal(verifyKnowledgePacketIntegrity(packet), true);
});

