let safeModeEnabled = false;

export function getSafeModeEnabled(): boolean {
  return safeModeEnabled;
}

export function setSafeModeEnabled(enabled: boolean): void {
  safeModeEnabled = enabled;
}
