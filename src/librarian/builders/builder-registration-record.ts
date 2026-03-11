export interface BuilderRegistrationRecord {
  builderId: string;
  version: string;
  lineageRef: string;
  performanceHistoryRef?: string;
  promotionHistoryRef?: string;
}
