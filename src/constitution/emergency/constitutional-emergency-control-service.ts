import type { EmergencyControlState } from "../types/emergency-control-state";

export class ConstitutionalEmergencyControlService {
  getState(): EmergencyControlState {
    return {
      freezeEnabled: false,
      safeModeEnabled: false,
      lockedNonCoreChanges: false,
      mismatchAlarmActive: false,
    };
  }
}
