import {
  KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM,
  KNOWLEDGE_PACKET_PROTOCOL_VERSION,
  type KnowledgePacket,
} from './knowledge-packet-types';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMetadataValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function validateKnowledgePacketSchema(packet: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(packet)) {
    return {
      valid: false,
      issues: [{ path: '$', message: 'Packet must be a plain object.' }],
    };
  }

  const candidate = packet as Partial<KnowledgePacket>;

  const requireString = (value: unknown, path: string) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push({ path, message: 'Expected a non-empty string.' });
    }
  };

  requireString(candidate.id, 'id');
  if (candidate.protocolVersion !== KNOWLEDGE_PACKET_PROTOCOL_VERSION) {
    issues.push({
      path: 'protocolVersion',
      message: `Expected protocolVersion ${KNOWLEDGE_PACKET_PROTOCOL_VERSION}.`,
    });
  }

  requireString(candidate.packetType, 'packetType');
  requireString(candidate.correlationId, 'correlationId');
  requireString(candidate.createdAt, 'createdAt');
  requireString(candidate.createdBy, 'createdBy');
  requireString(candidate.sourceNodeId, 'sourceNodeId');

  if (
    typeof candidate.createdAt === 'string' &&
    !ISO_DATE_PATTERN.test(candidate.createdAt)
  ) {
    issues.push({ path: 'createdAt', message: 'Expected a UTC ISO-8601 timestamp.' });
  }

  if (candidate.destinationNodeId !== undefined) {
    requireString(candidate.destinationNodeId, 'destinationNodeId');
  }

  if (
    candidate.priority !== 'low' &&
    candidate.priority !== 'normal' &&
    candidate.priority !== 'high' &&
    candidate.priority !== 'critical'
  ) {
    issues.push({ path: 'priority', message: 'Invalid packet priority.' });
  }

  if (
    candidate.lifecycleState !== 'created' &&
    candidate.lifecycleState !== 'validated' &&
    candidate.lifecycleState !== 'integrity_verified' &&
    candidate.lifecycleState !== 'routed' &&
    candidate.lifecycleState !== 'ledgered' &&
    candidate.lifecycleState !== 'failed'
  ) {
    issues.push({ path: 'lifecycleState', message: 'Invalid lifecycle state.' });
  }

  if (!isPlainObject(candidate.trust)) {
    issues.push({ path: 'trust', message: 'trust must be an object.' });
  } else {
    if (
      candidate.trust.trustLevel !== 'internal' &&
      candidate.trust.trustLevel !== 'restricted' &&
      candidate.trust.trustLevel !== 'external'
    ) {
      issues.push({ path: 'trust.trustLevel', message: 'Invalid trust level.' });
    }
    if (typeof candidate.trust.zeroTrustRequired !== 'boolean') {
      issues.push({
        path: 'trust.zeroTrustRequired',
        message: 'zeroTrustRequired must be boolean.',
      });
    }
  }

  if (!isPlainObject(candidate.routing)) {
    issues.push({ path: 'routing', message: 'routing must be an object.' });
  } else {
    if (
      candidate.routing.strategy !== 'direct' &&
      candidate.routing.strategy !== 'capability' &&
      candidate.routing.strategy !== 'broadcast'
    ) {
      issues.push({ path: 'routing.strategy', message: 'Invalid routing strategy.' });
    }
    if (
      candidate.routing.deliveryMode !== 'single' &&
      candidate.routing.deliveryMode !== 'dual-ready'
    ) {
      issues.push({
        path: 'routing.deliveryMode',
        message: 'Invalid delivery mode.',
      });
    }
    if (
      candidate.routing.preferredTargets !== undefined &&
      !Array.isArray(candidate.routing.preferredTargets)
    ) {
      issues.push({
        path: 'routing.preferredTargets',
        message: 'preferredTargets must be an array.',
      });
    }
    if (
      Array.isArray(candidate.routing.preferredTargets) &&
      candidate.routing.preferredTargets.some((value) => typeof value !== 'string' || value.trim().length === 0)
    ) {
      issues.push({
        path: 'routing.preferredTargets',
        message: 'preferredTargets entries must be non-empty strings.',
      });
    }
    if (
      candidate.routing.capabilityTags !== undefined &&
      !Array.isArray(candidate.routing.capabilityTags)
    ) {
      issues.push({
        path: 'routing.capabilityTags',
        message: 'capabilityTags must be an array.',
      });
    }
  }

  if (!isPlainObject(candidate.output)) {
    issues.push({ path: 'output', message: 'output must be an object.' });
  } else {
    requireString(candidate.output.type, 'output.type');
    if (typeof candidate.output.expectsStructuredResponse !== 'boolean') {
      issues.push({
        path: 'output.expectsStructuredResponse',
        message: 'expectsStructuredResponse must be boolean.',
      });
    }
    requireString(candidate.output.schemaVersion, 'output.schemaVersion');
  }

  if (!isPlainObject(candidate.payload)) {
    issues.push({ path: 'payload', message: 'payload must be an object.' });
  } else {
    requireString(candidate.payload.contentType, 'payload.contentType');
    requireString(candidate.payload.contentVersion, 'payload.contentVersion');
    if (!('content' in candidate.payload)) {
      issues.push({ path: 'payload.content', message: 'payload.content is required.' });
    }
  }

  if (!Array.isArray(candidate.tags)) {
    issues.push({ path: 'tags', message: 'tags must be an array.' });
  } else if (
    candidate.tags.some((value) => typeof value !== 'string' || value.trim().length === 0)
  ) {
    issues.push({ path: 'tags', message: 'tags entries must be non-empty strings.' });
  }

  if (!isPlainObject(candidate.metadata)) {
    issues.push({ path: 'metadata', message: 'metadata must be an object.' });
  } else {
    for (const [key, value] of Object.entries(candidate.metadata)) {
      if (!isMetadataValue(value)) {
        issues.push({
          path: `metadata.${key}`,
          message: 'metadata values must be string, number, boolean, or null.',
        });
      }
    }
  }

  if (!isPlainObject(candidate.integrity)) {
    issues.push({ path: 'integrity', message: 'integrity must be an object.' });
  } else {
    if (candidate.integrity.algorithm !== KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM) {
      issues.push({
        path: 'integrity.algorithm',
        message: `Expected integrity algorithm ${KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM}.`,
      });
    }
    if (
      typeof candidate.integrity.digest !== 'string' ||
      !SHA256_HEX_PATTERN.test(candidate.integrity.digest)
    ) {
      issues.push({ path: 'integrity.digest', message: 'digest must be a sha256 hex string.' });
    }
    if (
      typeof candidate.integrity.canonicalPayloadDigest !== 'string' ||
      !SHA256_HEX_PATTERN.test(candidate.integrity.canonicalPayloadDigest)
    ) {
      issues.push({
        path: 'integrity.canonicalPayloadDigest',
        message: 'canonicalPayloadDigest must be a sha256 hex string.',
      });
    }
    if (typeof candidate.integrity.signed !== 'boolean') {
      issues.push({ path: 'integrity.signed', message: 'signed must be boolean.' });
    }
  }

  return { valid: issues.length === 0, issues };
}
