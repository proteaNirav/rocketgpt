"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgePacketLedgerError = exports.KnowledgePacketRoutingError = exports.KnowledgePacketIntegrityError = exports.KnowledgePacketValidationError = exports.KnowledgePacketError = void 0;
class KnowledgePacketError extends Error {
    constructor(message, code = 'KNOWLEDGE_PACKET_ERROR', details) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        this.details = details;
    }
}
exports.KnowledgePacketError = KnowledgePacketError;
class KnowledgePacketValidationError extends KnowledgePacketError {
    constructor(message, details) {
        super(message, 'KNOWLEDGE_PACKET_VALIDATION_ERROR', details);
    }
}
exports.KnowledgePacketValidationError = KnowledgePacketValidationError;
class KnowledgePacketIntegrityError extends KnowledgePacketError {
    constructor(message, details) {
        super(message, 'KNOWLEDGE_PACKET_INTEGRITY_ERROR', details);
    }
}
exports.KnowledgePacketIntegrityError = KnowledgePacketIntegrityError;
class KnowledgePacketRoutingError extends KnowledgePacketError {
    constructor(message, details) {
        super(message, 'KNOWLEDGE_PACKET_ROUTING_ERROR', details);
    }
}
exports.KnowledgePacketRoutingError = KnowledgePacketRoutingError;
class KnowledgePacketLedgerError extends KnowledgePacketError {
    constructor(message, details) {
        super(message, 'KNOWLEDGE_PACKET_LEDGER_ERROR', details);
    }
}
exports.KnowledgePacketLedgerError = KnowledgePacketLedgerError;
