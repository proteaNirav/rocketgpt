"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPERIENCE_LIMITS = exports.EXPERIENCE_TAGS = exports.EXPERIENCE_SOURCE_COMPONENT = void 0;
exports.EXPERIENCE_SOURCE_COMPONENT = "mesh-live-runtime";
exports.EXPERIENCE_TAGS = {
    CAPTURED: "cel.captured",
    GUARDED: "cel.guarded",
    FAILED: "cel.failed",
    FALLBACK: "cel.fallback",
    VERIFIED: "cel.verified",
};
exports.EXPERIENCE_LIMITS = {
    DEFAULT_RECENT_LIMIT: 20,
    MAX_IN_MEMORY_RECORDS: 1000,
};
