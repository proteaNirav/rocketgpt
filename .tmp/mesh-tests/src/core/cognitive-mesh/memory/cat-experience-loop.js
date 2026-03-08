"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatExperienceLoop = void 0;
const cat_feedback_service_1 = require("./cat-feedback-service");
class CatExperienceLoop {
    constructor(memoryService) {
        this.memoryService = memoryService;
        this.feedbackService = new cat_feedback_service_1.CatFeedbackService();
    }
    apply(input, experienceRecord) {
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
exports.CatExperienceLoop = CatExperienceLoop;
