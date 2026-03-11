export interface SnapshotManifest {
  snapshotId: string;
  constitutionVersionId: string;
  trusted: boolean;
  contents: string[];
}
