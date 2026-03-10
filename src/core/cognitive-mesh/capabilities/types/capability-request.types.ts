import type { CapabilityVerificationMode } from "./capability.types";

export type CapabilityRequestPriority = "critical" | "high" | "normal" | "low";

export interface CapabilitySourceConstraints {
  allowedSourceDomains?: string[];
  allowedSourceTypes?: string[];
}

export interface CapabilityRequestEnvelope {
  requestId: string;
  sessionId: string;
  capabilityId: string;
  purpose: string;
  input: unknown;
  expectedOutputType?: string;
  verificationMode?: CapabilityVerificationMode;
  priority?: CapabilityRequestPriority;
  sourceConstraints?: CapabilitySourceConstraints;
  trace?: Record<string, unknown>;
  createdAt: string;
}

