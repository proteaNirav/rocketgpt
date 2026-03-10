import { KnowledgePacketValidationError } from './knowledge-packet-errors';
import {
  validateKnowledgePacketSchema,
  type ValidationIssue,
  type ValidationResult,
} from './knowledge-packet-schema';
import type { KnowledgePacket } from './knowledge-packet-types';

export interface KnowledgePacketValidationReport extends ValidationResult {
  packet?: KnowledgePacket;
}

export function validateKnowledgePacket(packet: unknown): KnowledgePacketValidationReport {
  const result = validateKnowledgePacketSchema(packet);
  return result.valid
    ? { ...result, packet: packet as KnowledgePacket }
    : result;
}

export function assertValidKnowledgePacket(packet: unknown): KnowledgePacket {
  const result = validateKnowledgePacket(packet);
  if (!result.valid || !result.packet) {
    throw new KnowledgePacketValidationError(
      formatValidationIssues(result.issues),
      result.issues,
    );
  }

  return result.packet;
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return 'Knowledge packet validation failed.';
  }

  return `Knowledge packet validation failed: ${issues
    .map((issue) => `${issue.path} ${issue.message}`)
    .join('; ')}`;
}
