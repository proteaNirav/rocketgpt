import test = require('node:test');
import assert = require('node:assert/strict');

import { validateKnowledgePacket } from '../../../src/core/cognitive-mesh/packet/knowledge-packet-validator';

test('validateKnowledgePacket returns issues for malformed packets', () => {
  const result = validateKnowledgePacket({
    id: '',
    protocolVersion: '0.0.1',
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.length > 0);
  assert.ok(result.issues.some((issue) => issue.path === 'protocolVersion'));
  assert.ok(result.issues.some((issue) => issue.path === 'packetType'));
});

