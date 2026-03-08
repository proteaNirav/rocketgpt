import { CognitiveMemoryService } from "./cognitive-memory-service";
import { CatFeedbackService, type BuildCatFeedbackInput } from "./cat-feedback-service";
import type { MemoryExperienceRecord } from "./types/dual-mode-memory.types";

export interface CatExperienceLoopResult {
  synthesized: boolean;
  feedbackId: string;
}

export class CatExperienceLoop {
  private readonly feedbackService = new CatFeedbackService();

  constructor(private readonly memoryService: CognitiveMemoryService) {}

  apply(input: BuildCatFeedbackInput, experienceRecord: MemoryExperienceRecord | undefined): CatExperienceLoopResult {
    const feedback = this.feedbackService.build(input);
    this.memoryService.synthesizeExperienceFeedback(feedback, experienceRecord, {
      priorByCapabilityLimit: 20,
    });
    return {
      synthesized: true,
      feedbackId: feedback.feedbackId,
    };
  }
}
