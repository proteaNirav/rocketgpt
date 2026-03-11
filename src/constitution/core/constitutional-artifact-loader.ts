import { readFile } from "node:fs/promises";
import type {
  ConstitutionalArtifactLoadResult,
  ConstitutionalArtifactV1,
  ConstitutionalCorePrincipleRecord,
  ConstitutionalGovernedPolicyRecord,
  ConstitutionalOsPolicyEnvelopeRecord,
  ConstitutionalRuntimePolicyBindingRecord,
  ConstitutionalSchemaDocument,
} from "../contracts/constitutional-artifact";

const DEFAULT_ARTIFACT_PATH = "config/constitution/constitution.v1.yaml";
const DEFAULT_SCHEMA_PATH = "config/constitution/constitutional-policy-schema.json";

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseBoolean(value: string): boolean {
  const normalized = parseScalar(value).toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new Error(`constitution_yaml_invalid:boolean:${value.trim()}`);
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(parseScalar(value), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`constitution_yaml_invalid:integer:${value.trim()}`);
  }
  return parsed;
}

export async function loadConstitutionSchemaDocument(
  schemaPath = DEFAULT_SCHEMA_PATH
): Promise<ConstitutionalSchemaDocument> {
  const raw = await readFile(schemaPath, "utf8");
  return JSON.parse(raw) as ConstitutionalSchemaDocument;
}

export async function loadConstitutionArtifact(
  artifactPath = DEFAULT_ARTIFACT_PATH,
  schemaPath = DEFAULT_SCHEMA_PATH
): Promise<ConstitutionalArtifactLoadResult> {
  const text = await readFile(artifactPath, "utf8");
  const lines = text.split(/\r?\n/);

  const artifact: Partial<ConstitutionalArtifactV1> = {
    core_principles: [],
    governed_policies: [],
    runtime_policy_bindings: [],
  };

  let currentSection:
    | "core_principles"
    | "governed_policies"
    | "runtime_policy_bindings"
    | "os_policy_envelope"
    | undefined;
  let currentObject:
    | Partial<ConstitutionalCorePrincipleRecord>
    | Partial<ConstitutionalGovernedPolicyRecord>
    | Partial<ConstitutionalRuntimePolicyBindingRecord>
    | undefined;
  let inScope = false;
  let osEnvelope: Partial<ConstitutionalOsPolicyEnvelopeRecord> = {};

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (!line.startsWith(" ")) {
      inScope = false;
      currentObject = undefined;
      if (trimmed.startsWith("version:")) {
        artifact.version = parseInteger(trimmed.slice("version:".length));
        continue;
      }
      if (trimmed.startsWith("constitution_id:")) {
        artifact.constitution_id = parseScalar(trimmed.slice("constitution_id:".length));
        continue;
      }
      if (trimmed.startsWith("status:")) {
        artifact.status = parseScalar(trimmed.slice("status:".length));
        continue;
      }
      if (trimmed.startsWith("active_version:")) {
        artifact.active_version = parseBoolean(trimmed.slice("active_version:".length));
        continue;
      }
      if (trimmed === "core_principles:") {
        currentSection = "core_principles";
        continue;
      }
      if (trimmed === "governed_policies:") {
        currentSection = "governed_policies";
        continue;
      }
      if (trimmed === "runtime_policy_bindings:") {
        currentSection = "runtime_policy_bindings";
        continue;
      }
      if (trimmed === "os_policy_envelope:") {
        currentSection = "os_policy_envelope";
        continue;
      }
      continue;
    }

    if (currentSection === "os_policy_envelope" && line.startsWith("  ")) {
      const [rawKey, rawValue] = trimmed.split(":", 2);
      osEnvelope[rawKey as keyof ConstitutionalOsPolicyEnvelopeRecord] = parseBoolean(rawValue) as never;
      artifact.os_policy_envelope = osEnvelope as ConstitutionalOsPolicyEnvelopeRecord;
      continue;
    }

    if (line.startsWith("  - ")) {
      inScope = false;
      if (currentSection === "core_principles") {
        currentObject = {};
      } else if (currentSection === "governed_policies") {
        currentObject = {};
      } else if (currentSection === "runtime_policy_bindings") {
        currentObject = {};
      } else {
        continue;
      }

      const [rawKey, rawValue] = trimmed.slice(2).split(":", 2);
      const value = parseScalar(rawValue);
      if (currentSection === "core_principles") {
        (currentObject as Partial<ConstitutionalCorePrincipleRecord>)[rawKey as keyof ConstitutionalCorePrincipleRecord] =
          value as never;
        (artifact.core_principles as ConstitutionalCorePrincipleRecord[]).push(
          currentObject as ConstitutionalCorePrincipleRecord
        );
      } else if (currentSection === "governed_policies") {
        (currentObject as Partial<ConstitutionalGovernedPolicyRecord>)[rawKey as keyof ConstitutionalGovernedPolicyRecord] =
          value as never;
        (artifact.governed_policies as ConstitutionalGovernedPolicyRecord[]).push(
          currentObject as ConstitutionalGovernedPolicyRecord
        );
      } else if (currentSection === "runtime_policy_bindings") {
        (
          currentObject as Partial<ConstitutionalRuntimePolicyBindingRecord>
        )[rawKey as keyof ConstitutionalRuntimePolicyBindingRecord] = value as never;
        (artifact.runtime_policy_bindings as ConstitutionalRuntimePolicyBindingRecord[]).push(
          currentObject as ConstitutionalRuntimePolicyBindingRecord
        );
      }
      continue;
    }

    if (!currentObject) {
      continue;
    }

    if (currentSection === "governed_policies" && trimmed === "scope:") {
      inScope = true;
      (currentObject as Partial<ConstitutionalGovernedPolicyRecord>).scope = [];
      continue;
    }

    if (currentSection === "governed_policies" && inScope && line.startsWith("      - ")) {
      ((currentObject as Partial<ConstitutionalGovernedPolicyRecord>).scope ??= []).push(
        parseScalar(line.slice("      - ".length))
      );
      continue;
    }

    if (line.startsWith("    ")) {
      const [rawKey, rawValue] = trimmed.split(":", 2);
      const value = rawValue.trim();
      if (currentSection === "core_principles") {
        const target = currentObject as Partial<ConstitutionalCorePrincipleRecord>;
        if (rawKey === "mutable") {
          target.mutable = parseBoolean(value);
        } else {
          target[rawKey as keyof ConstitutionalCorePrincipleRecord] = parseScalar(value) as never;
        }
      } else if (currentSection === "governed_policies") {
        const target = currentObject as Partial<ConstitutionalGovernedPolicyRecord>;
        if (rawKey !== "scope") {
          target[rawKey as keyof ConstitutionalGovernedPolicyRecord] = parseScalar(value) as never;
          inScope = false;
        }
      } else if (currentSection === "runtime_policy_bindings") {
        const target = currentObject as Partial<ConstitutionalRuntimePolicyBindingRecord>;
        target[rawKey as keyof ConstitutionalRuntimePolicyBindingRecord] = parseScalar(value) as never;
      }
    }
  }

  return {
    artifactPath,
    schemaPath,
    artifact: artifact as ConstitutionalArtifactV1,
    schema: await loadConstitutionSchemaDocument(schemaPath),
  };
}
