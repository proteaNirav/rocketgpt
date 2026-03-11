import type { AuditLineageRecord } from "../types/audit-lineage-record";

export class ConstitutionalAuditLineageService {
  record(entry: AuditLineageRecord): AuditLineageRecord {
    // TODO: route through the platform-approved audit persistence path.
    return entry;
  }
}
