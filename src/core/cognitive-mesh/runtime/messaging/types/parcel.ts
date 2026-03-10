import type { MeshNodeClass } from "./mesh-node";

export type DeliveryPriority = "low" | "normal" | "high" | "critical" | "emergency";

export type CourierIntent =
  | "index"
  | "retrieve"
  | "learn"
  | "sync"
  | "review"
  | "archive"
  | "escalate"
  | "replicate"
  | "coordinate"
  | "delegate";

export type ParcelSizeClass = "tiny" | "small" | "medium" | "large" | "oversized";
export type ParcelSensitivity = "public" | "internal" | "confidential" | "restricted" | "governance";

export interface ParcelProfile {
  sizeClass: ParcelSizeClass;
  sensitivity: ParcelSensitivity;
  replayable: boolean;
  requiresChainOfCustody: boolean;
}

export interface CognitiveParcel {
  parcelId: string;
  sessionId: string;
  sourceNodeId: string;
  sourceNodeClass: MeshNodeClass;
  targetNodeId: string;
  targetNodeClass: MeshNodeClass;
  intent: CourierIntent;
  eventType: string;
  payload: unknown;
  profile: ParcelProfile;
  priority: DeliveryPriority;
  createdAt: string;
  updatedAt: string;
}
