import type { CognitiveParcel } from "./types/parcel";
import type { MeshTunnelType } from "./types/tunnel";
import type { VehicleType } from "./types/vehicle";

export interface VehicleSelectionResult {
  tunnel: MeshTunnelType;
  vehicleType: VehicleType;
  dedicatedDispatch: boolean;
}

const INTERNAL_CLASSES = new Set(["cat", "learner", "librarian", "router", "planner", "memory", "research", "analyst"]);

export class VehicleSelector {
  select(parcel: CognitiveParcel, tunnelHint?: MeshTunnelType): VehicleSelectionResult {
    const tunnel = tunnelHint ?? this.selectTunnel(parcel);
    const sourceInternal = INTERNAL_CLASSES.has(parcel.sourceNodeClass);
    const targetInternal = INTERNAL_CLASSES.has(parcel.targetNodeClass);
    const internal = sourceInternal && targetInternal;
    const sensitivity = parcel.profile.sensitivity;

    if (parcel.priority === "critical" || parcel.priority === "emergency" || tunnel === "emergency") {
      return { tunnel: "emergency", vehicleType: "rocket", dedicatedDispatch: true };
    }

    if (
      sensitivity === "restricted" ||
      sensitivity === "governance" ||
      parcel.profile.requiresChainOfCustody ||
      sensitivity === "confidential"
    ) {
      return { tunnel, vehicleType: "secure-private-car", dedicatedDispatch: true };
    }

    if (parcel.priority === "high") {
      return { tunnel, vehicleType: "private-car", dedicatedDispatch: true };
    }

    if (parcel.priority === "normal" && internal) {
      if (parcel.profile.sizeClass === "large" || parcel.profile.sizeClass === "oversized") {
        return { tunnel, vehicleType: "private-car", dedicatedDispatch: true };
      }
      return { tunnel, vehicleType: "public-bus", dedicatedDispatch: false };
    }

    if (parcel.priority === "low" && (tunnel === "interactive" || internal)) {
      return { tunnel, vehicleType: "public-bus", dedicatedDispatch: false };
    }

    return { tunnel, vehicleType: "private-car", dedicatedDispatch: true };
  }

  publicVehicleAccepts(parcel: CognitiveParcel): boolean {
    if (parcel.profile.sensitivity === "restricted" || parcel.profile.sensitivity === "governance") {
      return false;
    }
    if (parcel.priority === "critical" || parcel.priority === "emergency") {
      return false;
    }
    if (parcel.profile.requiresChainOfCustody) {
      return false;
    }
    return true;
  }

  private selectTunnel(parcel: CognitiveParcel): MeshTunnelType {
    if (parcel.priority === "emergency" || parcel.priority === "critical") {
      return "emergency";
    }
    if (parcel.profile.sensitivity === "governance") {
      return "governance";
    }
    if (parcel.intent === "retrieve" || parcel.intent === "archive") {
      return "memory";
    }
    if (parcel.intent === "review" || parcel.intent === "replicate") {
      return "research";
    }
    if (parcel.profile.sizeClass === "oversized") {
      return "bulk";
    }
    return "interactive";
  }
}
