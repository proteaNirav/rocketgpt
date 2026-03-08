"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeKnowledgePacket = routeKnowledgePacket;
const node_crypto_1 = require("node:crypto");
const knowledge_packet_errors_1 = require("./knowledge-packet-errors");
function hashToSlot(seed, size) {
    const digest = (0, node_crypto_1.createHash)('sha256').update(seed).digest();
    return digest.readUInt32BE(0) % size;
}
function uniqueNodes(nodes) {
    const seen = new Set();
    return nodes.filter((node) => {
        if (seen.has(node.nodeId)) {
            return false;
        }
        seen.add(node.nodeId);
        return true;
    });
}
function resolveCandidates(packet, nodes) {
    const preferred = packet.routing.preferredTargets ?? [];
    const capabilityTags = packet.routing.capabilityTags ?? [];
    let filtered = nodes;
    if (packet.destinationNodeId) {
        filtered = filtered.filter((node) => node.nodeId === packet.destinationNodeId);
    }
    else if (preferred.length > 0) {
        const preferredSet = new Set(preferred);
        const preferredNodes = filtered.filter((node) => preferredSet.has(node.nodeId));
        if (preferredNodes.length > 0) {
            filtered = preferredNodes;
        }
    }
    if (packet.routing.strategy === 'capability' && capabilityTags.length > 0) {
        const capabilityMatched = filtered.filter((node) => {
            const tags = new Set(node.capabilityTags ?? []);
            return capabilityTags.every((tag) => tags.has(tag));
        });
        if (capabilityMatched.length > 0) {
            filtered = capabilityMatched;
        }
    }
    if (packet.trust.trustLevel === 'external') {
        const internalSafeNodes = filtered.filter((node) => node.acceptsExternal !== false);
        if (internalSafeNodes.length > 0) {
            filtered = internalSafeNodes;
        }
    }
    return uniqueNodes(filtered);
}
function routeKnowledgePacket(packet, nodes) {
    if (nodes.length === 0) {
        throw new knowledge_packet_errors_1.KnowledgePacketRoutingError('No packet nodes are available for routing.', {
            packetId: packet.id,
        });
    }
    const candidates = resolveCandidates(packet, nodes);
    if (candidates.length === 0) {
        throw new knowledge_packet_errors_1.KnowledgePacketRoutingError('No eligible route targets matched the packet.', {
            packetId: packet.id,
            strategy: packet.routing.strategy,
        });
    }
    const deterministicSeed = packet.routing.deterministicKey ??
        packet.destinationNodeId ??
        packet.correlationId ??
        packet.id;
    const deterministicSlot = hashToSlot(deterministicSeed, candidates.length);
    const primary = candidates[deterministicSlot];
    let secondaryTargetId;
    if (packet.routing.deliveryMode === 'dual-ready' && candidates.length > 1) {
        const secondarySlot = (deterministicSlot + 1) % candidates.length;
        secondaryTargetId = candidates[secondarySlot].nodeId;
    }
    return {
        packetId: packet.id,
        strategy: packet.routing.strategy,
        deliveryMode: packet.routing.deliveryMode,
        primaryTargetId: primary.nodeId,
        secondaryTargetId,
        candidateTargetIds: candidates.map((node) => node.nodeId),
        deterministicSlot,
        explanation: packet.routing.deliveryMode === 'dual-ready'
            ? 'Primary route selected deterministically with future dual-delivery secondary target reserved.'
            : 'Primary route selected deterministically.',
    };
}
