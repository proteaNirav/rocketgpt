import { docBuilder } from "../../../builders/doc-builder/src/index.js";
import { codeBuilder } from "../../../builders/code-builder/src/index.js";
import { opsBuilder } from "../../../builders/ops-builder/src/index.js";
import { validationBuilder } from "../../../builders/validation-builder/src/index.js";
import { saveBuildersState } from "./state.js";
import type { BuildersState, PersistedBuilderRecord } from "./types.js";

const runtimeEligibility: Array<"sandbox_runner" | "cats_gateway" | "os_adapter"> = [
  "sandbox_runner",
  "cats_gateway",
  "os_adapter",
];

function toRecord(builder: {
  capability: { builderId: string; builderKind: string; capabilities: string[]; boundedScopes: string[] };
  declareHealth(): { status: "healthy" | "constrained" | "degraded" | "unavailable"; trustPosture: any };
}): PersistedBuilderRecord {
  const health = builder.declareHealth();
  return {
    builderId: builder.capability.builderId,
    builderKind: builder.capability.builderKind,
    capabilities: builder.capability.capabilities,
    boundedScopes: builder.capability.boundedScopes,
    trustPosture: health.trustPosture,
    healthStatus: health.status,
    runtimeEligibility,
    updatedAt: new Date().toISOString(),
  };
}

export async function seedBuilders(): Promise<BuildersState> {
  const state: BuildersState = {
    builders: [toRecord(docBuilder), toRecord(codeBuilder), toRecord(opsBuilder), toRecord(validationBuilder)],
  };

  await saveBuildersState(state);
  return state;
}
