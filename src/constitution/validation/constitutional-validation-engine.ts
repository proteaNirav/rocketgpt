import type {
  ConstitutionalArtifactV1,
  ConstitutionalSchemaDocument,
} from "../contracts/constitutional-artifact";
import type { ConstitutionalProposal } from "../types/constitutional-proposal";
import type { ValidationResult } from "./validation-result";

function validateAgainstSchema(
  value: unknown,
  schema: ConstitutionalSchemaDocument,
  path: string,
  errors: string[]
): void {
  if (schema.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push(`${path}:expected_object`);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) {
        errors.push(`${path}.${key}:missing_required`);
      }
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (key in record) {
        validateAgainstSchema(record[key], propertySchema, `${path}.${key}`, errors);
      }
    }
    return;
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${path}:expected_array`);
      return;
    }
    value.forEach((item, index) => {
      if (schema.items) {
        validateAgainstSchema(item, schema.items, `${path}[${index}]`, errors);
      }
    });
    return;
  }

  if (schema.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${path}:expected_string`);
    }
    return;
  }

  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      errors.push(`${path}:expected_boolean`);
    }
    return;
  }

  if (schema.type === "integer") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`${path}:expected_integer`);
      return;
    }
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push(`${path}:below_minimum`);
    }
  }
}

export class ConstitutionalValidationEngine {
  validateProposal(proposal: ConstitutionalProposal): ValidationResult {
    const errors: string[] = [];
    if (!proposal.proposalId) {
      errors.push("proposal.proposalId:missing_required");
    }
    if (!proposal.title) {
      errors.push("proposal.title:missing_required");
    }
    if (!proposal.targetLayer) {
      errors.push("proposal.targetLayer:missing_required");
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  validateArtifact(
    artifact: ConstitutionalArtifactV1,
    schema: ConstitutionalSchemaDocument,
    artifactPath?: string
  ): ValidationResult {
    const errors: string[] = [];
    validateAgainstSchema(artifact, schema, "constitution", errors);

    if (artifact.core_principles.some((item) => item.mutable)) {
      errors.push("constitution.core_principles:protected_principle_marked_mutable");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      artifactPath,
      schemaId: schema.$id,
    };
  }
}
