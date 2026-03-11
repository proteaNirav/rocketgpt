import type { SnapshotRecord } from "../types/snapshot-record";
import { ConstitutionalLifecycleLedger } from "../core/constitutional-lifecycle-ledger";
import type { SnapshotManifest } from "./snapshot-manifest";

export class ConstitutionalSnapshotService {
  constructor(private readonly lifecycleLedger = new ConstitutionalLifecycleLedger()) {}

  createSnapshot(manifest: SnapshotManifest): SnapshotRecord {
    const record: SnapshotRecord = {
      snapshotId: manifest.snapshotId,
      constitutionVersionId: manifest.constitutionVersionId,
      manifestRef: "TODO-manifest-ref",
      trusted: manifest.trusted,
      createdAt: new Date(0).toISOString(),
    };
    this.lifecycleLedger.emit({
      stage: "snapshot_created",
      constitutionVersion: manifest.constitutionVersionId,
      snapshotId: record.snapshotId,
      sourceArtifactRef: record.manifestRef,
      actorRole: "read_only_auditor",
    });
    return record;
  }
}
