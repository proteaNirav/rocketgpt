"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp01 = clamp01;
exports.computeDeadlinePressure = computeDeadlinePressure;
exports.toAttentionBand = toAttentionBand;
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
function computeDeadlinePressure(deadlineTs, nowTs) {
    if (!deadlineTs || !Number.isFinite(deadlineTs)) {
        return 0;
    }
    if (deadlineTs <= nowTs) {
        return 1;
    }
    const remainingMs = deadlineTs - nowTs;
    if (remainingMs <= 15 * 60 * 1000) {
        return 0.95;
    }
    if (remainingMs <= 60 * 60 * 1000) {
        return 0.75;
    }
    if (remainingMs <= 6 * 60 * 60 * 1000) {
        return 0.5;
    }
    return 0.1;
}
function toAttentionBand(score) {
    if (score >= 80) {
        return "critical";
    }
    if (score >= 60) {
        return "high";
    }
    if (score >= 35) {
        return "normal";
    }
    return "low";
}
