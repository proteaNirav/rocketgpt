import { MemoryPacketService } from "./memory-packet-service";
import type { MemoryAccessContext, MemoryPacket } from "./types/dual-mode-memory.types";
import { InMemoryCognitiveMemoryRepository } from "./repository/in-memory-cognitive-memory-repository";

export class MemoryInjectionService {
  private readonly packetService: MemoryPacketService;

  constructor(repository: InMemoryCognitiveMemoryRepository) {
    this.packetService = new MemoryPacketService(repository);
  }

  buildInjectionPacket(
    context: MemoryAccessContext,
    options: { query?: string; limit?: number; relevanceFloor?: number } = {}
  ): MemoryPacket {
    return this.packetService.buildPacket(context, options);
  }
}
