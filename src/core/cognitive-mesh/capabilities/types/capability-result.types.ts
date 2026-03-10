export type CapabilityResultStatus =
  | "success"
  | "degraded_success"
  | "denied"
  | "blocked"
  | "not_found"
  | "invalid"
  | "unavailable"
  | "failed";

export type CapabilityExecutionFailureClass =
  | "none"
  | "capability_not_found"
  | "capability_unavailable"
  | "capability_disabled"
  | "invalid_request"
  | "operation_not_supported"
  | "context_requirements_missing"
  | "guard_blocked"
  | "adapter_dispatch_failure"
  | "execution_exception"
  | "execution_timeout"
  | "degraded_execution";

export interface CapabilityExecutionClassification {
  status: CapabilityResultStatus;
  failureClass: CapabilityExecutionFailureClass;
  reasonCodes: string[];
  lifecycleStage:
    | "capability_resolution"
    | "capability_eligibility_checked"
    | "input_normalized"
    | "policy_gated"
    | "execution_started"
    | "result_normalized"
    | "execution_completed"
    | "execution_failed";
  degraded: boolean;
}

export interface CapabilitySourceMetadata {
  sourceType?: string;
  sourceId?: string;
  sourceUrl?: string;
}

export interface CapabilityResultEnvelope {
  requestId: string;
  sessionId: string;
  capabilityId: string;
  status: CapabilityResultStatus;
  payload?: unknown;
  confidence?: number;
  freshness?: string;
  sourceMetadata?: CapabilitySourceMetadata;
  warnings?: string[];
  errors?: string[];
  verificationRequired: boolean;
  trace?: Record<string, unknown>;
  completedAt: string;
  classification?: CapabilityExecutionClassification;
  diagnostics?: Record<string, unknown>;
}
