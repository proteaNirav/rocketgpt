export interface BuilderReportingContract {
  reportToLibrarian(payload: unknown): Promise<void>;
  reportToLearner(payload: unknown): Promise<void>;
  reportToBrain(payload: unknown): Promise<void>;
  reportToConsortium(payload: unknown): Promise<void>;
}
