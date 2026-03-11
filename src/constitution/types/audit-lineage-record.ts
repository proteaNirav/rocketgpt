export interface AuditLineageRecord {
  recordId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  evidenceRefs: string[];
  recordedAt: string;
}
