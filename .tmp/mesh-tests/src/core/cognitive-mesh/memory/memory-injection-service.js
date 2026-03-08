"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryInjectionService = void 0;
const memory_packet_service_1 = require("./memory-packet-service");
class MemoryInjectionService {
    constructor(repository) {
        this.packetService = new memory_packet_service_1.MemoryPacketService(repository);
    }
    buildInjectionPacket(context, options = {}) {
        return this.packetService.buildPacket(context, options);
    }
}
exports.MemoryInjectionService = MemoryInjectionService;
