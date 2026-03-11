import type { BuilderRegistration } from "./builder-registration";

export interface BuilderWrapperContract {
  lookupRegistration(builderId: string): Promise<BuilderRegistration | null>;
  validateScope(builderId: string, request: unknown): Promise<void>;
  validateOutput(builderId: string, output: unknown): Promise<void>;
  reportEvent(builderId: string, eventType: string, payload: unknown): Promise<void>;
}
