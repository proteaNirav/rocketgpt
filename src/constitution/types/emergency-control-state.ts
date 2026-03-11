export interface EmergencyControlState {
  freezeEnabled: boolean;
  safeModeEnabled: boolean;
  lockedNonCoreChanges: boolean;
  lastTrustedSnapshotId?: string;
  mismatchAlarmActive: boolean;
}
