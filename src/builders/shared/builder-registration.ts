import type { BuilderClass } from "./builder-class";
import type { BuilderMode } from "./builder-mode";
import type { BuilderPermission } from "./builder-permission";
import type { BuilderTrustTier } from "./builder-trust-tier";
import type { BuilderType } from "./builder-type";

export interface BuilderRegistration {
  builderId: string;
  name: string;
  builderClass: BuilderClass;
  builderType: BuilderType;
  builderMode: BuilderMode;
  trustTier: BuilderTrustTier;
  permissions: BuilderPermission[];
  version: string;
  lineageRef: string;
  status: "proposed" | "registered" | "deprecated";
}
