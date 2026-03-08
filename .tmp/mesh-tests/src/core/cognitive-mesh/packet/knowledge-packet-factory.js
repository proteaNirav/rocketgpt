"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKnowledgePacket = createKnowledgePacket;
const node_crypto_1 = require("node:crypto");
const knowledge_packet_integrity_1 = require("./knowledge-packet-integrity");
const knowledge_packet_validator_1 = require("./knowledge-packet-validator");
const knowledge_packet_types_1 = require("./knowledge-packet-types");
function createKnowledgePacket(input) {
    const createdAt = new Date().toISOString();
    const packetId = (0, node_crypto_1.randomUUID)();
    const packet = {
        id: packetId,
        protocolVersion: knowledge_packet_types_1.KNOWLEDGE_PACKET_PROTOCOL_VERSION,
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
            algorithm: knowledge_packet_types_1.KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM,
            digest: '',
            canonicalPayloadDigest: '',
            signed: false,
        },
    };
    packet.integrity.canonicalPayloadDigest = (0, knowledge_packet_integrity_1.computeCanonicalPayloadDigest)(packet);
    packet.integrity.digest = (0, knowledge_packet_integrity_1.computeKnowledgePacketDigest)(packet);
    return (0, knowledge_packet_validator_1.assertValidKnowledgePacket)(packet);
}
