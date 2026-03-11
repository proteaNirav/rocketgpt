export interface OsAdapterConfig {
  componentId: string;
  governanceRequired: boolean;
  evidenceRequired: boolean;
  safeModeInterruptionsEnabled: boolean;
}

export const defaultOsAdapterConfig: OsAdapterConfig = {
  componentId: "os-adapter",
  governanceRequired: true,
  evidenceRequired: true,
  safeModeInterruptionsEnabled: true,
};
