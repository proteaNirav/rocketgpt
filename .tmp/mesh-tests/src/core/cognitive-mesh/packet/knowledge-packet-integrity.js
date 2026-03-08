"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCanonicalPayloadDigest = computeCanonicalPayloadDigest;
exports.serializePacketForIntegrity = serializePacketForIntegrity;
exports.computeKnowledgePacketDigest = computeKnowledgePacketDigest;
exports.verifyKnowledgePacketIntegrity = verifyKnowledgePacketIntegrity;
exports.assertKnowledgePacketIntegrity = assertKnowledgePacketIntegrity;
const node_crypto_1 = require("node:crypto");
const knowledge_packet_errors_1 = require("./knowledge-packet-errors");
function canonicalize(value) {
    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
        return JSON.stringify(value);
    }
    if (typeof value === 'string') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalize(item)).join(',')}]`;
    }
    if (typeof value === 'object') {
        const record = value;
        return `{${Object.keys(record)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(String(value));
}
function sha256Hex(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
}
function computeCanonicalPayloadDigest(packet) {
    return sha256Hex(canonicalize(packet.payload));
}
function serializePacketForIntegrity(packet) {
    const integritySafePacket = {
        ...packet,
        integrity: {
            algorithm: packet.integrity.algorithm,
            digest: '',
            canonicalPayloadDigest: packet.integrity.canonicalPayloadDigest,
            signed: packet.integrity.signed,
        },
    };
    return canonicalize(integritySafePacket);
}
function computeKnowledgePacketDigest(packet) {
    return sha256Hex(serializePacketForIntegrity(packet));
}
function verifyKnowledgePacketIntegrity(packet) {
    const expectedPayloadDigest = computeCanonicalPayloadDigest(packet);
    if (packet.integrity.canonicalPayloadDigest !== expectedPayloadDigest) {
        return false;
    }
    const expectedDigest = computeKnowledgePacketDigest(packet);
    return packet.integrity.digest === expectedDigest;
}
function assertKnowledgePacketIntegrity(packet) {
    if (!verifyKnowledgePacketIntegrity(packet)) {
        throw new knowledge_packet_errors_1.KnowledgePacketIntegrityError('Knowledge packet integrity verification failed.', {
            packetId: packet.id,
        });
    }
}
