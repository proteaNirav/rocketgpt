import type { ConstitutionRole } from "./constitution-role";

export interface ProposalReview {
  reviewId: string;
  proposalId: string;
  reviewerRole: ConstitutionRole;
  decision: "approved" | "rejected" | "revision_requested";
  comments: string[];
  reviewedAt?: string;
}
