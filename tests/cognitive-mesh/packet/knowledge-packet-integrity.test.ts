import test = require('node:test');
import assert = require('node:assert/strict');

import { createKnowledgePacket } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-factory';
import {
  assertKnowledgePacketIntegrity,
  verifyKnowledgePacketIntegrity,
} from '../../../src/core/cognitive-mesh/packet/knowledge-packet-integrity';

test('verifyKnowledgePacketIntegrity fails when payload content changes', () => {
  const packet = createKnowledgePacket({
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

  assert.equal(verifyKnowledgePacketIntegrity(tampered), false);
  assert.throws(() => assertKnowledgePacketIntegrity(tampered));
});

