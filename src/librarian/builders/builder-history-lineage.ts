export interface BuilderHistoryLineage {
  builderId: string;
  previousVersionRef?: string;
  supersessionRef?: string;
  trustHistoryRefs: string[];
}
