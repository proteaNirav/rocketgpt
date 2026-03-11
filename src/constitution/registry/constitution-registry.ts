import type { ConstitutionVersion } from "../types/constitution-version";

export class ConstitutionRegistry {
  private readonly versions: ConstitutionVersion[] = [];
  private activeVersionId?: string;
  private trustedVersionId?: string;

  listVersions(): ConstitutionVersion[] {
    return [...this.versions];
  }

  registerVersion(version: ConstitutionVersion): void {
    // TODO: persist through the platform-approved backing store.
    const existingIndex = this.versions.findIndex((item) => item.versionId === version.versionId);
    if (existingIndex >= 0) {
      this.versions[existingIndex] = { ...version };
    } else {
      this.versions.push({ ...version });
    }
    if (version.trustedBaseline) {
      this.trustedVersionId = version.versionId;
    }
    if (version.status === "active") {
      this.markActiveVersion(version.versionId);
    }
  }

  hasVersion(versionId: string): boolean {
    return this.versions.some((version) => version.versionId === versionId);
  }

  markActiveVersion(versionId: string): void {
    this.activeVersionId = versionId;
    this.versions.forEach((version) => {
      version.status = version.versionId === versionId ? "active" : version.status === "active" ? "approved" : version.status;
    });
  }

  setTrustedVersionReference(versionId: string): void {
    if (!this.hasVersion(versionId)) {
      throw new Error(`constitution_registry_missing_version:${versionId}`);
    }
    this.trustedVersionId = versionId;
    this.versions.forEach((version) => {
      version.trustedBaseline = version.versionId === versionId;
    });
  }

  getActiveVersion(): ConstitutionVersion | undefined {
    return this.versions.find((version) => version.versionId === this.activeVersionId);
  }

  getTrustedVersion(): ConstitutionVersion | undefined {
    return this.versions.find((version) => version.versionId === this.trustedVersionId);
  }
}
