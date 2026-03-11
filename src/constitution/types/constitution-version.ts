export interface ConstitutionVersion {
  versionId: string;
  semanticVersion: string;
  status: "draft" | "approved" | "active" | "superseded";
  trustedBaseline: boolean;
  activatedAt?: string;
  sourceArtifactRef?: string;
  schemaRef?: string;
  trustedSnapshotRef?: string;
}
