import type { ConstitutionalProposal } from "../types/constitutional-proposal";
import type { ProposalReview } from "../types/proposal-review";

export class ConstitutionalReviewService {
  attachReview(_proposal: ConstitutionalProposal, review: ProposalReview): ProposalReview {
    // TODO: enforce proposer, reviewer, and approver separation.
    return review;
  }
}
