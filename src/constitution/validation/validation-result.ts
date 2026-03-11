export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  artifactPath?: string;
  schemaId?: string;
}
