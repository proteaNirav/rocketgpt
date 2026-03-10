import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemasDir = path.join(__dirname, "schemas");

function loadSchema(fileName) {
  return JSON.parse(fs.readFileSync(path.join(schemasDir, fileName), "utf8"));
}

export const workflowPlanSchema = loadSchema("workflow-plan.schema.json");
export const iqScorecardSchema = loadSchema("iq-scorecard.schema.json");
export const evidencePackSchema = loadSchema("evidence-pack.schema.json");
export const analysisReportSchema = loadSchema("analysis-report.schema.json");

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isInteger(value) {
  return Number.isInteger(value);
}

const ISO_8601_UTC_LIKE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+\-]\d{2}:\d{2})$/;

function checkPrimitiveType(expected, value) {
  if (expected === "string") return typeof value === "string";
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  if (expected === "integer") return isInteger(value);
  if (expected === "boolean") return typeof value === "boolean";
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") return isObject(value);
  return true;
}

function shouldCheckFormat(schema) {
  return schema && typeof schema.format === "string" && schema.format.length > 0;
}

function validateNodeShape(schema, value, pathLabel, errors) {
  if (!schema || typeof schema !== "object") return true;
  if (!schema.type) return true;
  if (!checkPrimitiveType(schema.type, value)) {
    errors.push(`${pathLabel} must be ${schema.type}`);
    return false;
  }
  return true;
}

export function validateJsonSchema(schema, payload, { maxErrors = 64 } = {}) {
  const errors = [];
  const queue = [{ schema, value: payload, path: "$" }];

  while (queue.length && errors.length < maxErrors) {
    const current = queue.pop();
    const currentSchema = current.schema;
    const currentValue = current.value;
    const currentPath = current.path;

    if (!validateNodeShape(currentSchema, currentValue, currentPath, errors)) {
      continue;
    }

    if (currentSchema.enum && !currentSchema.enum.includes(currentValue)) {
      errors.push(`${currentPath} must be one of: ${currentSchema.enum.join(", ")}`);
      continue;
    }

    if (typeof currentValue === "string") {
      if (typeof currentSchema.minLength === "number" && currentValue.length < currentSchema.minLength) {
        errors.push(`${currentPath} is shorter than minLength ${currentSchema.minLength}`);
      }
      if (typeof currentSchema.maxLength === "number" && currentValue.length > currentSchema.maxLength) {
        errors.push(`${currentPath} is longer than maxLength ${currentSchema.maxLength}`);
      }
      if (currentSchema.pattern) {
        const re = new RegExp(currentSchema.pattern);
        if (!re.test(currentValue)) {
          errors.push(`${currentPath} does not match required pattern`);
        }
      }
      if (shouldCheckFormat(currentSchema) && currentSchema.format === "date-time") {
        if (!ISO_8601_UTC_LIKE.test(currentValue)) {
          errors.push(`${currentPath} must be an ISO-8601 date-time string`);
        }
      }
      continue;
    }

    if (typeof currentValue === "number") {
      if (typeof currentSchema.minimum === "number" && currentValue < currentSchema.minimum) {
        errors.push(`${currentPath} must be >= ${currentSchema.minimum}`);
      }
      if (typeof currentSchema.maximum === "number" && currentValue > currentSchema.maximum) {
        errors.push(`${currentPath} must be <= ${currentSchema.maximum}`);
      }
      continue;
    }

    if (Array.isArray(currentValue)) {
      if (typeof currentSchema.minItems === "number" && currentValue.length < currentSchema.minItems) {
        errors.push(`${currentPath} must contain at least ${currentSchema.minItems} items`);
      }
      if (typeof currentSchema.maxItems === "number" && currentValue.length > currentSchema.maxItems) {
        errors.push(`${currentPath} must contain at most ${currentSchema.maxItems} items`);
      }
      if (currentSchema.items) {
        for (let i = 0; i < currentValue.length && errors.length < maxErrors; i += 1) {
          queue.push({
            schema: currentSchema.items,
            value: currentValue[i],
            path: `${currentPath}[${i}]`,
          });
        }
      }
      continue;
    }

    if (isObject(currentValue)) {
      const props = currentSchema.properties || {};
      const required = Array.isArray(currentSchema.required) ? currentSchema.required : [];
      const keyList = Object.keys(currentValue);

      for (const req of required) {
        if (!(req in currentValue)) {
          errors.push(`${currentPath}.${req} is required`);
        }
      }

      if (currentSchema.additionalProperties === false) {
        for (const key of keyList) {
          if (!Object.prototype.hasOwnProperty.call(props, key)) {
            errors.push(`${currentPath}.${key} is not allowed`);
          }
        }
      }

      for (const [key, propSchema] of Object.entries(props)) {
        if (!Object.prototype.hasOwnProperty.call(currentValue, key)) continue;
        queue.push({
          schema: propSchema,
          value: currentValue[key],
          path: `${currentPath}.${key}`,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function makeAsserter(contractName, schema, value) {
  const result = validateJsonSchema(schema, value);
  if (!result.ok) {
    throw new Error(`${contractName} validation failed: ${result.errors.join("; ")}`);
  }
  return value;
}

export function validateWorkflowPlan(value) {
  return validateJsonSchema(workflowPlanSchema, value);
}

export function validateIQScorecard(value) {
  return validateJsonSchema(iqScorecardSchema, value);
}

export function validateEvidencePack(value) {
  return validateJsonSchema(evidencePackSchema, value);
}

export function validateAnalysisReport(value) {
  return validateJsonSchema(analysisReportSchema, value);
}

export function assertWorkflowPlan(value) {
  return makeAsserter("WorkflowPlan", workflowPlanSchema, value);
}

export function assertIQScorecard(value) {
  return makeAsserter("IQScorecard", iqScorecardSchema, value);
}

export function assertEvidencePack(value) {
  return makeAsserter("EvidencePack", evidencePackSchema, value);
}

export function assertAnalysisReport(value) {
  return makeAsserter("AnalysisReport", analysisReportSchema, value);
}
