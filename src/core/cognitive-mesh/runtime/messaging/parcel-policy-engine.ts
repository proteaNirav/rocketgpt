import type { CognitiveParcel } from "./types/parcel";
import type { MeshTunnelType } from "./types/tunnel";
import type { VehicleType } from "./types/vehicle";

export interface ParcelPolicyDecision {
  allowed: boolean;
  reason?: string;
}

const PUBLIC_ALLOWED_SENSITIVITY = new Set(["public", "internal", "confidential"]);

export class ParcelPolicyEngine {
  validateParcel(parcel: CognitiveParcel, tunnel: MeshTunnelType, vehicleType: VehicleType): ParcelPolicyDecision {
    const relationshipCheck = this.validateNodeRelationship(parcel, tunnel);
    if (!relationshipCheck.allowed) {
      return relationshipCheck;
    }

    if (!this.isTunnelAllowed(parcel, tunnel)) {
      return { allowed: false, reason: `tunnel_not_allowed:${tunnel}` };
    }

    if (!this.isVehicleAllowed(parcel, vehicleType)) {
      return { allowed: false, reason: `vehicle_not_allowed:${vehicleType}` };
    }

    if (
      vehicleType === "public-bus" &&
      (!PUBLIC_ALLOWED_SENSITIVITY.has(parcel.profile.sensitivity) || parcel.profile.requiresChainOfCustody)
    ) {
      return { allowed: false, reason: "public_bus_restricted_payload" };
    }

    if (parcel.sourceNodeClass === "governance" && parcel.targetNodeClass === "execution" && tunnel !== "emergency") {
      return { allowed: false, reason: "governance_execution_requires_emergency_tunnel" };
    }

    return { allowed: true };
  }

  private validateNodeRelationship(parcel: CognitiveParcel, tunnel: MeshTunnelType): ParcelPolicyDecision {
    if (parcel.sourceNodeClass === "learner" && parcel.targetNodeClass === "learner") {
      if (tunnel === "interactive" && parcel.profile.sensitivity === "confidential") {
        return { allowed: false, reason: "learner_to_learner_confidential_requires_secure_tunnel" };
      }
    }
    return { allowed: true };
  }

  private isTunnelAllowed(parcel: CognitiveParcel, tunnel: MeshTunnelType): boolean {
    if (parcel.priority === "emergency" || parcel.priority === "critical") {
      return tunnel === "emergency";
    }
    if (parcel.profile.sensitivity === "governance") {
      return tunnel === "governance" || tunnel === "emergency";
    }
    return true;
  }

  private isVehicleAllowed(parcel: CognitiveParcel, vehicleType: VehicleType): boolean {
    if (parcel.priority === "emergency" || parcel.priority === "critical") {
      return vehicleType === "rocket";
    }
    if (
      parcel.profile.sensitivity === "restricted" ||
      parcel.profile.sensitivity === "governance" ||
      parcel.profile.requiresChainOfCustody
    ) {
      return vehicleType === "secure-private-car" || vehicleType === "rocket";
    }
    return true;
  }
}
