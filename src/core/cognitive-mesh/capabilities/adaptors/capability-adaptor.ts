import type { CapabilityRequestEnvelope } from "../types/capability-request.types";
import type { CapabilityResultEnvelope } from "../types/capability-result.types";
import type { CapabilityDefinition } from "../types/capability.types";

export interface CapabilityAdaptor {
  getCapabilityDefinition(): CapabilityDefinition;
  canHandle?(request: CapabilityRequestEnvelope): boolean;
  invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope>;
}

