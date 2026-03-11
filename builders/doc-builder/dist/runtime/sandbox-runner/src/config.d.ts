export interface SandboxRunnerConfig {
    componentId: string;
    governanceRequired: boolean;
    evidenceRequired: boolean;
    survivalInterruptionsEnabled: boolean;
    defaultPolicyRef: string;
}
export declare const defaultSandboxRunnerConfig: SandboxRunnerConfig;
