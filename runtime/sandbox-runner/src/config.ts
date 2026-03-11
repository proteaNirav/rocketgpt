export interface SandboxRunnerConfig {
  componentId: string;
  governanceRequired: boolean;
  evidenceRequired: boolean;
  survivalInterruptionsEnabled: boolean;
  defaultPolicyRef: string;
}

export const defaultSandboxRunnerConfig: SandboxRunnerConfig = {
  componentId: "sandbox-runner",
  governanceRequired: true,
  evidenceRequired: true,
  survivalInterruptionsEnabled: true,
  defaultPolicyRef: "mishti.runtime.sandbox.first-life",
};
