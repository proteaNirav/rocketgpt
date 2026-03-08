"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKnowledgePacket = validateKnowledgePacket;
exports.assertValidKnowledgePacket = assertValidKnowledgePacket;
exports.formatValidationIssues = formatValidationIssues;
const knowledge_packet_errors_1 = require("./knowledge-packet-errors");
const knowledge_packet_schema_1 = require("./knowledge-packet-schema");
function validateKnowledgePacket(packet) {
    const result = (0, knowledge_packet_schema_1.validateKnowledgePacketSchema)(packet);
    return result.valid
        ? { ...result, packet: packet }
        : result;
}
function assertValidKnowledgePacket(packet) {
    const result = validateKnowledgePacket(packet);
    if (!result.valid || !result.packet) {
        throw new knowledge_packet_errors_1.KnowledgePacketValidationError(formatValidationIssues(result.issues), result.issues);
    }
    return result.packet;
}
function formatValidationIssues(issues) {
    if (issues.length === 0) {
        return 'Knowledge packet validation failed.';
    }
    return `Knowledge packet validation failed: ${issues
        .map((issue) => `${issue.path} ${issue.message}`)
        .join('; ')}`;
}
