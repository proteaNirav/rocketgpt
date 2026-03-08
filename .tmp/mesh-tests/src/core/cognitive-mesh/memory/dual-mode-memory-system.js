"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualModeMemorySystem = void 0;
class DualModeMemorySystem {
    constructor(memoryService) {
        this.memoryService = memoryService;
    }
    explicitRecall(query) {
        return this.memoryService.explicitRecallSearch(query);
    }
    implicitResurface(input) {
        return this.memoryService.implicitResurface(input);
    }
}
exports.DualModeMemorySystem = DualModeMemorySystem;
