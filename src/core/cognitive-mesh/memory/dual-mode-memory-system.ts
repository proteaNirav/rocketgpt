import { CognitiveMemoryService } from "./cognitive-memory-service";
import type { MemoryRecallQuery, MemoryResurfaceInput } from "./types/dual-mode-memory.types";

export class DualModeMemorySystem {
  constructor(private readonly memoryService: CognitiveMemoryService) {}

  explicitRecall(query: MemoryRecallQuery) {
    return this.memoryService.explicitRecallSearch(query);
  }

  implicitResurface(input: MemoryResurfaceInput) {
    return this.memoryService.implicitResurface(input);
  }
}
