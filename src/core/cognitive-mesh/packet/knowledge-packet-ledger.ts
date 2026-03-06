import { createHash } from 'node:crypto';

import { KnowledgePacketLedgerError } from './knowledge-packet-errors';
import type {
  KnowledgePacket,
  KnowledgePacketRouteDecision,
  PacketLedgerEvent,
  PacketLedgerEventType,
} from './knowledge-packet-types';

export interface PacketLedgerEventInput {
  type: PacketLedgerEventType;
  packet: KnowledgePacket;
  actor?: string;
  routeDecision?: KnowledgePacketRouteDecision;
  details?: Record<string, unknown>;
  createdAt?: string;
}

function createDeterministicLedgerEventId(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function createPacketLedgerEvent(input: PacketLedgerEventInput): PacketLedgerEvent {
  const createdAt = input.createdAt ?? new Date().toISOString();

  if (!input.packet.id) {
    throw new KnowledgePacketLedgerError('Cannot create ledger event without packet id.');
  }

  const id = createDeterministicLedgerEventId(
    `${input.packet.id}:${input.type}:${createdAt}:${input.actor ?? input.packet.createdBy}`,
  );

  return {
    id,
    packetId: input.packet.id,
    type: input.type,
    createdAt,
    actor: input.actor ?? input.packet.createdBy,
    sourceNodeId: input.packet.sourceNodeId,
    routeTargetId: input.routeDecision?.primaryTargetId,
    details: {
      lifecycleState: input.packet.lifecycleState,
      packetType: input.packet.packetType,
      protocolVersion: input.packet.protocolVersion,
      routeStrategy: input.routeDecision?.strategy,
      deliveryMode: input.routeDecision?.deliveryMode,
      ...input.details,
    },
  };
}

export function createPacketLifecycleLedgerEvents(args: {
  packet: KnowledgePacket;
  routeDecision?: KnowledgePacketRouteDecision;
  actor?: string;
  createdAt?: string;
}): PacketLedgerEvent[] {
  const baseDetails = {
    priority: args.packet.priority,
    correlationId: args.packet.correlationId,
  };

  return [
    createPacketLedgerEvent({
      type: 'packet.created',
      packet: args.packet,
      actor: args.actor,
      createdAt: args.createdAt,
      details: baseDetails,
    }),
    createPacketLedgerEvent({
      type: 'packet.validated',
      packet: args.packet,
      actor: args.actor,
      createdAt: args.createdAt,
      details: baseDetails,
    }),
    createPacketLedgerEvent({
      type: 'packet.integrity.verified',
      packet: args.packet,
      actor: args.actor,
      createdAt: args.createdAt,
      details: baseDetails,
    }),
    ...(args.routeDecision
      ? [
          createPacketLedgerEvent({
            type: 'packet.routed',
            packet: args.packet,
            actor: args.actor,
            createdAt: args.createdAt,
            routeDecision: args.routeDecision,
            details: {
              ...baseDetails,
              candidateTargetIds: args.routeDecision.candidateTargetIds,
            },
          }),
        ]
      : []),
  ];
}
