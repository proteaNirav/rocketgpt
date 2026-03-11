export interface CatsGatewayConfig {
  componentId: string;
  governanceRequired: boolean;
  evidenceRequired: boolean;
  trustVerificationRequired: boolean;
}

export const defaultCatsGatewayConfig: CatsGatewayConfig = {
  componentId: "cats-gateway",
  governanceRequired: true,
  evidenceRequired: true,
  trustVerificationRequired: true,
};
