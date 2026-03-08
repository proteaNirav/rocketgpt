"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPacketLedgerEvent = createPacketLedgerEvent;
exports.createPacketLifecycleLedgerEvents = createPacketLifecycleLedgerEvents;
const node_crypto_1 = require("node:crypto");
const knowledge_packet_errors_1 = require("./knowledge-packet-errors");
function createDeterministicLedgerEventId(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
}
function createPacketLedgerEvent(input) {
    const createdAt = input.createdAt ?? new Date().toISOString();
    if (!input.packet.id) {
        throw new knowledge_packet_errors_1.KnowledgePacketLedgerError('Cannot create ledger event without packet id.');
    }
    const id = createDeterministicLedgerEventId(`${input.packet.id}:${input.type}:${createdAt}:${input.actor ?? input.packet.createdBy}`);
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
function createPacketLifecycleLedgerEvents(args) {
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
