export const KNOWLEDGE_PACKET_PROTOCOL_VERSION = '1.0.0' as const;
export const KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM = 'sha256' as const;

export type PacketTrustLevel = 'internal' | 'restricted' | 'external';
export type PacketPriority = 'low' | 'normal' | 'high' | 'critical';
export type PacketDeliveryMode = 'single' | 'dual-ready';
export type PacketRouteStrategy = 'direct' | 'capability' | 'broadcast';
export type PacketLifecycleState =
  | 'created'
  | 'validated'
  | 'integrity_verified'
  | 'routed'
  | 'ledgered'
  | 'failed';

export type IntelligenceOutputType =
  | 'answer'
  | 'analysis'
  | 'plan'
  | 'instruction'
  | 'decision'
  | 'artifact'
  | 'observation';

export interface KnowledgePacketIntegrity {
  algorithm: typeof KNOWLEDGE_PACKET_INTEGRITY_ALGORITHM;
  digest: string;
  canonicalPayloadDigest: string;
  signed: boolean;
}

export interface KnowledgePacketRoutingContract {
  strategy: PacketRouteStrategy;
  deliveryMode: PacketDeliveryMode;
  deterministicKey?: string;
  preferredTargets?: string[];
  capabilityTags?: string[];
  allowBroadcastFallback?: boolean;
}

export interface KnowledgePacketTrustContract {
  trustLevel: PacketTrustLevel;
  zeroTrustRequired: boolean;
}

export interface KnowledgePacketOutputContract {
  type: IntelligenceOutputType;
  expectsStructuredResponse: boolean;
  schemaVersion: string;
}

export interface KnowledgePacketPayload<TPayload = unknown> {
  content: TPayload;
  contentType: string;
  contentVersion: string;
}

export interface KnowledgePacket<TPayload = unknown> {
  id: string;
  protocolVersion: typeof KNOWLEDGE_PACKET_PROTOCOL_VERSION;
  packetType: string;
  lifecycleState: PacketLifecycleState;
  correlationId: string;
  causationId?: string;
  createdAt: string;
  createdBy: string;
  sourceNodeId: string;
  destinationNodeId?: string;
  priority: PacketPriority;
  trust: KnowledgePacketTrustContract;
  routing: KnowledgePacketRoutingContract;
  output: KnowledgePacketOutputContract;
  payload: KnowledgePacketPayload<TPayload>;
  tags: string[];
  integrity: KnowledgePacketIntegrity;
  metadata: Record<string, string | number | boolean | null>;
}

export interface CreateKnowledgePacketInput<TPayload = unknown> {
  packetType: string;
  createdBy: string;
  sourceNodeId: string;
  destinationNodeId?: string;
  correlationId?: string;
  causationId?: string;
  priority?: PacketPriority;
  trust?: Partial<KnowledgePacketTrustContract>;
  routing?: Partial<KnowledgePacketRoutingContract>;
  output?: Partial<KnowledgePacketOutputContract>;
  payload: KnowledgePacketPayload<TPayload>;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PacketNodeDescriptor {
  nodeId: string;
  capabilityTags?: string[];
  weight?: number;
  acceptsExternal?: boolean;
}

export interface KnowledgePacketRouteDecision {
  packetId: string;
  strategy: PacketRouteStrategy;
  deliveryMode: PacketDeliveryMode;
  primaryTargetId: string;
  secondaryTargetId?: string;
  candidateTargetIds: string[];
  deterministicSlot: number;
  explanation: string;
}

export type PacketLedgerEventType =
  | 'packet.created'
  | 'packet.validated'
  | 'packet.integrity.verified'
  | 'packet.routed'
  | 'packet.ledgered'
  | 'packet.failed';

export interface PacketLedgerEvent {
  id: string;
  packetId: string;
  type: PacketLedgerEventType;
  createdAt: string;
  actor: string;
  sourceNodeId: string;
  routeTargetId?: string;
  details: Record<string, unknown>;
}
