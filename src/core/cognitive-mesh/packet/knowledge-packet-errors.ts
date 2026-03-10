export class KnowledgePacketError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = 'KNOWLEDGE_PACKET_ERROR', details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

export class KnowledgePacketValidationError extends KnowledgePacketError {
  constructor(message: string, details?: unknown) {
    super(message, 'KNOWLEDGE_PACKET_VALIDATION_ERROR', details);
  }
}

export class KnowledgePacketIntegrityError extends KnowledgePacketError {
  constructor(message: string, details?: unknown) {
    super(message, 'KNOWLEDGE_PACKET_INTEGRITY_ERROR', details);
  }
}

export class KnowledgePacketRoutingError extends KnowledgePacketError {
  constructor(message: string, details?: unknown) {
    super(message, 'KNOWLEDGE_PACKET_ROUTING_ERROR', details);
  }
}

export class KnowledgePacketLedgerError extends KnowledgePacketError {
  constructor(message: string, details?: unknown) {
    super(message, 'KNOWLEDGE_PACKET_LEDGER_ERROR', details);
  }
}
