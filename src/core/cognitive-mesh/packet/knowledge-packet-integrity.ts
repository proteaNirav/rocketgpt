import { createHash } from 'node:crypto';

import { KnowledgePacketIntegrityError } from './knowledge-packet-errors';
import type { KnowledgePacket } from './knowledge-packet-types';

function canonicalize(value: unknown): string {
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
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(String(value));
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function computeCanonicalPayloadDigest(packet: Pick<KnowledgePacket, 'payload'>): string {
  return sha256Hex(canonicalize(packet.payload));
}

export function serializePacketForIntegrity(packet: KnowledgePacket): string {
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

export function computeKnowledgePacketDigest(packet: KnowledgePacket): string {
  return sha256Hex(serializePacketForIntegrity(packet));
}

export function verifyKnowledgePacketIntegrity(packet: KnowledgePacket): boolean {
  const expectedPayloadDigest = computeCanonicalPayloadDigest(packet);
  if (packet.integrity.canonicalPayloadDigest !== expectedPayloadDigest) {
    return false;
  }

  const expectedDigest = computeKnowledgePacketDigest(packet);
  return packet.integrity.digest === expectedDigest;
}

export function assertKnowledgePacketIntegrity(packet: KnowledgePacket): void {
  if (!verifyKnowledgePacketIntegrity(packet)) {
    throw new KnowledgePacketIntegrityError(
      'Knowledge packet integrity verification failed.',
      {
        packetId: packet.id,
      },
    );
  }
}
