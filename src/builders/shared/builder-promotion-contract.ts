export interface BuilderPromotionReview {
  builderId: string;
  fromTrustTier: number;
  requestedTrustTier: number;
  evidenceRefs: string[];
  reviewStatus: "pending" | "approved" | "rejected";
}
