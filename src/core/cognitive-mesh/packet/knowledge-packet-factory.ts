import { randomUUID } from 'node:crypto';

import {
  computeCanonicalPayloadDigest,
  computeKnowledgePacketDigest,
} from './knowledge-packet-integrity';
import { assertValidKnowledgePacket } from './knowledge-packet-validator';
import {
  KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM,
  KNOWLEDGE_PACKET_PROTOCOL_VERSION,
  type CreateKnowledgePacketInput,
  type KnowledgePacket,
} from './knowledge-packet-types';

export function createKnowledgePacket<TPayload>(
  input: CreateKnowledgePacketInput<TPayload>,
): KnowledgePacket<TPayload> {
  const createdAt = new Date().toISOString();
  const packetId = randomUUID();

  const packet: KnowledgePacket<TPayload> = {
    id: packetId,
    protocolVersion: KNOWLEDGE_PACKET_PROTOCOL_VERSION,
    packetType: input.packetType,
    lifecycleState: 'created',
    correlationId: input.correlationId ?? packetId,
    causationId: input.causationId,
    createdAt,
    createdBy: input.createdBy,
    sourceNodeId: input.sourceNodeId,
    destinationNodeId: input.destinationNodeId,
    priority: input.priority ?? 'normal',
    trust: {
      trustLevel: input.trust?.trustLevel ?? 'internal',
      zeroTrustRequired: input.trust?.zeroTrustRequired ?? true,
    },
    routing: {
      strategy: input.routing?.strategy ?? (input.destinationNodeId ? 'direct' : 'capability'),
      deliveryMode: input.routing?.deliveryMode ?? 'single',
      deterministicKey: input.routing?.deterministicKey,
      preferredTargets: input.routing?.preferredTargets ?? [],
      capabilityTags: input.routing?.capabilityTags ?? [],
      allowBroadcastFallback: input.routing?.allowBroadcastFallback ?? false,
    },
    output: {
      type: input.output?.type ?? 'answer',
      expectsStructuredResponse: input.output?.expectsStructuredResponse ?? true,
      schemaVersion: input.output?.schemaVersion ?? '1.0.0',
    },
    payload: input.payload,
    tags: [...new Set(input.tags ?? [])],
    metadata: input.metadata ?? {},
    integrity: {
      algorithm: KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM,
      digest: '',
      canonicalPayloadDigest: '',
      signed: false,
    },
  };

  packet.integrity.canonicalPayloadDigest = computeCanonicalPayloadDigest(packet);
  packet.integrity.digest = computeKnowledgePacketDigest(packet);

  return assertValidKnowledgePacket(packet) as KnowledgePacket<TPayload>;
}
