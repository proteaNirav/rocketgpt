import { readFile } from "node:fs/promises";
import type {
  RocketGptConstitutionDocumentV1,
  RocketGptConstitutionPrincipleV1,
} from "./constitution.types";

const DEFAULT_CONSTITUTION_PATH = "configs/governance/rgpt_constitution_v1.yaml";

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseNumber(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateDocumentShape(doc: RocketGptConstitutionDocumentV1): RocketGptConstitutionDocumentV1 {
  if (doc.version !== 1) {
    throw new Error("constitution_invalid:version");
  }
  if (doc.name !== "RocketGPT Constitutional Brain Layer") {
    throw new Error("constitution_invalid:name");
  }
  if (doc.status !== "defined") {
    throw new Error("constitution_invalid:status");
  }
  if (doc.enforcement_mode !== "deferred_phased_rollout") {
    throw new Error("constitution_invalid:enforcement_mode");
  }
  if (doc.principles.length !== 6) {
    throw new Error("constitution_invalid:principle_count");
  }
  const expectedOrder: RocketGptConstitutionPrincipleV1["id"][] = [
    "governed_existence",
    "continuity_preservation",
    "reality_alignment",
    "self_awareness",
    "observational_learning",
    "trusted_steward_recognition_and_protection",
  ];
  for (let i = 0; i < expectedOrder.length; i += 1) {
    const principle = doc.principles[i];
    if (!principle) {
      throw new Error("constitution_invalid:principle_missing");
    }
    if (principle.id !== expectedOrder[i]) {
      throw new Error("constitution_invalid:principle_order");
    }
    if (principle.priority !== i + 1) {
      throw new Error("constitution_invalid:principle_priority");
    }
  }
  return doc;
}

export async function loadRocketGptConstitutionV1FromYaml(
  filePath = DEFAULT_CONSTITUTION_PATH
): Promise<RocketGptConstitutionDocumentV1> {
  const text = await readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const principles: RocketGptConstitutionPrincipleV1[] = [];
  let currentPrinciple: Partial<RocketGptConstitutionPrincipleV1> | undefined;
  let version: number | undefined;
  let name: string | undefined;
  let status: string | undefined;
  let enforcementMode: string | undefined;
  let inConstraints = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("version:")) {
      version = parseNumber(trimmed.slice("version:".length));
      continue;
    }
    if (trimmed.startsWith("name:")) {
      name = parseScalar(trimmed.slice("name:".length));
      continue;
    }
    if (trimmed.startsWith("status:")) {
      status = parseScalar(trimmed.slice("status:".length));
      continue;
    }
    if (trimmed.startsWith("enforcement_mode:")) {
      enforcementMode = parseScalar(trimmed.slice("enforcement_mode:".length));
      continue;
    }

    if (line.startsWith("  - id:")) {
      if (currentPrinciple) {
        principles.push({
          id: currentPrinciple.id as RocketGptConstitutionPrincipleV1["id"],
          priority: currentPrinciple.priority as RocketGptConstitutionPrincipleV1["priority"],
          title: currentPrinciple.title as string,
          description: currentPrinciple.description as string,
          constraints: currentPrinciple.constraints ?? [],
        });
      }
      currentPrinciple = {
        id: parseScalar(line.slice("  - id:".length)) as RocketGptConstitutionPrincipleV1["id"],
        constraints: [],
      };
      inConstraints = false;
      continue;
    }

    if (!currentPrinciple) {
      continue;
    }

    if (line.startsWith("    priority:")) {
      currentPrinciple.priority = parseNumber(line.slice("    priority:".length)) as RocketGptConstitutionPrincipleV1["priority"];
      inConstraints = false;
      continue;
    }
    if (line.startsWith("    title:")) {
      currentPrinciple.title = parseScalar(line.slice("    title:".length));
      inConstraints = false;
      continue;
    }
    if (line.startsWith("    description:")) {
      currentPrinciple.description = parseScalar(line.slice("    description:".length));
      inConstraints = false;
      continue;
    }
    if (line.startsWith("    constraints:")) {
      inConstraints = true;
      continue;
    }
    if (inConstraints && line.startsWith("      - ")) {
      currentPrinciple.constraints = [...(currentPrinciple.constraints ?? []), parseScalar(line.slice("      - ".length))];
      continue;
    }
  }

  if (currentPrinciple) {
    principles.push({
      id: currentPrinciple.id as RocketGptConstitutionPrincipleV1["id"],
      priority: currentPrinciple.priority as RocketGptConstitutionPrincipleV1["priority"],
      title: currentPrinciple.title as string,
      description: currentPrinciple.description as string,
      constraints: currentPrinciple.constraints ?? [],
    });
  }

  return validateDocumentShape({
    version: version as 1,
    name: name as "RocketGPT Constitutional Brain Layer",
    status: status as "defined",
    enforcement_mode: enforcementMode as "deferred_phased_rollout",
    principles,
  });
}
